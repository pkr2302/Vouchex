<?php

namespace App\Services;

use App\Models\GlAccount;
use App\Models\GlJournalLine;
use App\Models\ReportGroup;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;

class GlReportingService
{
    /**
     * @return array{rows: list<array>, totals: array, from: ?string, to: string}
     */
    public function trialBalance(?string $fromDate = null, ?string $toDate = null): array
    {
        $fromDate = $this->clampFromDate($fromDate);
        $to = $toDate ?? now()->format('Y-m-d');
        $companyId = (int) TenantContext::getCompanyId();

        $openingMap = $fromDate ? $this->aggregateMovements($companyId, null, $fromDate, exclusiveEnd: true) : [];
        $periodMap = $this->aggregateMovements($companyId, $fromDate, $to, exclusiveEnd: false);

        $accountIds = array_unique(array_merge(array_keys($openingMap), array_keys($periodMap)));
        $accounts = GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->whereIn('id', $accountIds)
            ->get()
            ->keyBy('id');

        $rows = [];
        $totalDebit = 0;
        $totalCredit = 0;
        $totalOpening = 0;
        $totalClosing = 0;

        foreach ($accountIds as $accountId) {
            $opening = $openingMap[$accountId] ?? ['debit' => 0, 'credit' => 0];
            $period = $periodMap[$accountId] ?? ['debit' => 0, 'credit' => 0];
            $openingBalance = round((float) $opening['debit'] - (float) $opening['credit'], 2);
            $debit = round((float) $period['debit'], 2);
            $credit = round((float) $period['credit'], 2);
            $closingBalance = round($openingBalance + $debit - $credit, 2);

            if (
                abs($openingBalance) < 0.001
                && abs($debit) < 0.001
                && abs($credit) < 0.001
                && abs($closingBalance) < 0.001
            ) {
                continue;
            }

            $account = $accounts->get($accountId);
            $meta = $period['meta'] ?? $opening['meta'] ?? null;

            $rows[] = [
                'gl_account_id' => (int) $accountId,
                'account_code' => $meta['account_code'] ?? $account?->code ?? '',
                'account_name' => $meta['account_name'] ?? $account?->name ?? '',
                'account_type' => $account?->account_type ?? 'asset',
                'report_group_id' => $account?->report_group_id,
                'opening_balance' => $openingBalance,
                'debit' => $debit,
                'credit' => $credit,
                'closing_balance' => $closingBalance,
                'balance' => $closingBalance,
            ];

            $totalDebit += $debit;
            $totalCredit += $credit;
            $totalOpening += $openingBalance;
            $totalClosing += $closingBalance;
        }

        usort($rows, fn ($a, $b) => strcmp($a['account_code'], $b['account_code']));

        return [
            'rows' => $rows,
            'totals' => [
                'opening_balance' => round($totalOpening, 2),
                'debit' => round($totalDebit, 2),
                'credit' => round($totalCredit, 2),
                'closing_balance' => round($totalClosing, 2),
            ],
            'from' => $fromDate,
            'to' => $to,
            'as_of' => $to,
        ];
    }

    /**
     * @return array<int, array{debit: float, credit: float, meta: array{account_code: string, account_name: string}}>
     */
    private function aggregateMovements(
        int $companyId,
        ?string $fromDate,
        ?string $toDate,
        bool $exclusiveEnd = false
    ): array {
        $query = GlJournalLine::query()
            ->join('gl_journals', 'gl_journals.id', '=', 'gl_journal_lines.journal_id')
            ->where('gl_journals.company_id', $companyId)
            ->select(
                'gl_journal_lines.gl_account_id',
                'gl_journal_lines.account_code',
                'gl_journal_lines.account_name',
                DB::raw('SUM(gl_journal_lines.debit) as total_debit'),
                DB::raw('SUM(gl_journal_lines.credit) as total_credit')
            )
            ->groupBy('gl_journal_lines.gl_account_id', 'gl_journal_lines.account_code', 'gl_journal_lines.account_name');

        if ($fromDate) {
            $query->where('gl_journals.journal_date', '>=', $fromDate);
        }
        if ($toDate) {
            if ($exclusiveEnd) {
                $query->where('gl_journals.journal_date', '<', $toDate);
            } else {
                $query->where('gl_journals.journal_date', '<=', $toDate);
            }
        }

        $map = [];
        foreach ($query->get() as $row) {
            $id = (int) $row->gl_account_id;
            $map[$id] = [
                'debit' => (float) $row->total_debit,
                'credit' => (float) $row->total_credit,
                'meta' => [
                    'account_code' => $row->account_code,
                    'account_name' => $row->account_name,
                ],
            ];
        }

        return $map;
    }

