<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\SubscriptionPayment;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function __construct(private SubscriptionService $subscriptions) {}

    public function plans(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'plans' => $this->subscriptions->planCatalog(),
            'payment' => [
                'upi_vpa' => config('services.vouchex.upi_vpa'),
                'upi_payee_name' => config('services.vouchex.upi_payee_name'),
                'upi_qr_url' => config('services.vouchex.upi_qr_url'),
                'support_email' => config('services.vouchex.support_email'),
            ],
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $company = $user->company_id ? Company::find($user->company_id) : null;

        return response()->json([
            'success' => true,
            'account' => $this->subscriptions->accountPayload($user, $company),
            'pending_payment' => $company
                ? SubscriptionPayment::where('company_id', $company->id)->where('status', 'pending')->latest()->first()
                : null,
        ]);
    }

    public function submitPayment(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->company_id) {
            return response()->json(['message' => 'No company linked to this account.'], 422);
        }

        $data = $request->validate([
            'plan' => 'required|in:monthly,quarterly,yearly',
            'payment_reference' => 'required|string|min:6|max:100',
            'notes' => 'nullable|string|max:500',
        ]);

        $company = Company::findOrFail($user->company_id);

        try {
            $payment = $this->subscriptions->submitPaymentClaim(
                $user,
                $company,
                $data['plan'],
                trim($data['payment_reference']),
                isset($data['notes']) ? trim($data['notes']) : null
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['success' => true, 'payment' => $payment], 201);
    }

    public function listPendingPayments(Request $request): JsonResponse
    {
        if (! $request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $rows = SubscriptionPayment::with(['company:id,name', 'user:id,name,email'])
            ->where('status', 'pending')
            ->orderByDesc('id')
            ->get();

        return response()->json(['success' => true, 'payments' => $rows]);
    }

    public function approvePayment(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $payment = SubscriptionPayment::findOrFail($id);

        try {
            $this->subscriptions->approvePayment($payment, $request->user());
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['success' => true]);
    }

    public function rejectPayment(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate(['notes' => 'nullable|string|max:500']);
        $payment = SubscriptionPayment::findOrFail($id);

        try {
            $this->subscriptions->rejectPayment($payment, $request->user(), $data['notes'] ?? null);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['success' => true]);
    }
}
