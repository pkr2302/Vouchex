<?php

namespace App\Services\GstCompliance;

use App\Models\CompanySetting;
use App\Models\EwayBill;
use App\Models\Invoice;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class EwayBillService
{
    public function __construct(private GstApiTransport $transport) {}

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public function generate(Invoice $invoice, CompanySetting $company, array $options, User $user): array
    {
        $settings = GstComplianceSettings::get($company);
        if (! ($settings['ewaybill_enabled'] ?? false)) {
            throw new \RuntimeException('E-Way Bill is not enabled for this company. Turn it on in Settings → GST Compliance.');
        }

        $errors = $this->validate($invoice, $company, $options);
        if ($errors !== []) {
            throw new \RuntimeException(implode("\n", $errors));
        }

        $payload = $this->buildPayload($invoice, $company, $options);
        $apiMode = $settings['api_mode'] ?? 'sandbox';
        $channel = $settings['ewaybill'] ?? [];

        return DB::transaction(function () use ($invoice, $company, $payload, $channel, $apiMode, $options, $user) {
            $record = EwayBill::create([
                'company_id' => $company->company_id,
                'invoice_id' => $invoice->id,
                'status' => 'pending',
                'supply_type' => $options['supply_type'] ?? 'Outward',
                'sub_supply_type' => $options['sub_supply_type'] ?? 'Supply',
                'document_type' => $options['document_type'] ?? 'Tax Invoice',
                'transport_mode' => $options['transport_mode'] ?? 'Road',
                'vehicle_no' => $options['vehicle_no'] ?? null,
                'transporter_name' => $options['transporter_name'] ?? null,
                'transporter_gstin' => $options['transporter_gstin'] ?? null,
                'distance_km' => (int) ($options['distance_km'] ?? 0),
                'from_pincode' => $options['from_pincode'] ?? $company->pincode,
                'to_pincode' => $options['to_pincode'] ?? null,
                'request_payload' => $payload,
                'created_by' => $user->id,
            ]);

            try {
                $response = $this->transport->post('/ewaybill/generate', $channel, $payload, $apiMode);
                $ewbNo = (string) ($response['ewbNo'] ?? $response['ewayBillNo'] ?? '');
                if ($ewbNo === '') {
                    throw new \RuntimeException('API response did not include an e-way bill number.');
                }

                $record->update([
                    'ewb_no' => $ewbNo,
                    'ewb_date' => now(),
                    'valid_upto' => isset($response['validUpto'])
                        ? Carbon::parse($response['validUpto'])
                        : now()->addDay(),
                    'status' => 'active',
                    'response_payload' => $response,
                    'api_error' => null,
                ]);

                return [
                    'success' => true,
                    'eway_bill' => $record->fresh()->toArray(),
                    'mode' => $response['mode'] ?? $apiMode,
                ];
            } catch (\Throwable $e) {
                $record->update([
                    'status' => 'failed',
                    'api_error' => $e->getMessage(),
                ]);
                throw $e;
            }
        });
    }

    /** @return array<int, string> */
    private function validate(Invoice $invoice, CompanySetting $company, array $options): array
    {
        $errors = [];
        if (! $company->gstin) {
            $errors[] = 'Company GSTIN is required.';
        }
        if ($invoice->status === 'Cancelled') {
            $errors[] = 'Cancelled invoices cannot generate e-way bills.';
        }
        if (empty($options['to_pincode'])) {
            $errors[] = 'Consignee pincode is required.';
        }
        if (empty($options['from_pincode']) && ! $company->pincode) {
            $errors[] = 'Dispatch pincode or company pincode is required.';
        }
        if (empty($options['transport_mode'])) {
            $errors[] = 'Transport mode is required.';
        }
        if (($options['transport_mode'] ?? '') === 'Road' && empty($options['vehicle_no'])) {
            $errors[] = 'Vehicle number is required for road transport.';
        }

        return $errors;
    }

    /** @param  array<string, mixed>  $options */
    private function buildPayload(Invoice $invoice, CompanySetting $company, array $options): array
    {
        return [
            'supplyType' => $options['supply_type'] ?? 'Outward',
            'subSupplyType' => $options['sub_supply_type'] ?? 'Supply',
            'docType' => $options['document_type'] ?? 'Tax Invoice',
            'docNo' => $invoice->invoice_number,
            'docDate' => $invoice->issue_date?->format('d/m/Y'),
            'fromGstin' => $company->gstin,
            'fromPincode' => $options['from_pincode'] ?? $company->pincode,
            'toGstin' => $invoice->gstin,
            'toPincode' => $options['to_pincode'],
            'totalValue' => (float) $invoice->total_amount,
            'taxableAmount' => (float) $invoice->subtotal - (float) $invoice->discount,
            'cgst' => (float) $invoice->cgst,
            'sgst' => (float) $invoice->sgst,
            'igst' => (float) $invoice->igst,
            'transMode' => $options['transport_mode'] ?? 'Road',
            'vehicleNo' => $options['vehicle_no'] ?? '',
            'transporterName' => $options['transporter_name'] ?? '',
            'transporterGstin' => $options['transporter_gstin'] ?? '',
            'distance' => (int) ($options['distance_km'] ?? 0),
            'irn' => $invoice->irn,
        ];
    }
}
