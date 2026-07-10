<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RbiReferenceRateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceRateController extends Controller
{
    public function __construct(private RbiReferenceRateService $rates)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $data = $request->validate([
            'currency' => 'required|string|max:10',
            'date' => 'nullable|date',
        ]);

        $result = $this->rates->lookup(
            strtoupper($data['currency']),
            $data['date'] ?? null
        );

        return response()->json(['success' => true, 'reference' => $result]);
    }
}
