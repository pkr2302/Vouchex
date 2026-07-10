<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function __construct(private SyncService $sync) {}

    public function changes(Request $request): JsonResponse
    {
        $since = $request->query('since');

        return response()->json($this->sync->changesSince($since));
    }
}
