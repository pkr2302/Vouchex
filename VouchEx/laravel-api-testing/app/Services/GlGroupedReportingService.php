<?php

namespace App\Services;

use App\Models\GlAccount;
use App\Models\ReportGroup;
use App\Support\TenantContext;

class GlGroupedReportingService
{
    public function __construct(
        private GlReportingService $flat,
    ) {}

    /**
     * AS vs Ind AS presentation metadata for financial statement responses.
     *
     * @return array{
     *   accounting_framework: string,
     *   presentation_standard: string,
     *   framework_label: string,
     *   schedule_division: string,
     *   report_titles: array<string, string>
     * }
     */
    public static function frameworkPresentation(?string $framework = null): array
    {
        $fw = $framework ?: (PortalDataService::companyRecord()->accounting_framework ?? 'AS');
        $indAs = strtoupper($fw) === 'IND_AS';

        return [
            'accounting_framework' => $fw,
            'presentation_standard' => $indAs ? 'IND_AS' : 'AS',
            'framework_label' => $indAs
                ? 'Ind AS — Indian Accounting Standards (Schedule III, Division II)'
                : 'AS — Accounting Standards (Schedule III, Division I)',
            'schedule_division' => $indAs ? 'Division II' : 'Division I',
            'report_titles' => [
                'trial_balance' => 'Trial Balance',
                'profit_and_loss' => $indAs
                    ? 'Statement of Profit and Loss (Ind AS)'
                    : 'Statement of Profit and Loss',
                'balance_sheet' => $indAs
                    ? 'Balance Sheet (Ind AS)'
                    : 'Balance Sheet',
                'notes_to_accounts' => 'Notes to Accounts',
            ],
        ];
    }

    /**
     * @return array{
     *   groups: list<array>,
     *   unmapped: list<array>,
     *   totals: array{debit: float, credit: float},
     *   as_of: string,
     *   detail: string,
     *   accounting_framework: string
     * }
     */
    public function groupedTrialBalance(?string $fromDate = null, ?string $toDate = null, string $detail = 'condensed'): array
    {
        $companyId = (int) TenantContext::getCompanyId();
        $tb = $this->flat->trialBalance($fromDate, $toDate);
        $balances = $this->accountBalancesFromTb($tb['rows']);

        $groups = ReportGroup::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $byParent = $groups->groupBy(fn ($g) => (string) ($g->parent_id ?? 'root'));
        $tree = $this->buildTreeNodes($byParent, 'root', $balances, $detail === 'detailed');

        $mappedSet = array_flip(
            GlAccount::withoutGlobalScopes()
                ->where('company_id', $companyId)
                ->whereNotNull('report_group_id')
                ->pluck('id')
                ->all()
        );

        $unmapped = [];
        foreach ($balances as $accountId => $bal) {
            if (isset($mappedSet[$accountId])) {
                continue;
            }
            if (abs($bal['debit']) < 0.001 && abs($bal['credit']) < 0.001
                && abs($bal['opening_balance'] ?? 0) < 0.001 && abs($bal['closing_balance'] ?? 0) < 0.001) {
                continue;
            }
            $unmapped[] = $bal;
        }

        $framework = PortalDataService::companyRecord()->accounting_framework ?? 'AS';

        return [
            ...self::frameworkPresentation($framework),
            'groups' => $tree,
            'unmapped' => $unmapped,
            'totals' => $tb['totals'],
            'as_of' => $tb['as_of'],
            'from' => $fromDate,
            'to' => $tb['to'],
            'detail' => $detail,
        ];
    }

    public function groupedProfitAndLoss(?string $fromDate = null, ?string $toDate = null, string $detail = 'condensed'): array
    {
        $grouped = $this->groupedTrialBalance($fromDate, $toDate, $detail);
        $plRoots = $this->filterStatementGroups($grouped['groups'], 'profit_loss');
        $flat = $this->flat->profitAndLoss($fromDate, $toDate);

        return [
            ...self::frameworkPresentation($grouped['accounting_framework']),
            'groups' => $plRoots,
            'unmapped' => array_values(array_filter($grouped['unmapped'], fn ($r) => in_array($r['account_type'], ['income', 'expense'], true))),
            'total_income' => $flat['total_income'],
            'total_cogs' => $flat['total_cogs'],
            'gross_profit' => $flat['gross_profit'],
            'operating_expense' => $flat['operating_expense'],
            'total_expense' => $flat['total_expense'],
            'net_profit' => $flat['net_profit'],
            'books_start_date' => $flat['books_start_date'],
            'from' => $fromDate,
            'to' => $toDate,
            'detail' => $detail,
        ];
    }

