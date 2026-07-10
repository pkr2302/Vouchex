<?php

namespace App\Services;

use App\Models\BankLedger;
use App\Models\CashLedger;
use App\Models\Customer;
use App\Models\ExpenseHead;
use App\Models\GlAccount;
use App\Models\Vendor;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;

class GlAccountService
{
    /** @var list<array{code: string, name: string, account_type: string, account_group: string}> */
    public const SYSTEM_ACCOUNTS = [
        ['code' => 'SYS-SALES', 'name' => 'Sales Revenue', 'account_type' => 'income', 'account_group' => 'system'],
        ['code' => 'SYS-SALES-RET', 'name' => 'Sales Returns', 'account_type' => 'income', 'account_group' => 'system'],
        ['code' => 'SYS-PURCH-RET', 'name' => 'Purchase Returns', 'account_type' => 'expense', 'account_group' => 'system'],
        ['code' => 'SYS-COGS', 'name' => 'Cost of Goods Sold', 'account_type' => 'expense', 'account_group' => 'system'],
        ['code' => 'SYS-INV', 'name' => 'Inventory', 'account_type' => 'asset', 'account_group' => 'inventory'],
        ['code' => 'SYS-OBE', 'name' => 'Opening Balance Equity', 'account_type' => 'equity', 'account_group' => 'system'],
        ['code' => 'SYS-FX-GAIN', 'name' => 'Forex Gain', 'account_type' => 'income', 'account_group' => 'system'],
        ['code' => 'SYS-FX-LOSS', 'name' => 'Forex Loss', 'account_type' => 'expense', 'account_group' => 'system'],
        ['code' => 'SYS-IN-CGST', 'name' => 'Input CGST', 'account_type' => 'asset', 'account_group' => 'gst'],
        ['code' => 'SYS-IN-SGST', 'name' => 'Input SGST', 'account_type' => 'asset', 'account_group' => 'gst'],
        ['code' => 'SYS-IN-IGST', 'name' => 'Input IGST', 'account_type' => 'asset', 'account_group' => 'gst'],
        ['code' => 'SYS-OUT-CGST', 'name' => 'Output CGST', 'account_type' => 'liability', 'account_group' => 'gst'],
        ['code' => 'SYS-OUT-SGST', 'name' => 'Output SGST', 'account_type' => 'liability', 'account_group' => 'gst'],
        ['code' => 'SYS-OUT-IGST', 'name' => 'Output IGST', 'account_type' => 'liability', 'account_group' => 'gst'],
        ['code' => 'SYS-RCM-PAY', 'name' => 'RCM GST Payable', 'account_type' => 'liability', 'account_group' => 'gst'],
        ['code' => 'SYS-TDS-REC', 'name' => 'TDS Receivable', 'account_type' => 'asset', 'account_group' => 'system'],
        ['code' => 'SYS-TDS-PAY', 'name' => 'TDS Payable', 'account_type' => 'liability', 'account_group' => 'system'],
        ['code' => 'SYS-CUST-ADV', 'name' => 'Customer Advances', 'account_type' => 'liability', 'account_group' => 'system'],
        ['code' => 'SYS-VEND-ADV', 'name' => 'Vendor Advances', 'account_type' => 'asset', 'account_group' => 'system'],
        ['code' => 'SYS-DISC-ALLOW', 'name' => 'Discount Allowed', 'account_type' => 'expense', 'account_group' => 'system'],
    ];

    public function ensureCompanyChart(int $companyId): void
    {
        foreach (self::SYSTEM_ACCOUNTS as $row) {
            GlAccount::withoutGlobalScopes()->firstOrCreate(
                ['company_id' => $companyId, 'code' => $row['code']],
                [
                    'name' => $row['name'],
                    'account_type' => $row['account_type'],
                    'account_group' => $row['account_group'],
                    'is_system' => true,
                    'active' => true,
                ]
            );
        }
    }

    public function system(string $code): GlAccount
    {
        $companyId = TenantContext::getCompanyId();
        $this->ensureCompanyChart((int) $companyId);

        return GlAccount::where('code', $code)->firstOrFail();
    }

