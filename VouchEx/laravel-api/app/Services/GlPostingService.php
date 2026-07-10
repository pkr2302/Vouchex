<?php

namespace App\Services;

use App\Models\AdvanceAdjustment;
use App\Models\BankLedger;
use App\Models\CashLedger;
use App\Models\Consumption;
use App\Models\CreditNote;
use App\Models\CreditNoteItem;
use App\Models\CurrencyConversion;
use App\Models\Customer;
use App\Models\DebitNote;
use App\Models\DebitNoteItem;
use App\Models\Expense;
use App\Models\ExpenseHead;
use App\Models\GlAccount;
use App\Models\GlJournal;
use App\Models\GlJournalLine;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\Vendor;
use App\Support\TenantContext;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class GlPostingService
{
    public function __construct(
        private GlAccountService $accounts,
        private NumberSequenceService $numbers,
    ) {}

    public function hasPosting(string $sourceType, int $sourceId): bool
    {
        return GlJournal::where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->where('is_reversal', false)
            ->exists();
    }

    public function reverseBySource(string $sourceType, int $sourceId, ?int $userId = null, ?string $memo = null): ?GlJournal
    {
        $original = GlJournal::where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->where('is_reversal', false)
            ->orderByDesc('id')
            ->first();

        if (! $original) {
            return null;
        }

        if (GlJournal::where('reversal_of_journal_id', $original->id)->exists()) {
            return null;
        }

        $lines = [];
        foreach ($original->lines as $line) {
            $account = GlAccount::find($line->gl_account_id);
            if (! $account) {
                continue;
            }
            $lines[] = [
                'account' => $account,
                'debit' => (float) $line->credit,
                'credit' => (float) $line->debit,
                'memo' => 'Reversal: '.($line->line_memo ?? ''),
            ];
        }

        return $this->postJournal(
            $original->journal_date->format('Y-m-d'),
            $sourceType.'_reversal',
            $sourceId,
            $lines,
            $memo ?? 'Reversal of '.$original->journal_number,
            $userId,
            $original->id,
            true
        );
    }

    public function postOpeningPair(
        string $date,
        string $sourceType,
        int $sourceId,
        GlAccount $debitAccount,
        GlAccount $creditAccount,
        float $amount,
        string $memo,
        ?int $userId
    ): GlJournal {
        return $this->postJournal($date, $sourceType, $sourceId, [
            ['account' => $debitAccount, 'debit' => $amount, 'credit' => 0, 'memo' => $memo],
            ['account' => $creditAccount, 'debit' => 0, 'credit' => $amount, 'memo' => $memo],
        ], $memo, $userId);
    }

    /**
     * @param  list<array{account: GlAccount, debit: float, credit: float, memo?: string}>  $lines
     */
    public function postJournal(
        string $date,
        string $sourceType,
        int $sourceId,
        array $lines,
        ?string $memo,
        ?int $userId = null,
        ?int $reversalOfId = null,
        bool $isReversal = false
    ): GlJournal {
        $normalized = $this->normalizeLines($lines, $sourceType, $sourceId);
        $companyId = TenantContext::getCompanyId();

        return DB::transaction(function () use ($normalized, $date, $sourceType, $sourceId, $memo, $userId, $reversalOfId, $isReversal, $companyId) {
            $journal = GlJournal::create([
                'company_id' => $companyId,
                'journal_number' => $this->numbers->next('JN', 'gl_journals', 'journal_number'),
                'journal_date' => $date,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'reversal_of_journal_id' => $reversalOfId,
                'is_reversal' => $isReversal,
                'memo' => $memo,
                'created_by' => $userId,
            ]);

            foreach ($normalized as $line) {
                GlJournalLine::create([
                    'company_id' => $companyId,
                    'journal_id' => $journal->id,
                    'gl_account_id' => $line['account']->id,
                    'account_code' => $line['account']->code,
                    'account_name' => $line['account']->name,
                    'debit' => round($line['debit'], 2),
                    'credit' => round($line['credit'], 2),
                    'line_memo' => $line['memo'] ?? null,
                ]);
            }

            return $journal->load('lines');
        });
    }

    public function postCustomerOpening(Customer $customer, ?int $userId): void
    {
        $amount = (float) ($customer->opening_balance ?? 0);
        if ($amount <= 0.001 || $this->hasPosting('customer_opening', $customer->id)) {
            return;
        }

        $ar = $this->accounts->customerAr($customer);
        $obe = $this->accounts->system('SYS-OBE');
        $date = $customer->opening_balance_date?->format('Y-m-d') ?? now()->format('Y-m-d');

        $this->postOpeningPair($date, 'customer_opening', $customer->id, $ar, $obe, $amount, 'Customer opening balance', $userId);
    }

    public function postVendorOpening(Vendor $vendor, ?int $userId): void
    {
        $amount = (float) ($vendor->opening_balance ?? 0);
        if ($amount <= 0.001 || $this->hasPosting('vendor_opening', $vendor->id)) {
            return;
        }

        $ap = $this->accounts->vendorAp($vendor);
        $obe = $this->accounts->system('SYS-OBE');
        $date = $vendor->opening_balance_date?->format('Y-m-d') ?? now()->format('Y-m-d');

        $this->postOpeningPair($date, 'vendor_opening', $vendor->id, $obe, $ap, $amount, 'Vendor opening balance', $userId);
    }

    public function postCoaOpening(
        GlAccount $account,
        float $amount,
        ?string $date,
        string $sourceType,
        int $sourceId,
        string $memo,
        ?int $userId
    ): void {
        if ($this->hasPosting($sourceType, $sourceId) || abs($amount) < 0.001) {
            return;
        }

        $obe = $this->accounts->system('SYS-OBE');
        $journalDate = $date ?: now()->format('Y-m-d');

        if ($amount > 0) {
            $this->postOpeningPair($journalDate, $sourceType, $sourceId, $account, $obe, $amount, $memo, $userId);
        } else {
            $this->postOpeningPair($journalDate, $sourceType, $sourceId, $obe, $account, abs($amount), $memo, $userId);
        }
    }

    public function postBankOpening(BankLedger $ledger, ?int $userId): void
    {
        $acct = $this->accounts->bankLedger($ledger);
        $this->postCoaOpening(
            $acct,
            (float) ($ledger->opening_balance ?? 0),
            $ledger->opening_balance_date?->format('Y-m-d'),
            'bank_opening',
            $ledger->id,
            'Bank opening balance — '.$ledger->name,
            $userId
        );
    }

    public function postCashOpening(CashLedger $ledger, ?int $userId): void
    {
        $acct = $this->accounts->cashLedger($ledger);
        $this->postCoaOpening(
            $acct,
            (float) ($ledger->opening_balance ?? 0),
            $ledger->opening_balance_date?->format('Y-m-d'),
            'cash_opening',
            $ledger->id,
            'Cash opening balance — '.$ledger->name,
            $userId
        );
    }

    public function postExpenseHeadOpening(ExpenseHead $head, ?int $userId): void
    {
        $acct = $this->accounts->expenseHead($head);
        $this->postCoaOpening(
            $acct,
            (float) ($head->opening_balance ?? 0),
            $head->opening_balance_date?->format('Y-m-d'),
            'expense_head_opening',
            $head->id,
            'Expense head opening — '.$head->name,
            $userId
        );
    }

    public function postInventoryOpening(Inventory $item, ?int $userId): void
    {
        if ($item->type !== 'Product' || $this->hasPosting('inventory_opening', $item->id)) {
            return;
        }

        $qty = (int) ($item->opening_stock ?? 0);
        if ($qty <= 0) {
            return;
        }

        $unitCost = (float) ($item->purchase_price ?? 0);
        if ($unitCost <= 0) {
            $unitCost = (float) ($item->rate ?? 0);
        }

        $value = round($qty * $unitCost, 2);
        if ($value <= 0.001) {
            return;
        }

        $inv = $this->accounts->system('SYS-INV');
        $obe = $this->accounts->system('SYS-OBE');

        $this->postOpeningPair(
            now()->format('Y-m-d'),
            'inventory_opening',
            $item->id,
            $inv,
            $obe,
            $value,
            'Opening stock — '.$item->name,
            $userId
        );
    }

    public function postInvoice(Invoice $invoice, ?int $userId): void
    {
        if ($this->hasPosting('invoice', $invoice->id)) {
            return;
        }

        $customer = Customer::find($invoice->customer_id);
        if (! $customer) {
            return;
        }

        $lines = [];
        $ar = $this->accounts->customerAr($customer);
        $headerTotal = (float) $invoice->total_amount;
        $taxTotal = $this->sumTax($invoice);
        $sales = $this->reconcileTaxableBase(
            $headerTotal,
            (float) $invoice->subtotal,
            (float) ($invoice->discount ?? 0),
            $taxTotal
        );

        $this->addLine($lines, $ar, $headerTotal, 0, 'Invoice '.$invoice->invoice_number);

        if ($sales > 0.001) {
            $this->addLine($lines, $this->accounts->system('SYS-SALES'), 0, $sales, 'Sales revenue');
        }

        $this->addTaxCredits($lines, $invoice, 'output');

        $items = InvoiceItem::where('invoice_id', $invoice->id)->get();
        $this->addCogsFromItems($lines, $items, 'sale');

        $this->postJournal(
            $invoice->issue_date->format('Y-m-d'),
            'invoice',
            $invoice->id,
            $lines,
            'Sales invoice '.$invoice->invoice_number,
            $userId
        );
    }

    public function postReceipt(Receipt $receipt, ?int $userId): void
    {
        if ($this->hasPosting('receipt', $receipt->id)) {
            return;
        }

        $cash = $this->accounts->bankOrCashByName($receipt->deposit_to, $receipt->payment_mode);
        if (! $cash) {
            return;
        }

        $lines = [];
        $amount = (float) $receipt->amount_received;
        $tds = (float) ($receipt->tds_deducted ?? 0);
        $disc = (float) ($receipt->discount_allowed ?? 0);
        $settlement = $amount + $tds + $disc;

        if ($amount > 0.001) {
            $this->addLine($lines, $cash, $amount, 0, 'Receipt '.$receipt->receipt_number);
        }

        if ($receipt->is_advance || ! $receipt->invoice_id) {
            $this->addLine($lines, $this->accounts->system('SYS-CUST-ADV'), 0, $settlement, 'Customer advance');
        } else {
            $customer = Customer::find($receipt->customer_id);
            if ($customer) {
                $this->addLine($lines, $this->accounts->customerAr($customer), 0, $settlement, 'AR settlement');
            }
        }

        if ($tds > 0.001) {
            $this->addLine($lines, $this->accounts->system('SYS-TDS-REC'), $tds, 0, 'TDS deducted by customer');
        }
        if ($disc > 0.001) {
            $this->addLine($lines, $this->accounts->system('SYS-DISC-ALLOW'), $disc, 0, 'Discount allowed');
        }

        $this->postJournal(
            $receipt->payment_date->format('Y-m-d'),
            'receipt',
            $receipt->id,
            $lines,
            'Receipt '.$receipt->receipt_number,
            $userId
        );
    }

    public function postAdvanceAdjustment(AdvanceAdjustment $adjustment, ?int $userId): void
    {
        if ($this->hasPosting('advance_adjustment', $adjustment->id)) {
            return;
        }

        $receipt = Receipt::find($adjustment->advance_receipt_id);
        $invoice = Invoice::find($adjustment->invoice_id);
        if (! $receipt || ! $invoice) {
            return;
        }

        $customer = Customer::find($receipt->customer_id ?? $invoice->customer_id);
        if (! $customer) {
            return;
        }

        $amount = (float) $adjustment->adjustment_amount;
        if ($amount <= 0.001) {
            return;
        }

        $lines = [];
        $this->addLine($lines, $this->accounts->system('SYS-CUST-ADV'), $amount, 0, 'Apply customer advance');
        $this->addLine($lines, $this->accounts->customerAr($customer), 0, $amount, 'Advance applied to invoice '.$invoice->invoice_number);

        $ref = $receipt->advance_reference ?: $receipt->receipt_number;
        $this->postJournal(
            $adjustment->adjustment_date->format('Y-m-d'),
            'advance_adjustment',
            $adjustment->id,
            $lines,
            'Advance '.$ref.' applied to '.$invoice->invoice_number,
            $userId
        );
    }

    public function postExpense(Expense $expense, ?int $userId): void
    {
        if ($this->hasPosting('expense', $expense->id)) {
            return;
        }

        $vendor = Vendor::find($expense->vendor_id);
        if (! $vendor) {
            return;
        }

        $lines = [];
        $isPurchase = ($expense->record_type ?? 'expense') === 'purchase';
        $taxTotal = $this->sumTax($expense);
        $base = (float) $expense->amount;
        $isRcm = strtoupper((string) ($expense->supply_mechanism ?? 'FCM')) === 'RCM';

        if (! $isRcm && (bool) ($expense->itc_eligible ?? true) && $taxTotal > 0.001) {
            $base = $this->reconcileTaxableBase(
                (float) $expense->total_amount,
                $base,
                0,
                $taxTotal
            );
        }

        if ($isPurchase && $expense->product_id && (float) $expense->quantity_purchased > 0) {
            $this->addLine($lines, $this->accounts->system('SYS-INV'), $base, 0, 'Inventory purchase');
        } else {
            $expAcct = $this->accounts->expenseHeadByName($expense->expense_head);
            if ($expAcct) {
                $this->addLine($lines, $expAcct, $base, 0, $expense->expense_head);
            }
        }

        if ((bool) ($expense->itc_eligible ?? true)) {
            $this->addTaxDebits($lines, $expense, 'input');
        }

        $ap = $this->accounts->vendorAp($vendor);
        if ($isRcm) {
            $tax = (float) ($expense->payable_tax ?? $expense->tax_amount ?? 0);
            if ($tax > 0.001) {
                $this->addLine($lines, $this->accounts->system('SYS-RCM-PAY'), 0, $tax, 'RCM GST payable');
            }
            $this->addLine($lines, $ap, 0, (float) $expense->amount, 'Vendor payable (RCM base)');
        } else {
            $this->addLine($lines, $ap, 0, (float) $expense->total_amount, 'Vendor payable');
        }

        $this->postJournal(
            $expense->expense_date->format('Y-m-d'),
            'expense',
            $expense->id,
            $lines,
            'Expense '.$expense->expense_number,
            $userId
        );
    }

    public function postPayment(Payment $payment, ?int $userId): void
    {
        if ($this->hasPosting('payment', $payment->id)) {
            return;
        }

        $cash = $this->accounts->bankOrCashByName($payment->paid_from, $payment->payment_mode);
        if (! $cash) {
            return;
        }

        $lines = [];
        $paid = (float) $payment->amount_paid;
        $tds = (float) ($payment->tds_deducted ?? 0);
        $settlement = $paid + $tds;

        if ($payment->is_advance || ! $payment->expense_id) {
            $this->addLine($lines, $this->accounts->system('SYS-VEND-ADV'), $settlement, 0, 'Vendor advance');
        } else {
            $vendor = Vendor::where('name', $payment->payee)->first();
            if (! $vendor && $payment->expense_id) {
                $exp = Expense::find($payment->expense_id);
                $vendor = $exp ? Vendor::find($exp->vendor_id) : null;
            }
            if ($vendor) {
                $this->addLine($lines, $this->accounts->vendorAp($vendor), $settlement, 0, 'AP settlement');
            }
        }

        if ($tds > 0.001) {
            $this->addLine($lines, $this->accounts->system('SYS-TDS-PAY'), 0, $tds, 'TDS withheld');
        }
        $this->addLine($lines, $cash, 0, $paid, 'Payment '.$payment->payment_number);

        $this->postJournal(
            $payment->payment_date->format('Y-m-d'),
            'payment',
            $payment->id,
            $lines,
            'Payment '.$payment->payment_number,
            $userId
        );
    }

    public function postCreditNote(CreditNote $note, ?int $userId): void
    {
        if ($this->hasPosting('credit_note', $note->id)) {
            return;
        }

        $customer = Customer::find($note->customer_id);
        if (! $customer) {
            return;
        }

        $lines = [];
        $headerTotal = (float) $note->total_amount;
        $taxTotal = $this->sumTax($note);
        $returnBase = $this->reconcileTaxableBase(
            $headerTotal,
            (float) $note->subtotal,
            0,
            $taxTotal
        );

        if ($returnBase > 0.001) {
            $this->addLine($lines, $this->accounts->system('SYS-SALES-RET'), $returnBase, 0, 'Sales return');
        }

        $this->addTaxDebits($lines, $note, 'output_reversal');
        $this->addLine($lines, $this->accounts->customerAr($customer), 0, $headerTotal, 'Credit note AR reduction');

        $items = CreditNoteItem::where('credit_note_id', $note->id)->get();
        $this->addCogsFromItems($lines, $items, 'cn_reverse');

        $this->postJournal(
            $note->issue_date->format('Y-m-d'),
            'credit_note',
            $note->id,
            $lines,
            'Credit note '.$note->credit_note_number,
            $userId
        );
    }

    public function postDebitNote(DebitNote $note, ?int $userId): void
    {
        if ($this->hasPosting('debit_note', $note->id)) {
            return;
        }

        $vendor = Vendor::find($note->vendor_id);
        if (! $vendor) {
            return;
        }

        $lines = [];
        $headerTotal = (float) $note->total_amount;
        $taxTotal = $this->sumTax($note);
        $returnBase = $this->reconcileTaxableBase(
            $headerTotal,
            (float) $note->subtotal,
            0,
            $taxTotal
        );

        $this->addLine($lines, $this->accounts->vendorAp($vendor), $headerTotal, 0, 'Debit note AP reduction');

        if ($returnBase > 0.001) {
            $this->addLine($lines, $this->accounts->system('SYS-PURCH-RET'), 0, $returnBase, 'Purchase return');
        }

        $this->addTaxCredits($lines, $note, 'input_reversal');

        $items = DebitNoteItem::where('debit_note_id', $note->id)->get();
        $this->addCogsFromItems($lines, $items, 'dn_reverse');

        $this->postJournal(
            $note->issue_date->format('Y-m-d'),
            'debit_note',
            $note->id,
            $lines,
            'Debit note '.$note->debit_note_number,
            $userId
        );
    }

    public function postForexConversion(CurrencyConversion $fx, ?int $userId): void
    {
        if ($this->hasPosting('forex', $fx->id)) {
            return;
        }

        $fromAcct = $this->accounts->bankOrCashByName($fx->from_ledger);
        $toAcct = $this->accounts->bankOrCashByName($fx->to_ledger);
        if (! $fromAcct || ! $toAcct) {
            return;
        }

        $toAmount = (float) $fx->to_amount;
        $fromBook = (float) ($fx->from_book_amount_inr ?? ($fx->from_amount * $fx->conversion_rate));
        $lines = [];

        $this->addLine($lines, $toAcct, $toAmount, 0, 'Forex conversion in');
        $this->addLine($lines, $fromAcct, 0, $fromBook, 'Forex conversion out');

        $delta = round($toAmount - $fromBook, 2);
        if ($delta > 0.009) {
            $this->addLine($lines, $this->accounts->system('SYS-FX-GAIN'), 0, $delta, 'Forex gain');
        } elseif ($delta < -0.009) {
            $this->addLine($lines, $this->accounts->system('SYS-FX-LOSS'), abs($delta), 0, 'Forex loss');
        }

        $this->postJournal(
            $fx->conversion_date->format('Y-m-d'),
            'forex',
            $fx->id,
            $lines,
            'Forex conversion '.$fx->reference_no,
            $userId
        );
    }

    public function postConsumption(Consumption $row, ?int $userId): void
    {
        if ($this->hasPosting('consumption', $row->id)) {
            return;
        }

        $exp = $this->accounts->expenseHeadByName($row->expense_head) ?? $this->accounts->system('SYS-COGS');
        $inv = $this->accounts->system('SYS-INV');
        $value = (float) $row->total_value;

        $this->postJournal(
            $row->consumption_date->format('Y-m-d'),
            'consumption',
            $row->id,
            [
                ['account' => $exp, 'debit' => $value, 'credit' => 0, 'memo' => 'Stock consumption'],
                ['account' => $inv, 'debit' => 0, 'credit' => $value, 'memo' => 'Inventory issue'],
            ],
            'Consumption '.$row->consumption_number,
            $userId
        );
    }

    /** @param  list<array{account: GlAccount, debit: float, credit: float, memo?: string}>  $lines */
    private function addLine(array &$lines, GlAccount $account, float $debit, float $credit, string $memo = ''): void
    {
        if ($debit <= 0.001 && $credit <= 0.001) {
            return;
        }
        $lines[] = ['account' => $account, 'debit' => $debit, 'credit' => $credit, 'memo' => $memo];
    }

    /** @param  Collection<int, InvoiceItem|CreditNoteItem|DebitNoteItem>  $items */
    private function addCogsFromItems(array &$lines, Collection $items, string $mode): void
    {
        $cogs = $this->accounts->system('SYS-COGS');
        $inv = $this->accounts->system('SYS-INV');

        foreach ($items as $item) {
            if (! $item->product_id) {
                continue;
            }
            $product = Inventory::find($item->product_id);
            if (! $product || $product->type !== 'Product') {
                continue;
            }

            $qty = (float) ($item->quantity ?? 0);
            if ($qty <= 0) {
                continue;
            }

            $unitCost = (float) ($product->purchase_price ?? 0);
            if ($unitCost <= 0) {
                $unitCost = (float) ($product->rate ?? 0);
            }
            $cost = round($qty * $unitCost, 2);
            if ($cost <= 0.001) {
                continue;
            }

            if ($mode === 'sale') {
                $this->addLine($lines, $cogs, $cost, 0, 'COGS — '.$product->name);
                $this->addLine($lines, $inv, 0, $cost, 'Inventory — '.$product->name);
            } elseif ($mode === 'cn_reverse') {
                $this->addLine($lines, $inv, $cost, 0, 'Inventory return — '.$product->name);
                $this->addLine($lines, $cogs, 0, $cost, 'COGS reversal');
            } elseif ($mode === 'dn_reverse') {
                $this->addLine($lines, $inv, 0, $cost, 'Inventory return to vendor');
                $this->addLine($lines, $cogs, $cost, 0, 'COGS reversal');
            }
        }
    }

    /** @param  list<array{account: GlAccount, debit: float, credit: float, memo?: string}>  $lines */
    private function addTaxCredits(array &$lines, object $doc, string $kind): void
    {
        $map = [
            'output' => ['SYS-OUT-CGST', 'SYS-OUT-SGST', 'SYS-OUT-IGST'],
            'input_reversal' => ['SYS-IN-CGST', 'SYS-IN-SGST', 'SYS-IN-IGST'],
        ];
        $codes = $map[$kind] ?? $map['output'];
        $parts = ['cgst', 'sgst', 'igst'];
        $componentTotal = 0.0;
        foreach ($parts as $i => $field) {
            $amt = (float) ($doc->{$field} ?? 0);
            if ($amt > 0.001) {
                $this->addLine($lines, $this->accounts->system($codes[$i]), 0, $amt, strtoupper($field));
                $componentTotal += $amt;
            }
        }

        $fallbackTax = $this->sumTax($doc);
        if ($componentTotal <= 0.001 && $fallbackTax > 0.001) {
            $fallbackCode = $kind === 'input_reversal' ? 'SYS-IN-IGST' : 'SYS-OUT-IGST';
            $this->addLine($lines, $this->accounts->system($fallbackCode), 0, $fallbackTax, 'GST');
        }
    }

    /** @param  list<array{account: GlAccount, debit: float, credit: float, memo?: string}>  $lines */
    private function addTaxDebits(array &$lines, object $doc, string $kind): void
    {
        if ($kind === 'output_reversal') {
            $map = ['SYS-OUT-CGST', 'SYS-OUT-SGST', 'SYS-OUT-IGST'];
        } else {
            $map = ['SYS-IN-CGST', 'SYS-IN-SGST', 'SYS-IN-IGST'];
        }
        $parts = ['cgst', 'sgst', 'igst'];
        $componentTotal = 0.0;
        foreach ($parts as $i => $field) {
            $amt = (float) ($doc->{$field} ?? 0);
            if ($amt > 0.001) {
                $this->addLine($lines, $this->accounts->system($map[$i]), $amt, 0, strtoupper($field).' reversal');
                $componentTotal += $amt;
            }
        }

        $fallbackTax = $this->sumTax($doc);
        if ($componentTotal <= 0.001 && $fallbackTax > 0.001) {
            $fallbackCode = $kind === 'output_reversal' ? 'SYS-OUT-IGST' : 'SYS-IN-IGST';
            $this->addLine($lines, $this->accounts->system($fallbackCode), $fallbackTax, 0, 'GST reversal');
        }
    }

    private function sumTax(object $doc): float
    {
        $parts = (float) ($doc->cgst ?? 0) + (float) ($doc->sgst ?? 0) + (float) ($doc->igst ?? 0);
        if ($parts > 0.001) {
            return round($parts, 2);
        }

        return round((float) ($doc->tax_amount ?? $doc->payable_tax ?? 0), 2);
    }

    private function reconcileTaxableBase(float $headerTotal, float $subtotal, float $discount, float $taxTotal): float
    {
        $baseFromDoc = max(0, round($subtotal - $discount, 2));
        $expectedTotal = round($baseFromDoc + $taxTotal, 2);

        if (abs($headerTotal - $expectedTotal) > 0.05) {
            return max(0, round($headerTotal - $taxTotal, 2));
        }

        return $baseFromDoc;
    }

    /**
     * @param  list<array{account: GlAccount, debit: float, credit: float, memo?: string}>  $lines
     * @return list<array{account: GlAccount, debit: float, credit: float, memo?: string}>
     */
    private function normalizeLines(array $lines, ?string $sourceType = null, ?int $sourceId = null): array
    {
        $merged = [];
        foreach ($lines as $line) {
            if (! isset($line['account']) || ! $line['account'] instanceof GlAccount) {
                throw new RuntimeException('GL line missing account.');
            }
            $id = $line['account']->id;
            if (! isset($merged[$id])) {
                $merged[$id] = [
                    'account' => $line['account'],
                    'debit' => 0,
                    'credit' => 0,
                    'memo' => $line['memo'] ?? '',
                ];
            }
            $merged[$id]['debit'] += (float) ($line['debit'] ?? 0);
            $merged[$id]['credit'] += (float) ($line['credit'] ?? 0);
        }

        $debitTotal = array_sum(array_column($merged, 'debit'));
        $creditTotal = array_sum(array_column($merged, 'credit'));
        if (abs($debitTotal - $creditTotal) > 0.05) {
            $context = ($sourceType && $sourceId)
                ? sprintf(' [%s #%d]', $sourceType, $sourceId)
                : '';
            throw new RuntimeException(sprintf(
                'Unbalanced journal%s: Dr %.2f Cr %.2f',
                $context,
                $debitTotal,
                $creditTotal
            ));
        }

        return array_values($merged);
    }
}
