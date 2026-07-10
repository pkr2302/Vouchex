<?php

namespace App\Services;

use App\Models\SyncEvent;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;

class SyncService
{
    public function bump(string $collection, string $action, ?int $recordId = null, ?int $userId = null): void
    {
        $companyId = TenantContext::getCompanyId();
        if (!$companyId) {
            return;
        }

        SyncEvent::create([
            'company_id' => $companyId,
            'collection' => $collection,
            'action' => $action,
            'record_id' => $recordId,
            'user_id' => $userId,
        ]);
    }

    public function changesSince(?string $sinceIso): array
    {
        $companyId = TenantContext::getCompanyId();
        $query = SyncEvent::query()->where('company_id', $companyId)->orderBy('id');

        if ($sinceIso) {
            $query->where('created_at', '>', $sinceIso);
        }

        $events = $query->get(['id', 'collection', 'action', 'record_id', 'created_at']);
        $version = (int) SyncEvent::query()->where('company_id', $companyId)->max('id');

        return [
            'version' => $version,
            'has_changes' => $events->isNotEmpty(),
            'collections' => $events->pluck('collection')->unique()->values()->all(),
            'events' => $events,
        ];
    }
}
