<?php

namespace App\Services;

use App\Models\CreditNote;
use App\Models\DebitNote;
use App\Models\Expense;
use App\Models\GlAccount;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Receipt;
use App\Support\TenantContext;
use Carbon\Carbon;

class GlOperationalReportingService
{
    public function __construct(
        private GlReportingService $gl,
    ) {}

    /**
     * @return array{
     *   as_of: string,
     *   buckets: array<string, float>,
     *   total: float,
     *   parties: list<array>
     * }
     */
    public function receivablesAgeing(?string $asOfDate = null): array
    {
        $asOf = $this->asOfCarbon($asOfDate);
        $companyId = (int) TenantContext::getCompanyId();

        $receiptsByInvoice = Receipt::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->get()
            ->groupBy('invoice_id');

        $creditByInvoice = CreditNote::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->get()
            ->groupBy('original_invoice_id');

        $buckets = ['0-30' => 0.0, '31-60' => 0.0, '60-90' => 0.0, '90+' => 0.0];
        $parties = [];

        $invoices = Invoice::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->whereNotIn('status', ['Cancelled', 'Paid'])
            ->get();

        foreach ($invoices as $invoice) {
            $outstanding = $this->invoiceOutstanding($invoice, $receiptsByInvoice, $creditByInvoice);
            if ($outstanding < 0.01) {
                continue;
            }

            $due = $invoice->due_date ?? $invoice->issue_date;
            $daysPast = $this->daysPastDue($asOf, $due);
            $bucket = $this->ageingBucket($daysPast);
            $buckets[$bucket] += $outstanding;

            $parties[] = [
                'party_type' => 'customer',
                'party_id' => $invoice->customer_id,
                'party_name' => $invoice->customer_name,
                'document_type' => 'invoice',
                'document_id' => $invoice->id,
                'document_number' => $invoice->invoice_number,
                'document_date' => optional($invoice->issue_date)->format('Y-m-d'),
                'due_date' => optional($due)->format('Y-m-d'),
                'days_past_due' => $daysPast,
                'bucket' => $bucket,
                'outstanding' => round($outstanding, 2),
            ];
        }

        return [
            'as_of' => $asOf->format('Y-m-d'),
            'buckets' => array_map(fn ($v) => round($v, 2), $buckets),
            'total' => round(array_sum($buckets), 2),
            'parties' => $parties,
        ];
    }

    /**
     * @return array{
     *   as_of: string,
     *   buckets: array<string, float>,
     *   total: float,
     *   parties: list<array>
     * }
     */
    public function payablesAgeing(?string $asOfDate = null): array
    {
        $asOf = $this->asOfCarbon($asOfDate);
        $companyId = (int) TenantContext::getCompanyId();

        $paymentsByExpense = Payment::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->get()
            ->groupBy('expense_id');

        $debitByExpense = DebitNote::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->get()
            ->groupBy('original_expense_id');

        $buckets = ['0-30' => 0.0, '31-60' => 0.0, '60-90' => 0.0, '90+' => 0.0];
        $parties = [];

        $expenses = Expense::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('payment_status', '!=', 'Paid')
            ->get();

        foreach ($expenses as $expense) {
            $outstanding = $this->expenseOutstanding($expense, $paymentsByExpense, $debitByExpense);
            if ($outstanding < 0.01) {
                continue;
            }

            $due = $expense->due_date ?? $expense->expense_date;
            $daysPast = $this->daysPastDue($asOf, $due);
            $bucket = $this->ageingBucket($daysPast);
            $buckets[$bucket] += $outstanding;

            $parties[] = [
                'party_type' => 'vendor',
                'party_id' => $expense->vendor_id,
                'party_name' => $expense->vendor_name,
                'document_type' => 'expense',
                'document_id' => $expense->id,
                'document_number' => $expense->expense_number ?: $expense->invoice_number,
                'document_date' => optional($expense->expense_date)->format('Y-m-d'),
                'due_date' => optional($due)->format('Y-m-d'),
                'days_past_due' => $daysPast,
                'bucket' => $bucket,
                'outstanding' => round($outstanding, 2),
            ];
        }

        return [
            'as_of' => $asOf->format('Y-m-d'),
            'buckets' => array_map(fn ($v) => round($v, 2), $buckets),
            'total' => round(array_sum($buckets), 2),
            'parties' => $parties,
        ];
    }

    /**
     * @return array{as_of: string, rows: list<array>, totals: array{bank: float, cash: float, combined: float}}
     */
    public function cashBankSummary(?string $asOfDate = null): array
    {
        $companyId = (int) TenantContext::getCompanyId();
        $tb = $this->gl->trialBalance(null, $asOfDate);
        $balanceByAccountId = [];
        foreach ($tb['rows'] as $row) {
            $balanceByAccountId[(int) $row['gl_account_id']] = (float) $row['balance'];
        }

        $accounts = GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('active', true)
            ->whereIn('account_subtype', ['bank', 'cash'])
            ->orderBy('code')
            ->get();

        $rows = [];
        $totalBank = 0.0;
        $totalCash = 0.0;

        foreach ($accounts as $acct) {
            $bal = $balanceByAccountId[$acct->id] ?? 0.0;
            if (abs($bal) < 0.001 && abs((float) $acct->opening_balance) < 0.001) {
                continue;
            }
            $amount = round($bal, 2);
            $row = [
                'gl_account_id' => $acct->id,
                'account_code' => $acct->code,
                'account_name' => $acct->name,
                'ledger_kind' => $acct->account_subtype === 'cash' ? 'cash' : 'bank',
                'balance' => $amount,
            ];
            $rows[] = $row;
            if ($acct->account_subtype === 'cash') {
                $totalCash += $amount;
            } else {
                $totalBank += $amount;
            }
        }

        return [
            'as_of' => $tb['as_of'],
            'rows' => $rows,
            'totals' => [
                'bank' => round($totalBank, 2),
                'cash' => round($totalCash, 2),
                'combined' => round($totalBank + $totalCash, 2),
            ],
        ];
    }

