<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PortalDataService;
use Illuminate\Http\JsonResponse;

class PortalDataController extends Controller
{
    public function __construct(private PortalDataService $portalData) {}

    public function bootstrap(): JsonResponse
    {
        try {
            return response()->json($this->portalData->bootstrap(request()->user()));
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Server Error',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()).':'.$e->getLine(),
            ], 500);
        }
    }
}
