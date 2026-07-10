<?php

namespace App\Services\GstCompliance;

use App\Models\CompanySetting;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class EinvoiceService
{
    public function __construct(
        private EinvoicePayloadBuilder $builder,
        private GstApiTransport $transport,
    ) {}

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public function generate(Invoice $invoice, CompanySetting $company, array $options, User $user): array
    {
        $settings = GstComplianceSettings::get($company);
        if (! ($settings['einvoice_enabled'] ?? false)) {
            throw new \RuntimeException('E-Invoice is not enabled for this company. Turn it on in Settings → GST Compliance.');
        }

        $items = $this->builder->loadItems($invoice);
        $itemArrays = array_map(fn ($i) => $i->toArray(), $items);
        $errors = $this->builder->validate($invoice, $itemArrays, $company, $options);
        if ($errors !== []) {
            throw new \RuntimeException(implode("\n", $errors));
        }

        $payload = $this->builder->build($invoice, $itemArrays, $company, $options);
        $apiMode = $settings['api_mode'] ?? 'sandbox';
        $channel = $settings['einvoice'] ?? [];

        return DB::transaction(function () use ($invoice, $payload, $channel, $apiMode, $user) {
            $invoice->einvoice_status = 'pending';
            $invoice->einvoice_error = null;
            $invoice->save();

            try {
                $response = $this->transport->post('/einvoice/generate', $channel, $payload, $apiMode);
                $irn = $response['irn'] ?? $response['Irn'] ?? null;
                if (! $irn) {
                    throw new \RuntimeException('API response did not include an IRN.');
                }

                $invoice->update([
                    'irn' => $irn,
                    'ack_no' => (string) ($response['ackNo'] ?? $response['AckNo'] ?? ''),
                    'ack_date' => now(),
                    'einvoice_qr' => (string) ($response['signedQRCode'] ?? $response['SignedQRCode'] ?? ''),
                    'einvoice_status' => 'generated',
                    'einvoice_error' => null,
                    'einvoice_generated_at' => now(),
                ]);

                return [
                    'success' => true,
                    'invoice' => $invoice->fresh()->toArray(),
                    'mode' => $response['mode'] ?? $apiMode,
                    'irn' => $irn,
                ];
            } catch (\Throwable $e) {
                $invoice->update([
                    'einvoice_status' => 'failed',
                    'einvoice_error' => $e->getMessage(),
                ]);
                throw $e;
            }
        });
    }

    public function cancel(Invoice $invoice, CompanySetting $company, string $reason, User $user): array
    {
        $settings = GstComplianceSettings::get($company);
        if (! ($settings['einvoice_enabled'] ?? false)) {
            throw new \RuntimeException('E-Invoice is not enabled for this company.');
        }
        if (! $invoice->irn || $invoice->einvoice_status !== 'generated') {
            throw new \RuntimeException('No active IRN to cancel on this invoice.');
        }

        $apiMode = $settings['api_mode'] ?? 'sandbox';
        $channel = $settings['einvoice'] ?? [];
        $payload = [
            'irn' => $invoice->irn,
            'reason' => $reason ?: 'Data entry mistake',
            'remark' => $reason ?: 'Cancelled from VouchEx portal',
        ];

        $this->transport->post('/einvoice/cancel', $channel, $payload, $apiMode);

        $invoice->update([
            'einvoice_status' => 'cancelled',
            'einvoice_cancelled_at' => now(),
            'einvoice_qr' => null,
        ]);

        return ['success' => true, 'invoice' => $invoice->fresh()->toArray()];
    }
}
