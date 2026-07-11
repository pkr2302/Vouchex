<?php

namespace Database\Seeders;

use App\Models\BankLedger;
use App\Models\CashLedger;
use App\Models\Company;
use App\Models\CompanySetting;
use App\Models\Consumption;
use App\Models\CreditNote;
use App\Models\CreditNoteItem;
use App\Models\CurrencyConversion;
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
use App\Services\CoaAutoMapService;
use App\Services\GlBackfillService;
use App\Services\ReportGroupService;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoCompaniesSeeder extends Seeder
{
    private const DEMO_SLUGS = ['vouchex-as', 'vouchex-ind-as'];

    /** @return list<array{company_id: int, name: string, framework: string, admin_email: string, backfill_errors: list}> */
    public function seed(): array
    {
        return [
            $this->seedCompany([
                'name' => 'Vouchex AS',
                'slug' => 'vouchex-as',
                'framework' => 'AS',
                'template' => 'schedule_iii_as',
                'gstin' => '24AAAAV0001A1Z5',
                'prefix' => 'AS',
                'admin_email' => 'admin-as@vouchex.com',
                'user_email' => 'user-as@vouchex.com',
            ]),
            $this->seedCompany([
                'name' => 'Vouchex Ind AS',
                'slug' => 'vouchex-ind-as',
                'framework' => 'IND_AS',
                'template' => 'schedule_iii_ind_as',
                'gstin' => '24AAAAV0002A1Z4',
                'prefix' => 'IAS',
                'admin_email' => 'admin-indas@vouchex.com',
                'user_email' => 'user-indas@vouchex.com',
            ]),
        ];
    }

    public function removeDemoCompanies(): void
    {
        $ids = Company::whereIn('slug', self::DEMO_SLUGS)->pluck('id');
        if ($ids->isEmpty()) {
            return;
        }

        DB::transaction(function () use ($ids) {
            User::whereIn('company_id', $ids)->delete();
            foreach ($ids as $id) {
                $this->purgeCompanyData((int) $id);
            }
            CompanySetting::whereIn('company_id', $ids)->delete();
            Company::whereIn('id', $ids)->delete();
        });
    }

    /** @param  array{name: string, slug: string, framework: string, template: string, gstin: string, prefix: string, admin_email: string, user_email: string}  $cfg */
    private function seedCompany(array $cfg): array
    {
        if (Company::where('slug', $cfg['slug'])->exists()) {
            $existing = Company::where('slug', $cfg['slug'])->first();
            $setting = CompanySetting::where('company_id', $existing->id)->first();

            return [
                'company_id' => $existing->id,
                'name' => $cfg['name'],
                'framework' => $setting?->accounting_framework ?? $cfg['framework'],
                'admin_email' => $cfg['admin_email'],
                'backfill_errors' => [],
                'skipped' => true,
            ];
        }

        $p = $cfg['prefix'];

        $company = Company::create([
            'name' => $cfg['name'],
            'slug' => $cfg['slug'],
            'is_active' => true,
            'subscription_status' => 'active',
            'subscription_plan' => 'professional',
        ]);

        CompanySetting::create([
            'company_id' => $company->id,
            'name' => $cfg['name'],
            'trade_name' => $cfg['name'],
            'gstin' => $cfg['gstin'],
            'pan' => 'AAAAV'.substr($cfg['prefix'], 0, 4).'1A',
            'state' => 'Gujarat',
            'address' => '501, VouchEx Tower, SG Highway',
            'city' => 'Ahmedabad',
            'pincode' => '380015',
            'country' => 'India',
            'email' => strtolower(str_replace(' ', '', $cfg['name'])).'@demo.vouchex.com',
            'phone' => '+91-9876500001',
            'currency' => 'INR',
            'bank_name' => 'HDFC Bank',
            'bank_account' => '502000'.str_pad((string) $company->id, 8, '0', STR_PAD_LEFT),
            'bank_ifsc' => 'HDFC0001234',
            'bank_branch' => 'SG Highway Branch',
            'upi_id' => 'vouchex@okhdfcbank',
            'inactivity_timeout' => 900,
            'rcm_ledger_balance' => 8500,
            'accounting_framework' => $cfg['framework'],
            'custom_options' => ['gl_books_start_date' => '2025-04-01'],
        ]);

        $admin = User::create([
            'company_id' => $company->id,
            'email' => $cfg['admin_email'],
            'name' => $cfg['name'].' Admin',
            'role' => 'admin',
            'password' => Hash::make('user123'),
            'is_active' => true,
        ]);

        User::create([
            'company_id' => $company->id,
            'email' => $cfg['user_email'],
            'name' => $cfg['name'].' User',
            'role' => 'user',
            'password' => Hash::make('user123'),
            'is_active' => true,
        ]);

        foreach (['HDFC Bank Current A/c', 'ICICI Bank A/c'] as $bankName) {
            BankLedger::create(['company_id' => $company->id, 'name' => $bankName, 'active' => true]);
        }
        foreach (['Main Cash Ledger', 'Petty Cash Vault'] as $cashName) {
            CashLedger::create(['company_id' => $company->id, 'name' => $cashName, 'active' => true]);
        }
        foreach ([
            'Utilities', 'Software & Server Hosting', 'Office Stationery',
            'Business Travel', 'Legal & Audit fees', 'Rent',
        ] as $headName) {
            ExpenseHead::create(['company_id' => $company->id, 'name' => $headName]);
        }

        $customers = [
            Customer::create([
                'company_id' => $company->id,
                'name' => 'Reliance Industries Ltd',
                'contact_person' => 'Accounts Payable',
                'email' => 'ap.reliance@demo.com',
                'phone' => '+91-22-35555000',
                'category' => 'Corporate',
                'gst_type' => 'Registered - Regular',
                'gstin' => '27AAACR5055K1Z5',
                'pan' => 'AAACR5055K',
                'currency' => 'INR',
                'billing_address' => 'Maker Chambers IV, Nariman Point',
                'billing_city' => 'Mumbai',
                'billing_state' => 'Maharashtra',
                'billing_pincode' => '400021',
                'billing_country' => 'India',
                'shipping_same' => true,
                'opening_balance' => 85000,
                'opening_balance_date' => '2025-04-01',
                'payment_terms' => 'Net 30',
                'credit_limit' => 500000,
            ]),
            Customer::create([
                'company_id' => $company->id,
                'name' => 'Adani Enterprises Ltd',
                'contact_person' => 'Finance Desk',
                'email' => 'finance.adani@demo.com',
                'phone' => '+91-79-26565555',
                'category' => 'Corporate',
                'gst_type' => 'Registered - Regular',
                'gstin' => '24AAACG1234F1Z8',
                'pan' => 'AAACG1234F',
                'currency' => 'INR',
                'billing_address' => 'Adani House, Near Mithakhali Circle',
                'billing_city' => 'Ahmedabad',
                'billing_state' => 'Gujarat',
                'billing_pincode' => '380009',
                'billing_country' => 'India',
                'shipping_same' => true,
                'opening_balance' => 42000,
                'opening_balance_date' => '2025-04-01',
                'payment_terms' => 'Net 15',
                'credit_limit' => 300000,
            ]),
        ];

        $vendors = [
            Vendor::create([
                'company_id' => $company->id,
                'name' => 'Torrent Power Ltd',
                'contact_person' => 'Billing Desk',
                'email' => 'billing.torrent@demo.com',
                'phone' => '+91-79-26404040',
                'gst_type' => 'Registered - Regular',
                'gstin' => '24AABCT1234A1Z9',
                'billing_address' => 'Torrent House, Ashram Road',
                'billing_city' => 'Ahmedabad',
                'billing_state' => 'Gujarat',
                'billing_pincode' => '380009',
                'pan' => 'AABCT1234A',
                'opening_balance' => 12000,
                'opening_balance_date' => '2025-04-01',
            ]),
            Vendor::create([
                'company_id' => $company->id,
                'name' => 'Amazon Web Services India',
                'contact_person' => 'Billing',
                'email' => 'aws-billing@demo.com',
                'phone' => '+91-80-40000000',
                'gst_type' => 'Registered - Regular',
                'gstin' => '29AAHCA1234E1Z2',
                'billing_address' => 'Embassy Tech Village, Outer Ring Road',
                'billing_city' => 'Bengaluru',
                'billing_state' => 'Karnataka',
                'billing_pincode' => '560103',
                'pan' => 'AAHCA1234E',
                'opening_balance' => 0,
            ]),
        ];

        $products = [
            Inventory::create([
                'company_id' => $company->id,
                'type' => 'Product',
                'name' => 'Industrial Lubricant Oil',
                'code' => "LUB-{$p}-01",
                'sku' => "SKU-LUB-{$p}-01",
                'quantity' => 480,
                'unit' => 'Litre',
                'purchase_price' => 320,
                'sales_price' => 450,
                'tax_rate' => 18,
                'supply_mechanism' => 'FCM',
                'opening_stock' => 600,
                'low_stock_threshold' => 40,
                'created_by' => $admin->id,
            ]),
            Inventory::create([
                'company_id' => $company->id,
                'type' => 'Service',
                'name' => 'Annual Maintenance Contract',
                'code' => "AMC-{$p}-01",
                'sku' => "SKU-AMC-{$p}-01",
                'quantity' => 0,
                'unit' => 'Job',
                'purchase_price' => 0,
                'sales_price' => 25000,
                'tax_rate' => 18,
                'supply_mechanism' => 'FCM',
                'opening_stock' => 0,
                'low_stock_threshold' => 0,
                'created_by' => $admin->id,
            ]),
        ];

        $invoices = [
            $this->createInvoice($company, $admin, $customers[0], $products[0], [
                'number' => "INV-{$p}-001",
                'issue_date' => '2026-05-10',
                'due_date' => '2026-06-09',
                'place_of_supply' => 'Maharashtra',
                'qty' => 100,
                'unit_price' => 450,
                'subtotal' => 45000,
                'igst' => 8100,
                'cgst' => 0,
                'sgst' => 0,
                'total' => 53100,
                'status' => 'Paid',
            ]),
            $this->createInvoice($company, $admin, $customers[1], $products[1], [
                'number' => "INV-{$p}-002",
                'issue_date' => '2026-05-18',
                'due_date' => '2026-06-02',
                'place_of_supply' => 'Gujarat',
                'qty' => 1,
                'unit_price' => 25000,
                'subtotal' => 25000,
                'igst' => 0,
                'cgst' => 2250,
                'sgst' => 2250,
                'total' => 29500,
                'status' => 'Unpaid',
                'product_index' => 1,
            ]),
        ];

        Receipt::create([
            'company_id' => $company->id,
            'receipt_number' => "REC-{$p}-001",
            'invoice_id' => $invoices[0]->id,
            'invoice_number' => $invoices[0]->invoice_number,
            'customer_id' => $customers[0]->id,
            'customer_name' => $customers[0]->name,
            'payment_date' => '2026-05-12',
            'amount_received' => 53100,
            'payment_mode' => 'Bank:HDFC Bank Current A/c',
            'deposit_to' => 'HDFC Bank Current A/c',
            'reference_no' => "UTR-{$p}-REC-001",
            'is_advance' => false,
            'created_by' => $admin->id,
        ]);

        Receipt::create([
            'company_id' => $company->id,
            'receipt_number' => "REC-{$p}-002",
            'invoice_id' => null,
            'invoice_number' => null,
            'customer_id' => $customers[1]->id,
            'customer_name' => $customers[1]->name,
            'payment_date' => '2026-05-20',
            'amount_received' => 15000,
            'payment_mode' => 'Bank:ICICI Bank A/c',
            'deposit_to' => 'ICICI Bank A/c',
            'reference_no' => "UTR-{$p}-ADV-001",
            'is_advance' => true,
            'created_by' => $admin->id,
        ]);

        $expenses = [
            Expense::create([
                'company_id' => $company->id,
                'expense_number' => "EXP-{$p}-001",
                'record_type' => 'purchase',
                'invoice_number' => "TP-BILL-{$p}-MAY",
                'description' => 'Electricity charges May 2026',
                'expense_head' => 'Utilities',
                'vendor_id' => $vendors[0]->id,
                'vendor_name' => $vendors[0]->name,
                'expense_date' => '2026-05-08',
                'amount' => 38000,
                'tax_rate' => 18,
                'tax_amount' => 6840,
                'total_amount' => 44840,
                'cgst' => 3420,
                'sgst' => 3420,
                'igst' => 0,
                'payable_tax' => 6840,
                'supply_mechanism' => 'FCM',
                'place_of_supply' => 'Gujarat',
                'payment_status' => 'Paid',
                'hsn_sac' => '996912',
                'itc_eligible' => true,
                'paid_from_account' => 'HDFC Bank Current A/c',
                'payment_reference' => "UTR-{$p}-PAY-001",
                'created_by' => $admin->id,
            ]),
            Expense::create([
                'company_id' => $company->id,
                'expense_number' => "EXP-{$p}-002",
                'record_type' => 'expense',
                'invoice_number' => "AWS-{$p}-MAY",
                'description' => 'Cloud hosting May 2026',
                'expense_head' => 'Software & Server Hosting',
                'vendor_id' => $vendors[1]->id,
                'vendor_name' => $vendors[1]->name,
                'expense_date' => '2026-05-15',
                'amount' => 22000,
                'tax_rate' => 18,
                'tax_amount' => 3960,
                'total_amount' => 25960,
                'cgst' => 0,
                'sgst' => 0,
                'igst' => 3960,
                'payable_tax' => 3960,
                'supply_mechanism' => 'FCM',
                'place_of_supply' => 'Gujarat',
                'payment_status' => 'Unpaid',
                'hsn_sac' => '998314',
                'itc_eligible' => true,
                'created_by' => $admin->id,
            ]),
        ];

        Payment::create([
            'company_id' => $company->id,
            'payment_number' => "PAY-{$p}-001",
            'expense_id' => $expenses[0]->id,
            'expense_number' => $expenses[0]->expense_number,
            'payee' => $vendors[0]->name,
            'payment_date' => '2026-05-09',
            'amount_paid' => 44840,
            'payment_mode' => 'Bank:HDFC Bank Current A/c',
            'paid_from' => 'HDFC Bank Current A/c',
            'reference_no' => "UTR-{$p}-PAY-001",
            'is_advance' => false,
            'created_by' => $admin->id,
        ]);

        Payment::create([
            'company_id' => $company->id,
            'payment_number' => "PAY-{$p}-002",
            'expense_id' => null,
            'expense_number' => null,
            'payee' => $vendors[1]->name,
            'payment_date' => '2026-05-16',
            'amount_paid' => 10000,
            'payment_mode' => 'Bank:ICICI Bank A/c',
            'paid_from' => 'ICICI Bank A/c',
            'reference_no' => "UTR-{$p}-ADV-PAY-001",
            'is_advance' => true,
            'created_by' => $admin->id,
        ]);

        $creditNotes = [
            CreditNote::create([
                'company_id' => $company->id,
                'credit_note_number' => "CN-{$p}-001",
                'customer_id' => $customers[0]->id,
                'customer_name' => $customers[0]->name,
                'original_invoice_id' => $invoices[0]->id,
                'original_invoice_number' => $invoices[0]->invoice_number,
                'original_invoice_date' => $invoices[0]->issue_date,
                'issue_date' => '2026-05-25',
                'reason' => 'Partial return — damaged drums',
                'subtotal' => 4500,
                'tax_rate' => 18,
                'tax_amount' => 810,
                'total_amount' => 5310,
                'cgst' => 0,
                'sgst' => 0,
                'igst' => 810,
                'payable_tax' => 810,
                'supply_mechanism' => 'FCM',
                'created_by' => $admin->id,
            ]),
            CreditNote::create([
                'company_id' => $company->id,
                'credit_note_number' => "CN-{$p}-002",
                'customer_id' => $customers[1]->id,
                'customer_name' => $customers[1]->name,
                'original_invoice_id' => $invoices[1]->id,
                'original_invoice_number' => $invoices[1]->invoice_number,
                'original_invoice_date' => $invoices[1]->issue_date,
                'issue_date' => '2026-05-28',
                'reason' => 'Service credit — SLA breach',
                'subtotal' => 5000,
                'tax_rate' => 18,
                'tax_amount' => 900,
                'total_amount' => 5900,
                'cgst' => 450,
                'sgst' => 450,
                'igst' => 0,
                'payable_tax' => 900,
                'supply_mechanism' => 'FCM',
                'created_by' => $admin->id,
            ]),
        ];

        CreditNoteItem::create([
            'credit_note_id' => $creditNotes[0]->id,
            'product_id' => $products[0]->id,
            'description' => $products[0]->name,
            'quantity' => 10,
            'original_qty' => 100,
            'unit_price' => 450,
            'original_rate' => 450,
            'line_total' => 4500,
            'hsn_sac' => '27101980',
            'tax_rate_override' => 18,
            'supply_mechanism' => 'FCM',
            'igst' => 810,
        ]);

        CreditNoteItem::create([
            'credit_note_id' => $creditNotes[1]->id,
            'product_id' => $products[1]->id,
            'description' => $products[1]->name,
            'quantity' => 0.2,
            'original_qty' => 1,
            'unit_price' => 25000,
            'original_rate' => 25000,
            'line_total' => 5000,
            'hsn_sac' => '998719',
            'tax_rate_override' => 18,
            'supply_mechanism' => 'FCM',
            'cgst' => 450,
            'sgst' => 450,
        ]);

        $debitNotes = [
            DebitNote::create([
                'company_id' => $company->id,
                'debit_note_number' => "DN-{$p}-001",
                'vendor_id' => $vendors[0]->id,
                'vendor_name' => $vendors[0]->name,
                'original_expense_id' => $expenses[0]->id,
                'original_expense_number' => $expenses[0]->expense_number,
                'original_expense_date' => $expenses[0]->expense_date,
                'issue_date' => '2026-05-22',
                'reason' => 'Billing correction',
                'subtotal' => 2000,
                'tax_rate' => 18,
                'tax_amount' => 360,
                'total_amount' => 2360,
                'cgst' => 180,
                'sgst' => 180,
                'igst' => 0,
                'payable_tax' => 360,
                'supply_mechanism' => 'FCM',
                'created_by' => $admin->id,
            ]),
            DebitNote::create([
                'company_id' => $company->id,
                'debit_note_number' => "DN-{$p}-002",
                'vendor_id' => $vendors[1]->id,
                'vendor_name' => $vendors[1]->name,
                'original_expense_id' => $expenses[1]->id,
                'original_expense_number' => $expenses[1]->expense_number,
                'original_expense_date' => $expenses[1]->expense_date,
                'issue_date' => '2026-05-26',
                'reason' => 'Credit for unused capacity',
                'subtotal' => 3000,
                'tax_rate' => 18,
                'tax_amount' => 540,
                'total_amount' => 3540,
                'cgst' => 0,
                'sgst' => 0,
                'igst' => 540,
                'payable_tax' => 540,
                'supply_mechanism' => 'FCM',
                'created_by' => $admin->id,
            ]),
        ];

        DebitNoteItem::create([
            'debit_note_id' => $debitNotes[0]->id,
            'description' => 'Electricity billing adjustment',
            'quantity' => 1,
            'unit_price' => 2000,
            'line_total' => 2000,
            'hsn_sac' => '996912',
            'tax_rate_override' => 18,
            'cgst' => 180,
            'sgst' => 180,
        ]);

        DebitNoteItem::create([
            'debit_note_id' => $debitNotes[1]->id,
            'description' => 'AWS credit note',
            'quantity' => 1,
            'unit_price' => 3000,
            'line_total' => 3000,
            'hsn_sac' => '998314',
            'tax_rate_override' => 18,
            'igst' => 540,
        ]);

        Consumption::create([
            'company_id' => $company->id,
            'consumption_number' => "CON-{$p}-001",
            'consumption_date' => '2026-05-14',
            'product_id' => $products[0]->id,
            'quantity' => 25,
            'unit_cost' => 320,
            'total_value' => 8000,
            'expense_head' => 'Utilities',
            'reference' => 'Factory line A',
            'created_by' => $admin->id,
        ]);

        Consumption::create([
            'company_id' => $company->id,
            'consumption_number' => "CON-{$p}-002",
            'consumption_date' => '2026-05-21',
            'product_id' => $products[0]->id,
            'quantity' => 15,
            'unit_cost' => 320,
            'total_value' => 4800,
            'expense_head' => 'Office Stationery',
            'reference' => 'Maintenance batch',
            'created_by' => $admin->id,
        ]);

        CurrencyConversion::create([
            'company_id' => $company->id,
            'invoice_id' => $invoices[0]->id,
            'invoice_number' => $invoices[0]->invoice_number,
            'conversion_date' => '2026-05-13',
            'from_currency' => 'USD',
            'to_currency' => 'INR',
            'from_amount' => 500,
            'from_book_amount_inr' => 42000,
            'to_amount' => 42000,
            'conversion_rate' => 84,
            'from_ledger' => 'HDFC Bank Current A/c',
            'to_ledger' => 'HDFC Bank Current A/c',
            'reference_no' => "FX-{$p}-001",
            'created_by' => $admin->id,
        ]);

        CurrencyConversion::create([
            'company_id' => $company->id,
            'invoice_id' => null,
            'invoice_number' => null,
            'conversion_date' => '2026-05-19',
            'from_currency' => 'EUR',
            'to_currency' => 'INR',
            'from_amount' => 200,
            'from_book_amount_inr' => 18000,
            'to_amount' => 18000,
            'conversion_rate' => 90,
            'from_ledger' => 'ICICI Bank A/c',
            'to_ledger' => 'ICICI Bank A/c',
            'reference_no' => "FX-{$p}-002",
            'created_by' => $admin->id,
        ]);

        foreach ([
            ['action' => 'REVERSAL', 'type' => 'Rule 42 ITC reversal', 'cgst' => 1200, 'sgst' => 1200],
            ['action' => 'REVERSAL', 'type' => 'Rule 43 ITC reversal', 'cgst' => 800, 'sgst' => 800],
        ] as $i => $ecrs) {
            EcrsLog::create([
                'company_id' => $company->id,
                'action' => $ecrs['action'],
                'type' => $ecrs['type'],
                'cgst' => $ecrs['cgst'],
                'sgst' => $ecrs['sgst'],
                'igst' => 0,
                'status' => 'Reversed',
                'logged_at' => now()->subDays(10 - $i),
            ]);
        }

        TenantContext::setCompany($company->id);
        app()->instance('currentCompanyId', $company->id);

        app(ReportGroupService::class)->loadTemplate($company->id, $cfg['template']);
        app(CoaAutoMapService::class)->autoMap($company->id);

        $backfill = app(GlBackfillService::class)->backfillCompany($company->id, $admin->id);

        return [
            'company_id' => $company->id,
            'name' => $cfg['name'],
            'framework' => $cfg['framework'],
            'admin_email' => $cfg['admin_email'],
            'backfill_errors' => $backfill['errors'] ?? [],
        ];
    }

    /** @param  array{number: string, issue_date: string, due_date: string, place_of_supply: string, qty: float, unit_price: float, subtotal: float, igst: float, cgst: float, sgst: float, total: float, status: string, product_index?: int}  $data */
    private function createInvoice(Company $company, User $admin, Customer $customer, Inventory $defaultProduct, array $data): Invoice
    {
        $product = $defaultProduct;
        if (isset($data['product_index'])) {
            $product = Inventory::where('company_id', $company->id)->skip($data['product_index'])->first() ?? $defaultProduct;
        }

        $taxAmount = ($data['igst'] ?? 0) + ($data['cgst'] ?? 0) + ($data['sgst'] ?? 0);

        $invoice = Invoice::create([
            'company_id' => $company->id,
            'invoice_number' => $data['number'],
            'invoice_type' => 'B2B',
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'issue_date' => $data['issue_date'],
            'due_date' => $data['due_date'],
            'place_of_supply' => $data['place_of_supply'],
            'billing_address' => $customer->billing_address,
            'shipping_address' => $customer->billing_address,
            'gstin' => $customer->gstin,
            'subtotal' => $data['subtotal'],
            'discount' => 0,
            'tax_rate' => 18,
            'tax_amount' => $taxAmount,
            'cgst' => $data['cgst'],
            'sgst' => $data['sgst'],
            'igst' => $data['igst'],
            'payable_tax' => $taxAmount,
            'supply_mechanism' => 'FCM',
            'total_amount' => $data['total'],
            'status' => $data['status'],
            'created_by' => $admin->id,
            'created_by_name' => $admin->name,
        ]);

        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'product_id' => $product->id,
            'description' => $product->name,
            'item_detail' => 'Demo line item',
            'quantity' => $data['qty'],
            'unit_price' => $data['unit_price'],
            'line_total' => $data['subtotal'],
            'hsn_sac' => $product->type === 'Service' ? '998719' : '27101980',
            'tax_rate_override' => 18,
            'supply_mechanism' => 'FCM',
            'cgst' => $data['cgst'],
            'sgst' => $data['sgst'],
            'igst' => $data['igst'],
        ]);

        return $invoice;
    }

    private function purgeCompanyData(int $companyId): void
    {
        $tables = [
            'gl_journal_lines', 'gl_journals', 'gl_accounts', 'report_groups',
            'credit_note_items', 'credit_notes', 'debit_note_items', 'debit_notes',
            'invoice_items', 'invoices', 'receipts', 'payments', 'expenses',
            'consumptions', 'currency_conversions', 'ecrs_logs',
            'inventory', 'customers', 'vendors', 'expense_heads',
            'bank_ledgers', 'cash_ledgers', 'calendar_reminders',
        ];

        foreach ($tables as $table) {
            if (\Illuminate\Support\Facades\Schema::hasTable($table) && \Illuminate\Support\Facades\Schema::hasColumn($table, 'company_id')) {
                DB::table($table)->where('company_id', $companyId)->delete();
            }
        }
    }
}
