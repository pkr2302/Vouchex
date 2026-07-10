<?php

namespace App\Services;

use App\Models\AdvanceAdjustment;
use App\Models\AuditLog;
use App\Models\BankLedger;
use App\Models\CalendarReminder;
use App\Models\CashLedger;
use App\Models\CompanySetting;
use App\Models\Consumption;
use App\Models\CreditNote;
use App\Models\CreditNoteItem;
use App\Models\CronReminderLog;
use App\Models\CurrencyConversion;
use App\Models\Customer;
use App\Models\DebitNote;
use App\Models\DebitNoteItem;
use App\Models\EcrsLog;
use App\Models\EwayBill;
use App\Models\Expense;
use App\Models\ExpenseHead;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\LoginLog;
use App\Models\Payment;
use App\Models\PortalSetting;
use App\Models\Receipt;
use App\Models\User;
use App\Models\Vendor;
use App\Services\GstCompliance\GstComplianceSettings;
use App\Services\LogRetentionService;
use App\Services\CoaService;
use App\Services\ReportGroupService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PortalDataService
{
    public function bootstrap(?\App\Models\User $actor = null): array
    {
        $companyId = \App\Support\TenantContext::getCompanyId();
        if (! $companyId) {
            return $this->emptyBootstrap($actor);
        }

        $company = self::companyRecord();
        $companyDetails = self::formatCompanyDetails($company);

        return [
            'activeCompanyId' => \App\Support\TenantContext::getCompanyId(),
            'users' => $this->loadPortalUsers($actor),
            'customers' => Customer::orderBy('id')->get()->map(fn ($c) => $this->mapCustomer($c)),
            'vendors' => Vendor::orderBy('id')->get()->map(fn ($v) => $this->mapVendor($v)),
            'invoices' => Invoice::orderByDesc('id')->get()->map(fn ($i) => $this->mapInvoice($i)),
            'invoiceItems' => InvoiceItem::orderBy('id')->get(),
            'inventory' => Inventory::orderBy('id')->get()->map(fn ($i) => $this->mapInventory($i)),
            'receipts' => Receipt::orderByDesc('id')->get()->map(fn ($r) => $this->mapReceipt($r)),
            'advanceAdjustments' => $this->loadAdvanceAdjustments(),
            'currencyConversions' => Schema::hasTable('currency_conversions')
                ? CurrencyConversion::orderByDesc('id')->get()->map(fn ($c) => [
                    ...$c->toArray(),
                    'conversion_date' => $c->conversion_date?->format('Y-m-d'),
                ])
                : [],
            'expenses' => Expense::orderByDesc('id')->get()->map(fn ($e) => $this->mapExpense($e)),
            'consumptions' => Schema::hasTable('consumptions')
                ? Consumption::orderByDesc('id')->get()->map(fn ($c) => $this->mapConsumption($c))
                : [],
            'payments' => Payment::orderByDesc('id')->get()->map(fn ($p) => $this->mapPayment($p)),
            'creditNotes' => CreditNote::orderByDesc('id')->get()->map(fn ($c) => $this->mapCreditNote($c)),
            'creditNoteItems' => CreditNoteItem::orderBy('id')->get(),
            'debitNotes' => DebitNote::orderByDesc('id')->get()->map(fn ($d) => $this->mapDebitNote($d)),
            'debitNoteItems' => DebitNoteItem::orderBy('id')->get(),
            'ewayBills' => Schema::hasTable('eway_bills')
                ? EwayBill::orderByDesc('id')->get()->map(fn ($b) => $b->toArray())
                : [],
            'ecrsLogs' => EcrsLog::orderByDesc('id')->get()->map(fn ($e) => [
                'id' => $e->id,
                'action' => $e->action,
                'type' => $e->type,
                'cgst' => (float) $e->cgst,
                'sgst' => (float) $e->sgst,
                'igst' => (float) $e->igst,
                'status' => $e->status,
                'timestamp' => $e->logged_at?->toIso8601String() ?? $e->created_at->toIso8601String(),
            ]),
            'expenseHeads' => ExpenseHead::orderBy('name')->pluck('name'),
            'bankAccounts' => BankLedger::where('active', true)->orderBy('name')->pluck('name'),
            'cashLedgers' => CashLedger::where('active', true)->orderBy('name')->pluck('name'),
            'coaRecords' => [
                'expense_heads' => ExpenseHead::orderBy('name')->get()->map(fn ($h) => $this->mapCoaLedger($h))->values(),
                'banks' => BankLedger::where('active', true)->orderBy('name')->get()->map(fn ($b) => $this->mapCoaLedger($b))->values(),
                'cash' => CashLedger::where('active', true)->orderBy('name')->get()->map(fn ($c) => $this->mapCoaLedger($c))->values(),
            ],
            'coaChart' => Schema::hasTable('report_groups')
                ? app(CoaService::class)->buildChart((int) \App\Support\TenantContext::getCompanyId())
                : [],
            'reportGroups' => Schema::hasTable('report_groups')
                ? app(ReportGroupService::class)->tree((int) \App\Support\TenantContext::getCompanyId())
                : [],
            'coaSubtypes' => \App\Support\CoaCatalog::allSubtypes(),
            'auditLogs' => AuditLog::orderByDesc('id')->limit(LogRetentionService::AUDIT_MAX)->get()->map(fn ($a) => [
                'id' => $a->id,
                'user_id' => $a->user_id,
                'user_name' => $a->user_name,
                'action' => $a->action,
                'target' => $a->target,
                'details' => $a->details,
                'timestamp' => $a->logged_at?->toIso8601String(),
            ]),
            'loginLogs' => LoginLog::orderByDesc('id')->limit(LogRetentionService::LOGIN_MAX)->get()->map(fn ($l) => [
                'id' => $l->id,
                'user_id' => $l->user_id,
                'email' => $l->email,
                'name' => $l->name,
                'status' => $l->status,
                'details' => $l->details,
                'timestamp' => $l->logged_at?->toIso8601String(),
            ]),
            'cronReminderLogs' => CronReminderLog::orderByDesc('id')->get(),
            'calendarReminders' => CalendarReminder::orderBy('reminder_date')->orderBy('reminder_time')->get()->map(fn ($r) => [
                'id' => $r->id,
                'kind' => $r->kind,
                'priority' => $r->priority,
                'title' => $r->title,
                'notes' => $r->notes,
                'reminder_date' => $r->reminder_date?->format('Y-m-d'),
                'reminder_time' => $r->reminder_time,
                'notify_email' => $r->notify_email,
                'is_recurring' => (bool) $r->is_recurring,
                'recurring_frequency' => $r->recurring_frequency,
                'email_status' => $r->email_status,
                'email_sent_at' => $r->email_sent_at?->toIso8601String(),
                'popup_shown_at' => $r->popup_shown_at?->toIso8601String(),
                'user_id' => $r->user_id,
                'created_at' => $r->created_at?->toIso8601String(),
            ]),
            'companyDetails' => $companyDetails,
            'isFinancialYearLocked' => (bool) ($company->is_financial_year_locked ?? false),
            'lockedMonths' => $company->locked_months ?? [],
            'inactivityTimeout' => Schema::hasTable('portal_settings')
                ? PortalSetting::inactivityTimeout()
                : (int) ($company->inactivity_timeout ?? 900),
            'rcmLedgerBalance' => (float) ($company->rcm_ledger_balance ?? 0),
            'customOptions' => Schema::hasColumn('company_settings', 'custom_options')
                ? ($company->custom_options ?? [])
                : [],
        ];
    }

    private function formatPortalDate($date): ?string
    {
        if ($date === null) {
            return null;
        }

        return $date->format('Y-m-d');
    }

    private function mapCustomer(Customer $c): array
    {
        return array_merge($c->toArray(), [
            'opening_balance_date' => $this->formatPortalDate($c->opening_balance_date),
        ]);
    }

    private function mapVendor(Vendor $v): array
    {
        return array_merge($v->toArray(), [
            'opening_balance_date' => $this->formatPortalDate($v->opening_balance_date),
        ]);
    }

    private function mapConsumption(Consumption $c): array
    {
        return array_merge($c->toArray(), [
            'consumption_date' => $this->formatPortalDate($c->consumption_date),
            'created_at' => $c->created_at?->toIso8601String(),
        ]);
    }

    private function mapInvoice(Invoice $i): array
    {
        $po = $i->po_number;
        if ($po === null || trim((string) $po) === '' || strtoupper(trim((string) $po)) === 'NIL') {
            $po = null;
        }

        return array_merge($i->toArray(), [
            'po_number' => $po,
            'issue_date' => $i->issue_date?->format('Y-m-d') ?? $i->issue_date,
            'due_date' => $i->due_date?->format('Y-m-d') ?? $i->due_date,
            'created_at' => $i->created_at?->toIso8601String(),
        ]);
    }

    private function mapInventory(Inventory $i): array
    {
        return array_merge($i->toArray(), [
            'rate' => (float) $i->rate,
            'created_at' => $i->created_at?->toIso8601String(),
        ]);
    }

    private function mapReceipt(Receipt $r): array
    {
        $hasInvoice = ! empty($r->invoice_id);

        $mapped = array_merge($r->toArray(), [
            'payment_date' => $this->formatPortalDate($r->payment_date),
            'is_advance' => $hasInvoice ? false : (bool) $r->is_advance,
            'created_at' => $r->created_at?->toIso8601String(),
        ]);

        foreach ([
            'advance_reference',
            'utr_number',
            'cheque_number',
            'bank_reference',
            'customer_reference',
        ] as $column) {
            if (Schema::hasColumn('receipts', $column)) {
                $mapped[$column] = $r->{$column};
            }
        }

        return $mapped;
    }

    /** Safe when migration/model not deployed yet — bootstrap must never 500. */
    private function loadAdvanceAdjustments(): array
    {
        if (! Schema::hasTable('advance_adjustments') || ! class_exists(AdvanceAdjustment::class)) {
            return [];
        }

        try {
            return AdvanceAdjustment::orderByDesc('id')
                ->get()
                ->map(fn ($a) => $this->mapAdvanceAdjustment($a))
                ->values()
                ->all();
        } catch (\Throwable $e) {
            report($e);

            return [];
        }
    }

    private function mapAdvanceAdjustment(AdvanceAdjustment $a): array
    {
        return [
            'id' => $a->id,
            'company_id' => $a->company_id,
            'advance_receipt_id' => $a->advance_receipt_id,
            'invoice_id' => $a->invoice_id,
            'adjustment_amount' => (float) $a->adjustment_amount,
            'adjustment_date' => $this->formatPortalDate($a->adjustment_date),
            'created_by' => $a->created_by,
            'created_at' => $a->created_at?->toIso8601String(),
        ];
    }

    private function mapExpense(Expense $e): array
    {
        return array_merge($e->toArray(), [
            'expense_date' => $this->formatPortalDate($e->expense_date),
            'due_date' => $this->formatPortalDate($e->due_date),
            'is_recurring' => (bool) $e->is_recurring,
            'reminders_opt_in' => (bool) $e->reminders_opt_in,
            'itc_eligible' => (bool) $e->itc_eligible,
            'created_at' => $e->created_at?->toIso8601String(),
        ]);
    }

    private function mapPayment(Payment $p): array
    {
        $hasExpense = ! empty($p->expense_id);

        return array_merge($p->toArray(), [
            'payment_date' => $this->formatPortalDate($p->payment_date),
            'is_advance' => $hasExpense ? false : (bool) $p->is_advance,
            'created_at' => $p->created_at?->toIso8601String(),
        ]);
    }

    private function mapCreditNote(CreditNote $c): array
    {
        return array_merge($c->toArray(), [
            'original_invoice_date' => $this->formatPortalDate($c->original_invoice_date),
            'issue_date' => $this->formatPortalDate($c->issue_date),
            'created_at' => $c->created_at?->toIso8601String(),
        ]);
    }

    private function mapDebitNote(DebitNote $d): array
    {
        return array_merge($d->toArray(), [
            'original_expense_date' => $this->formatPortalDate($d->original_expense_date),
            'issue_date' => $this->formatPortalDate($d->issue_date),
            'created_at' => $d->created_at?->toIso8601String(),
        ]);
    }

    /** Bootstrap payload when no tenant company is selected (e.g. new group admin). */
    private function emptyBootstrap(?\App\Models\User $actor): array
    {
        return [
            'activeCompanyId' => null,
            'users' => $this->loadPortalUsers($actor),
            'customers' => [],
            'vendors' => [],
            'invoices' => [],
            'invoiceItems' => [],
            'inventory' => [],
            'receipts' => [],
            'advanceAdjustments' => [],
            'currencyConversions' => [],
            'expenses' => [],
            'consumptions' => [],
            'payments' => [],
            'creditNotes' => [],
            'creditNoteItems' => [],
            'debitNotes' => [],
            'debitNoteItems' => [],
            'ewayBills' => [],
            'ecrsLogs' => [],
            'expenseHeads' => [],
            'bankAccounts' => [],
            'cashLedgers' => [],
            'coaRecords' => ['expense_heads' => [], 'banks' => [], 'cash' => []],
            'coaChart' => [],
            'reportGroups' => [],
            'coaSubtypes' => \App\Support\CoaCatalog::allSubtypes(),
            'auditLogs' => [],
            'loginLogs' => [],
            'cronReminderLogs' => [],
            'calendarReminders' => [],
            'companyDetails' => [
                'name' => '',
                'gstin' => '',
                'pan' => '',
                'state' => '',
                'address' => '',
                'city' => '',
                'pincode' => '',
                'country' => 'India',
                'email' => '',
                'phone' => '',
                'currency' => 'INR (₹)',
                'bank_name' => '',
                'bank_account' => '',
                'bank_account_holder' => '',
                'bank_ifsc' => '',
                'bank_branch' => '',
                'logo' => '',
                'logo_layout' => 'auto',
                'accounting_framework' => 'AS',
                'gst_compliance' => [],
            ],
            'isFinancialYearLocked' => false,
            'lockedMonths' => [],
            'inactivityTimeout' => Schema::hasTable('portal_settings')
                ? PortalSetting::inactivityTimeout()
                : 900,
            'rcmLedgerBalance' => 0,
            'customOptions' => [],
        ];
    }

    /** Company settings row for the active tenant. */
    public static function companyRecord(): CompanySetting
    {
        $companyId = \App\Support\TenantContext::getCompanyId();
        if (!$companyId) {
            throw new \RuntimeException('Company context is not set.');
        }

        return CompanySetting::firstOrCreate(
            ['company_id' => $companyId],
            ['name' => 'New Company', 'currency' => 'INR']
        );
    }

    public static function formatCompanyDetails(CompanySetting $company): array
    {
        return [
            'name' => $company->name ?? '',
            'gstin' => $company->gstin ?? '',
            'pan' => $company->pan ?? '',
            'state' => $company->state ?? '',
            'address' => $company->address ?? '',
            'city' => $company->city ?? '',
            'pincode' => $company->pincode ?? '',
            'country' => $company->country ?? '',
            'email' => $company->email ?? '',
            'phone' => $company->phone ?? '',
            'currency' => $company->currency ?? 'INR (₹)',
            'bank_name' => $company->bank_name ?? '',
            'bank_account' => $company->bank_account ?? '',
            'bank_account_holder' => $company->bank_account_holder ?? '',
            'bank_ifsc' => $company->bank_ifsc ?? '',
            'bank_branch' => $company->bank_branch ?? '',
            'logo' => self::resolveCompanyLogo($company->logo ?? ''),
            'logo_layout' => ($company->custom_options ?? [])['logo_layout'] ?? 'auto',
            'accounting_framework' => $company->accounting_framework ?? 'AS',
            'gst_compliance' => GstComplianceSettings::forFrontend($company),
        ];
    }

    /** File path, full URL, or legacy base64 data URL for company logo. */
    public static function resolveCompanyLogo(?string $logo): string
    {
        if ($logo === null || $logo === '') {
            return '';
        }

        if (str_starts_with($logo, 'http://') || str_starts_with($logo, 'https://')) {
            return $logo;
        }

        if (str_starts_with($logo, '/storage/')) {
            return rtrim(config('app.url'), '/').$logo;
        }

        if (str_starts_with($logo, 'data:image/')) {
            if (strlen($logo) > 500000) {
                return '';
            }

            return $logo;
        }

        return $logo;
    }

    private function loadPortalUsers(?\App\Models\User $actor): \Illuminate\Support\Collection
    {
        $query = User::query()
            ->where('role', '!=', 'super_admin')
            ->select('id', 'email', 'name', 'role', 'company_id', 'created_at')
            ->orderBy('id');

        if ($actor && $actor->isSuperAdmin()) {
            $users = $query->get();
            $managedMap = $this->managedCompanyIdsForUsers(
                $users->where('role', 'group_admin')->pluck('id')->map(static fn ($id) => (int) $id)->all()
            );

            return $users->map(fn ($user) => $this->mapPortalUser($user, $managedMap));
        }

        $query->where('role', '!=', 'group_admin');

        if ($actor && $actor->isGroupAdmin()) {
            $accessibleIds = $actor->accessibleCompanyIds();
            if ($accessibleIds === []) {
                return collect();
            }

            return $query->whereIn('company_id', $accessibleIds)->get()->map(fn ($user) => $this->mapPortalUser($user));
        }

        $companyId = \App\Support\TenantContext::getCompanyId();
        if (! $companyId) {
            return collect();
        }

        return $query->where('company_id', $companyId)->get()->map(fn ($user) => $this->mapPortalUser($user));
    }

    /** @param array<int, list<int>> $managedMap */
    private function mapPortalUser(\App\Models\User $user, array $managedMap = []): array
    {
        $row = [
            'id' => $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'role' => $user->role,
            'company_id' => $user->company_id,
            'created_at' => $user->created_at?->toIso8601String(),
        ];

        if ($user->role === 'group_admin') {
            $row['managed_company_ids'] = $managedMap[$user->id] ?? [];
        }

        return $row;
    }

    /** @param list<int> $userIds @return array<int, list<int>> */
    private function managedCompanyIdsForUsers(array $userIds): array
    {
        if ($userIds === [] || ! Schema::hasTable('user_companies')) {
            return [];
        }

        $map = [];
        foreach (DB::table('user_companies')->whereIn('user_id', $userIds)->get(['user_id', 'company_id']) as $row) {
            $map[(int) $row->user_id][] = (int) $row->company_id;
        }

        return $map;
    }

    private function mapCoaLedger(object $record): array
    {
        return [
            'id' => $record->id,
            'name' => $record->name,
            'account_code' => $record->account_code,
            'ledger_type' => $record->ledger_type,
            'account_subtype' => $record->account_subtype ?? null,
            'opening_balance' => (float) ($record->opening_balance ?? 0),
            'opening_balance_date' => $record->opening_balance_date?->format('Y-m-d'),
            'description' => $record->description,
            'ifsc' => $record->ifsc ?? null,
            'account_number' => $record->account_number ?? null,
            'branch' => $record->branch ?? null,
            'location' => $record->location ?? null,
            'active' => isset($record->active) ? (bool) $record->active : true,
        ];
    }
}
