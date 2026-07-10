<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EwayBill;
use App\Models\Invoice;
use App\Services\GstCompliance\EinvoiceService;
use App\Services\GstCompliance\EwayBillService;
use App\Services\GstCompliance\GstComplianceSettings;
use App\Services\PortalDataService;
use App\Support\ApiErrorResponse;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GstComplianceController extends Controller
{
    public function __construct(
        private EinvoiceService $einvoice,
        private EwayBillService $ewayBill,
    ) {}

    public function showSettings(): JsonResponse
    {
        $company = PortalDataService::companyRecord();

        return response()->json([
            'success' => true,
            'gst_compliance' => GstComplianceSettings::forFrontend($company),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Only administrators can update GST compliance settings.'], 403);
        }

        $data = $request->validate([
            'einvoice_enabled' => 'boolean',
            'ewaybill_enabled' => 'boolean',
            'api_mode' => 'nullable|in:sandbox,production',
            'provider_label' => 'nullable|string|max:120',
            'einvoice' => 'nullable|array',
            'einvoice.api_url' => 'nullable|string|max:500',
            'einvoice.auth_type' => 'nullable|in:bearer,basic,api_key,none',
            'einvoice.client_id' => 'nullable|string|max:255',
            'einvoice.client_secret' => 'nullable|string|max:500',
            'einvoice.username' => 'nullable|string|max:255',
            'einvoice.password' => 'nullable|string|max:255',
            'ewaybill' => 'nullable|array',
            'ewaybill.api_url' => 'nullable|string|max:500',
            'ewaybill.auth_type' => 'nullable|in:bearer,basic,api_key,none',
            'ewaybill.client_id' => 'nullable|string|max:255',
            'ewaybill.client_secret' => 'nullable|string|max:500',
            'ewaybill.username' => 'nullable|string|max:255',
            'ewaybill.password' => 'nullable|string|max:255',
        ]);

        $company = PortalDataService::companyRecord();
        $saved = GstComplianceSettings::save($company, $data);

        return response()->json([
            'success' => true,
            'gst_compliance' => $saved,
            'companyDetails' => array_merge(
                PortalDataService::formatCompanyDetails($company->fresh()),
                ['gst_compliance' => $saved]
            ),
        ]);
    }

    public function generateEinvoice(Request $request, int $id): JsonResponse
    {
        try {
            $invoice = $this->findInvoice($id);
            $company = PortalDataService::companyRecord();
            $options = $request->validate([
                'buyer_pincode' => 'required|string|max:10',
                'buyer_city' => 'nullable|string|max:100',
                'dispatch_pincode' => 'nullable|string|max:10',
                'supply_type' => 'nullable|string|max:32',
            ]);

            $result = $this->einvoice->generate($invoice, $company, $options, $request->user());

            return response()->json($result);
        } catch (\Throwable $e) {
            report($e);

            return ApiErrorResponse::fromThrowable($e, $request);
        }
    }

    public function cancelEinvoice(Request $request, int $id): JsonResponse
    {
        try {
            $invoice = $this->findInvoice($id);
            $company = PortalDataService::companyRecord();
            $data = $request->validate(['reason' => 'nullable|string|max:255']);
            $result = $this->einvoice->cancel($invoice, $company, $data['reason'] ?? '', $request->user());

            return response()->json($result);
        } catch (\Throwable $e) {
            report($e);

            return ApiErrorResponse::fromThrowable($e, $request);
        }
    }

    public function generateEwayBill(Request $request, int $id): JsonResponse
    {
        try {
            $invoice = $this->findInvoice($id);
            $company = PortalDataService::companyRecord();
            $options = $request->validate([
                'supply_type' => 'nullable|string|max:32',
                'sub_supply_type' => 'nullable|string|max:32',
                'document_type' => 'nullable|string|max:32',
                'transport_mode' => 'required|string|max:16',
                'vehicle_no' => 'nullable|string|max:32',
                'transporter_name' => 'nullable|string|max:255',
                'transporter_gstin' => 'nullable|string|max:15',
                'distance_km' => 'nullable|integer|min:0|max:4000',
                'from_pincode' => 'nullable|string|max:10',
                'to_pincode' => 'required|string|max:10',
            ]);

            $result = $this->ewayBill->generate($invoice, $company, $options, $request->user());

            return response()->json($result);
        } catch (\Throwable $e) {
            report($e);

            return ApiErrorResponse::fromThrowable($e, $request);
        }
    }

    public function listEwayBills(): JsonResponse
    {
        $bills = EwayBill::query()->orderByDesc('id')->get();

        return response()->json(['success' => true, 'eway_bills' => $bills]);
    }

    private function findInvoice(int $id): Invoice
    {
        $companyId = TenantContext::getCompanyId();
        $invoice = Invoice::query()->where('id', $id)->where('company_id', $companyId)->first();
        if (! $invoice) {
            throw new \RuntimeException('Invoice not found.');
        }

        return $invoice;
    }
}
