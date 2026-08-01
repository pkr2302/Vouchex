<?php

namespace App\Providers;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // cPanel FTP deploys update routes/api.php but leave a stale route:cache.
        // Clear once so newly added API routes (e.g. company signature) become live.
        $marker = storage_path('framework/cache/.cleared-routes-signatory-20260801');
        if (file_exists($marker) || ! $this->app->routesAreCached()) {
            return;
        }

        try {
            Artisan::call('route:clear');
            @file_put_contents($marker, now()->toIso8601String());
        } catch (\Throwable) {
            // Ignore — logo endpoint still accepts signature uploads as fallback.
        }
    }
}
