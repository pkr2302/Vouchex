<?php

namespace App\Services\GstCompliance;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GstApiTransport
{
    /**
     * @param  array<string, mixed>  $channelConfig
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function post(string $path, array $channelConfig, array $payload, string $apiMode): array
    {
        $url = rtrim((string) ($channelConfig['api_url'] ?? ''), '/');
        if ($url === '' || $apiMode === 'sandbox') {
            return $this->sandboxResponse($path, $payload);
        }

        $request = Http::timeout(45)->acceptJson();
        $authType = $channelConfig['auth_type'] ?? 'bearer';

        if ($authType === 'bearer' && ! empty($channelConfig['client_secret'])) {
            $secret = GstComplianceSettings::decryptSecret($channelConfig['client_secret']);
            if ($secret !== '') {
                $request = $request->withToken($secret);
            }
        } elseif ($authType === 'basic') {
            $user = $channelConfig['username'] ?? '';
            $pass = GstComplianceSettings::decryptSecret($channelConfig['password'] ?? '');
            if ($user !== '' && $pass !== '') {
                $request = $request->withBasicAuth($user, $pass);
            }
        } elseif ($authType === 'api_key' && ! empty($channelConfig['client_id'])) {
            $key = GstComplianceSettings::decryptSecret($channelConfig['client_secret'] ?? '');
            $request = $request->withHeaders([
                'X-API-Key' => $key,
                'X-Client-Id' => $channelConfig['client_id'],
            ]);
        }

        $endpoint = $url.(str_starts_with($path, '/') ? $path : '/'.$path);
        $response = $request->post($endpoint, $payload);

        if (! $response->successful()) {
            Log::warning('GST API call failed', [
                'url' => $endpoint,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \RuntimeException(
                'GST API returned HTTP '.$response->status().': '.substr($response->body(), 0, 500)
            );
        }

        $json = $response->json();
        if (! is_array($json)) {
            throw new \RuntimeException('GST API returned an invalid response.');
        }

        return $json;
    }

    /** @param  array<string, mixed>  $payload */
    private function sandboxResponse(string $path, array $payload): array
    {
        $seed = md5(json_encode($payload).$path.microtime(true));

        if (str_contains($path, 'cancel')) {
            return ['success' => true, 'status' => 'cancelled'];
        }

        if (str_contains($path, 'eway')) {
            return [
                'success' => true,
                'ewbNo' => (string) random_int(100000000000, 999999999999),
                'ewbDate' => now()->toIso8601String(),
                'validUpto' => now()->addDay()->toIso8601String(),
                'mode' => 'sandbox',
            ];
        }

        return [
            'success' => true,
            'irn' => strtoupper(substr(hash('sha256', $seed), 0, 64)),
            'ackNo' => 'ACK'.random_int(100000, 999999),
            'ackDate' => now()->format('Y-m-d H:i:s'),
            'signedQRCode' => base64_encode('VouchEx-Sandbox-QR:'.$seed),
            'mode' => 'sandbox',
        ];
    }
}
