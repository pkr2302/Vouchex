<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Services\GlAccountService;
use App\Services\GlPostingService;
use Throwable;

trait PostsToGeneralLedger
{
    protected function glPost(callable $callback): void
    {
        try {
            $callback();
        } catch (Throwable $e) {
            report($e);
            throw $e;
        }
    }

    /** Post to GL without failing the parent voucher save. */
    protected function glPostSoft(callable $callback): void
    {
        try {
            $callback();
        } catch (Throwable $e) {
            report($e);
        }
    }

    protected function glReverse(GlPostingService $gl, string $sourceType, int $sourceId, ?int $userId): void
    {
        $this->glPost(fn () => $gl->reverseBySource($sourceType, $sourceId, $userId));
    }

    protected function glReverseSoft(GlPostingService $gl, string $sourceType, int $sourceId, ?int $userId): void
    {
        $this->glPostSoft(fn () => $gl->reverseBySource($sourceType, $sourceId, $userId));
    }

    protected function ensureGlChart(GlAccountService $accounts, int $companyId): void
    {
        $accounts->ensureCompanyChart($companyId);
    }

    protected function liveGlPost(?int $companyId, ?int $userId, callable $callback): void
    {
        if (! $companyId || ! $userId) {
            return;
        }
        $this->glPostSoft(function () use ($companyId, $userId, $callback) {
            $accounts = app(GlAccountService::class);
            $gl = app(GlPostingService::class);
            $this->ensureGlChart($accounts, $companyId);
            $callback($gl, $userId);
        });
    }

    protected function liveGlRepost(?int $companyId, ?int $userId, string $sourceType, int $sourceId, callable $callback): void
    {
        if (! $companyId || ! $userId) {
            return;
        }
        $this->glPostSoft(function () use ($companyId, $userId, $sourceType, $sourceId, $callback) {
            $accounts = app(GlAccountService::class);
            $gl = app(GlPostingService::class);
            $this->ensureGlChart($accounts, $companyId);
            $gl->reverseBySource($sourceType, $sourceId, $userId);
            $callback($gl, $userId);
        });
    }

    protected function liveGlUnpost(?int $companyId, ?int $userId, string $sourceType, int $sourceId): void
    {
        if (! $companyId || ! $userId) {
            return;
        }
        $this->glPostSoft(function () use ($companyId, $userId, $sourceType, $sourceId) {
            $accounts = app(GlAccountService::class);
            $gl = app(GlPostingService::class);
            $this->ensureGlChart($accounts, $companyId);
            $gl->reverseBySource($sourceType, $sourceId, $userId);
        });
    }
}
