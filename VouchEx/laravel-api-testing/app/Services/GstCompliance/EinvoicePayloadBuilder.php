<?php

namespace App\Services\GstCompliance;

use App\Models\CompanySetting;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Services\PortalDataService;

class EinvoicePayloadBuilder
{
    /**
     * Build a NIC-style e-invoice JSON payload from portal invoice data.
     *
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public function build(Invoice $invoice, array $items, CompanySetting $company, array $options = []): array
    {
        $buyerPin = $options['buyer_pincode'] ?? '';
        $dispatchPin = $options['dispatch_pincode'] ?? ($company->pincode ?? '');

        $lineItems = [];
        $slNo = 1;
        foreach ($items as $item) {
            $qty = (float) ($item['quantity'] ?? 1);
            if ($qty <= 0) {
                $qty = 1;
            }
            $rate = (float) ($item['unit_price'] ?? $item['rate'] ?? 0);
            $taxable = (float) ($item['line_total'] ?? ($qty * $rate));
            $lineItems[] = [
                'SlNo' => (string) $slNo,
                'PrdDesc' => (string) ($item['description'] ?? 'Item'),
                'IsServc' => 'N',
                'HsnCd' => (string) ($item['hsn_sac'] ?? '9997'),
                'Qty' => $qty,
                'Unit' => (string) ($item['uqc'] ?? 'NOS'),
                'UnitPrice' => round($rate, 2),
                'TotAmt' => round($taxable, 2),
                'AssAmt' => round($taxable, 2),
                'GstRt' => (float) ($item['tax_rate_override'] ?? $item['tax_rate'] ?? 0),
                'IgstAmt' => round((float) ($item['igst'] ?? 0), 2),
                'CgstAmt' => round((float) ($item['cgst'] ?? 0), 2),
                'SgstAmt' => round((float) ($item['sgst'] ?? 0), 2),
                'TotItemVal' => round($taxable + (float) ($item['cgst'] ?? 0) + (float) ($item['sgst'] ?? 0) + (float) ($item['igst'] ?? 0), 2),
            ];
            $slNo++;
        }

        return [
            'Version' => '1.1',
            'TranDtls' => [
                'TaxSch' => 'GST',
                'SupTyp' => $options['supply_type'] ?? 'B2B',
                'RegRev' => 'N',
            ],
            'DocDtls' => [
                'Typ' => 'INV',
                'No' => $invoice->invoice_number,
                'Dt' => $invoice->issue_date?->format('d/m/Y'),
            ],
            'SellerDtls' => [
                'Gstin' => $company->gstin,
                'LglNm' => $company->name,
                'Addr1' => $company->address,
                'Loc' => $company->city,
                'Pin' => (int) preg_replace('/\D/', '', (string) ($dispatchPin ?: $company->pincode)),
                'Stcd' => $this->stateCode($company->state),
            ],
            'BuyerDtls' => [
                'Gstin' => $invoice->gstin,
                'LglNm' => $invoice->customer_name,
                'Addr1' => $invoice->billing_address,
                'Loc' => $options['buyer_city'] ?? $company->city,
                'Pin' => (int) preg_replace('/\D/', '', (string) $buyerPin),
                'Pos' => $this->stateCode($invoice->place_of_supply),
                'Stcd' => $this->stateCode($invoice->place_of_supply),
            ],
            'ValDtls' => [
                'AssVal' => round((float) $invoice->subtotal - (float) $invoice->discount, 2),
                'CgstVal' => round((float) $invoice->cgst, 2),
                'SgstVal' => round((float) $invoice->sgst, 2),
                'IgstVal' => round((float) $invoice->igst, 2),
                'TotInvVal' => round((float) $invoice->total_amount, 2),
            ],
            'ItemList' => $lineItems,
        ];
    }

    /** @return array<int, string> */
    public function validate(Invoice $invoice, array $items, CompanySetting $company, array $options = []): array
    {
        $errors = [];
        if (! $company->gstin) {
            $errors[] = 'Company GSTIN is required in Settings → Company Profile.';
        }
        if (! $company->state) {
            $errors[] = 'Company registered state is required in Settings.';
        }
        if (! $company->pincode && empty($options['dispatch_pincode'])) {
            $errors[] = 'Company pincode or dispatch pincode is required for e-Invoice.';
        }
        if ($invoice->status === 'Cancelled') {
            $errors[] = 'Cancelled invoices cannot be registered.';
        }
        if ($invoice->einvoice_status === 'generated' && $invoice->irn) {
            $errors[] = 'This invoice already has an active IRN. Cancel it before generating a new one.';
        }
        if ($invoice->invoice_type === 'B2B' && (! $invoice->gstin || strlen((string) $invoice->gstin) < 15)) {
            $errors[] = 'Valid buyer GSTIN is required for B2B e-Invoice.';
        }
        if (! $invoice->place_of_supply) {
            $errors[] = 'Place of supply is required on the invoice.';
        }
        if (empty($options['buyer_pincode'])) {
            $errors[] = 'Buyer pincode is required when generating e-Invoice (enter in the form).';
        }
        if (count($items) === 0) {
            $errors[] = 'Invoice must have at least one line item.';
        }
        foreach ($items as $idx => $item) {
            if (empty($item['hsn_sac'])) {
                $errors[] = 'Line '.($idx + 1).': HSN/SAC is required.';
            }
        }

        return $errors;
    }

    /** @return array<int, InvoiceItem> */
    public function loadItems(Invoice $invoice): array
    {
        return InvoiceItem::query()
            ->where('invoice_id', $invoice->id)
            ->orderBy('id')
            ->get()
            ->all();
    }

    private function stateCode(?string $stateName): string
    {
        $map = [
            'Jammu and Kashmir' => '01', 'Himachal Pradesh' => '02', 'Punjab' => '03',
            'Chandigarh' => '04', 'Uttarakhand' => '05', 'Haryana' => '06', 'Delhi' => '07',
            'Rajasthan' => '08', 'Uttar Pradesh' => '09', 'Bihar' => '10', 'Sikkim' => '11',
            'Arunachal Pradesh' => '12', 'Nagaland' => '13', 'Manipur' => '14', 'Mizoram' => '15',
            'Tripura' => '16', 'Meghalaya' => '17', 'Assam' => '18', 'West Bengal' => '19',
            'Jharkhand' => '20', 'Odisha' => '21', 'Chhattisgarh' => '22', 'Madhya Pradesh' => '23',
            'Gujarat' => '24', 'Maharashtra' => '27', 'Karnataka' => '29', 'Goa' => '30',
            'Kerala' => '32', 'Tamil Nadu' => '33', 'Puducherry' => '34', 'Telangana' => '36',
            'Andhra Pradesh' => '37', 'Ladakh' => '38',
        ];
        $name = trim((string) $stateName);

        return $map[$name] ?? '24';
    }
}
