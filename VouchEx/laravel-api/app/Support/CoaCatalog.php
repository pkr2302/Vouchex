<?php

namespace App\Support;

/**
 * Master catalogue of ledger sub-types for Indian businesses (AS / Ind AS compatible).
 */
class CoaCatalog
{
    /** @var list<array{value: string, label: string, nature: string, code_from: int, code_to: int, normal_balance: string, fields: list<string>}> */
    public const SUBTYPES = [
        // Assets
        ['value' => 'bank', 'label' => 'Bank Account', 'nature' => 'asset', 'code_from' => 1100, 'code_to' => 1199, 'normal_balance' => 'debit', 'fields' => ['ifsc', 'account_number', 'branch']],
        ['value' => 'cash', 'label' => 'Cash / Petty Cash', 'nature' => 'asset', 'code_from' => 1200, 'code_to' => 1299, 'normal_balance' => 'debit', 'fields' => ['location']],
        ['value' => 'trade_receivable', 'label' => 'Trade Receivable (Debtors)', 'nature' => 'asset', 'code_from' => 1300, 'code_to' => 1399, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'other_receivable', 'label' => 'Other Receivable', 'nature' => 'asset', 'code_from' => 1400, 'code_to' => 1449, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'inventory', 'label' => 'Inventory / Stock', 'nature' => 'asset', 'code_from' => 1450, 'code_to' => 1499, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'gst_input', 'label' => 'GST Input (ITC)', 'nature' => 'asset', 'code_from' => 1500, 'code_to' => 1549, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'tds_receivable', 'label' => 'TDS Receivable', 'nature' => 'asset', 'code_from' => 1550, 'code_to' => 1579, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'advance_to_supplier', 'label' => 'Advance to Suppliers', 'nature' => 'asset', 'code_from' => 1580, 'code_to' => 1599, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'fixed_asset', 'label' => 'Fixed Asset (PPE)', 'nature' => 'asset', 'code_from' => 1600, 'code_to' => 1699, 'normal_balance' => 'debit', 'fields' => ['asset_category', 'purchase_date']],
        ['value' => 'accumulated_depreciation', 'label' => 'Accumulated Depreciation', 'nature' => 'asset', 'code_from' => 1700, 'code_to' => 1749, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'deposit_investment', 'label' => 'Deposits & Investments', 'nature' => 'asset', 'code_from' => 1750, 'code_to' => 1799, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'prepayment', 'label' => 'Prepaid Expenses', 'nature' => 'asset', 'code_from' => 1800, 'code_to' => 1849, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'loan_given', 'label' => 'Loans & Advances Given', 'nature' => 'asset', 'code_from' => 1850, 'code_to' => 1899, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'security_deposit', 'label' => 'Security Deposits (Asset)', 'nature' => 'asset', 'code_from' => 1900, 'code_to' => 1949, 'normal_balance' => 'debit', 'fields' => []],
        // Liabilities
        ['value' => 'trade_payable', 'label' => 'Trade Payable (Creditors)', 'nature' => 'liability', 'code_from' => 2100, 'code_to' => 2199, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'other_payable', 'label' => 'Other Payable', 'nature' => 'liability', 'code_from' => 2200, 'code_to' => 2249, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'gst_output', 'label' => 'GST Output / Payable', 'nature' => 'liability', 'code_from' => 2250, 'code_to' => 2299, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'tds_payable', 'label' => 'TDS Payable', 'nature' => 'liability', 'code_from' => 2300, 'code_to' => 2349, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'loan_borrowed', 'label' => 'Loans & Borrowings', 'nature' => 'liability', 'code_from' => 2350, 'code_to' => 2399, 'normal_balance' => 'credit', 'fields' => ['lender', 'interest_rate']],
        ['value' => 'advance_from_customer', 'label' => 'Advance from Customers', 'nature' => 'liability', 'code_from' => 2400, 'code_to' => 2449, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'provision', 'label' => 'Provisions', 'nature' => 'liability', 'code_from' => 2450, 'code_to' => 2499, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'statutory_dues', 'label' => 'Statutory Dues Payable', 'nature' => 'liability', 'code_from' => 2500, 'code_to' => 2549, 'normal_balance' => 'credit', 'fields' => []],
        // Equity
        ['value' => 'capital', 'label' => 'Capital / Share Capital', 'nature' => 'equity', 'code_from' => 3100, 'code_to' => 3199, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'retained_earnings', 'label' => 'Retained Earnings / Reserves', 'nature' => 'equity', 'code_from' => 3200, 'code_to' => 3299, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'drawings', 'label' => 'Drawings', 'nature' => 'equity', 'code_from' => 3300, 'code_to' => 3399, 'normal_balance' => 'debit', 'fields' => []],
        // Income
        ['value' => 'sales_revenue', 'label' => 'Sales / Revenue', 'nature' => 'income', 'code_from' => 4100, 'code_to' => 4199, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'other_income', 'label' => 'Other Income', 'nature' => 'income', 'code_from' => 4200, 'code_to' => 4299, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'interest_income', 'label' => 'Interest Income', 'nature' => 'income', 'code_from' => 4300, 'code_to' => 4349, 'normal_balance' => 'credit', 'fields' => []],
        ['value' => 'forex_gain', 'label' => 'Forex Gain', 'nature' => 'income', 'code_from' => 4350, 'code_to' => 4399, 'normal_balance' => 'credit', 'fields' => []],
        // Expenses
        ['value' => 'expense_direct', 'label' => 'Direct Expense / COGS', 'nature' => 'expense', 'code_from' => 5100, 'code_to' => 5199, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'expense_indirect', 'label' => 'Indirect Expense', 'nature' => 'expense', 'code_from' => 5200, 'code_to' => 5299, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'expense_admin', 'label' => 'Administrative Expense', 'nature' => 'expense', 'code_from' => 5300, 'code_to' => 5349, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'expense_selling', 'label' => 'Selling & Distribution Expense', 'nature' => 'expense', 'code_from' => 5350, 'code_to' => 5399, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'expense_finance', 'label' => 'Finance Cost', 'nature' => 'expense', 'code_from' => 5400, 'code_to' => 5449, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'depreciation_expense', 'label' => 'Depreciation & Amortisation', 'nature' => 'expense', 'code_from' => 5450, 'code_to' => 5499, 'normal_balance' => 'debit', 'fields' => []],
        ['value' => 'forex_loss', 'label' => 'Forex Loss', 'nature' => 'expense', 'code_from' => 5500, 'code_to' => 5549, 'normal_balance' => 'debit', 'fields' => []],
    ];

