<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\LoginLog;

class LogRetentionService
{
    public const LOGIN_MAX = 10;

    public const AUDIT_MAX = 20;

    public function pruneLoginLogs(): void
    {
        $keepIds = LoginLog::query()->orderByDesc('id')->limit(self::LOGIN_MAX)->pluck('id');
        if ($keepIds->isEmpty()) {
            return;
        }
        LoginLog::query()->whereNotIn('id', $keepIds)->delete();
    }

    public function pruneAuditLogs(): void
    {
        $keepIds = AuditLog::query()->orderByDesc('id')->limit(self::AUDIT_MAX)->pluck('id');
        if ($keepIds->isEmpty()) {
            return;
        }
        AuditLog::query()->whereNotIn('id', $keepIds)->delete();
    }
}
