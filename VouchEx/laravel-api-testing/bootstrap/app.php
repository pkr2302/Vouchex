<?php

use App\Support\ApiErrorResponse;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule) {
        $schedule->command('calendar:send-reminders')->everyMinute();

        // Catch-up scheduler: do NOT use dailyAt('13:00') alone.
        // On shared hosting, missing that single minute skips the backup for the whole day.
        // After the configured time, retry every 5 minutes until PortalSetting marks today as sent.
        $schedule->command('backups:send-daily')
            ->everyFiveMinutes()
            ->timezone(config('vouchex.backup_timezone', 'Asia/Kolkata'))
            ->when(function () {
                $tz = (string) config('vouchex.backup_timezone', 'Asia/Kolkata');
                $at = (string) config('vouchex.backup_daily_at', '13:00');
                if (! preg_match('/^\d{2}:\d{2}$/', $at)) {
                    $at = '13:00';
                }

                return now($tz)->format('H:i') >= $at;
            })
            ->withoutOverlapping(120);
    })
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->validateCsrfTokens(except: ['api/*']);
        $middleware->redirectGuestsTo(function (Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return null;
            }

            return '/';
        });
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                    'type' => 'unauthenticated',
                ], 401);
            }

            return null;
        });

        $exceptions->render(function (\Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiErrorResponse::fromThrowable($e, $request);
        });
    })->create();