    public static function subtype(string $value): ?array
    {
        foreach (self::SUBTYPES as $row) {
            if ($row['value'] === $value) {
                return $row;
            }
        }

        return null;
    }

    public static function subtypesForNature(string $nature): array
    {
        return array_values(array_filter(self::SUBTYPES, fn ($r) => $r['nature'] === $nature));
    }

    public static function allSubtypes(): array
    {
        return self::SUBTYPES;
    }

    public static function normalBalanceFor(string $nature, ?string $subtype = null): string
    {
        if ($subtype) {
            $row = self::subtype($subtype);
            if ($row) {
                return $row['normal_balance'];
            }
        }

        return match ($nature) {
            'asset', 'expense' => 'debit',
            'liability', 'equity', 'income' => 'credit',
            default => 'debit',
        };
    }

    public static function validateCodeForSubtype(string $code, string $subtype): ?string
    {
        $row = self::subtype($subtype);
        if (! $row) {
            return null;
        }
        if (! preg_match('/^\d{4}$/', $code)) {
            return 'Account code must be a 4-digit number.';
        }
        $num = (int) $code;
        if ($num < $row['code_from'] || $num > $row['code_to']) {
            return "Code for {$row['label']} should be between {$row['code_from']} and {$row['code_to']}.";
        }

        return null;
    }
}
