<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

Route::get('/config.json', function () {
    $path = public_path('config.json');
    if (! File::exists($path)) {
        return response()->json([
            'apiBaseUrl' => '/api',
            'syncIntervalMs' => 5000,
            'documentLockTtlMinutes' => 15,
        ]);
    }

    return response()->file($path, ['Content-Type' => 'application/json']);
});

Route::get('/privacy-policy', function () {
    return response()
        ->view('legal.privacy-policy')
        ->header('X-Robots-Tag', 'noindex, nofollow');
});

Route::get('/terms-of-service', function () {
    return response()
        ->view('legal.terms-of-service')
        ->header('X-Robots-Tag', 'noindex, nofollow');
});

// cPanel FTP deploys cannot create the public/storage symlink, so serve uploads directly.
Route::get('/storage/{path}', function (string $path) {
    if (str_contains($path, '..')) {
        abort(404);
    }

    $full = storage_path('app/public/'.$path);
    if (! File::exists($full) || is_dir($full)) {
        abort(404);
    }

    return response()->file($full);
})->where('path', '.*');

Route::get('/sitemap.xml', function () {
    $path = public_path('sitemap.xml');
    if (! File::exists($path)) {
        abort(404);
    }

    return response()->file($path, ['Content-Type' => 'application/xml']);
});

Route::get('/{any?}', function () {
    $index = public_path('index.html');
    if (File::exists($index)) {
        return response()->file($index);
    }

    return response()->json([
        'status' => 'ok',
        'service' => 'vouchex-portal',
        'message' => 'Upload the built frontend (index.html) to public/ or run npm run build.',
    ]);
})->where('any', '^(?!api).*$');
