<?php

namespace App\Services;

use App\Models\PortalSetting;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class SystemHealthService
{
    private const LOG_TAIL_BYTES = 20480;

    public function status(): array
    {
        $dbConnected = true;
        $dbError = null;
        $dbName = null;

        try {
            DB::connection()->getPdo();
            $dbName = DB::connection()->getDatabaseName();
        } catch (\Throwable $e) {
            $dbConnected = false;
            $dbError = $e->getMessage();
        }

        return [
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'environment' => app()->environment(),
            'debug' => (bool) config('app.debug'),
            'database' => [
                'connected' => $dbConnected,
                'name' => $dbName,
                'error' => $dbError,
            ],
            'server_time' => now()->toIso8601String(),
            'timezone' => config('app.timezone'),
            'migrations_allowed' => $this->migrationsAllowed(),
            'inactivity_timeout' => PortalSetting::inactivityTimeout(),
            'log_lines' => $this->logTailLines(),
        ];
    }

    /** @return list<array{level: string, text: string}> */
    public function logTailLines(): array
    {
        $path = storage_path('logs/laravel.log');
        if (! is_readable($path)) {
            return [['level' => 'info', 'text' => '(No log file or not readable yet.)']];
        }

        $size = filesize($path);
        if ($size === false || $size === 0) {
            return [['level' => 'info', 'text' => '(Log file is empty.)']];
        }

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            return [['level' => 'warning', 'text' => '(Could not open log file.)']];
        }

        $start = max(0, $size - self::LOG_TAIL_BYTES);
        fseek($handle, $start);
        $chunk = (string) stream_get_contents($handle);
        fclose($handle);

        if ($start > 0) {
            $chunk = preg_replace('/^[^\n]*\n/', '', $chunk, 1) ?? $chunk;
        }

        $lines = preg_split("/\r\n|\n|\r/", $chunk) ?: [];
        $lines = array_slice(array_values(array_filter($lines, static fn ($l) => $l !== '')), -50);

        return array_map(fn (string $line) => [
            'level' => $this->detectLogLevel($line),
            'text' => $line,
        ], $lines);
    }

    public function clearCache(): array
    {
        $commands = [
            'cache:clear',
            'view:clear',
            'config:clear',
            'route:clear',
        ];
        $ran = [];
        foreach ($commands as $command) {
            Artisan::call($command);
            $ran[] = $command;
        }

        return [
            'success' => true,
            'message' => 'Application caches cleared.',
            'commands' => $ran,
        ];
    }

    public function optimize(): array
    {
        Artisan::call('optimize');

        return [
            'success' => true,
            'message' => 'Application optimized for production.',
        ];
    }

    public function migrate(): array
    {
        if (! $this->migrationsAllowed()) {
            throw new \RuntimeException(
                'Database migrations are disabled in production. Set APP_ALLOW_DANGEROUS_SYSTEM=true in .env only when you intend to run migrations.'
            );
        }

        Artisan::call('migrate', ['--force' => true]);
        $output = trim(Artisan::output());

        return [
            'success' => true,
            'message' => 'Pending migrations executed.',
            'output' => $output !== '' ? $output : 'Nothing to migrate.',
        ];
    }

    public function migrationsAllowed(): bool
    {
        if (! app()->environment('production')) {
            return true;
        }

        return filter_var(config('app.allow_dangerous_system', false), FILTER_VALIDATE_BOOLEAN);
    }

    private function detectLogLevel(string $line): string
    {
        if (preg_match('/\.(ERROR|CRITICAL|ALERT|EMERGENCY):/i', $line)) {
            return 'error';
        }
        if (preg_match('/\.(WARNING|WARN):/i', $line)) {
            return 'warning';
        }

        return 'info';
    }
}
