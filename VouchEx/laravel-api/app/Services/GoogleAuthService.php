<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoogleAuthService
{
    public function verifyIdToken(string $idToken): array
    {
        $clientId = config('services.google.client_id');
        if (! $clientId) {
            throw new RuntimeException('Google Sign-In is not configured on this server.');
        }

        $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->ok()) {
            throw new RuntimeException('Google sign-in verification failed.');
        }

        $payload = $response->json();
        if (($payload['aud'] ?? '') !== $clientId) {
            throw new RuntimeException('Google token audience mismatch.');
        }

        if (! ($payload['email_verified'] ?? false)) {
            throw new RuntimeException('Google account email is not verified.');
        }

        return [
            'google_id' => (string) ($payload['sub'] ?? ''),
            'email' => strtolower((string) ($payload['email'] ?? '')),
            'name' => (string) ($payload['name'] ?? $payload['email'] ?? 'VouchEx User'),
        ];
    }
}
