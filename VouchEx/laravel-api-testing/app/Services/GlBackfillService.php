<?php

namespace App\Services;

use App\Models\BankLedger;
use App\Models\CashLedger;
use App\Models\Company;
use App\Models\CompanySetting;
use App\Models\Consumption;
use App\Models\CreditNote;
use App\Models\CurrencyConversion;
use App\Models\Customer;
use App\Models\DebitNote;
use App\Models\Expense;
use App\Models\ExpenseHead;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\Vendor;
use App\Support\TenantContext;

class GlBackfillService
{
    public function __construct(
        private GlAccountService $accounts,
        private GlPostingService $posting,
    ) {}

    public function backfillCompany(int $companyId, ?int $userId = null): array
    {
        app()->instance('currentCompanyId', $companyId);
        TenantContext::setCompany($companyId);

        $this->accounts->ensureCompanyChart($companyId);

        $counts = [
            'customers' => 0,
            'vendors' => 0,
            'banks' => 0,
            'cash' => 0,
            'expense_heads' => 0,
            'inventory_openings' => 0,
            'invoices' => 0,
            'receipts' => 0,
            'expenses' => 0,
            'payments' => 0,
            'credit_notes' => 0,
            'debit_notes' => 0,
            'forex' => 0,
            'consumptions' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        foreach (Customer::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('id')->get() as $c) {
            if (! $this->posting->hasPosting('customer_opening', $c->id)) {
                $this->tryPost($counts, 'customers', 'customer_opening', $c->id, $c->name, fn () => $this->posting->postCustomerOpening($c, $userId));
            }
        }

        foreach (Vendor::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('id')->get() as $v) {
            if (! $this->posting->hasPosting('vendor_opening', $v->id)) {
                $this->tryPost($counts, 'vendors', 'vendor_opening', $v->id, $v->name, fn () => $this->posting->postVendorOpening($v, $userId));
            }
        }

        foreach (BankLedger::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('id')->get() as $bank) {
            if (! $this->posting->hasPosting('bank_opening', $bank->id)) {
                $this->tryPost($counts, 'banks', 'bank_opening', $bank->id, $bank->name, fn () => $this->posting->postBankOpening($bank, $userId));
            }
        }

        foreach (CashLedger::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('id')->get() as $cash) {
            if (! $this->posting->hasPosting('cash_opening', $cash->id)) {
                $this->tryPost($counts, 'cash', 'cash_opening', $cash->id, $cash->name, fn () => $this->posting->postCashOpening($cash, $userId));
            }
        }

        foreach (ExpenseHead::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('id')->get() as $head) {
            if (! $this->posting->hasPosting('expense_head_opening', $head->id)) {
                $this->tryPost($counts, 'expense_heads', 'expense_head_opening', $head->id, $head->name, fn () => $this->posting->postExpenseHeadOpening($head, $userId));
            }
        }

        foreach (Inventory::withoutGlobalScopes()->where('company_id', $companyId)->where('type', 'Product')->orderBy('id')->get() as $item) {
            if (! $this->posting->hasPosting('inventory_opening', $item->id)) {
                $this->tryPost($counts, 'inventory_openings', 'inventory_opening', $item->id, $item->name, fn () => $this->posting->postInventoryOpening($item, $userId));
            }
        }

        foreach (Invoice::withoutGlobalScopes()->where('company_id', $companyId)->where('status', '!=', 'Cancelled')->orderBy('issue_date')->orderBy('id')->get() as $inv) {
            if ($this->posting->hasPosting('invoice', $inv->id)) {
                $counts['skipped']++;
            } else {
                $this->tryPost($counts, 'invoices', 'invoice', $inv->id, $inv->invoice_number, fn () => $this->posting->postInvoice($inv, $userId));
            }
        }

        foreach (CreditNote::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('issue_date')->orderBy('id')->get() as $cn) {
            if (! $this->posting->hasPosting('credit_note', $cn->id)) {
                $this->tryPost($counts, 'credit_notes', 'credit_note', $cn->id, $cn->credit_note_number, fn () => $this->posting->postCreditNote($cn, $userId));
            }
        }

        foreach (Expense::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('expense_date')->orderBy('id')->get() as $exp) {
            if (! $this->posting->hasPosting('expense', $exp->id)) {
                $this->tryPost($counts, 'expenses', 'expense', $exp->id, $exp->expense_number, fn () => $this->posting->postExpense($exp, $userId));
            }
        }

        foreach (DebitNote::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('issue_date')->orderBy('id')->get() as $dn) {
            if (! $this->posting->hasPosting('debit_note', $dn->id)) {
                $this->tryPost($counts, 'debit_notes', 'debit_note', $dn->id, $dn->debit_note_number, fn () => $this->posting->postDebitNote($dn, $userId));
            }
        }

        foreach (Receipt::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('payment_date')->orderBy('id')->get() as $rec) {
            if (! $this->posting->hasPosting('receipt', $rec->id)) {
                $this->tryPost($counts, 'receipts', 'receipt', $rec->id, $rec->receipt_number, fn () => $this->posting->postReceipt($rec, $userId));
            }
        }

        foreach (Payment::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('payment_date')->orderBy('id')->get() as $pay) {
            if (! $this->posting->hasPosting('payment', $pay->id)) {
                $this->tryPost($counts, 'payments', 'payment', $pay->id, $pay->payment_number, fn () => $this->posting->postPayment($pay, $userId));
            }
        }

        foreach (CurrencyConversion::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('conversion_date')->orderBy('id')->get() as $fx) {
            if (! $this->posting->hasPosting('forex', $fx->id)) {
                $this->tryPost($counts, 'forex', 'forex', $fx->id, $fx->reference_no ?: ('FX-'.$fx->id), fn () => $this->posting->postForexConversion($fx, $userId));
            }
        }

        foreach (Consumption::withoutGlobalScopes()->where('company_id', $companyId)->orderBy('consumption_date')->orderBy('id')->get() as $con) {
            if (! $this->posting->hasPosting('consumption', $con->id)) {
                $this->tryPost($counts, 'consumptions', 'consumption', $con->id, 'CON-'.$con->id, fn () => $this->posting->postConsumption($con, $userId));
            }
        }

        if ($counts['errors'] === []) {
            CompanySetting::withoutGlobalScopes()->where('company_id', $companyId)->update([
                'gl_backfilled_at' => now(),
            ]);
        }

        return $this->formatResult($counts);
    }

    /** @param  array<string, mixed>  $counts */
    private function formatResult(array $counts): array
    {
        $postedTypes = [
            'customers', 'vendors', 'banks', 'cash', 'expense_heads', 'inventory_openings',
            'invoices', 'receipts', 'expenses', 'payments', 'credit_notes', 'debit_notes', 'forex', 'consumptions',
        ];
        $postedByType = [];
        $postedTotal = 0;
        foreach ($postedTypes as $key) {
            $n = (int) ($counts[$key] ?? 0);
            if ($n > 0) {
                $postedByType[$key] = $n;
                $postedTotal += $n;
            }
        }

        $errors = array_map(fn ($err) => [
            'type' => $err['type'],
            'id' => $err['id'],
            'label' => $err['label'],
            'message' => $this->friendlyErrorMessage($err['type'], $err['message']),
            'technical' => $err['message'],
        ], $counts['errors'] ?? []);

        return [
            ...$counts,
            'errors' => $errors,
            'summary' => [
                'posted_total' => $postedTotal,
                'skipped_already_in_gl' => (int) ($counts['skipped'] ?? 0),
                'failed' => count($errors),
                'posted_by_type' => $postedByType,
            ],
        ];
    }

    private function friendlyErrorMessage(string $type, string $technical): string
    {
        $lower = strtolower($technical);

        if (str_contains($lower, 'must be of type')) {
            return 'Internal posting error for this record. Please contact support with the document number shown.';
        }
        if (str_contains($lower, 'bank') && str_contains($lower, 'not found')) {
            return 'Bank or cash ledger missing or inactive. Check the voucher uses a valid ledger in Chart of Accounts.';
        }
        if (str_contains($lower, 'customer')) {
            return 'Customer account could not be linked. Check the customer exists in Customer Master.';
        }
        if (str_contains($lower, 'vendor')) {
            return 'Vendor account could not be linked. Check the vendor exists in Vendor Master.';
        }
        if (str_contains($lower, 'expense head')) {
            return 'Expense category not found. Add or restore the expense head in Chart of Accounts.';
        }
        if (str_contains($lower, 'balance') || str_contains($lower, 'settlement')) {
            return 'Amounts on this voucher do not balance. Open the document and verify totals, TDS, and discounts.';
        }
        if (str_contains($lower, 'cancelled')) {
            return 'This document is cancelled or invalid for posting.';
        }

        return strlen($technical) > 180 ? substr($technical, 0, 177).'…' : $technical;
    }

    public function backfillAll(?int $userId = null): array
    {
        $summary = [];
        foreach (Company::orderBy('id')->get() as $company) {
            $summary[$company->id] = $this->backfillCompany($company->id, $userId);
        }

        return $summary;
    }

    /** @param  array<string, mixed>  $counts */
    private function tryPost(array &$counts, string $countKey, string $type, int $id, string $label, callable $callback): void
    {
        try {
            $callback();
            $counts[$countKey]++;
        } catch (\Throwable $e) {
            $counts['errors'][] = [
                'type' => $type,
                'id' => $id,
                'label' => $label,
                'message' => $e->getMessage(),
            ];
        }
    }
}
