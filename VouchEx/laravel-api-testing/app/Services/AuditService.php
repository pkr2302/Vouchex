<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Services\LogRetentionService;
use App\Support\TenantContext;

class AuditService
{
    public function __construct(private LogRetentionService $logRetention) {}

    public function log(?User $user, string $action, string $target, string $details): AuditLog
    {
        $entry = AuditLog::create([
            'company_id' => TenantContext::getCompanyId(),
            'user_id' => $user?->id,
            'user_name' => $user?->name,
            'action' => $action,
            'target' => $target,
            'details' => $details,
            'logged_at' => now(),
        ]);

        try {
            $this->logRetention->pruneAuditLogs();
        } catch (\Throwable) {
            // Non-blocking retention trim.
        }

        return $entry;
    }
}
