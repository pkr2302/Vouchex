<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\CompanySetting;
use App\Services\CompanyBackupMailService;
use App\Services\CompanyBackupService;
use App\Support\ApiErrorResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CompanyBackupController extends Controller
{
    public function __construct(
        private CompanyBackupService $backups,
        private CompanyBackupMailService $backupMailer,
    ) {}

    public function download(Request $request): StreamedResponse|JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Only the portal super admin can download company backups.'], 403);
        }

        $companyId = (int) $request->header('X-Company-Id');
        if ($companyId < 1) {
            return ApiErrorResponse::manual(
                'No company selected.',
                422,
                'Choose a company from the header dropdown before downloading a backup.',
                'Select the company to back up, then try again.',
                'company_context'
            );
        }

        if (!Company::where('id', $companyId)->where('is_active', true)->exists()) {
            return response()->json(['message' => 'Company not found.'], 404);
        }

        $settings = CompanySetting::withoutGlobalScopes()->where('company_id', $companyId)->first();
        $companyName = $settings?->name ?: Company::find($companyId)?->name ?: 'Company';
        $filename = CompanyBackupService::filenameFor($companyName);
        $json = $this->backups->toJson($companyId);

        return response()->streamDownload(
            static function () use ($json) {
                echo $json;
            },
            $filename,
            [
                'Content-Type' => 'application/json',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ]
        );
    }

    public function restore(Request $request): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Only the portal super admin can restore company backups.'], 403);
        }

        $companyId = (int) $request->header('X-Company-Id');
        if ($companyId < 1) {
            return ApiErrorResponse::manual(
                'No company selected.',
                422,
                'Choose the company to restore in the header dropdown first.',
                'Select the target company, then upload the backup file.',
                'company_context'
            );
        }

        $request->validate([
            'backup' => 'required|file|max:51200',
            'confirm' => 'required|in:RESTORE',
        ]);

        $raw = file_get_contents($request->file('backup')->getRealPath());
        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            return response()->json(['message' => 'Invalid backup file: must be valid JSON.'], 422);
        }

        try {
            $this->backups->restore($companyId, $payload);
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => $e->getMessage() ?: 'Restore failed.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Company data restored from backup. Reloading portal data is recommended.',
            'company_id' => $companyId,
            'restored_at' => now()->toIso8601String(),
        ]);
    }

    public function emailStatus(Request $request): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Only the portal super admin can view backup email status.'], 403);
        }

        return response()->json($this->backupMailer->status());
    }

    public function sendEmailNow(Request $request): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Only the portal super admin can send backup emails.'], 403);
        }

        $result = $this->backupMailer->sendDailyBackups(manual: true);

        return response()->json($result, $result['ok'] ? 200 : 422);
    }
}
