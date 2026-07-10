<?php

namespace App\Services;

use App\Models\BankLedger;
use App\Models\CashLedger;
use App\Models\Customer;
use App\Models\ExpenseHead;
use App\Models\GlAccount;
use App\Models\GlJournalLine;
use App\Models\Vendor;
use App\Support\CoaCatalog;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CoaService
{
    public function __construct(
        private GlAccountService $glAccounts,
    ) {}

    /** Sync all ledgers into gl_accounts and return the full chart. */
    public function buildChart(int $companyId): array
    {
        $this->glAccounts->ensureCompanyChart($companyId);

        foreach (Customer::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('id')->get() as $c) {
            $this->syncCustomer($c);
        }
        foreach (Vendor::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('id')->get() as $v) {
            $this->syncVendor($v);
        }
        foreach (BankLedger::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('id')->get() as $b) {
            $this->syncBankLedger($b);
        }
        foreach (CashLedger::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('id')->get() as $c) {
            $this->syncCashLedger($c);
        }
        foreach (ExpenseHead::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('id')->get() as $h) {
            $this->syncExpenseHead($h);
        }

        return GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->orderBy('code')
            ->get()
            ->map(fn (GlAccount $a) => $this->mapAccount($a))
            ->values()
            ->all();
    }

    public function createAccount(array $data, int $userId): GlAccount
    {
        $companyId = (int) TenantContext::getCompanyId();
        $subtype = $data['account_subtype'];
        $catalog = CoaCatalog::subtype($subtype);
        if (! $catalog) {
            throw ValidationException::withMessages(['account_subtype' => 'Invalid account sub-type.']);
        }

        $codeError = CoaCatalog::validateCodeForSubtype($data['code'], $subtype);
        if ($codeError) {
            throw ValidationException::withMessages(['code' => $codeError]);
        }

        if (GlAccount::withoutGlobalScopes()->where('company_id', $companyId)->where('code', $data['code'])->exists()) {
            throw ValidationException::withMessages(['code' => 'This account code is already in use.']);
        }

        $account = GlAccount::create([
            'company_id' => $companyId,
            'code' => $data['code'],
            'name' => $data['name'],
            'account_type' => $catalog['nature'],
            'account_subtype' => $subtype,
            'account_group' => $this->groupFromSubtype($subtype),
            'normal_balance_side' => $data['normal_balance_side'] ?? $catalog['normal_balance'],
            'opening_balance' => $data['opening_balance'] ?? 0,
            'opening_balance_date' => $data['opening_balance_date'] ?? null,
            'description' => $data['description'] ?? null,
            'metadata' => $data['metadata'] ?? null,
            'report_group_id' => $data['report_group_id'] ?? null,
            'is_system' => false,
            'active' => $data['active'] ?? true,
        ]);

        $this->maybePostOpening($account, $userId, 'coa_account', $account->id);

        return $account;
    }

    public function updateAccount(GlAccount $account, array $data, int $userId): GlAccount
    {
        if ($account->ref_type) {
            throw ValidationException::withMessages([
                'account' => 'This account is linked to a business master. Edit it from the operational ledger section.',
            ]);
        }

        if ($account->is_system && ! ($data['report_group_id_only'] ?? false)) {
            throw ValidationException::withMessages([
                'account' => 'System accounts can only be assigned to report groups.',
            ]);
        }

        if ($data['report_group_id_only'] ?? false) {
            $account->update(['report_group_id' => $data['report_group_id'] ?? null]);

            return $account->fresh();
        }

        $subtype = $data['account_subtype'] ?? $account->account_subtype;
        $catalog = CoaCatalog::subtype((string) $subtype);
        if (! $catalog) {
            throw ValidationException::withMessages(['account_subtype' => 'Invalid account sub-type.']);
        }

        if (isset($data['code']) && $data['code'] !== $account->code) {
            $codeError = CoaCatalog::validateCodeForSubtype($data['code'], $subtype);
            if ($codeError) {
                throw ValidationException::withMessages(['code' => $codeError]);
            }
            if (GlAccount::withoutGlobalScopes()
                ->where('company_id', $account->company_id)
                ->where('code', $data['code'])
                ->where('id', '!=', $account->id)
                ->exists()) {
                throw ValidationException::withMessages(['code' => 'This account code is already in use.']);
            }
        }

        if (GlJournalLine::where('gl_account_id', $account->id)->exists() && isset($data['code']) && $data['code'] !== $account->code) {
            throw ValidationException::withMessages(['code' => 'Cannot change code after transactions are posted.']);
        }

        $account->update([
            'code' => $data['code'] ?? $account->code,
            'name' => $data['name'] ?? $account->name,
            'account_type' => $catalog['nature'],
            'account_subtype' => $subtype,
            'account_group' => $this->groupFromSubtype($subtype),
            'normal_balance_side' => $data['normal_balance_side'] ?? $catalog['normal_balance'],
            'opening_balance' => $data['opening_balance'] ?? $account->opening_balance,
            'opening_balance_date' => $data['opening_balance_date'] ?? $account->opening_balance_date,
            'description' => $data['description'] ?? $account->description,
            'metadata' => $data['metadata'] ?? $account->metadata,
            'report_group_id' => array_key_exists('report_group_id', $data) ? $data['report_group_id'] : $account->report_group_id,
            'active' => $data['active'] ?? $account->active,
        ]);

        return $account->fresh();
    }

    public function deleteAccount(GlAccount $account): void
    {
        if ($account->is_system || $account->ref_type) {
            throw ValidationException::withMessages(['account' => 'This account cannot be deleted.']);
        }
        if (GlJournalLine::where('gl_account_id', $account->id)->exists()) {
            throw ValidationException::withMessages(['account' => 'Cannot delete: GL transactions exist for this account.']);
        }
        $account->delete();
    }

    public function assignReportGroup(GlAccount $account, ?int $reportGroupId): GlAccount
    {
        $account->update(['report_group_id' => $reportGroupId]);

        return $account->fresh();
    }

    public function syncBankLedger(BankLedger $ledger): GlAccount
    {
        $account = $this->findByRef(BankLedger::class, $ledger->id, $ledger->company_id)
            ?? new GlAccount(['company_id' => $ledger->company_id]);

        $code = trim((string) ($ledger->account_code ?? '')) ?: ('BANK-'.$ledger->id);
        $subtype = $ledger->account_subtype ?: 'bank';

        $account->fill([
            'code' => $this->uniqueCode($ledger->company_id, $code, $account->id ?? null),
            'name' => $ledger->name,
            'account_type' => 'asset',
            'account_subtype' => $subtype,
            'account_group' => 'bank',
            'ref_type' => BankLedger::class,
            'ref_id' => $ledger->id,
            'is_system' => false,
            'active' => (bool) $ledger->active,
            'opening_balance' => $ledger->opening_balance ?? 0,
            'opening_balance_date' => $ledger->opening_balance_date,
            'normal_balance_side' => 'debit',
            'description' => $ledger->description,
            'metadata' => [
                'ifsc' => $ledger->ifsc ?? null,
                'account_number' => $ledger->account_number ?? null,
                'branch' => $ledger->branch ?? null,
            ],
        ]);
        $account->save();

        return $account;
    }

    public function syncCashLedger(CashLedger $ledger): GlAccount
    {
        $account = $this->findByRef(CashLedger::class, $ledger->id, $ledger->company_id)
            ?? new GlAccount(['company_id' => $ledger->company_id]);

        $code = trim((string) ($ledger->account_code ?? '')) ?: ('CASH-'.$ledger->id);
        $subtype = $ledger->account_subtype ?: 'cash';

        $account->fill([
            'code' => $this->uniqueCode($ledger->company_id, $code, $account->id ?? null),
            'name' => $ledger->name,
            'account_type' => 'asset',
            'account_subtype' => $subtype,
            'account_group' => 'cash',
            'ref_type' => CashLedger::class,
            'ref_id' => $ledger->id,
            'is_system' => false,
            'active' => (bool) $ledger->active,
            'opening_balance' => $ledger->opening_balance ?? 0,
            'opening_balance_date' => $ledger->opening_balance_date,
            'normal_balance_side' => 'debit',
            'description' => $ledger->description,
            'metadata' => ['location' => $ledger->location ?? null],
        ]);
        $account->save();

        return $account;
    }

    public function syncExpenseHead(ExpenseHead $head): GlAccount
    {
        $account = $this->findByRef(ExpenseHead::class, $head->id, $head->company_id)
            ?? new GlAccount(['company_id' => $head->company_id]);

        $code = trim((string) ($head->account_code ?? '')) ?: ('EXP-'.$head->id);
        $subtype = $head->account_subtype ?: 'expense_indirect';

        $account->fill([
            'code' => $this->uniqueCode($head->company_id, $code, $account->id ?? null),
            'name' => $head->name,
            'account_type' => 'expense',
            'account_subtype' => $subtype,
            'account_group' => 'expense',
            'ref_type' => ExpenseHead::class,
            'ref_id' => $head->id,
            'is_system' => false,
            'active' => (bool) ($head->active ?? true),
            'opening_balance' => $head->opening_balance ?? 0,
            'opening_balance_date' => $head->opening_balance_date,
            'normal_balance_side' => 'debit',
            'description' => $head->description,
        ]);
        $account->save();

        return $account;
    }

    public function syncCustomer(Customer $customer): GlAccount
    {
        $account = $this->findByRef(Customer::class, $customer->id, $customer->company_id);
        if (! $account) {
            return $this->glAccounts->customerAr($customer);
        }
        $account->update([
            'name' => $customer->name.' — Accounts Receivable',
            'account_subtype' => 'trade_receivable',
        ]);

        return $account;
    }

    public function syncVendor(Vendor $vendor): GlAccount
    {
        $account = $this->findByRef(Vendor::class, $vendor->id, $vendor->company_id);
        if (! $account) {
            return $this->glAccounts->vendorAp($vendor);
        }
        $account->update([
            'name' => $vendor->name.' — Accounts Payable',
            'account_subtype' => 'trade_payable',
        ]);

        return $account;
    }

    public function mapAccount(GlAccount $account): array
    {
        $source = null;
        $sourceId = null;
        if ($account->ref_type === BankLedger::class) {
            $source = 'bank';
            $sourceId = $account->ref_id;
        } elseif ($account->ref_type === CashLedger::class) {
            $source = 'cash';
            $sourceId = $account->ref_id;
        } elseif ($account->ref_type === ExpenseHead::class) {
            $source = 'expense_head';
            $sourceId = $account->ref_id;
        } elseif ($account->ref_type === Customer::class) {
            $source = 'customer';
            $sourceId = $account->ref_id;
        } elseif ($account->ref_type === Vendor::class) {
            $source = 'vendor';
            $sourceId = $account->ref_id;
        } elseif ($account->is_system) {
            $source = 'system';
        } else {
            $source = 'manual';
        }

        $subtype = CoaCatalog::subtype((string) ($account->account_subtype ?? ''));

        return [
            'id' => $account->id,
            'code' => $account->code,
            'name' => $account->name,
            'account_type' => $account->account_type,
            'account_subtype' => $account->account_subtype,
            'account_subtype_label' => $subtype['label'] ?? $account->account_subtype,
            'account_group' => $account->account_group,
            'normal_balance_side' => $account->normal_balance_side,
            'opening_balance' => (float) ($account->opening_balance ?? 0),
            'opening_balance_date' => $account->opening_balance_date?->format('Y-m-d'),
            'description' => $account->description,
            'metadata' => $account->metadata ?? (object) [],
            'report_group_id' => $account->report_group_id,
            'is_system' => (bool) $account->is_system,
            'active' => (bool) $account->active,
            'source' => $source,
            'source_id' => $sourceId,
            'editable' => ! $account->is_system && ! $account->ref_type,
            'group_assignable' => true,
        ];
    }

    private function findByRef(string $refType, int $refId, int $companyId): ?GlAccount
    {
        return GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('ref_type', $refType)
            ->where('ref_id', $refId)
            ->first();
    }

    private function uniqueCode(int $companyId, string $code, ?int $ignoreId): string
    {
        $base = $code;
        $suffix = 1;
        while (GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('code', $code)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $code = $base.'-'.$suffix;
            $suffix++;
        }

        return $code;
    }

    private function groupFromSubtype(string $subtype): string
    {
        return match ($subtype) {
            'bank' => 'bank',
            'cash' => 'cash',
            'trade_receivable' => 'customer',
            'trade_payable' => 'vendor',
            'inventory' => 'inventory',
            'gst_input', 'gst_output' => 'gst',
            default => 'manual',
        };
    }

    private function maybePostOpening(GlAccount $account, int $userId, string $sourceType, int $sourceId): void
    {
        $amount = (float) ($account->opening_balance ?? 0);
        if (abs($amount) < 0.001) {
            return;
        }

        $signed = $account->normal_balance_side === 'credit' ? -abs($amount) : abs($amount);
        $this->glAccounts->postCoaOpeningBalance(
            $account,
            $signed,
            $account->opening_balance_date?->format('Y-m-d'),
            $userId,
            $sourceType,
            $sourceId
        );
    }
}
