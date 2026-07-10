<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\GlAccount;
use App\Models\Vendor;
use App\Services\PortalDataService;
use App\Support\TenantContext;

class GlNotesReportingService
{
    public function __construct(
        private GlReportingService $gl,
        private GlOperationalReportingService $operational,
    ) {}

    /**
     * Notes to accounts — party and ledger drill-down for disclosure schedules.
     *
     * @return array<string, mixed>
     */
    public function notesToAccounts(?string $fromDate = null, ?string $toDate = null, ?string $asOfDate = null): array
    {
        $companyId = (int) TenantContext::getCompanyId();
        $asOf = $asOfDate ?: $toDate;
        $tb = $this->gl->trialBalance($fromDate, $asOf);
        $balanceByAccountId = [];
        foreach ($tb['rows'] as $row) {
            if (! empty($row['gl_account_id'])) {
                $balanceByAccountId[(int) $row['gl_account_id']] = $row;
            }
        }

        $framework = PortalDataService::companyRecord()->accounting_framework ?? 'AS';
        $presentation = GlGroupedReportingService::frameworkPresentation($framework);

        return [
            ...$presentation,
            'from' => $fromDate,
            'to' => $toDate,
            'as_of' => $tb['as_of'],
            'sections' => [
                $this->tradeReceivablesSection($companyId, $balanceByAccountId),
                $this->tradePayablesSection($companyId, $balanceByAccountId),
                $this->cashAndBankSection($asOf),
                $this->taxBalancesSection($balanceByAccountId),
                $this->unmappedLedgersSection($companyId, $balanceByAccountId),
            ],
        ];
    }

    /** @param  array<int, array>  $balanceByAccountId */
    private function tradeReceivablesSection(int $companyId, array $balanceByAccountId): array
    {
        $rows = [];
        $total = 0.0;

        $accounts = GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('account_group', 'customer')
            ->orderBy('code')
            ->get();

        foreach ($accounts as $acct) {
            $bal = $balanceByAccountId[$acct->id] ?? null;
            if (! $bal || abs((float) $bal['balance']) < 0.001) {
                continue;
            }
            $customer = $acct->ref_id ? Customer::withoutGlobalScopes()->find($acct->ref_id) : null;
            $amount = round((float) $bal['balance'], 2);
            $total += $amount;
            $rows[] = [
                'party_type' => 'customer',
                'party_id' => $customer?->id,
                'party_name' => $customer?->name ?? $acct->name,
                'gl_account_id' => $acct->id,
                'account_code' => $acct->code,
                'account_name' => $acct->name,
                'balance' => $amount,
            ];
        }

        return [
            'id' => 'trade_receivables',
            'title' => 'Note — Trade Receivables (Debtors)',
            'description' => 'Party-wise balances of customer receivable ledgers as per the general ledger.',
            'rows' => $rows,
            'total' => round($total, 2),
        ];
    }

    /** @param  array<int, array>  $balanceByAccountId */
    private function tradePayablesSection(int $companyId, array $balanceByAccountId): array
    {
        $rows = [];
        $total = 0.0;

        $accounts = GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('account_group', 'vendor')
            ->orderBy('code')
            ->get();

        foreach ($accounts as $acct) {
            $bal = $balanceByAccountId[$acct->id] ?? null;
            if (! $bal || abs((float) $bal['balance']) < 0.001) {
                continue;
            }
            $vendor = $acct->ref_id ? Vendor::withoutGlobalScopes()->find($acct->ref_id) : null;
            $amount = round(abs((float) $bal['balance']), 2);
            $total += $amount;
            $rows[] = [
                'party_type' => 'vendor',
                'party_id' => $vendor?->id,
                'party_name' => $vendor?->name ?? $acct->name,
                'gl_account_id' => $acct->id,
                'account_code' => $acct->code,
                'account_name' => $acct->name,
                'balance' => $amount,
            ];
        }

        return [
            'id' => 'trade_payables',
            'title' => 'Note — Trade Payables (Creditors)',
            'description' => 'Party-wise balances of vendor payable ledgers as per the general ledger.',
            'rows' => $rows,
            'total' => round($total, 2),
        ];
    }

    private function cashAndBankSection(?string $asOf): array
    {
        $summary = $this->operational->cashBankSummary($asOf);
        $rows = array_map(fn ($r) => [
            'ledger_kind' => $r['ledger_kind'],
            'account_code' => $r['account_code'],
            'account_name' => $r['account_name'],
            'balance' => $r['balance'],
            'gl_account_id' => $r['gl_account_id'],
        ], $summary['rows'] ?? []);

        return [
            'id' => 'cash_and_bank',
            'title' => 'Note — Cash & Bank Balances',
            'description' => 'Ledger-wise cash and bank balances including opening balances and all posted vouchers.',
            'rows' => $rows,
            'total' => round((float) ($summary['totals']['combined'] ?? 0), 2),
            'totals' => $summary['totals'] ?? [],
        ];
    }

    /** @param  array<int, array>  $balanceByAccountId */
    private function taxBalancesSection(array $balanceByAccountId): array
    {
        $rows = [];
        $total = 0.0;

        foreach ($balanceByAccountId as $bal) {
            $code = (string) ($bal['account_code'] ?? '');
            if (! str_starts_with($code, 'SYS-GST') && ! str_starts_with($code, 'SYS-TDS')) {
                continue;
            }
            if (abs((float) $bal['balance']) < 0.001) {
                continue;
            }
            $amount = round((float) $bal['balance'], 2);
            $total += $amount;
            $rows[] = [
                'gl_account_id' => $bal['gl_account_id'] ?? null,
                'account_code' => $code,
                'account_name' => $bal['account_name'],
                'balance' => $amount,
            ];
        }

        usort($rows, fn ($a, $b) => strcmp($a['account_code'], $b['account_code']));

        return [
            'id' => 'tax_balances',
            'title' => 'Note — GST / TDS Ledger Balances',
            'description' => 'System tax control accounts with non-zero balances.',
            'rows' => $rows,
            'total' => round($total, 2),
        ];
    }

    /** @param  array<int, array>  $balanceByAccountId */
    private function unmappedLedgersSection(int $companyId, array $balanceByAccountId): array
    {
        $mappedIds = GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->whereNotNull('report_group_id')
            ->pluck('id')
            ->all();
        $mappedSet = array_flip($mappedIds);

        $rows = [];
        $total = 0.0;
        foreach ($balanceByAccountId as $id => $bal) {
            if (isset($mappedSet[$id])) {
                continue;
            }
            if (abs((float) $bal['debit']) < 0.001 && abs((float) $bal['credit']) < 0.001) {
                continue;
            }
            $amount = round((float) $bal['balance'], 2);
            $total += abs($amount);
            $rows[] = [
                'gl_account_id' => $id,
                'account_code' => $bal['account_code'],
                'account_name' => $bal['account_name'],
                'account_type' => $bal['account_type'],
                'debit' => $bal['debit'],
                'credit' => $bal['credit'],
                'balance' => $amount,
            ];
        }

        usort($rows, fn ($a, $b) => strcmp($a['account_code'], $b['account_code']));

        return [
            'id' => 'unmapped_ledgers',
            'title' => 'Note — Unmapped Ledgers',
            'description' => 'Ledgers not assigned to any report group — assign them in Chart of Accounts → Report Groupings.',
            'rows' => $rows,
            'total' => round($total, 2),
        ];
    }
}
