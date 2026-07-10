<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class RbiReferenceRateService
{
    /** ISO code → labels used on RBI reference rate pages. */
    private const RBI_CURRENCY_NAMES = [
        'USD' => ['U.S. Dollar', 'US Dollar', 'United States Dollar'],
        'GBP' => ['U.K. Pound Sterling', 'UK Pound Sterling', 'British Pound'],
        'EUR' => ['Euro'],
        'JPY' => ['Japanese Yen'],
        'AUD' => ['Australian Dollar'],
        'CAD' => ['Canadian Dollar'],
        'CHF' => ['Swiss Franc'],
        'SGD' => ['Singapore Dollar'],
        'HKD' => ['Hong Kong Dollar'],
        'SAR' => ['Saudi Riyal'],
        'CNY' => ['Chinese Yuan'],
        'NZD' => ['New Zealand Dollar'],
        'SEK' => ['Swedish Krona'],
        'DKK' => ['Danish Krone'],
        'NOK' => ['Norwegian Kroner'],
        'KWD' => ['Kuwaiti Dinar'],
        'BHD' => ['Bahraini Dinar'],
    ];

    public function lookup(string $currency, ?string $date = null): array
    {
        $code = strtoupper(trim($currency));
        if ($code === 'INR' || $code === '') {
            return [
                'currency' => 'INR',
                'rate' => 1.0,
                'rate_date' => $date,
                'source' => 'fixed',
                'label' => 'Indian Rupee',
                'available' => true,
            ];
        }

        if (! isset(self::RBI_CURRENCY_NAMES[$code])) {
            return [
                'currency' => $code,
                'rate' => null,
                'rate_date' => $date,
                'source' => 'rbi',
                'label' => $code,
                'available' => false,
                'message' => 'RBI does not publish a daily reference rate for this currency. Enter the rate manually.',
            ];
        }

        $cacheKey = 'rbi_ref_'.md5($code.'|'.($date ?? 'latest'));
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $result = $this->fetchRate($code, $date);
        Cache::put($cacheKey, $result, now()->addHours(6));

        return $result;
    }

    /** Refresh cached snapshot file from live sources (for cron / artisan). */
    public function syncSnapshot(): array
    {
        $rates = [];
        foreach (array_keys(self::RBI_CURRENCY_NAMES) as $code) {
            $row = $this->fetchRate($code, null);
            if ($row['available'] && $row['rate'] > 0) {
                $rates[$code] = $row['rate'];
            }
        }

        if ($rates !== []) {
            Storage::disk('local')->put('rbi_reference_rates.json', json_encode([
                'updated_at' => date('Y-m-d'),
                'rates' => $rates,
                'note' => 'Auto-synced from RBI / market sources',
            ], JSON_PRETTY_PRINT));
        }

        return $rates;
    }

    private function fetchRate(string $code, ?string $date): array
    {
        $labels = self::RBI_CURRENCY_NAMES[$code];
        $primaryLabel = $labels[0];

        try {
            foreach ($this->rbiHtmlSources($date) as $html) {
                $parsed = $this->parseRateFromHtml($html, $labels);
                if ($parsed !== null) {
                    return [
                        'currency' => $code,
                        'rate' => $parsed['rate'],
                        'rate_date' => $parsed['rate_date'] ?? $date ?? date('Y-m-d'),
                        'source' => 'rbi',
                        'label' => $primaryLabel,
                        'available' => true,
                    ];
                }
            }

            $fileRate = $this->rateFromLocalFile($code);
            if ($fileRate !== null) {
                return [
                    'currency' => $code,
                    'rate' => $fileRate['rate'],
                    'rate_date' => $fileRate['updated_at'] ?? $date ?? date('Y-m-d'),
                    'source' => 'rbi_cached',
                    'label' => $primaryLabel,
                    'available' => true,
                    'note' => 'Cached RBI snapshot (live RBI site unreachable from server).',
                ];
            }

            $ecb = $this->fetchEcbFallback($code, $date);
            if ($ecb !== null) {
                return $ecb;
            }
        } catch (\Throwable $e) {
            Log::warning('RBI reference rate fetch failed: '.$e->getMessage());
        }

        return [
            'currency' => $code,
            'rate' => null,
            'rate_date' => $date,
            'source' => 'rbi',
            'label' => $primaryLabel,
            'available' => false,
            'message' => 'Unable to fetch RBI reference rate right now. Enter the rate manually.',
        ];
    }

    /** @return iterable<string> */
    private function rbiHtmlSources(?string $date): iterable
    {
        $urls = [
            'https://www.rbi.org.in/Scripts/BS_ViewReferenceRate.aspx',
            'https://www.rbi.org.in/scripts/BS_ViewReferenceRate.aspx',
            'https://www.rbi.org.in/Scripts/Referenceratearchive.aspx',
        ];

        if ($date) {
            try {
                $formatted = \Carbon\Carbon::parse($date)->format('d/m/Y');
                $urls[] = 'https://www.rbi.org.in/Scripts/ReferenceRateArchive.aspx?date='.$formatted;
            } catch (\Throwable) {
                // ignore bad date
            }
        }

        foreach ($urls as $url) {
            try {
                $response = Http::timeout(20)
                    ->withOptions(['verify' => true])
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (compatible; VouchEx/1.0; +https://vouchex.kuhu.org.in)',
                        'Accept' => 'text/html,application/xhtml+xml',
                    ])
                    ->get($url);

                if ($response->successful() && strlen($response->body()) > 200) {
                    yield $response->body();
                }
            } catch (\Throwable $e) {
                Log::debug('RBI URL failed '.$url.': '.$e->getMessage());
            }
        }
    }

    /** @param array<int, string> $labels */
    private function parseRateFromHtml(string $html, array $labels): ?array
    {
        foreach ($labels as $label) {
            $variants = [
                $label,
                str_replace('.', '', $label),
                str_replace('U.S.', 'US', $label),
                str_replace('U.K.', 'UK', $label),
            ];

            foreach ($variants as $variant) {
                $normalized = html_entity_decode(strip_tags(str_replace(['<br>', '<br/>', '<br />', '</td>', '</tr>'], ' ', $html)));
                $pattern = '/'.preg_quote($variant, '/').'[^0-9]{0,40}([\d,]+\.\d{2,6})/i';
                if (preg_match($pattern, $normalized, $m)) {
                    $rate = (float) str_replace(',', '', $m[1]);
                    if ($rate > 0) {
                        return ['rate' => round($rate, 6)];
                    }
                }
            }
        }

        if (preg_match_all('/<tr[^>]*>(.*?)<\/tr>/is', $html, $rows)) {
            foreach ($rows[1] as $row) {
                $rowText = strip_tags($row);
                foreach ($labels as $label) {
                    if (stripos($rowText, $label) === false && stripos($rowText, str_replace('.', '', $label)) === false) {
                        continue;
                    }
                    if (preg_match('/([\d,]+\.\d{2,6})/', $rowText, $m)) {
                        $rate = (float) str_replace(',', '', $m[1]);
                        if ($rate > 0) {
                            return ['rate' => round($rate, 6)];
                        }
                    }
                }
            }
        }

        return null;
    }

    /** @return array{rate: float, updated_at?: string}|null */
    private function rateFromLocalFile(string $code): ?array
    {
        if (! Storage::disk('local')->exists('rbi_reference_rates.json')) {
            return null;
        }

        try {
            $json = json_decode(Storage::disk('local')->get('rbi_reference_rates.json'), true);
            $rate = $json['rates'][$code] ?? null;
            if ($rate && (float) $rate > 0) {
                return [
                    'rate' => round((float) $rate, 6),
                    'updated_at' => $json['updated_at'] ?? null,
                ];
            }
        } catch (\Throwable) {
            return null;
        }

        return null;
    }

    private function fetchEcbFallback(string $code, ?string $date): ?array
    {
        try {
            $day = $date ?: date('Y-m-d');
            $url = "https://api.frankfurter.app/{$day}?from={$code}&to=INR";
            $response = Http::timeout(12)->get($url);
            if (! $response->successful()) {
                return null;
            }
            $data = $response->json();
            $rate = $data['rates']['INR'] ?? null;
            if (! $rate || (float) $rate <= 0) {
                return null;
            }

            return [
                'currency' => $code,
                'rate' => round((float) $rate, 6),
                'rate_date' => $data['date'] ?? $day,
                'source' => 'ecb_market',
                'label' => self::RBI_CURRENCY_NAMES[$code][0],
                'available' => true,
                'note' => 'Market reference rate (ECB). Verify against RBI reference rate for GST filing.',
            ];
        } catch (\Throwable) {
            return null;
        }
    }
}