    public function customerAr(Customer $customer): GlAccount
    {
        $code = 'AR-'.$customer->id;

        return GlAccount::firstOrCreate(
            ['company_id' => $customer->company_id, 'code' => $code],
            [
                'name' => $customer->name.' — Accounts Receivable',
                'account_type' => 'asset',
                'account_group' => 'customer',
                'ref_type' => Customer::class,
                'ref_id' => $customer->id,
                'is_system' => false,
                'active' => true,
            ]
        );
    }

    public function vendorAp(Vendor $vendor): GlAccount
    {
        $code = 'AP-'.$vendor->id;

        return GlAccount::firstOrCreate(
            ['company_id' => $vendor->company_id, 'code' => $code],
            [
                'name' => $vendor->name.' — Accounts Payable',
                'account_type' => 'liability',
                'account_group' => 'vendor',
                'ref_type' => Vendor::class,
                'ref_id' => $vendor->id,
                'is_system' => false,
                'active' => true,
            ]
        );
    }

    public function bankByName(?string $name): ?GlAccount
    {
        if (! $name || trim($name) === '') {
            return null;
        }

        $ledger = BankLedger::where('name', $name)->where('active', true)->first();
        if (! $ledger) {
            return null;
        }

        return $this->bankLedger($ledger);
    }

    public function cashByName(?string $name): ?GlAccount
    {
        if (! $name || trim($name) === '') {
            return null;
        }

        $ledger = CashLedger::where('name', $name)->where('active', true)->first();
        if (! $ledger) {
            return null;
        }

        return $this->cashLedger($ledger);
    }

    public function bankOrCashByName(?string $name, ?string $paymentMode = null): ?GlAccount
    {
        $acct = $this->bankByName($name) ?? $this->cashByName($name);
        if ($acct) {
            return $acct;
        }

        if ($paymentMode && str_contains($paymentMode, 'Cash')) {
            return CashLedger::where('active', true)->orderBy('name')->first()
                ? $this->cashLedger(CashLedger::where('active', true)->orderBy('name')->first())
                : null;
        }

        return BankLedger::where('active', true)->orderBy('name')->first()
            ? $this->bankLedger(BankLedger::where('active', true)->orderBy('name')->first())
            : null;
    }

    public function bankLedger(BankLedger $ledger): GlAccount
    {
        return app(CoaService::class)->syncBankLedger($ledger);
    }

    public function cashLedger(CashLedger $ledger): GlAccount
    {
        return app(CoaService::class)->syncCashLedger($ledger);
    }

    public function expenseHeadByName(?string $name): ?GlAccount
    {
        if (! $name || trim($name) === '') {
            return null;
        }

        $head = ExpenseHead::where('name', $name)->first();
        if (! $head) {
            return GlAccount::firstOrCreate(
                ['company_id' => TenantContext::getCompanyId(), 'code' => 'EXP-'.substr(md5($name), 0, 8)],
                [
                    'name' => $name,
                    'account_type' => 'expense',
                    'account_group' => 'expense',
                    'is_system' => false,
                    'active' => true,
                ]
            );
        }

        return $this->expenseHead($head);
    }

    public function expenseHead(ExpenseHead $head): GlAccount
    {
        return app(CoaService::class)->syncExpenseHead($head);
    }

    /** Post opening balance for COA bank/cash/expense head if set. */
    public function postCoaOpeningBalance(GlAccount $account, float $amount, ?string $date, int $userId, string $sourceType, int $sourceId): void
    {
        if (abs($amount) < 0.001) {
            return;
        }

        app(GlPostingService::class)->postOpeningPair(
            $date ?: now()->format('Y-m-d'),
            $sourceType,
            $sourceId,
            $amount > 0 ? $account : $this->system('SYS-OBE'),
            $amount > 0 ? $this->system('SYS-OBE') : $account,
            abs($amount),
            'Opening balance — '.$account->name,
            $userId
        );
    }
}
