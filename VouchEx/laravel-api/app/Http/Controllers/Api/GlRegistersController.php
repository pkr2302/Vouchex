<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GlRegistersReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlRegistersController extends Controller
{
    public function __construct(
        private GlRegistersReportingService $registers,
    ) {}

    public function dayBook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        return response()->json([
            'success' => true,
            'day_book' => $this->registers->dayBook($data['from'] ?? null, $data['to'] ?? null),
        ]);
    }

    public function salesRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        return response()->json([
            'success' => true,
            'sales_register' => $this->registers->salesRegister($data['from'] ?? null, $data['to'] ?? null),
        ]);
    }

    public function purchaseRegister(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        return response()->json([
            'success' => true,
            'purchase_register' => $this->registers->purchaseRegister($data['from'] ?? null, $data['to'] ?? null),
        ]);
    }

    public function ledgerAccounts(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'accounts' => $this->registers->ledgerAccounts(),
        ]);
    }
}