    /**
     * @return array{income: list<array>, expenses: list<array>, net_profit: float, from: ?string, to: ?string}
     */
    public function profitAndLoss(?string $fromDate = null, ?string $toDate = null): array
    {
        $fromDate = $this->clampFromDate($fromDate);
        $tb = $this->trialBalance($fromDate, $toDate);
        $income = [];
        $expenses = [];
        $totalIncome = 0;
        $totalExpense = 0;

        foreach ($tb['rows'] as $row) {
            $type = $row['account_type'];
            if ($type === 'income') {
                $periodNet = round((float) $row['credit'] - (float) $row['debit'], 2);
                if (abs($periodNet) > 0.001) {
                    $income[] = [
                        'gl_account_id' => $row['gl_account_id'],
                        'account_code' => $row['account_code'],
                        'account_name' => $row['account_name'],
                        'amount' => $periodNet,
                    ];
                    $totalIncome += $periodNet;
                }
            } elseif ($type === 'expense') {
                $periodNet = round((float) $row['debit'] - (float) $row['credit'], 2);
                if (abs($periodNet) > 0.001) {
                    $expenses[] = [
                        'gl_account_id' => $row['gl_account_id'],
                        'account_code' => $row['account_code'],
                        'account_name' => $row['account_name'],
                        'amount' => $periodNet,
                    ];
                    $totalExpense += $periodNet;
                }
            }
        }

        $cogsCodes = $this->cogsAccountCodes();
        $totalCogs = 0;
        foreach ($expenses as $expenseRow) {
            if (in_array($expenseRow['account_code'], $cogsCodes, true)) {
                $totalCogs += $expenseRow['amount'];
            }
        }
        $totalCogs = round($totalCogs, 2);

        return [
            'income' => $income,
            'expenses' => $expenses,
            'total_income' => round($totalIncome, 2),
            'total_cogs' => $totalCogs,
            'gross_profit' => round($totalIncome - $totalCogs, 2),
            'operating_expense' => round($totalExpense - $totalCogs, 2),
            'total_expense' => round($totalExpense, 2),
            'net_profit' => round($totalIncome - $totalExpense, 2),
            'from' => $fromDate,
            'to' => $toDate ?? $tb['to'],
            'books_start_date' => $this->booksStartDate(),
        ];
    }

    /**
     * @return array{assets: list<array>, liabilities: list<array>, equity: list<array>, totals: array}
     */
    public function balanceSheet(?string $asOfDate = null): array
    {
        $tb = $this->trialBalance(null, $asOfDate);
        $assets = [];
        $liabilities = [];
        $equity = [];
        $totals = ['assets' => 0, 'liabilities' => 0, 'equity' => 0];

        foreach ($tb['rows'] as $row) {
            $type = $row['account_type'];
            $bal = (float) $row['closing_balance'];
            $entry = [
                'gl_account_id' => $row['gl_account_id'],
                'account_code' => $row['account_code'],
                'account_name' => $row['account_name'],
                'balance' => 0,
            ];

            if ($type === 'asset') {
                $entry['balance'] = round($bal, 2);
                $assets[] = $entry;
                $totals['assets'] += $entry['balance'];
            } elseif ($type === 'liability') {
                $entry['balance'] = round(-$bal, 2);
                $liabilities[] = $entry;
                $totals['liabilities'] += $entry['balance'];
            } elseif ($type === 'equity') {
                $entry['balance'] = round(-$bal, 2);
                $equity[] = $entry;
                $totals['equity'] += $entry['balance'];
            }
        }

        $pl = $this->profitAndLoss(
            $this->financialYearStartForDate($asOfDate ?? now()->format('Y-m-d')),
            $asOfDate
        );
        $retained = $pl['net_profit'];
        if (abs($retained) > 0.001) {
            $equity[] = [
                'account_code' => 'SYS-PNL',
                'account_name' => 'Current Period Profit / (Loss)',
                'balance' => $retained,
            ];
            $totals['equity'] += $retained;
        }

        return [
            'assets' => $assets,
            'liabilities' => $liabilities,
            'equity' => $equity,
            'totals' => [
                'assets' => round($totals['assets'], 2),
                'liabilities' => round($totals['liabilities'], 2),
                'equity' => round($totals['equity'], 2),
                'liabilities_and_equity' => round($totals['liabilities'] + $totals['equity'], 2),
            ],
            'as_of' => $asOfDate ?? now()->format('Y-m-d'),
        ];
    }

    private function financialYearStartForDate(string $isoDate): string
    {
        [$y, $m] = array_map('intval', explode('-', substr($isoDate, 0, 10)));
        $startYear = $m >= 4 ? $y : $y - 1;

        return sprintf('%04d-04-01', $startYear);
    }

    private function booksStartDate(): ?string
    {
        $options = PortalDataService::companyRecord()->custom_options ?? [];

        return is_array($options) ? ($options['gl_books_start_date'] ?? null) : null;
    }

    private function clampFromDate(?string $fromDate): ?string
    {
        $booksStart = $this->booksStartDate();
        if (! $booksStart) {
            return $fromDate;
        }
        if (! $fromDate || $fromDate < $booksStart) {
            return $booksStart;
        }

        return $fromDate;
    }

    /** @return list<string> */
    private function cogsAccountCodes(): array
    {
        $companyId = (int) TenantContext::getCompanyId();
        $groupIds = ReportGroup::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('code', 'COGS')
            ->pluck('id');

        $codes = GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where(function ($q) use ($groupIds) {
                $q->where('code', 'SYS-COGS');
                if ($groupIds->isNotEmpty()) {
                    $q->orWhereIn('report_group_id', $groupIds);
                }
            })
            ->pluck('code')
            ->all();

        return array_values(array_unique($codes));
    }
}
