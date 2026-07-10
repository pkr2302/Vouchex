<?php

namespace App\Services;

use App\Models\GlAccount;
use App\Models\ReportGroup;
use App\Support\TenantContext;

class CoaAutoMapService
{
    /** @var array<string, string> account_subtype or rule key → report group code */
    private const SUBTYPE_TO_CODE = [
        'bank' => 'BB',
        'cash' => 'CCE',
        'trade_receivable' => 'TR',
        'other_receivable' => 'OCA',
        'inventory' => 'INV',
        'gst_input' => 'OCA',
        'tds_receivable' => 'OCA',
        'advance_to_supplier' => 'OCA',
        'fixed_asset' => 'PPE',
        'accumulated_depreciation' => 'PPE',
        'deposit_investment' => 'NCI',
        'prepayment' => 'OCA',
        'loan_given' => 'OCA',
        'security_deposit' => 'OCA',
        'trade_payable' => 'TP',
        'other_payable' => 'TP',
        'gst_output' => 'SD',
        'tds_payable' => 'SD',
        'loan_borrowed' => 'LTB',
        'advance_from_customer' => 'TP',
        'provision' => 'NCL',
        'statutory_dues' => 'SD',
        'capital' => 'SC',
        'retained_earnings' => 'RS',
        'drawings' => 'RS',
        'sales_revenue' => 'REV',
        'other_income' => 'OI',
        'interest_income' => 'OI',
        'forex_gain' => 'OI',
        'expense_direct' => 'COGS',
        'expense_indirect' => 'OEXP',
        'expense_admin' => 'ADM',
        'expense_selling' => 'SDE',
        'expense_finance' => 'FC',
        'depreciation_expense' => 'DEP',
        'forex_loss' => 'OEXP',
    ];

    /** @var array<string, string> system GL code → report group code */
    private const SYSTEM_CODE_TO_GROUP = [
        'SYS-SALES' => 'REV',
        'SYS-SALES-RET' => 'REV',
        'SYS-PURCH-RET' => 'COGS',
        'SYS-COGS' => 'COGS',
        'SYS-INV' => 'INV',
        'SYS-OBE' => 'RS',
        'SYS-FX-GAIN' => 'OI',
        'SYS-FX-LOSS' => 'OEXP',
        'SYS-IN-CGST' => 'OCA',
        'SYS-IN-SGST' => 'OCA',
        'SYS-IN-IGST' => 'OCA',
        'SYS-OUT-CGST' => 'SD',
        'SYS-OUT-SGST' => 'SD',
        'SYS-OUT-IGST' => 'SD',
        'SYS-RCM-PAY' => 'SD',
        'SYS-TDS-REC' => 'OCA',
        'SYS-TDS-PAY' => 'SD',
        'SYS-CUST-ADV' => 'TP',
        'SYS-VEND-ADV' => 'OCA',
        'SYS-DISC-ALLOW' => 'OEXP',
    ];

    /** @var array<string, string> account_group → report group code */
    private const GROUP_TO_CODE = [
        'bank' => 'BB',
        'cash' => 'CCE',
        'customer' => 'TR',
        'vendor' => 'TP',
        'inventory' => 'INV',
        'expense' => 'OEXP',
    ];

    public function __construct(
        private ReportGroupService $reportGroups,
    ) {}

    /**
     * @return array{mapped: list<array>, skipped: list<array>, updated: int}
     */
    public function autoMap(?int $companyId = null): array
    {
        $companyId = $companyId ?? (int) TenantContext::getCompanyId();
        $groupsByCode = ReportGroup::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('active', true)
            ->whereNotNull('code')
        ->where(function ($q) {
            $q->whereNull('nature')->orWhere('nature', '!=', 'heading');
        })
            ->get()
            ->keyBy(fn ($g) => strtoupper((string) $g->code));

        $mapped = [];
        $skipped = [];

        foreach (GlAccount::withoutGlobalScopes()->where('company_id', $companyId)->whereNull('report_group_id')->orderBy('code')->get() as $account) {
            $groupCode = $this->resolveGroupCode($account);
            if (! $groupCode) {
                $skipped[] = [
                    'gl_account_id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'reason' => 'No automatic rule for this ledger type. Map it manually.',
                ];
                continue;
            }

            $group = $groupsByCode->get(strtoupper($groupCode));
            if (! $group) {
                $skipped[] = [
                    'gl_account_id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'reason' => "Expected group “{$groupCode}” not found. Load the report template or add that group.",
                ];
                continue;
            }

            $account->update(['report_group_id' => $group->id]);
            $mapped[] = [
                'gl_account_id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'report_group_id' => $group->id,
                'report_group_name' => $group->name,
            ];
        }

        return [
            'mapped' => $mapped,
            'skipped' => $skipped,
            'updated' => count($mapped),
        ];
    }

    private function resolveGroupCode(GlAccount $account): ?string
    {
        if (isset(self::SYSTEM_CODE_TO_GROUP[$account->code])) {
            return self::SYSTEM_CODE_TO_GROUP[$account->code];
        }

        if ($account->account_subtype && isset(self::SUBTYPE_TO_CODE[$account->account_subtype])) {
            return self::SUBTYPE_TO_CODE[$account->account_subtype];
        }

        if ($account->account_group && isset(self::GROUP_TO_CODE[$account->account_group])) {
            return self::GROUP_TO_CODE[$account->account_group];
        }

        if ($account->account_type === 'income') {
            return 'OI';
        }
        if ($account->account_type === 'expense') {
            return 'OEXP';
        }
        if ($account->account_type === 'equity') {
            return 'RS';
        }
        if ($account->account_type === 'liability') {
            return 'TP';
        }
        if ($account->account_type === 'asset') {
            return 'OCA';
        }

        return null;
    }
}