    /**
     * @return array{
     *   account: array,
     *   as_of: string,
     *   from: ?string,
     *   to: ?string,
     *   rows: list<array>,
     *   opening_balance: float,
     *   closing_balance: float
     * }
     */
    public function ledgerStatement(int $glAccountId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $companyId = (int) TenantContext::getCompanyId();
        $account = GlAccount::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('id', $glAccountId)
            ->firstOrFail();

        $query = \App\Models\GlJournalLine::query()
            ->join('gl_journals', 'gl_journals.id', '=', 'gl_journal_lines.journal_id')
            ->where('gl_journal_lines.gl_account_id', $glAccountId)
            ->where('gl_journal_lines.company_id', $companyId)
            ->select(
                'gl_journals.journal_date',
                'gl_journals.journal_number',
                'gl_journals.source_type',
                'gl_journals.source_id',
                'gl_journals.memo',
                'gl_journal_lines.debit',
                'gl_journal_lines.credit',
                'gl_journal_lines.line_memo'
            )
            ->orderBy('gl_journals.journal_date')
            ->orderBy('gl_journals.id');

        if ($fromDate) {
            $query->where('gl_journals.journal_date', '>=', $fromDate);
        }
        if ($toDate) {
            $query->where('gl_journals.journal_date', '<=', $toDate);
        }

        $opening = 0.0;
        if ($fromDate) {
            $prior = $this->gl->trialBalance(null, Carbon::parse($fromDate)->subDay()->format('Y-m-d'));
            foreach ($prior['rows'] as $row) {
                if ((int) $row['gl_account_id'] === $glAccountId) {
                    $opening = (float) $row['balance'];
                    break;
                }
            }
        } else {
            $opening = (float) $account->opening_balance;
        }

        $rows = [];
        $balance = $opening;
        foreach ($query->get() as $line) {
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            $balance = round($balance + $debit - $credit, 2);
            $rows[] = [
                'date' => optional($line->journal_date)->format('Y-m-d'),
                'journal_number' => $line->journal_number,
                'source_type' => $line->source_type,
                'source_id' => $line->source_id,
                'description' => $line->line_memo ?: $line->memo,
                'debit' => round($debit, 2),
                'credit' => round($credit, 2),
                'balance' => $balance,
            ];
        }

        return [
            'account' => [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'account_subtype' => $account->account_subtype,
            ],
            'from' => $fromDate,
            'to' => $toDate,
            'as_of' => $toDate ?? now()->format('Y-m-d'),
            'opening_balance' => round($opening, 2),
            'closing_balance' => $balance,
            'rows' => $rows,
        ];
    }

    private function asOfCarbon(?string $asOfDate): Carbon
    {
        return $asOfDate
            ? Carbon::parse($asOfDate)->startOfDay()
            : now()->startOfDay();
    }

    private function ageingBucket(int $daysPastDue): string
    {
        if ($daysPastDue <= 30) {
            return '0-30';
        }
        if ($daysPastDue <= 60) {
            return '31-60';
        }
        if ($daysPastDue <= 90) {
            return '60-90';
        }

        return '90+';
    }

    private function daysPastDue(Carbon $asOf, $dueDate): int
    {
        if (! $dueDate) {
            return 0;
        }

        $due = Carbon::parse($dueDate)->startOfDay();
        $days = (int) $due->diffInDays($asOf->copy()->startOfDay(), false);

        return max(0, $days);
    }

    /** @param  \Illuminate\Support\Collection<int|string, \Illuminate\Support\Collection<int, Receipt>>  $receiptsByInvoice */
    /** @param  \Illuminate\Support\Collection<int|string, \Illuminate\Support\Collection<int, CreditNote>>  $creditByInvoice */
    private function invoiceOutstanding(Invoice $invoice, $receiptsByInvoice, $creditByInvoice): float
    {
        $creditTotal = ($creditByInvoice->get($invoice->id) ?? collect())
            ->sum(fn (CreditNote $cn) => (float) $cn->total_amount);
        $net = max(0, (float) $invoice->total_amount - $creditTotal);

        $settled = ($receiptsByInvoice->get($invoice->id) ?? collect())
            ->sum(fn (Receipt $r) => (float) $r->amount_received + (float) $r->tds_deducted + (float) $r->discount_allowed);

        return max(0, round($net - $settled, 2));
    }

    /** @param  \Illuminate\Support\Collection<int|string, \Illuminate\Support\Collection<int, Payment>>  $paymentsByExpense */
    /** @param  \Illuminate\Support\Collection<int|string, \Illuminate\Support\Collection<int, DebitNote>>  $debitByExpense */
    private function expenseOutstanding(Expense $expense, $paymentsByExpense, $debitByExpense): float
    {
        $debitTotal = ($debitByExpense->get($expense->id) ?? collect())
            ->sum(fn (DebitNote $dn) => (float) $dn->total_amount);
        $net = max(0, (float) $expense->total_amount - $debitTotal);

        $settled = ($paymentsByExpense->get($expense->id) ?? collect())
            ->sum(fn (Payment $p) => (float) $p->amount_paid + (float) $p->tds_deducted);

        return max(0, round($net - $settled, 2));
    }
}