    public function groupedBalanceSheet(?string $asOfDate = null, string $detail = 'condensed'): array
    {
        $grouped = $this->groupedTrialBalance(null, $asOfDate, $detail);
        $bsRoots = $this->filterStatementGroups($grouped['groups'], 'balance_sheet');
        $flat = $this->flat->balanceSheet($asOfDate);

        return [
            ...self::frameworkPresentation($grouped['accounting_framework']),
            'groups' => $bsRoots,
            'unmapped' => array_values(array_filter($grouped['unmapped'], fn ($r) => in_array($r['account_type'], ['asset', 'liability', 'equity'], true))),
            'totals' => $flat['totals'],
            'as_of' => $flat['as_of'],
            'detail' => $detail,
            'current_period_profit' => $this->flat->profitAndLoss(null, $asOfDate)['net_profit'],
        ];
    }

    /** @param  list<array>  $rows */
    private function accountBalancesFromTb(array $rows): array
    {
        $map = [];
        foreach ($rows as $row) {
            $id = $row['gl_account_id'] ?? null;
            if (! $id) {
                continue;
            }
            $map[$id] = $row;
        }

        return $map;
    }

    /** @param  \Illuminate\Support\Collection<string, \Illuminate\Support\Collection<int, ReportGroup>>  $byParent */
    private function buildTreeNodes($byParent, string $parentKey, array $balances, bool $detailed): array
    {
        $nodes = [];
        foreach ($byParent->get($parentKey, collect()) as $group) {
            $directAccounts = GlAccount::withoutGlobalScopes()
                ->where('report_group_id', $group->id)
                ->orderBy('code')
                ->get();

            $debit = 0;
            $credit = 0;
            $opening = 0;
            $closing = 0;
            $accounts = [];

            foreach ($directAccounts as $acct) {
                $bal = $balances[$acct->id] ?? null;
                if (! $bal) {
                    continue;
                }
                $opening += (float) ($bal['opening_balance'] ?? 0);
                $debit += (float) $bal['debit'];
                $credit += (float) $bal['credit'];
                $closing += (float) ($bal['closing_balance'] ?? $bal['balance'] ?? 0);
                if ($detailed) {
                    $accounts[] = [
                        'gl_account_id' => (int) $acct->id,
                        'account_code' => $bal['account_code'],
                        'account_name' => $bal['account_name'],
                        'opening_balance' => $bal['opening_balance'] ?? 0,
                        'debit' => $bal['debit'],
                        'credit' => $bal['credit'],
                        'closing_balance' => $bal['closing_balance'] ?? $bal['balance'] ?? 0,
                        'balance' => $bal['closing_balance'] ?? $bal['balance'] ?? 0,
                    ];
                }
            }

            $children = $this->buildTreeNodes($byParent, (string) $group->id, $balances, $detailed);
            foreach ($children as $child) {
                $opening += (float) ($child['opening_balance'] ?? 0);
                $debit += (float) $child['debit'];
                $credit += (float) $child['credit'];
                $closing += (float) ($child['closing_balance'] ?? $child['balance'] ?? 0);
            }

            $nodes[] = [
                'id' => $group->id,
                'name' => $group->name,
                'code' => $group->code,
                'statement_type' => $group->statement_type,
                'nature' => $group->nature,
                'opening_balance' => round($opening, 2),
                'debit' => round($debit, 2),
                'credit' => round($credit, 2),
                'closing_balance' => round($closing, 2),
                'balance' => round($closing, 2),
                'children' => $children,
                'accounts' => $detailed ? $accounts : [],
            ];
        }

        if (! $detailed) {
            $nodes = array_values(array_filter($nodes, function (array $node) {
                if (! empty($node['children'])) {
                    return true;
                }

                return abs($node['debit']) >= 0.001 || abs($node['credit']) >= 0.001
                    || abs($node['opening_balance'] ?? 0) >= 0.001 || abs($node['closing_balance'] ?? 0) >= 0.001;
            }));
        }

        return $nodes;
    }

    /** @param  list<array>  $groups */
    private function filterStatementGroups(array $groups, string $statementType): array
    {
        $out = [];
        foreach ($groups as $node) {
            if (($node['statement_type'] ?? '') === $statementType || $this->hasStatementDescendant($node, $statementType)) {
                $out[] = $this->pruneStatementNode($node, $statementType);
            }
        }

        return array_values(array_filter($out));
    }

    private function hasStatementDescendant(array $node, string $statementType): bool
    {
        if (($node['statement_type'] ?? '') === $statementType) {
            return true;
        }
        foreach ($node['children'] ?? [] as $child) {
            if ($this->hasStatementDescendant($child, $statementType)) {
                return true;
            }
        }

        return false;
    }

    private function pruneStatementNode(array $node, string $statementType): array
    {
        $children = [];
        foreach ($node['children'] ?? [] as $child) {
            if ($this->hasStatementDescendant($child, $statementType)) {
                $children[] = $this->pruneStatementNode($child, $statementType);
            }
        }
        $node['children'] = $children;

        return $node;
    }
}
