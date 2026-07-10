<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class PublicConfigController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'google_client_id' => config('services.google.client_id'),
            'trial_days' => 30,
            'plans' => app(\App\Services\SubscriptionService::class)->planCatalog(),
            'payment' => [
                'upi_vpa' => config('services.vouchex.upi_vpa'),
                'upi_payee_name' => config('services.vouchex.upi_payee_name'),
                'upi_qr_url' => config('services.vouchex.upi_qr_url'),
                'support_email' => config('services.vouchex.support_email'),
            ],
        ]);
    }
}
