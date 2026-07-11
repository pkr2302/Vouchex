<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\PostsToGeneralLedger;
use App\Http\Controllers\Controller;
use App\Models\AdvanceAdjustment;
use App\Models\BankLedger;
use App\Models\CashLedger;
use App\Models\Consumption;
use App\Models\CurrencyConversion;
use App\Models\CompanySetting;
use App\Models\Company;
use App\Models\CreditNote;
use App\Models\CreditNoteItem;
use App\Models\Customer;
use App\Models\DebitNote;
use App\Models\DebitNoteItem;
use App\Models\EcrsLog;
use App\Models\Expense;
use App\Models\ExpenseHead;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Receipt;
use App\Models\User;
use App\Models\Vendor;
use App\Services\AuditService;
use App\Services\CoaService;
use App\Services\GlAccountService;
use App\Services\GlPostingService;
use App\Services\NumberSequenceService;
use App\Services\PortalDataService;
use App\Services\StockService;
use App\Services\SyncService;
use App\Support\ApiErrorResponse;
use App\Support\TenantContext;
use App\Support\TenantRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PortalMutationController extends Controller
{
    use PostsToGeneralLedger;

    public function __construct(
        private AuditService $audit,
        private SyncService $sync,
        private StockService $stock,
        private NumberSequenceService $numbers,
    ) {}

    public function storeCustomer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'category' => 'nullable|string|max:50',
            'gst_type' => 'required|string|max:100',
            'gstin' => 'nullable|string|max:20',
            'pan' => 'nullable|string|max:20',
            'currency' => 'nullable|string|max:10',
            'billing_address' => 'nullable|string',
            'billing_city' => 'nullable|string|max:100',
            'billing_state' => 'nullable|string|max:100',
            'billing_pincode' => 'nullable|string|max:20',
            'billing_country' => 'nullable|string|max:100',
            'shipping_same' => 'boolean',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:100',
            'shipping_state' => 'nullable|string|max:100',
            'shipping_pincode' => 'nullable|string|max:20',
            'shipping_country' => 'nullable|string|max:100',
            'opening_balance' => 'numeric',
            'opening_balance_date' => 'nullable|date',
            'payment_terms' => 'nullable|string|max:100',
            'credit_limit' => 'numeric',
        ]);

        $customer = Customer::create($data);
        $this->audit->log($request->user(), 'CREATE CUSTOMER', $customer->name, "GST: {$customer->gst_type}");
        $this->sync->bump('customers', 'create', $customer->id, $request->user()->id);

        return response()->json(['success' => true, 'customer' => $customer], 201);
    }

    public function storeInvoice(Request $request): JsonResponse
    {
        try {
            return $this->storeInvoiceInternal($request);
        } catch (\Throwable $e) {
            report($e);

            return ApiErrorResponse::fromThrowable($e, $request);
        }
    }

    private function storeInvoiceInternal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice' => 'required|array',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string|max:500',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.rate' => 'required|numeric|min:0',
            'items.*.line_total' => 'required|numeric|min:0',
            'items.*.product_id' => 'nullable',
            'items.*.hsn_sac' => 'nullable|string|max:20',
            'items.*.item_detail' => 'nullable|string|max:500',
            'advance_adjustments' => 'nullable|array',
            'advance_adjustments.*.advance_receipt_id' => 'required|integer',
            'advance_adjustments.*.adjustment_amount' => 'required|numeric|min:0.01',
        ]);

        $companyId = TenantContext::getCompanyId();
        if (!$companyId) {
            return ApiErrorResponse::manual(
                'No company selected.',
                422,
                'Super admin must choose a company from the header dropdown before raising invoices.',
                'Select a company at the top-right, then try saving the invoice again.',
                'company_context'
            );
        }

        $user = $request->user();
        $inv = $data['invoice'];

        $dueDate = $inv['due_date'] ?? null;
        if ($dueDate === '' || $dueDate === null) {
            $dueDate = null;
        }

        $customerId = isset($inv['customer_id']) && $inv['customer_id'] !== '' && $inv['customer_id'] !== null
            ? (int) $inv['customer_id']
            : null;

        if ($customerId) {
            $customerExists = Customer::query()
                ->where('company_id', $companyId)
                ->where('id', $customerId)
                ->exists();
            if (!$customerExists) {
                return ApiErrorResponse::manual(
                    'Selected customer was not found for this company.',
                    422,
                    'The customer ID in the form does not belong to the active company, or the record was deleted.',
                    'Re-select the customer from the dropdown and save again.',
                    'validation'
                );
            }
        }

        $gstin = trim((string) ($inv['gstin'] ?? 'NIL'));
        if ($gstin === '') {
            $gstin = 'NIL';
        } elseif (strlen($gstin) > 15) {
            $gstin = substr(preg_replace('/\s+/', '', strtoupper($gstin)), 0, 15);
        }

        $requestedNumber = trim((string) ($inv['invoice_number'] ?? ''));
        if ($requestedNumber !== '') {
            $taken = Invoice::query()
                ->where('company_id', $companyId)
                ->where('invoice_number', $requestedNumber)
                ->exists();
            if ($taken) {
                $suggested = $this->numbers->suggestNextInSeries('invoices', 'invoice_number');

                return ApiErrorResponse::manual(
                    "Invoice number \"{$requestedNumber}\" is already used.",
                    422,
                    'Each invoice number must be unique within your company. The number you entered is already on file (possibly from a previous save that succeeded).',
                    "Use \"{$suggested}\" or refresh the page to load the latest invoice list, then try again.",
                    'duplicate_number'
                );
            }
        }

        $invoice = DB::transaction(function () use ($inv, $data, $user, $dueDate, $companyId, $customerId, $gstin, $requestedNumber) {
            $number = $requestedNumber !== ''
                ? $requestedNumber
                : $this->numbers->next('INV', 'invoices', 'invoice_number');

            $invoice = Invoice::create([
                'company_id' => $companyId,
                'invoice_number' => $number,
                'invoice_type' => $inv['invoice_type'] ?? 'B2B',
                'customer_id' => $customerId,
                'customer_name' => $inv['customer_name'] ?? 'Unknown Client',
                'issue_date' => $inv['issue_date'],
                'due_date' => $dueDate,
                'po_number' => $this->nullablePoNumber($inv['po_number'] ?? null),
                'billing_address' => $inv['billing_address'] ?? '',
                'shipping_address' => $inv['shipping_address'] ?? $inv['billing_address'] ?? '',
                'place_of_supply' => $inv['place_of_supply'] ?? '',
                'print_place_of_supply_on_pdf' => array_key_exists('print_place_of_supply_on_pdf', $inv)
                    ? filter_var($inv['print_place_of_supply_on_pdf'], FILTER_VALIDATE_BOOLEAN)
                    : true,
                'gstin' => $gstin,
                'subtotal' => (float) ($inv['subtotal'] ?? 0),
                'discount' => (float) ($inv['discount'] ?? 0),
                'tax_rate' => (float) ($inv['tax_rate'] ?? 0),
                'tax_amount' => (float) ($inv['tax_amount'] ?? 0),
                'cgst' => (float) ($inv['cgst'] ?? 0),
                'sgst' => (float) ($inv['sgst'] ?? 0),
                'igst' => (float) ($inv['igst'] ?? 0),
                'payable_tax' => (float) ($inv['payable_tax'] ?? ($inv['tax_amount'] ?? 0)),
                'supply_mechanism' => $inv['supply_mechanism'] ?? 'FCM',
                'total_amount' => (float) ($inv['total_amount'] ?? 0),
                'currency' => $this->normalizeDocumentCurrency($inv['currency'] ?? 'INR'),
                'conversion_rate' => $inv['conversion_rate'] ?? null,
                'export_country' => $inv['export_country'] ?? null,
                'export_treatment' => $inv['export_treatment'] ?? null,
                'status' => $inv['status'] ?? 'Unpaid',
                'created_by' => $user->id,
                'created_by_name' => $user->name,
            ]);

            foreach ($data['items'] as $item) {
                $productId = !empty($item['product_id']) ? (int) $item['product_id'] : null;
                if ($productId) {
                    $product = Inventory::query()
                        ->where('company_id', $companyId)
                        ->where('id', $productId)
                        ->first();
                    if (!$product) {
                        $productId = null;
                    }
                }

                $description = trim((string) ($item['description'] ?? ''));
                if ($description === '' && $productId) {
                    $description = Inventory::query()->where('id', $productId)->value('name') ?? 'Item';
                }

                $qty = isset($item['quantity']) && $item['quantity'] !== null && $item['quantity'] !== ''
                    ? (float) $item['quantity']
                    : 0;

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $productId,
                    'description' => $description,
                    'item_detail' => ($item['item_detail'] ?? null) ?: null,
                    'quantity' => $qty,
                    'unit_price' => (float) $item['rate'],
                    'line_total' => (float) $item['line_total'],
                    'hsn_sac' => $item['hsn_sac'] ?? 'NIL',
                ]);

                if ($productId && $qty > 0) {
                    $product = Inventory::query()->where('id', $productId)->first();
                    if ($product && $product->type === 'Product') {
                        $this->stock->adjust($productId, -((int) round($qty)));
                    }
                }
            }

            return $invoice;
        });

        try {
            $this->audit->log($user, 'CREATE INVOICE', $invoice->invoice_number, 'Total: INR '.$invoice->total_amount);
            $this->sync->bump('invoices', 'create', $invoice->id, $user->id);
            $this->sync->bump('inventory', 'update', null, $user->id);
        } catch (\Throwable $e) {
            report($e);
        }

        $this->liveGlPost($companyId, $user->id, fn (GlPostingService $gl, int $uid) => $gl->postInvoice($invoice->fresh(), $uid));

        if (! empty($data['advance_adjustments'])) {
            $adjustmentDate = $inv['issue_date'] ?? now()->format('Y-m-d');
            $created = $this->createAdvanceAdjustments(
                $data['advance_adjustments'],
                (int) $invoice->id,
                $adjustmentDate,
                $user
            );
            $this->sync->bump('advance_adjustments', 'create', null, $user->id);
            $this->sync->bump('invoices', 'update', $invoice->id, $user->id);
            foreach ($created as $adj) {
                $this->liveGlPost($companyId, $user->id, fn (GlPostingService $gl, int $uid) => $gl->postAdvanceAdjustment($adj->fresh(), $uid));
            }
        }

        return response()->json(['success' => true, 'invoice' => $invoice->fresh('items')], 201);
    }

    public function storeReceipt(Request $request): JsonResponse
    {
        $data = $request->validate([
            'is_bulk' => 'boolean',
            'customer_id' => 'required|integer',
            'customer_name' => 'required|string|max:255',
            'payment_date' => 'required|date',
            'payment_mode' => 'nullable|string|max:100',
            'deposit_to' => 'nullable|string|max:255',
            'reference_no' => 'nullable|string|max:100',
            'amount_received' => 'nullable|numeric',
            'invoice_id' => 'nullable|integer',
            'invoice_number' => 'nullable|string',
            'tds_deducted' => 'nullable|numeric',
            'discount_allowed' => 'numeric',
            'currency' => 'nullable|string|max:10',
            'conversion_rate' => 'nullable|numeric',
            'is_advance' => 'boolean',
            'advance_reference' => 'nullable|string|max:64',
            'utr_number' => 'nullable|string|max:100',
            'cheque_number' => 'nullable|string|max:100',
            'bank_reference' => 'nullable|string|max:100',
            'customer_reference' => 'nullable|string|max:100',
            'allocations' => 'nullable|array',
        ]);

        $user = $request->user();
        $recNumber = $this->numbers->next('REC', 'receipts', 'receipt_number');

        $created = DB::transaction(function () use ($data, $user, $recNumber) {
            $rows = [];
            if (!empty($data['is_bulk']) && !empty($data['allocations'])) {
                foreach ($data['allocations'] as $alloc) {
                    $rows[] = $this->persistReceipt($recNumber, $data, $alloc, $user);
                }
            } else {
                $rows[] = $this->persistReceipt($recNumber, $data, $data, $user);
            }
            return $rows;
        });

        $this->sync->bump('receipts', 'create', null, $user->id);
        $this->sync->bump('invoices', 'update', null, $user->id);

        $companyId = (int) TenantContext::getCompanyId();
        foreach ($created as $rec) {
            $this->liveGlPost($companyId, $user->id, fn (GlPostingService $gl, int $uid) => $gl->postReceipt($rec->fresh(), $uid));
        }

        return response()->json(['success' => true, 'receipt' => $created[0] ?? null], 201);
    }

    private function persistReceipt(string $recNumber, array $parent, array $alloc, $user): Receipt
    {
        $invoiceId = ! empty($alloc['invoice_id'] ?? null)
            ? (int) $alloc['invoice_id']
            : (! empty($parent['invoice_id'] ?? null) ? (int) $parent['invoice_id'] : null);

        $isAdvance = $invoiceId === null && filter_var($parent['is_advance'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $invoiceNumber = $alloc['invoice_number'] ?? $parent['invoice_number'] ?? null;
        if ($invoiceId) {
            $isAdvance = false;
            if (! $invoiceNumber || $invoiceNumber === 'NIL' || trim((string) $invoiceNumber) === '') {
                $invoiceNumber = Invoice::query()->where('id', $invoiceId)->value('invoice_number') ?? 'NIL';
            }
        } elseif ($isAdvance) {
            $invoiceNumber = 'NIL';
        } else {
            $invoiceNumber = $invoiceNumber ?: 'NIL';
        }

        $cash = (float) ($alloc['amount_received'] ?? $parent['amount_received'] ?? 0);
        $tds = $this->numericOrZero($alloc['tds_deducted'] ?? $parent['tds_deducted'] ?? 0);
        $disc = $this->numericOrZero($alloc['discount_allowed'] ?? $parent['discount_allowed'] ?? 0);
        $this->assertReceiptSettlement($invoiceId, $cash, $tds, $disc, $isAdvance);

        $advanceReference = null;
        if ($isAdvance) {
            $advanceReference = trim((string) ($parent['advance_reference'] ?? ''));
            if ($advanceReference === '') {
                $advanceReference = $this->numbers->nextAdvanceReference((string) ($parent['payment_date'] ?? now()->format('Y-m-d')));
            }
            $this->assertAdvanceReferenceUnique($advanceReference, null);
        }

        $receipt = Receipt::create([
            'receipt_number' => $recNumber,
            'advance_reference' => $advanceReference,
            'invoice_id' => $invoiceId,
            'invoice_number' => $invoiceNumber,
            'customer_id' => $parent['customer_id'],
            'customer_name' => $parent['customer_name'],
            'payment_date' => $parent['payment_date'],
            'amount_received' => $cash,
            'tds_deducted' => $tds,
            'discount_allowed' => $disc,
            'currency' => strtoupper((string) ($parent['currency'] ?? 'INR')) ?: 'INR',
            'conversion_rate' => $parent['conversion_rate'] ?? null,
            'payment_mode' => $parent['payment_mode'] ?? '',
            'deposit_to' => $parent['deposit_to'] ?? '',
            'reference_no' => $parent['reference_no'] ?? 'NIL',
            'utr_number' => $parent['utr_number'] ?? null,
            'cheque_number' => $parent['cheque_number'] ?? null,
            'bank_reference' => $parent['bank_reference'] ?? null,
            'customer_reference' => $parent['customer_reference'] ?? null,
            'is_advance' => $isAdvance,
            'created_by' => $user->id,
            'created_by_name' => $user->name,
        ]);

        if ($receipt->invoice_id) {
            $this->refreshInvoiceStatus((int) $receipt->invoice_id);
        }

        return $receipt;
    }

    private function refreshInvoiceStatus(int $invoiceId): void
    {
        $invoice = Invoice::find($invoiceId);
        if (!$invoice) {
            return;
        }
        $advanceAdjusted = (float) AdvanceAdjustment::where('invoice_id', $invoiceId)->sum('adjustment_amount');
        $paid = (float) Receipt::where('invoice_id', $invoiceId)
            ->selectRaw('COALESCE(SUM(amount_received + tds_deducted + discount_allowed), 0) as total')
            ->value('total');
        $settled = round($advanceAdjusted + $paid, 2);
        $invoice->status = $settled >= (float) $invoice->total_amount ? 'Paid' : ($settled > 0.009 ? 'Partially Paid' : 'Unpaid');
        $invoice->save();
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_number' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'expense_head' => 'required|string|max:100',
            'vendor_id' => 'required|integer',
            'vendor_name' => 'required|string|max:255',
            'expense_date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'tax_rate' => 'numeric',
            'tax_amount' => 'numeric',
            'total_amount' => 'required|numeric|min:0',
            'payment_status' => 'nullable|string|max:30',
            'hsn_sac' => 'nullable|string|max:20',
            'is_recurring' => 'boolean',
            'recurring_frequency' => 'nullable|string|max:30',
            'reminders_opt_in' => 'boolean',
            'itc_eligible' => 'boolean',
            'tds_deducted' => 'numeric',
            'attachment' => 'nullable|string|max:255',
            'due_date' => 'nullable|date',
            'paid_from_account' => 'nullable|string|max:255',
            'payment_reference' => 'nullable|string|max:100',
            'product_id' => 'nullable|integer',
            'quantity_purchased' => 'nullable|integer|min:0',
            'record_type' => 'nullable|in:purchase,expense',
            'currency' => 'nullable|string|max:10',
            'conversion_rate' => 'nullable|numeric',
            'export_country' => 'nullable|string|max:100',
            'place_of_supply' => 'nullable|string|max:100',
            'cgst' => 'numeric',
            'sgst' => 'numeric',
            'igst' => 'numeric',
            'payable_tax' => 'numeric',
            'supply_mechanism' => 'nullable|string|max:20',
        ]);

        $data['currency'] = $this->normalizeDocumentCurrency($data['currency'] ?? 'INR');

        $user = $request->user();
        $expNumber = $this->numbers->next('EXP', 'expenses', 'expense_number');

        $expense = DB::transaction(function () use ($data, $user, $expNumber) {
            $expense = Expense::create(array_merge($data, [
                'expense_number' => $expNumber,
                'created_by' => $user->id,
                'created_by_name' => $user->name,
            ]));

            if (!empty($data['product_id']) && !empty($data['quantity_purchased'])) {
                $this->stock->adjust((int) $data['product_id'], (int) $data['quantity_purchased']);
            }

            if (($data['payment_status'] ?? '') === 'Paid') {
                Payment::create([
                    'payment_number' => $this->numbers->next('PAY', 'payments', 'payment_number'),
                    'expense_id' => $expense->id,
                    'expense_number' => $expNumber,
                    'payee' => $expense->vendor_name,
                    'payment_date' => $expense->expense_date,
                    'amount_paid' => $expense->total_amount - $expense->tds_deducted,
                    'payment_mode' => str_contains($expense->paid_from_account ?? '', 'Bank') ? 'Bank/HDFC NetBanking' : 'Cash',
                    'reference_no' => $expense->payment_reference ?: 'CASH-AUTO-SETTLE',
                    'created_by' => $user->id,
                    'created_by_name' => $user->name,
                ]);
            }

            return $expense;
        });

        $this->audit->log($user, 'CREATE EXPENSE', $expense->expense_number, $expense->vendor_name);
        $this->sync->bump('expenses', 'create', $expense->id, $user->id);

        $companyId = (int) TenantContext::getCompanyId();
        $this->liveGlPost($companyId, $user->id, fn (GlPostingService $gl, int $uid) => $gl->postExpense($expense->fresh(), $uid));
        if (($data['payment_status'] ?? '') === 'Paid') {
            $linkedPayment = Payment::where('expense_id', $expense->id)->orderByDesc('id')->first();
            if ($linkedPayment) {
                $this->liveGlPost($companyId, $user->id, fn (GlPostingService $gl, int $uid) => $gl->postPayment($linkedPayment->fresh(), $uid));
            }
        }

        return response()->json(['success' => true, 'expense' => $expense], 201);
    }

    public function storePayment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'is_bulk' => 'boolean',
            'payee' => 'required|string|max:255',
            'payment_date' => 'required|date',
            'payment_mode' => 'nullable|string|max:100',
            'paid_from' => 'nullable|string|max:255',
            'reference_no' => 'nullable|string|max:100',
            'amount_paid' => 'nullable|numeric',
            'expense_id' => 'nullable|integer',
            'expense_number' => 'nullable|string',
            'tds_deducted' => 'numeric',
            'currency' => 'nullable|string|max:10',
            'conversion_rate' => 'nullable|numeric',
            'is_advance' => 'boolean',
            'allocations' => 'nullable|array',
        ]);

        $user = $request->user();
        $payNumber = $this->numbers->next('PAY', 'payments', 'payment_number');

        $payment = DB::transaction(function () use ($data, $user, $payNumber) {
            if (!empty($data['is_bulk']) && !empty($data['allocations'])) {
                $first = null;
                foreach ($data['allocations'] as $alloc) {
                    $expenseId = ! empty($alloc['expense_id']) ? (int) $alloc['expense_id'] : null;
                    $expenseNumber = $alloc['expense_number'] ?? null;
                    if ($expenseId && (! $expenseNumber || $expenseNumber === 'NIL')) {
                        $expenseNumber = Expense::query()->where('id', $expenseId)->value('expense_number') ?? 'NIL';
                    }

                    $paid = (float) ($alloc['amount_paid'] ?? 0);
                    $tds = $this->numericOrZero($alloc['tds_deducted'] ?? 0);
                    $this->assertPaymentSettlement($expenseId, $paid, $tds, false);

                    $p = Payment::create([
                        'payment_number' => $payNumber,
                        'expense_id' => $expenseId,
                        'expense_number' => $expenseNumber ?? 'NIL',
                        'payee' => $data['payee'],
                        'payment_date' => $data['payment_date'],
                        'amount_paid' => $paid,
                        'tds_deducted' => $tds,
                        'currency' => strtoupper((string) ($data['currency'] ?? 'INR')) ?: 'INR',
                        'conversion_rate' => $data['conversion_rate'] ?? null,
                        'payment_mode' => $data['payment_mode'] ?? '',
                        'paid_from' => $data['paid_from'] ?? '',
                        'reference_no' => $data['reference_no'] ?? 'NIL',
                        'is_advance' => false,
                        'created_by' => $user->id,
                        'created_by_name' => $user->name,
                    ]);
                    if ($expenseId) {
                        $this->refreshExpenseStatus($expenseId);
                    }
                    $first ??= $p;
                }

                return $first;
            }

            $expenseId = ! empty($data['expense_id']) ? (int) $data['expense_id'] : null;
            $isAdvance = $expenseId === null && filter_var($data['is_advance'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $expenseNumber = $data['expense_number'] ?? null;
            if ($expenseId) {
                $isAdvance = false;
                if (! $expenseNumber || $expenseNumber === 'NIL' || trim((string) $expenseNumber) === '') {
                    $expenseNumber = Expense::query()->where('id', $expenseId)->value('expense_number') ?? 'NIL';
                }
            } elseif ($isAdvance) {
                $expenseNumber = 'NIL';
            } else {
                $expenseNumber = $expenseNumber ?: 'NIL';
            }

            $paid = (float) ($data['amount_paid'] ?? 0);
            $tds = $this->numericOrZero($data['tds_deducted'] ?? 0);
            $this->assertPaymentSettlement($expenseId, $paid, $tds, $isAdvance);

            $p = Payment::create([
                'payment_number' => $payNumber,
                'expense_id' => $expenseId,
                'expense_number' => $expenseNumber,
                'payee' => $data['payee'],
                'payment_date' => $data['payment_date'],
                'amount_paid' => $paid,
                'tds_deducted' => $tds,
                'currency' => strtoupper((string) ($data['currency'] ?? 'INR')) ?: 'INR',
                'conversion_rate' => $data['conversion_rate'] ?? null,
                'payment_mode' => $data['payment_mode'] ?? '',
                'paid_from' => $data['paid_from'] ?? '',
                'reference_no' => $data['reference_no'] ?? 'NIL',
                'is_advance' => $isAdvance,
                'created_by' => $user->id,
                'created_by_name' => $user->name,
            ]);

            if ($p->expense_id) {
                $this->refreshExpenseStatus((int) $p->expense_id);
            }

            return $p;
        });

        $this->sync->bump('payments', 'create', $payment?->id, $user->id);

        $companyId = (int) TenantContext::getCompanyId();
        $postedPayments = Payment::where('payment_number', $payNumber)->get();
        foreach ($postedPayments as $p) {
            $this->liveGlPost($companyId, $user->id, fn (GlPostingService $gl, int $uid) => $gl->postPayment($p->fresh(), $uid));
        }

        return response()->json(['success' => true, 'payment' => $payment], 201);
    }

    private function refreshExpenseStatus(int $expenseId): void
    {
        $expense = Expense::find($expenseId);
        if (!$expense) {
            return;
        }
        $paid = Payment::where('expense_id', $expenseId)
            ->selectRaw('COALESCE(SUM(amount_paid + tds_deducted), 0) as total')
            ->value('total');
        $expense->payment_status = $paid >= $expense->total_amount ? 'Paid' : 'Partially Paid';
        $expense->save();
    }

    public function storeVendor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'category' => 'nullable|string|max:50',
            'gst_type' => 'nullable|string|max:100',
            'gstin' => 'nullable|string|max:20',
            'currency' => 'nullable|string|max:10',
            'billing_address' => 'nullable|string',
            'billing_city' => 'nullable|string|max:100',
            'billing_state' => 'nullable|string|max:100',
            'billing_pincode' => 'nullable|string|max:20',
            'billing_country' => 'nullable|string|max:100',
            'pan' => 'nullable|string|max:20',
            'opening_balance' => 'numeric',
            'opening_balance_date' => 'nullable|date',
            'payment_terms' => 'nullable|string|max:100',
        ]);
        if (!empty($data['currency'])) {
            $data['currency'] = $this->normalizeDocumentCurrency($data['currency']);
        }
        $vendor = Vendor::create($data);
        $this->sync->bump('vendors', 'create', $vendor->id, $request->user()->id);

        return response()->json(['success' => true, 'vendor' => $vendor], 201);
    }

    public function storeInventory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|in:Product,Service',
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'sku' => 'nullable|string|max:50',
            'quantity' => 'integer|min:0',
            'unit' => 'nullable|string|max:30',
            'rate' => 'required|numeric|min:0',
            'purchase_price' => 'numeric',
            'sales_price' => 'numeric',
            'tax_rate' => 'numeric',
            'opening_stock' => 'integer|min:0',
            'low_stock_threshold' => 'integer|min:0',
            'product_class' => 'nullable|in:raw_material,semi_finished,finished_goods',
            'default_expense_head' => 'nullable|string|max:100',
        ]);

        $user = $request->user();
        $item = Inventory::create(array_merge($data, [
            'created_by' => $user->id,
            'quantity' => $data['type'] === 'Product' ? ($data['quantity'] ?? 0) : 0,
        ]));

        $this->sync->bump('inventory', 'create', $item->id, $user->id);

        return response()->json(['success' => true, 'item' => $item], 201);
    }

    public function storeCreditNote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'credit_note' => 'required|array',
            'items' => 'required|array|min:1',
        ]);

        $user = $request->user();
        $cn = $data['credit_note'];
        $number = $this->numbers->next('CN', 'credit_notes', 'credit_note_number');

        $note = DB::transaction(function () use ($cn, $data, $user, $number) {
            $note = CreditNote::create([
                'credit_note_number' => $number,
                'customer_id' => $cn['customer_id'],
                'customer_name' => $cn['customer_name'],
                'original_invoice_id' => $cn['original_invoice_id'],
                'original_invoice_number' => $cn['original_invoice_number'],
                'original_invoice_date' => $cn['original_invoice_date'],
                'issue_date' => $cn['issue_date'],
                'reason' => $cn['reason'] ?? '',
                'subtotal' => $cn['subtotal'],
                'discount' => $cn['discount'] ?? 0,
                'tax_rate' => $cn['tax_rate'] ?? 0,
                'tax_amount' => $cn['tax_amount'] ?? 0,
                'total_amount' => $cn['total_amount'],
                'cgst' => $cn['cgst'] ?? 0,
                'sgst' => $cn['sgst'] ?? 0,
                'igst' => $cn['igst'] ?? 0,
                'payable_tax' => $cn['payable_tax'] ?? ($cn['tax_amount'] ?? 0),
                'supply_mechanism' => $cn['supply_mechanism'] ?? 'FCM',
                'currency' => $this->normalizeDocumentCurrency($cn['currency'] ?? 'INR'),
                'conversion_rate' => $cn['conversion_rate'] ?? null,
                'export_country' => $cn['export_country'] ?? null,
                'created_by' => $user->id,
                'created_by_name' => $user->name,
            ]);

            foreach ($data['items'] as $item) {
                CreditNoteItem::create([
                    'credit_note_id' => $note->id,
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['rate'],
                    'line_total' => $item['line_total'],
                    'hsn_sac' => $item['hsn_sac'] ?? 'NIL',
                ]);
                if (!empty($item['product_id'])) {
                    $this->stock->adjust((int) $item['product_id'], (int) $item['quantity']);
                }
            }

            return $note;
        });

        $this->sync->bump('credit_notes', 'create', $note->id, $user->id);

        $companyId = (int) TenantContext::getCompanyId();
        $this->liveGlPost($companyId, $user->id, fn (GlPostingService $gl, int $uid) => $gl->postCreditNote($note->fresh(), $uid));

        return response()->json(['success' => true, 'credit_note' => $note], 201);
    }

    public function storeDebitNote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'debit_note' => 'required|array',
            'items' => 'required|array|min:1',
        ]);

        $user = $request->user();
        $dn = $data['debit_note'];
        $number = $this->numbers->next('DN', 'debit_notes', 'debit_note_number');

        $note = DB::transaction(function () use ($dn, $data, $user, $number) {
            $note = DebitNote::create([
                'debit_note_number' => $number,
                'vendor_id' => $dn['vendor_id'],
                'vendor_name' => $dn['vendor_name'],
                'original_expense_id' => $dn['original_expense_id'],
                'original_expense_number' => $dn['original_expense_number'],
                'original_expense_date' => $dn['original_expense_date'],
                'issue_date' => $dn['issue_date'],
                'reason' => $dn['reason'] ?? '',
                'subtotal' => $dn['subtotal'],
                'tax_rate' => $dn['tax_rate'] ?? 0,
                'tax_amount' => $dn['tax_amount'] ?? 0,
                'total_amount' => $dn['total_amount'],
                'cgst' => $dn['cgst'] ?? 0,
                'sgst' => $dn['sgst'] ?? 0,
                'igst' => $dn['igst'] ?? 0,
                'payable_tax' => $dn['payable_tax'] ?? ($dn['tax_amount'] ?? 0),
                'supply_mechanism' => $dn['supply_mechanism'] ?? 'FCM',
                'currency' => $this->normalizeDocumentCurrency($dn['currency'] ?? 'INR'),
                'conversion_rate' => $dn['conversion_rate'] ?? null,
                'export_country' => $dn['export_country'] ?? null,
                'created_by' => $user->id,
                'created_by_name' => $user->name,
            ]);

            foreach ($data['items'] as $item) {
                DebitNoteItem::create([
                    'debit_note_id' => $note->id,
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['rate'],
                    'line_total' => $item['line_total'],
                    'hsn_sac' => $item['hsn_sac'] ?? 'NIL',
                ]);
                if (!empty($item['product_id'])) {
                    $this->stock->adjust((int) $item['product_id'], -((int) $item['quantity']));
                }
            }

            $cgst = $note->tax_amount / 2;
            EcrsLog::create([
                'action' => 'REVERSAL',
                'type' => "ITC Reversal - Purchase Return Debit Note ({$number})",
                'cgst' => $cgst,
                'sgst' => $cgst,
                'igst' => 0,
                'status' => 'Reversed',
                'logged_at' => now(),
            ]);

            return $note;
        });

        $this->sync->bump('debit_notes', 'create', $note->id, $user->id);
        $this->sync->bump('ecrs_logs', 'create', null, $user->id);

        $companyId = (int) TenantContext::getCompanyId();
        $this->liveGlPost($companyId, $user->id, fn (GlPostingService $gl, int $uid) => $gl->postDebitNote($note->fresh(), $uid));

        return response()->json(['success' => true, 'debit_note' => $note], 201);
    }

    public function storeUser(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $actor = $request->user();
        $allowedRoles = $actor->isSuperAdmin() ? ['admin', 'user', 'group_admin'] : ['admin', 'user'];

        $data = $request->validate([
            'email' => 'required|email|unique:users,email',
            'name' => 'required|string|max:255',
            'role' => 'required|in:'.implode(',', $allowedRoles),
            'password' => 'required|string|min:6|max:255',
            'company_id' => 'nullable|integer|exists:companies,id',
            'company_ids' => 'nullable|array',
            'company_ids.*' => 'integer|exists:companies,id',
        ]);

        if ($data['role'] === 'group_admin') {
            if (! $actor->isSuperAdmin()) {
                return response()->json(['message' => 'Only the portal super admin can create group admin accounts.'], 403);
            }
            $companyIds = array_values(array_unique(array_map('intval', $data['company_ids'] ?? [])));
            if ($companyIds === []) {
                return response()->json(['message' => 'Select at least one company for the group admin.'], 422);
            }
            $companyId = null;
        } else {
            $companyIds = array_values(array_unique(array_map('intval', $data['company_ids'] ?? [])));

            if ($actor->isSuperAdmin() && $companyIds !== []) {
                $companyId = $companyIds[0];
            } elseif ($actor->isSuperAdmin() && ! empty($data['company_id'])) {
                $companyId = (int) $data['company_id'];
                $companyIds = [$companyId];
            } else {
                $companyId = TenantContext::getCompanyId();
                if (! $companyId) {
                    return response()->json(['message' => 'Company context required.'], 422);
                }
                $companyIds = [(int) $companyId];
            }

            if ($actor->isGroupAdmin()) {
                foreach ($companyIds as $cid) {
                    if (! $this->groupAdminCanAccessCompany($actor, $cid)) {
                        return response()->json(['message' => 'You cannot create users for this company.'], 403);
                    }
                }
            }
        }

        $user = User::create([
            'company_id' => $companyId,
            'email' => strtolower($data['email']),
            'name' => $data['name'],
            'role' => $data['role'],
            'password' => $data['password'],
        ]);

        if ($companyIds !== []) {
            $user->managedCompanies()->sync($companyIds);
        }

        $this->sync->bump('users', 'create', $user->id, $request->user()->id);

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'role' => $user->role,
                'company_id' => $user->company_id,
                'managed_company_ids' => $user->managedCompanies()->pluck('companies.id')->map(fn ($id) => (int) $id)->all(),
            ],
        ], 201);
    }

    public function updateUser(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $actor = $request->user();
        $allowedRoles = $actor->isSuperAdmin() ? ['admin', 'user', 'group_admin'] : ['admin', 'user'];

        $data = $request->validate([
            'email' => 'sometimes|email|unique:users,email,'.$id,
            'name' => 'sometimes|string|max:255',
            'role' => 'sometimes|in:'.implode(',', $allowedRoles),
            'password' => 'nullable|string|min:6|max:255',
            'company_id' => 'nullable|integer|exists:companies,id',
            'company_ids' => 'nullable|array',
            'company_ids.*' => 'integer|exists:companies,id',
        ]);

        $user = User::query()->where('id', $id)->where('role', '!=', 'super_admin')->first();
        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->isGroupAdmin()) {
            if (! $actor->isSuperAdmin()) {
                return response()->json(['message' => 'Only the portal super admin can update group admin accounts.'], 403);
            }

            if (isset($data['email'])) {
                $user->email = strtolower($data['email']);
            }
            if (isset($data['name'])) {
                $user->name = $data['name'];
            }
            if (! empty($data['password'])) {
                $user->password = $data['password'];
            }
            if (array_key_exists('company_ids', $data)) {
                $companyIds = array_values(array_unique(array_map('intval', $data['company_ids'] ?? [])));
                if ($companyIds === []) {
                    return response()->json(['message' => 'Select at least one company for the group admin.'], 422);
                }
                $user->managedCompanies()->sync($companyIds);
            }
            $user->save();

            $this->sync->bump('users', 'update', $user->id, $request->user()->id);

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    'role' => $user->role,
                    'company_id' => $user->company_id,
                    'managed_company_ids' => $user->managedCompanies()->pluck('companies.id')->map(fn ($cid) => (int) $cid)->all(),
                ],
            ]);
        }

        $query = User::query()->where('id', $id)->where('role', '!=', 'super_admin')->where('role', '!=', 'group_admin');
        if ($request->user()->isGroupAdmin()) {
            $ownedIds = $request->user()->accessibleCompanyIds();
            $query->where(function ($q) use ($ownedIds) {
                $q->whereIn('company_id', $ownedIds)
                    ->orWhereHas('managedCompanies', fn ($mq) => $mq->whereIn('companies.id', $ownedIds));
            });
        } elseif (! $request->user()->isSuperAdmin()) {
            $query->where('company_id', TenantContext::getCompanyId());
        }
        $user = $query->first();
        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if (isset($data['email'])) {
            $user->email = strtolower($data['email']);
        }
        if (isset($data['name'])) {
            $user->name = $data['name'];
        }
        if (isset($data['role'])) {
            if ($data['role'] === 'group_admin' && ! $request->user()->isSuperAdmin()) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            if ($data['role'] === 'group_admin') {
                $companyIds = array_values(array_unique(array_map('intval', $data['company_ids'] ?? [])));
                if ($companyIds === []) {
                    return response()->json(['message' => 'Select at least one company for the group admin.'], 422);
                }
                $user->role = 'group_admin';
                $user->company_id = null;
                $user->managedCompanies()->sync($companyIds);
            } else {
                $user->role = $data['role'];
            }
        }

        if ($user->role !== 'group_admin' && $request->user()->isSuperAdmin() && array_key_exists('company_ids', $data)) {
            $companyIds = array_values(array_unique(array_map('intval', $data['company_ids'] ?? [])));
            if ($companyIds === []) {
                return response()->json(['message' => 'Select at least one company for this user.'], 422);
            }
            $user->company_id = $companyIds[0];
            $user->managedCompanies()->sync($companyIds);
        } elseif ($user->role !== 'group_admin' && $request->user()->isSuperAdmin() && isset($data['company_id'])) {
            $user->company_id = (int) $data['company_id'];
            $user->managedCompanies()->sync([(int) $data['company_id']]);
        }

        if (!empty($data['password'])) {
            $user->password = $data['password'];
        }
        $user->save();

        $this->sync->bump('users', 'update', $user->id, $request->user()->id);

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'role' => $user->role,
                'company_id' => $user->company_id,
                'managed_company_ids' => $user->managedCompanies()->pluck('companies.id')->map(fn ($cid) => (int) $cid)->all(),
            ],
        ]);
    }

    public function deleteUser(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        if ($request->user()->id === $id) {
            return response()->json(['message' => 'Cannot delete your own account'], 422);
        }

        $user = User::query()->where('id', $id)->where('role', '!=', 'super_admin')->first();
        if (! $user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($user->isGroupAdmin() && ! $request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Only the portal super admin can delete group admin accounts.'], 403);
        }

        if ($request->user()->isGroupAdmin()) {
            $accessibleIds = $request->user()->accessibleCompanyIds();
            if (! in_array((int) $user->company_id, $accessibleIds, true)) {
                return response()->json(['message' => 'User not found.'], 404);
            }
        } elseif (! $request->user()->isSuperAdmin()) {
            if ((int) $user->company_id !== (int) TenantContext::getCompanyId()) {
                return response()->json(['message' => 'User not found.'], 404);
            }
        }

        if ($user->isGroupAdmin()) {
            $user->managedCompanies()->detach();
        }

        $user->delete();
        $this->sync->bump('users', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function storeExpenseHead(Request $request): JsonResponse
    {
        $data = $request->validate($this->coaLedgerRules('expense_heads'));
        $head = ExpenseHead::create($data);
        app(CoaService::class)->syncExpenseHead($head);
        $this->sync->bump('expense_heads', 'create', null, $request->user()->id);
        $this->sync->bump('coa', 'update', null, $request->user()->id);

        return response()->json(['success' => true], 201);
    }

    public function storeBankLedger(Request $request): JsonResponse
    {
        $data = $request->validate($this->coaLedgerRules('bank_ledgers'));
        $ledger = BankLedger::create($data);
        app(CoaService::class)->syncBankLedger($ledger);
        $this->sync->bump('settings', 'update', null, $request->user()->id);
        $this->sync->bump('coa', 'update', null, $request->user()->id);

        return response()->json(['success' => true], 201);
    }

    public function storeCashLedger(Request $request): JsonResponse
    {
        $data = $request->validate($this->coaLedgerRules('cash_ledgers'));
        $ledger = CashLedger::create($data);
        app(CoaService::class)->syncCashLedger($ledger);
        $this->sync->bump('settings', 'update', null, $request->user()->id);
        $this->sync->bump('coa', 'update', null, $request->user()->id);

        return response()->json(['success' => true], 201);
    }

    public function updateCompany(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:255',
            'trade_name' => 'nullable|string|max:255',
            'gstin' => 'nullable|string|max:20',
            'pan' => 'nullable|string|max:20',
            'state' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
            'email' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'currency' => 'nullable|string|max:30',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:50',
            'bank_account_holder' => 'nullable|string|max:255',
            'bank_ifsc' => 'nullable|string|max:20',
            'bank_branch' => 'nullable|string|max:255',
            'upi_id' => 'nullable|string|max:100',
            'logo' => 'nullable|string|max:500000',
            'is_financial_year_locked' => 'boolean',
            'locked_months' => 'nullable|array',
            'inactivity_timeout' => 'integer|min:60',
            'rcm_ledger_balance' => 'numeric',
            'custom_options' => 'nullable|array',
            'accounting_framework' => 'nullable|in:AS,IND_AS',
        ]);

        if (!$request->user()->isAdmin()) {
            $data = array_intersect_key($data, array_flip(['custom_options']));
            if ($data === []) {
                return response()->json(['message' => 'Only administrators can update company profile.'], 403);
            }
        }

        unset($data['inactivity_timeout']);

        $company = PortalDataService::companyRecord();
        $company->fill($data);
        $company->save();

        if (isset($data['name']) && $data['name'] !== '') {
            \App\Models\Company::where('id', $company->company_id)->update(['name' => $data['name']]);
        }

        $this->sync->bump('settings', 'update', $company->id, $request->user()->id);

        return response()->json([
            'success' => true,
            'companyDetails' => PortalDataService::formatCompanyDetails($company->fresh()),
        ]);
    }

    public function uploadCompanyLogo(Request $request): JsonResponse
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Only administrators can update the company logo.'], 403);
        }

        $request->validate([
            'logo' => 'required|file|mimes:jpg,jpeg,png,webp,gif|max:10240',
        ]);

        $file = $request->file('logo');
        $ext = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'png');
        if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
            $ext = 'png';
        }

        $company = PortalDataService::companyRecord();
        $companyId = $company->company_id;
        $dir = 'company/'.$companyId;
        Storage::disk('public')->makeDirectory($dir);

        foreach (Storage::disk('public')->files($dir) as $old) {
            if (str_starts_with(basename($old), 'logo.')) {
                Storage::disk('public')->delete($old);
            }
        }

        $file->storeAs($dir, 'logo.'.$ext, 'public');

        $relative = '/storage/'.$dir.'/logo.'.$ext;
        $publicUrl = rtrim(config('app.url'), '/').$relative;

        $layout = 'compact';
        $size = @getimagesize($file->getRealPath());
        if ($size && ($size[0] ?? 0) > 0 && ($size[1] ?? 0) > 0) {
            $layout = ($size[0] / $size[1]) >= 1.6 ? 'banner' : 'compact';
        }

        $custom = is_array($company->custom_options) ? $company->custom_options : [];
        $custom['logo_layout'] = $layout;
        $company->custom_options = $custom;
        $company->logo = $relative;
        $company->save();

        $this->sync->bump('settings', 'update', $company->id, $request->user()->id);

        return response()->json([
            'success' => true,
            'logo' => $publicUrl,
            'companyDetails' => PortalDataService::formatCompanyDetails($company->fresh()),
        ]);
    }

    public function updateCustomer(Request $request, int $id): JsonResponse
    {
        $customer = Customer::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'category' => 'nullable|string|max:50',
            'gst_type' => 'sometimes|string|max:100',
            'gstin' => 'nullable|string|max:20',
            'pan' => 'nullable|string|max:20',
            'currency' => 'nullable|string|max:10',
            'billing_address' => 'nullable|string',
            'billing_city' => 'nullable|string|max:100',
            'billing_state' => 'nullable|string|max:100',
            'billing_pincode' => 'nullable|string|max:20',
            'billing_country' => 'nullable|string|max:100',
            'shipping_same' => 'boolean',
            'opening_balance' => 'numeric',
            'opening_balance_date' => 'nullable|date',
            'payment_terms' => 'nullable|string|max:100',
            'credit_limit' => 'numeric',
        ]);
        $customer->update($data);
        $this->sync->bump('customers', 'update', $customer->id, $request->user()->id);

        return response()->json(['success' => true, 'customer' => $customer]);
    }

    public function deleteCustomer(Request $request, int $id): JsonResponse
    {
        Customer::findOrFail($id)->delete();
        $this->sync->bump('customers', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function updateVendor(Request $request, int $id): JsonResponse
    {
        $vendor = Vendor::findOrFail($id);
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'category' => 'nullable|string|max:50',
            'gst_type' => 'nullable|string|max:100',
            'gstin' => 'nullable|string|max:20',
            'currency' => 'nullable|string|max:10',
            'billing_address' => 'nullable|string',
            'billing_city' => 'nullable|string|max:100',
            'billing_state' => 'nullable|string|max:100',
            'billing_pincode' => 'nullable|string|max:20',
            'billing_country' => 'nullable|string|max:100',
            'pan' => 'nullable|string|max:20',
            'opening_balance' => 'numeric',
            'opening_balance_date' => 'nullable|date',
            'payment_terms' => 'nullable|string|max:100',
        ]);
        if (array_key_exists('currency', $data)) {
            $data['currency'] = $this->normalizeDocumentCurrency($data['currency']);
        }
        $vendor->update($data);
        $this->sync->bump('vendors', 'update', $vendor->id, $request->user()->id);

        return response()->json(['success' => true, 'vendor' => $vendor]);
    }

    public function deleteVendor(Request $request, int $id): JsonResponse
    {
        Vendor::findOrFail($id)->delete();
        $this->sync->bump('vendors', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function updateInvoice(Request $request, int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $data = $request->validate([
            'invoice' => 'required|array',
            'items' => 'required|array|min:1',
        ]);
        $inv = $data['invoice'];
        if (array_key_exists('po_number', $inv)) {
            $inv['po_number'] = $this->nullablePoNumber($inv['po_number']);
        }
        if (array_key_exists('currency', $inv)) {
            $inv['currency'] = $this->normalizeDocumentCurrency($inv['currency']);
        }
        DB::transaction(function () use ($invoice, $inv, $data) {
            $invoice->update(array_merge($inv, [
                'cgst' => $inv['cgst'] ?? $invoice->cgst,
                'sgst' => $inv['sgst'] ?? $invoice->sgst,
                'igst' => $inv['igst'] ?? $invoice->igst,
                'payable_tax' => $inv['payable_tax'] ?? $invoice->payable_tax,
            ]));
            $invoice->items()->delete();
            foreach ($data['items'] as $item) {
                $qty = isset($item['quantity']) && $item['quantity'] !== null && $item['quantity'] !== ''
                    ? (float) $item['quantity']
                    : 0;
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'item_detail' => $item['item_detail'] ?? null,
                    'quantity' => $qty,
                    'unit_price' => $item['rate'] ?? $item['unit_price'],
                    'line_total' => $item['line_total'],
                    'hsn_sac' => $item['hsn_sac'] ?? null,
                    'tax_rate_override' => $item['tax_rate_override'] ?? null,
                    'supply_mechanism' => $item['supply_mechanism'] ?? 'FCM',
                    'cgst' => $item['cgst'] ?? 0,
                    'sgst' => $item['sgst'] ?? 0,
                    'igst' => $item['igst'] ?? 0,
                ]);
            }
        });
        $this->sync->bump('invoices', 'update', $invoice->id, $request->user()->id);

        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;
        $this->liveGlRepost($companyId, $userId, 'invoice', $invoice->id, fn (GlPostingService $gl, int $uid) => $gl->postInvoice($invoice->fresh('items'), $uid));

        return response()->json(['success' => true, 'invoice' => $invoice->fresh('items')]);
    }

    public function updateExpense(Request $request, int $id): JsonResponse
    {
        $expense = Expense::findOrFail($id);
        $data = $request->validate([
            'invoice_number' => 'nullable|string',
            'description' => 'nullable|string',
            'expense_head' => 'nullable|string',
            'vendor_id' => 'integer',
            'vendor_name' => 'nullable|string',
            'expense_date' => 'date',
            'amount' => 'numeric',
            'tax_rate' => 'numeric',
            'tax_amount' => 'numeric',
            'total_amount' => 'numeric',
            'cgst' => 'numeric',
            'sgst' => 'numeric',
            'igst' => 'numeric',
            'place_of_supply' => 'nullable|string',
            'currency' => 'nullable|string|max:10',
            'conversion_rate' => 'nullable|numeric',
            'export_country' => 'nullable|string|max:100',
            'due_date' => 'nullable|date',
            'payment_status' => 'nullable|string|max:30',
            'supply_mechanism' => 'nullable|string|max:20',
            'payable_tax' => 'numeric',
            'tds_deducted' => 'numeric',
            'hsn_sac' => 'nullable|string|max:20',
            'record_type' => 'nullable|in:purchase,expense',
        ]);
        if (array_key_exists('currency', $data)) {
            $data['currency'] = $this->normalizeDocumentCurrency($data['currency']);
        }
        $expense->update($data);
        $this->sync->bump('expenses', 'update', $expense->id, $request->user()->id);

        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;
        $this->liveGlRepost($companyId, $userId, 'expense', $expense->id, fn (GlPostingService $gl, int $uid) => $gl->postExpense($expense->fresh(), $uid));

        return response()->json(['success' => true, 'expense' => $expense]);
    }

    public function updateReceipt(Request $request, int $id): JsonResponse
    {
        $receipt = Receipt::findOrFail($id);
        $data = $request->validate([
            'payment_date' => 'required|date',
            'amount_received' => 'required|numeric|min:0',
            'tds_deducted' => 'nullable|numeric|min:0',
            'discount_allowed' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'payment_mode' => 'nullable|string|max:100',
            'deposit_to' => 'nullable|string|max:255',
            'reference_no' => 'nullable|string|max:100',
            'advance_reference' => 'nullable|string|max:64',
            'utr_number' => 'nullable|string|max:100',
            'cheque_number' => 'nullable|string|max:100',
            'bank_reference' => 'nullable|string|max:100',
            'customer_reference' => 'nullable|string|max:100',
        ]);

        if ($receipt->is_advance && array_key_exists('advance_reference', $data)) {
            $hasAdjustments = AdvanceAdjustment::where('advance_receipt_id', $receipt->id)->exists();
            $newRef = trim((string) ($data['advance_reference'] ?? ''));
            if ($hasAdjustments && $newRef !== (string) $receipt->advance_reference) {
                throw ValidationException::withMessages([
                    'advance_reference' => 'Advance Reference Number cannot be changed after adjustments have been made.',
                ]);
            }
            if ($newRef !== '' && $newRef !== (string) $receipt->advance_reference) {
                $this->assertAdvanceReferenceUnique($newRef, $receipt->id);
            }
        }

        $cash = (float) $data['amount_received'];
        $tds = $this->numericOrZero($data['tds_deducted'] ?? 0);
        $disc = $this->numericOrZero($data['discount_allowed'] ?? 0);
        $this->assertReceiptSettlement(
            $receipt->invoice_id ? (int) $receipt->invoice_id : null,
            $cash,
            $tds,
            $disc,
            (bool) $receipt->is_advance,
            $receipt->id
        );

        $oldInvoiceId = $receipt->invoice_id;
        $updatePayload = [
            'payment_date' => $data['payment_date'],
            'amount_received' => $cash,
            'tds_deducted' => $tds,
            'discount_allowed' => $disc,
            'currency' => strtoupper((string) ($data['currency'] ?? $receipt->currency ?? 'INR')) ?: 'INR',
            'payment_mode' => $data['payment_mode'] ?? $receipt->payment_mode,
            'deposit_to' => $data['deposit_to'] ?? $receipt->deposit_to,
            'reference_no' => $data['reference_no'] ?? $receipt->reference_no,
        ];
        if ($receipt->is_advance) {
            if (array_key_exists('advance_reference', $data) && trim((string) ($data['advance_reference'] ?? '')) !== '') {
                $updatePayload['advance_reference'] = trim((string) $data['advance_reference']);
            }
            foreach (['utr_number', 'cheque_number', 'bank_reference', 'customer_reference'] as $field) {
                if (array_key_exists($field, $data)) {
                    $updatePayload[$field] = $data[$field];
                }
            }
        }
        $receipt->update($updatePayload);

        if ($oldInvoiceId) {
            $this->refreshInvoiceStatus((int) $oldInvoiceId);
        }
        $this->audit->log($request->user(), 'UPDATE RECEIPT', (string) $id, $receipt->receipt_number);
        $this->sync->bump('receipts', 'update', $id, $request->user()->id);

        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;
        $this->liveGlRepost($companyId, $userId, 'receipt', $receipt->id, fn (GlPostingService $gl, int $uid) => $gl->postReceipt($receipt->fresh(), $uid));

        return response()->json(['success' => true, 'receipt' => $receipt->fresh()]);
    }

    public function updatePayment(Request $request, int $id): JsonResponse
    {
        $payment = Payment::findOrFail($id);
        $data = $request->validate([
            'payment_date' => 'required|date',
            'amount_paid' => 'required|numeric|min:0',
            'tds_deducted' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'payment_mode' => 'nullable|string|max:100',
            'paid_from' => 'nullable|string|max:255',
            'reference_no' => 'nullable|string|max:100',
        ]);

        $paid = (float) $data['amount_paid'];
        $tds = $this->numericOrZero($data['tds_deducted'] ?? 0);
        $this->assertPaymentSettlement(
            $payment->expense_id ? (int) $payment->expense_id : null,
            $paid,
            $tds,
            (bool) $payment->is_advance,
            $payment->id
        );

        $oldExpenseId = $payment->expense_id;
        $payment->update([
            'payment_date' => $data['payment_date'],
            'amount_paid' => $paid,
            'tds_deducted' => $tds,
            'currency' => strtoupper((string) ($data['currency'] ?? $payment->currency ?? 'INR')) ?: 'INR',
            'payment_mode' => $data['payment_mode'] ?? $payment->payment_mode,
            'paid_from' => $data['paid_from'] ?? $payment->paid_from,
            'reference_no' => $data['reference_no'] ?? $payment->reference_no,
        ]);

        if ($oldExpenseId) {
            $this->refreshExpenseStatus((int) $oldExpenseId);
        }
        $this->audit->log($request->user(), 'UPDATE PAYMENT', (string) $id, $payment->payment_number);
        $this->sync->bump('payments', 'update', $id, $request->user()->id);

        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;
        $this->liveGlRepost($companyId, $userId, 'payment', $payment->id, fn (GlPostingService $gl, int $uid) => $gl->postPayment($payment->fresh(), $uid));

        return response()->json(['success' => true, 'payment' => $payment->fresh()]);
    }

    public function updateCreditNote(Request $request, int $id): JsonResponse
    {
        $note = CreditNote::findOrFail($id);
        $data = $request->validate([
            'credit_note' => 'required|array',
            'items' => 'required|array|min:1',
        ]);
        $cn = $data['credit_note'];

        DB::transaction(function () use ($note, $cn, $data) {
            $oldItems = CreditNoteItem::where('credit_note_id', $note->id)->get();
            foreach ($oldItems as $item) {
                if ($item->product_id) {
                    $this->stock->adjust((int) $item->product_id, -((int) $item->quantity));
                }
            }
            CreditNoteItem::where('credit_note_id', $note->id)->delete();

            $note->update([
                'customer_id' => $cn['customer_id'] ?? $note->customer_id,
                'customer_name' => $cn['customer_name'] ?? $note->customer_name,
                'original_invoice_id' => $cn['original_invoice_id'] ?? $note->original_invoice_id,
                'original_invoice_number' => $cn['original_invoice_number'] ?? $note->original_invoice_number,
                'original_invoice_date' => $cn['original_invoice_date'] ?? $note->original_invoice_date,
                'issue_date' => $cn['issue_date'] ?? $note->issue_date,
                'reason' => $cn['reason'] ?? $note->reason,
                'subtotal' => $cn['subtotal'] ?? $note->subtotal,
                'discount' => $cn['discount'] ?? $note->discount,
                'tax_rate' => $cn['tax_rate'] ?? $note->tax_rate,
                'tax_amount' => $cn['tax_amount'] ?? $note->tax_amount,
                'total_amount' => $cn['total_amount'] ?? $note->total_amount,
            ]);

            foreach ($data['items'] as $item) {
                CreditNoteItem::create([
                    'credit_note_id' => $note->id,
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['rate'] ?? $item['unit_price'],
                    'line_total' => $item['line_total'],
                    'hsn_sac' => $item['hsn_sac'] ?? 'NIL',
                ]);
                if (! empty($item['product_id'])) {
                    $this->stock->adjust((int) $item['product_id'], (int) $item['quantity']);
                }
            }
        });

        $this->audit->log($request->user(), 'UPDATE CREDIT NOTE', (string) $id, $note->credit_note_number);
        $this->sync->bump('credit_notes', 'update', $id, $request->user()->id);

        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;
        $this->liveGlRepost($companyId, $userId, 'credit_note', $note->id, fn (GlPostingService $gl, int $uid) => $gl->postCreditNote($note->fresh(), $uid));

        return response()->json(['success' => true, 'credit_note' => $note->fresh()]);
    }

    public function updateDebitNote(Request $request, int $id): JsonResponse
    {
        $note = DebitNote::findOrFail($id);
        $data = $request->validate([
            'debit_note' => 'required|array',
            'items' => 'required|array|min:1',
        ]);
        $dn = $data['debit_note'];

        DB::transaction(function () use ($note, $dn, $data) {
            $oldItems = DebitNoteItem::where('debit_note_id', $note->id)->get();
            foreach ($oldItems as $item) {
                if ($item->product_id) {
                    $this->stock->adjust((int) $item->product_id, (int) $item->quantity);
                }
            }
            DebitNoteItem::where('debit_note_id', $note->id)->delete();

            $note->update([
                'vendor_id' => $dn['vendor_id'] ?? $note->vendor_id,
                'vendor_name' => $dn['vendor_name'] ?? $note->vendor_name,
                'original_expense_id' => $dn['original_expense_id'] ?? $note->original_expense_id,
                'original_expense_number' => $dn['original_expense_number'] ?? $note->original_expense_number,
                'original_expense_date' => $dn['original_expense_date'] ?? $note->original_expense_date,
                'issue_date' => $dn['issue_date'] ?? $note->issue_date,
                'reason' => $dn['reason'] ?? $note->reason,
                'subtotal' => $dn['subtotal'] ?? $note->subtotal,
                'tax_rate' => $dn['tax_rate'] ?? $note->tax_rate,
                'tax_amount' => $dn['tax_amount'] ?? $note->tax_amount,
                'total_amount' => $dn['total_amount'] ?? $note->total_amount,
            ]);

            foreach ($data['items'] as $item) {
                DebitNoteItem::create([
                    'debit_note_id' => $note->id,
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['rate'] ?? $item['unit_price'],
                    'line_total' => $item['line_total'],
                    'hsn_sac' => $item['hsn_sac'] ?? 'NIL',
                ]);
                if (! empty($item['product_id'])) {
                    $this->stock->adjust((int) $item['product_id'], -((int) $item['quantity']));
                }
            }
        });

        $this->audit->log($request->user(), 'UPDATE DEBIT NOTE', (string) $id, $note->debit_note_number);
        $this->sync->bump('debit_notes', 'update', $id, $request->user()->id);

        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;
        $this->liveGlRepost($companyId, $userId, 'debit_note', $note->id, fn (GlPostingService $gl, int $uid) => $gl->postDebitNote($note->fresh(), $uid));

        return response()->json(['success' => true, 'debit_note' => $note->fresh()]);
    }

    public function deleteInvoice(Request $request, int $id): JsonResponse
    {
        $invoice = Invoice::findOrFail($id);
        $invNumber = $invoice->invoice_number;
        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;
        $linkedReceipts = Receipt::where('invoice_id', $invoice->id)->get();

        DB::transaction(function () use ($invoice, $linkedReceipts, $companyId, $userId) {
            foreach ($linkedReceipts as $rec) {
                $this->liveGlUnpost($companyId, $userId, 'receipt', $rec->id);
            }
            $this->liveGlUnpost($companyId, $userId, 'invoice', $invoice->id);

            $items = InvoiceItem::where('invoice_id', $invoice->id)->get();
            foreach ($items as $item) {
                if ($item->product_id) {
                    $this->stock->adjust((int) $item->product_id, (int) $item->quantity);
                }
            }
            Receipt::where('invoice_id', $invoice->id)->delete();
            InvoiceItem::where('invoice_id', $invoice->id)->delete();
            $invoice->delete();
        });
        $this->audit->log($request->user(), 'DELETE INVOICE', (string) $id, $invNumber);
        $this->sync->bump('invoices', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function deleteReceipt(Request $request, int $id): JsonResponse
    {
        $receipt = Receipt::findOrFail($id);
        $invoiceId = $receipt->invoice_id;
        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;
        $this->liveGlUnpost($companyId, $userId, 'receipt', $receipt->id);
        $receipt->delete();
        if ($invoiceId) {
            $this->refreshInvoiceStatus((int) $invoiceId);
        }
        $this->audit->log($request->user(), 'DELETE RECEIPT', (string) $id, $receipt->receipt_number);
        $this->sync->bump('receipts', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function deleteExpense(Request $request, int $id): JsonResponse
    {
        $expense = Expense::findOrFail($id);
        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;
        $linkedPayments = Payment::where('expense_id', $expense->id)->get();

        DB::transaction(function () use ($expense, $linkedPayments, $companyId, $userId) {
            foreach ($linkedPayments as $pay) {
                $this->liveGlUnpost($companyId, $userId, 'payment', $pay->id);
            }
            $this->liveGlUnpost($companyId, $userId, 'expense', $expense->id);

            if ($expense->product_id && $expense->quantity_purchased) {
                $this->stock->adjust((int) $expense->product_id, -((int) $expense->quantity_purchased));
            }
            Payment::where('expense_id', $expense->id)->delete();
            $expense->delete();
        });
        $this->audit->log($request->user(), 'DELETE EXPENSE', (string) $id, $expense->expense_number);
        $this->sync->bump('expenses', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function deletePayment(Request $request, int $id): JsonResponse
    {
        $payment = Payment::findOrFail($id);
        $expenseId = $payment->expense_id;
        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;
        $this->liveGlUnpost($companyId, $userId, 'payment', $payment->id);
        $payment->delete();
        if ($expenseId) {
            $this->refreshExpenseStatus((int) $expenseId);
        }
        $this->audit->log($request->user(), 'DELETE PAYMENT', (string) $id, $payment->payment_number);
        $this->sync->bump('payments', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function deleteCreditNote(Request $request, int $id): JsonResponse
    {
        $cn = CreditNote::findOrFail($id);
        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;

        DB::transaction(function () use ($cn, $companyId, $userId) {
            $this->liveGlUnpost($companyId, $userId, 'credit_note', $cn->id);

            $items = CreditNoteItem::where('credit_note_id', $cn->id)->get();
            foreach ($items as $item) {
                if ($item->product_id) {
                    $this->stock->adjust((int) $item->product_id, -((int) $item->quantity));
                }
            }
            CreditNoteItem::where('credit_note_id', $cn->id)->delete();
            $cn->delete();
        });
        $this->audit->log($request->user(), 'DELETE CREDIT NOTE', (string) $id, $cn->credit_note_number);
        $this->sync->bump('credit_notes', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function deleteDebitNote(Request $request, int $id): JsonResponse
    {
        $dn = DebitNote::findOrFail($id);
        $dnNumber = $dn->debit_note_number;
        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;

        DB::transaction(function () use ($dn, $dnNumber, $companyId, $userId) {
            $this->liveGlUnpost($companyId, $userId, 'debit_note', $dn->id);

            $items = DebitNoteItem::where('debit_note_id', $dn->id)->get();
            foreach ($items as $item) {
                if ($item->product_id) {
                    $this->stock->adjust((int) $item->product_id, (int) $item->quantity);
                }
            }
            DebitNoteItem::where('debit_note_id', $dn->id)->delete();
            EcrsLog::where('type', 'like', '%'.$dnNumber.'%')->delete();
            $dn->delete();
        });
        $this->audit->log($request->user(), 'DELETE DEBIT NOTE', (string) $id, $dn->debit_note_number);
        $this->sync->bump('debit_notes', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function updateInventory(Request $request, int $id): JsonResponse
    {
        $item = Inventory::findOrFail($id);
        $data = $request->validate([
            'type' => 'required|in:Product,Service',
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'sku' => 'nullable|string|max:50',
            'quantity' => 'integer|min:0',
            'unit' => 'nullable|string|max:30',
            'rate' => 'required|numeric|min:0',
            'purchase_price' => 'numeric',
            'sales_price' => 'numeric',
            'tax_rate' => 'numeric',
            'low_stock_threshold' => 'integer|min:0',
        ]);

        if ($data['type'] === 'Service') {
            $data['quantity'] = 0;
            $data['low_stock_threshold'] = 0;
        }

        $item->update($data);
        $this->audit->log($request->user(), 'UPDATE INVENTORY', (string) $id, $item->name);
        $this->sync->bump('inventory', 'update', $id, $request->user()->id);

        return response()->json(['success' => true, 'item' => $item->fresh()]);
    }

    public function deleteInventory(Request $request, int $id): JsonResponse
    {
        if ($this->inventoryInUse($id)) {
            return response()->json([
                'message' => 'Cannot delete: this product or service is linked to invoices, notes, or expenses.',
            ], 422);
        }

        $item = Inventory::findOrFail($id);
        $name = $item->name;
        $item->delete();
        $this->audit->log($request->user(), 'DELETE INVENTORY', (string) $id, $name);
        $this->sync->bump('inventory', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function updateExpenseHead(Request $request, int $id): JsonResponse
    {
        $head = ExpenseHead::findOrFail($id);
        $data = $request->validate($this->coaLedgerRules('expense_heads', $id));
        $old = $head->name;
        $head->update($data);
        app(CoaService::class)->syncExpenseHead($head->fresh());
        if ($old !== $data['name']) {
            Expense::where('expense_head', $old)->update(['expense_head' => $data['name']]);
        }
        $this->sync->bump('expense_heads', 'update', $id, $request->user()->id);
        $this->sync->bump('coa', 'update', null, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function deleteExpenseHead(Request $request, int $id): JsonResponse
    {
        $head = ExpenseHead::findOrFail($id);
        if (Expense::where('expense_head', $head->name)->exists()) {
            return response()->json([
                'message' => 'Cannot delete: expenses are posted under this head.',
            ], 422);
        }
        $head->delete();
        $this->sync->bump('expense_heads', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function updateBankLedger(Request $request, int $id): JsonResponse
    {
        $ledger = BankLedger::findOrFail($id);
        $data = $request->validate($this->coaLedgerRules('bank_ledgers', $id));
        $this->renamePaymentLedger($ledger->name, $data['name'], 'Bank');
        $ledger->update($data);
        app(CoaService::class)->syncBankLedger($ledger->fresh());
        $this->sync->bump('settings', 'update', $id, $request->user()->id);
        $this->sync->bump('coa', 'update', null, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function deleteBankLedger(Request $request, int $id): JsonResponse
    {
        $ledger = BankLedger::findOrFail($id);
        if ($this->bankLedgerInUse($ledger->name)) {
            return response()->json([
                'message' => 'Cannot delete: receipts or payments reference this bank ledger.',
            ], 422);
        }
        $ledger->delete();
        $this->sync->bump('settings', 'update', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function updateCashLedger(Request $request, int $id): JsonResponse
    {
        $ledger = CashLedger::findOrFail($id);
        $data = $request->validate($this->coaLedgerRules('cash_ledgers', $id));
        $this->renamePaymentLedger($ledger->name, $data['name'], 'Cash');
        $ledger->update($data);
        app(CoaService::class)->syncCashLedger($ledger->fresh());
        $this->sync->bump('settings', 'update', $id, $request->user()->id);
        $this->sync->bump('coa', 'update', null, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function deleteCashLedger(Request $request, int $id): JsonResponse
    {
        $ledger = CashLedger::findOrFail($id);
        if ($this->cashLedgerInUse($ledger->name)) {
            return response()->json([
                'message' => 'Cannot delete: receipts or payments reference this cash ledger.',
            ], 422);
        }
        $ledger->delete();
        $this->sync->bump('settings', 'update', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    private function coaLedgerRules(string $table, ?int $id = null): array
    {
        $nameMax = $table === 'expense_heads' ? 100 : 255;
        $nameRule = $id
            ? ['required', 'string', 'max:'.$nameMax, TenantRules::uniquePerCompany($table, 'name')->ignore($id)]
            : ['required', 'string', 'max:'.$nameMax, TenantRules::uniquePerCompany($table, 'name')];

        $rules = [
            'name' => $nameRule,
            'account_code' => 'nullable|string|max:32',
            'ledger_type' => 'nullable|string|max:32',
            'account_subtype' => 'nullable|string|max:64',
            'opening_balance' => 'nullable|numeric',
            'opening_balance_date' => 'nullable|date',
            'description' => 'nullable|string',
        ];

        if ($table === 'bank_ledgers') {
            $rules['ifsc'] = 'nullable|string|max:20';
            $rules['account_number'] = 'nullable|string|max:50';
            $rules['branch'] = 'nullable|string|max:255';
        }
        if ($table === 'cash_ledgers') {
            $rules['location'] = 'nullable|string|max:255';
        }
        if ($table === 'expense_heads') {
            $rules['active'] = 'nullable|boolean';
        }

        return $rules;
    }

    private function assertReceiptSettlement(?int $invoiceId, float $cash, float $tds, float $disc, bool $isAdvance, ?int $excludeReceiptId = null): void
    {
        $settlement = round($cash + $tds + $disc, 2);

        if ($isAdvance) {
            if ($cash <= 0.001) {
                throw ValidationException::withMessages(['amount_received' => 'Received amount must be positive.']);
            }

            return;
        }

        if ($settlement <= 0.001) {
            throw ValidationException::withMessages(['amount_received' => 'Amount receivable must be positive.']);
        }
        if ($cash <= 0.001) {
            throw ValidationException::withMessages(['amount_received' => 'Net amount received must be positive.']);
        }
        if (! $invoiceId) {
            return;
        }

        $invoice = Invoice::find($invoiceId);
        if (! $invoice) {
            return;
        }

        $alreadySettled = (float) Receipt::where('invoice_id', $invoiceId)
            ->when($excludeReceiptId, fn ($q) => $q->where('id', '!=', $excludeReceiptId))
            ->selectRaw('COALESCE(SUM(amount_received + tds_deducted + discount_allowed), 0) as total')
            ->value('total');
        $advanceAdjusted = (float) AdvanceAdjustment::where('invoice_id', $invoiceId)->sum('adjustment_amount');
        $outstanding = max(0, round((float) $invoice->total_amount - $alreadySettled - $advanceAdjusted, 2));

        if ($settlement > $outstanding + 0.02) {
            throw ValidationException::withMessages([
                'amount_received' => "Settlement ({$settlement}) exceeds outstanding balance ({$outstanding}).",
            ]);
        }
    }

    private function assertPaymentSettlement(?int $expenseId, float $paid, float $tds, bool $isAdvance, ?int $excludePaymentId = null): void
    {
        $settlement = round($paid + $tds, 2);

        if ($isAdvance) {
            if ($settlement <= 0.001) {
                throw ValidationException::withMessages(['amount_paid' => 'Amount payable must be positive.']);
            }
            if ($paid <= 0.001) {
                throw ValidationException::withMessages(['amount_paid' => 'Net amount paid must be positive.']);
            }

            return;
        }

        if ($settlement <= 0.001) {
            throw ValidationException::withMessages(['amount_paid' => 'Amount payable must be positive.']);
        }
        if ($paid <= 0.001) {
            throw ValidationException::withMessages(['amount_paid' => 'Net amount paid must be positive.']);
        }
        if (! $expenseId) {
            return;
        }

        $expense = Expense::find($expenseId);
        if (! $expense) {
            return;
        }

        $alreadySettled = (float) Payment::where('expense_id', $expenseId)
            ->when($excludePaymentId, fn ($q) => $q->where('id', '!=', $excludePaymentId))
            ->selectRaw('COALESCE(SUM(amount_paid + tds_deducted), 0) as total')
            ->value('total');
        $outstanding = max(0, round((float) $expense->total_amount - $alreadySettled, 2));

        if ($settlement > $outstanding + 0.02) {
            throw ValidationException::withMessages([
                'amount_paid' => "Settlement ({$settlement}) exceeds outstanding liability ({$outstanding}).",
            ]);
        }
    }

    private function inventoryInUse(int $id): bool
    {
        return InvoiceItem::where('product_id', $id)->exists()
            || CreditNoteItem::where('product_id', $id)->exists()
            || DebitNoteItem::where('product_id', $id)->exists()
            || Expense::where('product_id', $id)->exists();
    }

    private function bankLedgerInUse(string $name): bool
    {
        return $this->ledgerInUse($name, 'Bank');
    }

    private function cashLedgerInUse(string $name): bool
    {
        return $this->ledgerInUse($name, 'Cash');
    }

    private function ledgerInUse(string $name, string $prefix): bool
    {
        $modeTag = $prefix.': '.$name;

        return Payment::where('paid_from', $name)->orWhere('payment_mode', $modeTag)->exists()
            || Receipt::where('deposit_to', $name)->orWhere('payment_mode', $modeTag)->exists();
    }

    private function renamePaymentLedger(string $old, string $new, string $prefix): void
    {
        $oldMode = $prefix.': '.$old;
        $newMode = $prefix.': '.$new;

        Payment::where('paid_from', $old)->update(['paid_from' => $new]);
        Payment::where('payment_mode', $oldMode)->update(['payment_mode' => $newMode]);

        Receipt::where('deposit_to', $old)->update(['deposit_to' => $new]);
        Receipt::where('payment_mode', $oldMode)->update(['payment_mode' => $newMode]);
    }

    private function normalizeDocumentCurrency(?string $currency): string
    {
        $code = strtoupper(trim((string) ($currency ?? 'INR')));

        return $code !== '' ? $code : 'INR';
    }

    private function numericOrZero(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        return is_numeric($value) ? (float) $value : 0.0;
    }

    private function nullablePoNumber(mixed $value): ?string
    {
        $po = trim((string) ($value ?? ''));
        if ($po === '' || strtoupper($po) === 'NIL') {
            return null;
        }

        return $po;
    }

    public function storeCurrencyConversion(Request $request): JsonResponse
    {
        $data = $request->validate([
            'conversion_date' => 'required|date',
            'invoice_id' => 'nullable|integer',
            'invoice_number' => 'nullable|string|max:100',
            'from_currency' => 'required|string|max:10',
            'from_amount' => 'required|numeric|min:0.01',
            'to_amount' => 'required|numeric|min:0.01',
            'conversion_rate' => 'required|numeric|min:0.000001',
            'from_ledger' => 'required|string|max:255',
            'to_ledger' => 'required|string|max:255',
            'reference_no' => 'nullable|string|max:100',
        ]);

        $user = $request->user();
        $fromAmount = (float) $data['from_amount'];
        $rate = (float) $data['conversion_rate'];
        $fromBookInr = round($fromAmount * $rate, 2);

        $fx = CurrencyConversion::create([
            'invoice_id' => $data['invoice_id'] ?? null,
            'invoice_number' => $data['invoice_number'] ?? null,
            'conversion_date' => $data['conversion_date'],
            'from_currency' => strtoupper($data['from_currency']),
            'to_currency' => 'INR',
            'from_amount' => $fromAmount,
            'to_amount' => (float) $data['to_amount'],
            'from_book_amount_inr' => $fromBookInr,
            'conversion_rate' => $rate,
            'from_ledger' => $data['from_ledger'],
            'to_ledger' => $data['to_ledger'],
            'reference_no' => $data['reference_no'] ?? null,
            'created_by' => $user->id,
        ]);

        try {
            app(GlPostingService::class)->postForexConversion($fx, $user->id);
        } catch (\Throwable $e) {
            report($e);
        }

        $this->sync->bump('currencyConversions', 'create', $fx->id, $user->id);

        return response()->json([
            'success' => true,
            'conversion' => array_merge($fx->toArray(), [
                'conversion_date' => $fx->conversion_date?->format('Y-m-d'),
            ]),
        ], 201);
    }

    public function storeConsumption(Request $request): JsonResponse
    {
        $data = $request->validate([
            'consumption_number' => 'required|string|max:50',
            'consumption_date' => 'required|date',
            'product_id' => 'required|integer',
            'quantity' => 'required|numeric|min:0.001',
            'unit_cost' => 'required|numeric|min:0',
            'total_value' => 'required|numeric|min:0',
            'expense_head' => 'required|string|max:100',
            'reference' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $consumption = DB::transaction(function () use ($data, $user) {
            $consumption = Consumption::create(array_merge($data, [
                'created_by' => $user->id,
            ]));
            $this->stock->adjust((int) $data['product_id'], -1 * (float) $data['quantity']);

            return $consumption;
        });

        $this->sync->bump('consumptions', 'create', $consumption->id, $user->id);

        $companyId = (int) TenantContext::getCompanyId();
        $this->liveGlPost($companyId, $user->id, fn (GlPostingService $gl, int $uid) => $gl->postConsumption($consumption->fresh(), $uid));

        return response()->json(['success' => true, 'consumption' => $consumption], 201);
    }

    public function deleteConsumption(Request $request, int $id): JsonResponse
    {
        $consumption = Consumption::findOrFail($id);
        $companyId = (int) TenantContext::getCompanyId();
        $userId = (int) $request->user()->id;

        DB::transaction(function () use ($consumption, $companyId, $userId) {
            $this->liveGlUnpost($companyId, $userId, 'consumption', $consumption->id);
            $this->stock->adjust((int) $consumption->product_id, (float) $consumption->quantity);
            $consumption->delete();
        });
        $this->sync->bump('consumptions', 'delete', $id, $request->user()->id);

        return response()->json(['success' => true]);
    }

    public function storeAdvanceAdjustments(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id' => 'required|integer',
            'adjustment_date' => 'required|date',
            'adjustments' => 'required|array|min:1',
            'adjustments.*.advance_receipt_id' => 'required|integer',
            'adjustments.*.adjustment_amount' => 'required|numeric|min:0.01',
        ]);

        $user = $request->user();
        $companyId = (int) TenantContext::getCompanyId();
        $invoiceId = (int) $data['invoice_id'];

        $created = DB::transaction(function () use ($data, $user, $invoiceId) {
            return $this->createAdvanceAdjustments(
                $data['adjustments'],
                $invoiceId,
                $data['adjustment_date'],
                $user
            );
        });

        $this->sync->bump('advance_adjustments', 'create', null, $user->id);
        $this->sync->bump('invoices', 'update', $invoiceId, $user->id);

        foreach ($created as $adj) {
            $this->liveGlPost($companyId, $user->id, fn (GlPostingService $gl, int $uid) => $gl->postAdvanceAdjustment($adj->fresh(), $uid));
        }

        return response()->json(['success' => true, 'adjustments' => $created], 201);
    }

    private function assertAdvanceReferenceUnique(string $reference, ?int $excludeReceiptId): void
    {
        $companyId = TenantContext::getCompanyId();
        $query = Receipt::query()
            ->where('company_id', $companyId)
            ->where('advance_reference', $reference);
        if ($excludeReceiptId) {
            $query->where('id', '!=', $excludeReceiptId);
        }
        if ($query->exists()) {
            throw ValidationException::withMessages([
                'advance_reference' => 'Advance Reference Number already exists. Please enter a unique reference number.',
            ]);
        }
    }

    private function advanceOriginalAmount(Receipt $receipt): float
    {
        return round(
            (float) $receipt->amount_received
            + (float) ($receipt->tds_deducted ?? 0)
            + (float) ($receipt->discount_allowed ?? 0),
            2
        );
    }

    private function advanceAppliedAmount(int $advanceReceiptId, ?int $excludeAdjustmentId = null): float
    {
        $query = AdvanceAdjustment::where('advance_receipt_id', $advanceReceiptId);
        if ($excludeAdjustmentId) {
            $query->where('id', '!=', $excludeAdjustmentId);
        }

        return round((float) $query->sum('adjustment_amount'), 2);
    }

    private function advanceAvailableBalance(Receipt $receipt): float
    {
        return max(0, round($this->advanceOriginalAmount($receipt) - $this->advanceAppliedAmount((int) $receipt->id), 2));
    }

    private function invoiceOutstandingForAdvance(int $invoiceId): float
    {
        $invoice = Invoice::find($invoiceId);
        if (! $invoice) {
            return 0;
        }
        $advanceAdjusted = (float) AdvanceAdjustment::where('invoice_id', $invoiceId)->sum('adjustment_amount');
        $cashSettled = (float) Receipt::where('invoice_id', $invoiceId)
            ->selectRaw('COALESCE(SUM(amount_received + tds_deducted + discount_allowed), 0) as total')
            ->value('total');

        return max(0, round((float) $invoice->total_amount - $advanceAdjusted - $cashSettled, 2));
    }

    /** @return AdvanceAdjustment[] */
    private function createAdvanceAdjustments(array $rows, int $invoiceId, string $adjustmentDate, $user): array
    {
        $companyId = (int) TenantContext::getCompanyId();
        $invoice = Invoice::query()->where('company_id', $companyId)->where('id', $invoiceId)->first();
        if (! $invoice) {
            throw ValidationException::withMessages(['invoice_id' => 'Invoice not found for this company.']);
        }

        $created = [];
        $pendingOnInvoice = $this->invoiceOutstandingForAdvance($invoiceId);

        foreach ($rows as $row) {
            $advanceId = (int) $row['advance_receipt_id'];
            $amount = round((float) $row['adjustment_amount'], 2);
            if ($amount <= 0.009) {
                continue;
            }

            $receipt = Receipt::query()
                ->where('company_id', $companyId)
                ->where('id', $advanceId)
                ->where('is_advance', true)
                ->first();
            if (! $receipt) {
                throw ValidationException::withMessages([
                    'advance_receipt_id' => 'Selected advance receipt is invalid.',
                ]);
            }
            if ((int) $receipt->customer_id !== (int) $invoice->customer_id) {
                throw ValidationException::withMessages([
                    'advance_receipt_id' => 'Advance receipt must belong to the same customer as the invoice.',
                ]);
            }

            $available = $this->advanceAvailableBalance($receipt);
            if ($amount > $available + 0.02) {
                throw ValidationException::withMessages([
                    'adjustment_amount' => "Adjustment ({$amount}) exceeds available advance balance ({$available}).",
                ]);
            }
            if ($amount > $pendingOnInvoice + 0.02) {
                throw ValidationException::withMessages([
                    'adjustment_amount' => "Adjustment ({$amount}) exceeds invoice outstanding ({$pendingOnInvoice}).",
                ]);
            }

            $created[] = AdvanceAdjustment::create([
                'company_id' => $companyId,
                'advance_receipt_id' => $advanceId,
                'invoice_id' => $invoiceId,
                'adjustment_amount' => $amount,
                'adjustment_date' => $adjustmentDate,
                'created_by' => $user->id,
            ]);

            $pendingOnInvoice = max(0, round($pendingOnInvoice - $amount, 2));
        }

        if ($created === []) {
            throw ValidationException::withMessages(['adjustments' => 'At least one valid adjustment is required.']);
        }

        $this->refreshInvoiceStatus($invoiceId);

        return $created;
    }

    private function groupAdminCanAccessCompany(\App\Models\User $actor, int $companyId): bool
    {
        if (! $actor->isGroupAdmin()) {
            return false;
        }

        return in_array($companyId, $actor->accessibleCompanyIds(), true);
    }
}
