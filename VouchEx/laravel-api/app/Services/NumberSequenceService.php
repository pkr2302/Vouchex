<?php

namespace App\Services;

use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;

class NumberSequenceService
{
    /**
     * Next document number for PREFIX-YEAR-NNN (e.g. INV-2026-003).
     * Uses the highest existing sequence for this prefix/year — not row count —
     * so gaps, deletions, and seed data cannot cause duplicate numbers.
     */
    public function next(string $prefix, string $table, string $column): string
    {
        $companyId = TenantContext::getCompanyId();
        $year = now()->format('Y');
        $patternPrefix = sprintf('%s-%s-', $prefix, $year);

        $query = DB::table($table)->where($column, 'like', $patternPrefix.'%');
        if ($companyId && $this->tableHasCompanyId($table)) {
            $query->where('company_id', $companyId);
        }

        $maxSeq = 0;
        foreach ($query->pluck($column) as $existing) {
            if (preg_match('/-(\d+)$/', (string) $existing, $matches)) {
                $maxSeq = max($maxSeq, (int) $matches[1]);
            }
        }

        return sprintf('%s-%s-%03d', $prefix, $year, $maxSeq + 1);
    }

    /**
     * Suggest the next number in the dominant existing series (e.g. 0003/2026-27 → 0004/2026-27).
     */
    public function suggestNextInSeries(string $table, string $column): string
    {
        $companyId = TenantContext::getCompanyId();
        $query = DB::table($table)->whereNotNull($column)->where($column, '!=', '');
        if ($companyId && $this->tableHasCompanyId($table)) {
            $query->where('company_id', $companyId);
        }

        $nums = $query->pluck($column)->map(fn ($n) => trim((string) $n))->filter()->values()->all();
        if ($nums === []) {
            return $this->next('INV', $table, $column);
        }

        $leadingGroups = [];
        foreach ($nums as $n) {
            if (! preg_match('/^(\d+)(.+)$/', $n, $m) || $m[2] === '') {
                continue;
            }
            $suffix = $m[2];
            $val = (int) $m[1];
            if (! isset($leadingGroups[$suffix])) {
                $leadingGroups[$suffix] = ['max' => $val, 'pad' => strlen($m[1]), 'count' => 0];
            }
            $leadingGroups[$suffix]['count']++;
            if ($val > $leadingGroups[$suffix]['max']) {
                $leadingGroups[$suffix]['max'] = $val;
                $leadingGroups[$suffix]['pad'] = max($leadingGroups[$suffix]['pad'], strlen($m[1]));
            }
        }

        $best = null;
        foreach ($leadingGroups as $suffix => $g) {
            if ($best === null || $g['count'] > $best['count'] || ($g['count'] === $best['count'] && $g['max'] > $best['max'])) {
                $best = ['suffix' => $suffix, ...$g];
            }
        }
        if ($best !== null) {
            return str_pad((string) ($best['max'] + 1), $best['pad'], '0', STR_PAD_LEFT).$best['suffix'];
        }

        $trailingGroups = [];
        foreach ($nums as $n) {
            if (! preg_match('/^(.+?)(\d+)$/', $n, $m)) {
                continue;
            }
            $prefix = $m[1];
            $val = (int) $m[2];
            if (! isset($trailingGroups[$prefix])) {
                $trailingGroups[$prefix] = ['max' => $val, 'pad' => strlen($m[2]), 'count' => 0];
            }
            $trailingGroups[$prefix]['count']++;
            if ($val > $trailingGroups[$prefix]['max']) {
                $trailingGroups[$prefix]['max'] = $val;
                $trailingGroups[$prefix]['pad'] = max($trailingGroups[$prefix]['pad'], strlen($m[2]));
            }
        }

        $best = null;
        foreach ($trailingGroups as $prefix => $g) {
            if ($best === null || $g['count'] > $best['count'] || ($g['count'] === $best['count'] && $g['max'] > $best['max'])) {
                $best = ['prefix' => $prefix, ...$g];
            }
        }
        if ($best !== null) {
            return $best['prefix'].str_pad((string) ($best['max'] + 1), $best['pad'], '0', STR_PAD_LEFT);
        }

        return $this->next('INV', $table, $column);
    }

    /** Indian FY label e.g. 2026-27 from a calendar date. */
    public function indianFinancialYearLabel(?string $date = null): string
    {
        $d = $date ? \Carbon\Carbon::parse($date) : now();
        $year = (int) $d->format('Y');
        $month = (int) $d->format('n');
        if ($month >= 4) {
            $start = $year;
            $end = ($year + 1) % 100;
        } else {
            $start = $year - 1;
            $end = $year % 100;
        }

        return sprintf('%d-%02d', $start, $end);
    }

    /** Next ADV/2026-27/000001 style reference for customer advance receipts. */
    public function nextAdvanceReference(string $paymentDate): string
    {
        $companyId = TenantContext::getCompanyId();
        $fy = $this->indianFinancialYearLabel($paymentDate);
        $prefix = "ADV/{$fy}/";

        $query = DB::table('receipts')
            ->where('is_advance', true)
            ->whereNotNull('advance_reference')
            ->where('advance_reference', 'like', $prefix.'%');
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $maxSeq = 0;
        foreach ($query->pluck('advance_reference') as $existing) {
            if (preg_match('#/(\d+)$#', (string) $existing, $matches)) {
                $maxSeq = max($maxSeq, (int) $matches[1]);
            }
        }

        return $prefix.str_pad((string) ($maxSeq + 1), 6, '0', STR_PAD_LEFT);
    }

    private function tableHasCompanyId(string $table): bool
    {
        return in_array($table, [
            'invoices', 'receipts', 'expenses', 'payments',
            'credit_notes', 'debit_notes', 'gl_journals',
        ], true);
    }
}
