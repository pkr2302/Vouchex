<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentLock;
use App\Services\SyncService;
use App\Support\TenantContext;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentLockController extends Controller
{
    public function __construct(private SyncService $sync) {}

    public function check(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document_type' => 'required|string|max:64',
            'document_key' => 'required|string|max:128',
        ]);

        $this->purgeExpired();
        $companyId = TenantContext::getCompanyId();

        $lock = DocumentLock::where('company_id', $companyId)
            ->where('document_type', $data['document_type'])
            ->where('document_key', $data['document_key'])
            ->first();

        if (!$lock) {
            return response()->json(['locked' => false]);
        }

        return response()->json([
            'locked' => true,
            'lock' => [
                'id' => $lock->id,
                'user_id' => $lock->user_id,
                'user_name' => $lock->user_name,
                'document_type' => $lock->document_type,
                'document_key' => $lock->document_key,
                'expires_at' => $lock->expires_at->toIso8601String(),
            ],
        ]);
    }

    public function acquire(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document_type' => 'required|string|max:64',
            'document_key' => 'required|string|max:128',
        ]);

        $user = $request->user();
        $companyId = TenantContext::getCompanyId();
        $this->purgeExpired();

        $existing = DocumentLock::where('company_id', $companyId)
            ->where('document_type', $data['document_type'])
            ->where('document_key', $data['document_key'])
            ->first();

        if ($existing && $existing->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'locked' => true,
                'message' => "User {$existing->user_name} is currently editing this document.",
                'lock' => [
                    'user_name' => $existing->user_name,
                    'user_id' => $existing->user_id,
                ],
            ], 423);
        }

        $ttl = (int) config('portal.document_lock_ttl_minutes', 15);
        $lock = DocumentLock::updateOrCreate(
            [
                'company_id' => $companyId,
                'document_type' => $data['document_type'],
                'document_key' => $data['document_key'],
            ],
            [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'locked_at' => now(),
                'expires_at' => now()->addMinutes($ttl),
            ]
        );

        $this->sync->bump('locks', 'acquire', $lock->id, $user->id);

        return response()->json(['success' => true, 'lock_id' => $lock->id]);
    }

    public function release(Request $request, int $id): JsonResponse
    {
        $lock = DocumentLock::findOrFail($id);
        $user = $request->user();

        if ($lock->user_id !== $user->id && !$user->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $lock->delete();
        $this->sync->bump('locks', 'release', $id, $user->id);

        return response()->json(['success' => true]);
    }

    private function purgeExpired(): void
    {
        DocumentLock::where('expires_at', '<', Carbon::now())->delete();
    }
}
