<?php

namespace App\Services\GstCompliance;

use App\Models\CompanySetting;
use Illuminate\Support\Facades\Crypt;

class GstComplianceSettings
{
    public const KEY = 'gst_compliance';

    public static function defaults(): array
    {
        return [
            'einvoice_enabled' => false,
            'ewaybill_enabled' => false,
            'api_mode' => 'sandbox',
            'provider_label' => '',
            'einvoice' => [
                'api_url' => '',
                'auth_type' => 'bearer',
                'client_id' => '',
                'client_secret' => '',
                'username' => '',
                'password' => '',
            ],
            'ewaybill' => [
                'api_url' => '',
                'auth_type' => 'basic',
                'client_id' => '',
                'client_secret' => '',
                'username' => '',
                'password' => '',
            ],
        ];
    }

    public static function get(CompanySetting $company): array
    {
        $opts = $company->custom_options ?? [];
        $stored = is_array($opts[self::KEY] ?? null) ? $opts[self::KEY] : [];

        return self::mergeRecursive(self::defaults(), $stored);
    }

    public static function forFrontend(CompanySetting $company): array
    {
        $cfg = self::get($company);

        return [
            'einvoice_enabled' => (bool) ($cfg['einvoice_enabled'] ?? false),
            'ewaybill_enabled' => (bool) ($cfg['ewaybill_enabled'] ?? false),
            'api_mode' => $cfg['api_mode'] ?? 'sandbox',
            'provider_label' => $cfg['provider_label'] ?? '',
            'einvoice' => self::maskChannel($cfg['einvoice'] ?? []),
            'ewaybill' => self::maskChannel($cfg['ewaybill'] ?? []),
        ];
    }

    public static function save(CompanySetting $company, array $incoming): array
    {
        $current = self::get($company);
        $next = $current;

        foreach (['einvoice_enabled', 'ewaybill_enabled', 'api_mode', 'provider_label'] as $key) {
            if (array_key_exists($key, $incoming)) {
                $next[$key] = $incoming[$key];
            }
        }

        if (isset($incoming['einvoice']) && is_array($incoming['einvoice'])) {
            $next['einvoice'] = self::mergeChannel($current['einvoice'], $incoming['einvoice']);
        }
        if (isset($incoming['ewaybill']) && is_array($incoming['ewaybill'])) {
            $next['ewaybill'] = self::mergeChannel($current['ewaybill'], $incoming['ewaybill']);
        }

        $next['einvoice_enabled'] = (bool) ($next['einvoice_enabled'] ?? false);
        $next['ewaybill_enabled'] = (bool) ($next['ewaybill_enabled'] ?? false);
        $next['api_mode'] = in_array($next['api_mode'] ?? '', ['sandbox', 'production'], true)
            ? $next['api_mode']
            : 'sandbox';

        $opts = $company->custom_options ?? [];
        $opts[self::KEY] = $next;
        $company->custom_options = $opts;
        $company->save();

        return self::forFrontend($company->fresh());
    }

    private static function mergeChannel(array $current, array $incoming): array
    {
        $merged = array_merge($current, array_intersect_key($incoming, array_flip([
            'api_url', 'auth_type', 'client_id', 'username',
        ])));

        if (! empty($incoming['client_secret'])) {
            $merged['client_secret'] = self::encryptSecret($incoming['client_secret']);
        }
        if (! empty($incoming['password'])) {
            $merged['password'] = self::encryptSecret($incoming['password']);
        }

        return $merged;
    }

    private static function maskChannel(array $channel): array
    {
        return [
            'api_url' => $channel['api_url'] ?? '',
            'auth_type' => $channel['auth_type'] ?? 'bearer',
            'client_id' => $channel['client_id'] ?? '',
            'username' => $channel['username'] ?? '',
            'has_client_secret' => ! empty($channel['client_secret']),
            'has_password' => ! empty($channel['password']),
        ];
    }

    public static function decryptSecret(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return '';
        }
    }

    private static function encryptSecret(string $plain): string
    {
        return Crypt::encryptString($plain);
    }

    private static function mergeRecursive(array $base, array $over): array
    {
        foreach ($over as $k => $v) {
            if (is_array($v) && isset($base[$k]) && is_array($base[$k])) {
                $base[$k] = self::mergeRecursive($base[$k], $v);
            } else {
                $base[$k] = $v;
            }
        }

        return $base;
    }
}
