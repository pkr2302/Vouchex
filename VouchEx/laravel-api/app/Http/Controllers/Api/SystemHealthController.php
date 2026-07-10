<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PortalSetting;
use App\Services\SystemHealthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemHealthController extends Controller
{
    public function __construct(private SystemHealthService $health) {}

    public function show(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnlessSuperAdmin($request)) {
            return $deny;
        }

        return response()->json([
            'success' => true,
            'health' => $this->health->status(),
        ]);
    }

    public function clearCache(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnlessSuperAdmin($request)) {
            return $deny;
        }

        try {
            $result = $this->health->clearCache();
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => $e->getMessage() ?: 'Cache clear failed.'], 500);
        }

        return response()->json($result);
    }

    public function optimize(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnlessSuperAdmin($request)) {
            return $deny;
        }

        try {
            $result = $this->health->optimize();
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => $e->getMessage() ?: 'Optimize failed.'], 500);
        }

        return response()->json($result);
    }

    public function migrate(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnlessSuperAdmin($request)) {
            return $deny;
        }

        if (! $this->health->migrationsAllowed()) {
            return response()->json([
                'message' => 'Migrations are disabled in production. Set APP_ALLOW_DANGEROUS_SYSTEM=true in .env when you need to run them.',
            ], 403);
        }

        try {
            $result = $this->health->migrate();
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => $e->getMessage() ?: 'Migration failed.'], 500);
        }

        return response()->json($result);
    }

    public function updateInactivityTimeout(Request $request): JsonResponse
    {
        if ($deny = $this->denyUnlessSuperAdmin($request)) {
            return $deny;
        }

        $data = $request->validate([
            'inactivity_timeout' => 'required|integer|min:60|max:7200',
        ]);

        $row = PortalSetting::setInactivityTimeout((int) $data['inactivity_timeout']);

        return response()->json([
            'success' => true,
            'inactivity_timeout' => (int) $row->inactivity_timeout,
        ]);
    }

    private function denyUnlessSuperAdmin(Request $request): ?JsonResponse
    {
        if (! $request->user()?->isSuperAdmin()) {
            return response()->json(['message' => 'Only the portal super admin can access system health tools.'], 403);
        }

        return null;
    }
}
