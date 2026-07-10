/** Master catalogue of ledger sub-types — mirrors backend CoaCatalog. */

export const COA_NATURES = [
  { value: 'asset', label: 'Assets' },
  { value: 'liability', label: 'Liabilities' },
  { value: 'equity', label: 'Equity' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
];

export const COA_SUBTYPES = [
  { value: 'bank', label: 'Bank Account', nature: 'asset', codeFrom: 1100, codeTo: 1199, normalBalance: 'debit', fields: ['ifsc', 'account_number', 'branch'] },
  { value: 'cash', label: 'Cash / Petty Cash', nature: 'asset', codeFrom: 1200, codeTo: 1299, normalBalance: 'debit', fields: ['location'] },
  { value: 'trade_receivable', label: 'Trade Receivable (Debtors)', nature: 'asset', codeFrom: 1300, codeTo: 1399, normalBalance: 'debit', fields: [] },
  { value: 'other_receivable', label: 'Other Receivable', nature: 'asset', codeFrom: 1400, codeTo: 1449, normalBalance: 'debit', fields: [] },
  { value: 'inventory', label: 'Inventory / Stock', nature: 'asset', codeFrom: 1450, codeTo: 1499, normalBalance: 'debit', fields: [] },
  { value: 'gst_input', label: 'GST Input (ITC)', nature: 'asset', codeFrom: 1500, codeTo: 1549, normalBalance: 'debit', fields: [] },
  { value: 'tds_receivable', label: 'TDS Receivable', nature: 'asset', codeFrom: 1550, codeTo: 1579, normalBalance: 'debit', fields: [] },
  { value: 'advance_to_supplier', label: 'Advance to Suppliers', nature: 'asset', codeFrom: 1580, codeTo: 1599, normalBalance: 'debit', fields: [] },
  { value: 'fixed_asset', label: 'Fixed Asset (PPE)', nature: 'asset', codeFrom: 1600, codeTo: 1699, normalBalance: 'debit', fields: ['asset_category', 'purchase_date'] },
  { value: 'accumulated_depreciation', label: 'Accumulated Depreciation', nature: 'asset', codeFrom: 1700, codeTo: 1749, normalBalance: 'credit', fields: [] },
  { value: 'deposit_investment', label: 'Deposits & Investments', nature: 'asset', codeFrom: 1750, codeTo: 1799, normalBalance: 'debit', fields: [] },
  { value: 'prepayment', label: 'Prepaid Expenses', nature: 'asset', codeFrom: 1800, codeTo: 1849, normalBalance: 'debit', fields: [] },
  { value: 'loan_given', label: 'Loans & Advances Given', nature: 'asset', codeFrom: 1850, codeTo: 1899, normalBalance: 'debit', fields: [] },
  { value: 'security_deposit', label: 'Security Deposits (Asset)', nature: 'asset', codeFrom: 1900, codeTo: 1949, normalBalance: 'debit', fields: [] },
  { value: 'trade_payable', label: 'Trade Payable (Creditors)', nature: 'liability', codeFrom: 2100, codeTo: 2199, normalBalance: 'credit', fields: [] },
  { value: 'other_payable', label: 'Other Payable', nature: 'liability', codeFrom: 2200, codeTo: 2249, normalBalance: 'credit', fields: [] },
  { value: 'gst_output', label: 'GST Output / Payable', nature: 'liability', codeFrom: 2250, codeTo: 2299, normalBalance: 'credit', fields: [] },
  { value: 'tds_payable', label: 'TDS Payable', nature: 'liability', codeFrom: 2300, codeTo: 2349, normalBalance: 'credit', fields: [] },
  { value: 'loan_borrowed', label: 'Loans & Borrowings', nature: 'liability', codeFrom: 2350, codeTo: 2399, normalBalance: 'credit', fields: ['lender', 'interest_rate'] },
  { value: 'advance_from_customer', label: 'Advance from Customers', nature: 'liability', codeFrom: 2400, codeTo: 2449, normalBalance: 'credit', fields: [] },
  { value: 'provision', label: 'Provisions', nature: 'liability', codeFrom: 2450, codeTo: 2499, normalBalance: 'credit', fields: [] },
  { value: 'statutory_dues', label: 'Statutory Dues Payable', nature: 'liability', codeFrom: 2500, codeTo: 2549, normalBalance: 'credit', fields: [] },
  { value: 'capital', label: 'Capital / Share Capital', nature: 'equity', codeFrom: 3100, codeTo: 3199, normalBalance: 'credit', fields: [] },
  { value: 'retained_earnings', label: 'Retained Earnings / Reserves', nature: 'equity', codeFrom: 3200, codeTo: 3299, normalBalance: 'credit', fields: [] },
  { value: 'drawings', label: 'Drawings', nature: 'equity', codeFrom: 3300, codeTo: 3399, normalBalance: 'debit', fields: [] },
  { value: 'sales_revenue', label: 'Sales / Revenue', nature: 'income', codeFrom: 4100, codeTo: 4199, normalBalance: 'credit', fields: [] },
  { value: 'other_income', label: 'Other Income', nature: 'income', codeFrom: 4200, codeTo: 4299, normalBalance: 'credit', fields: [] },
  { value: 'interest_income', label: 'Interest Income', nature: 'income', codeFrom: 4300, codeTo: 4349, normalBalance: 'credit', fields: [] },
  { value: 'forex_gain', label: 'Forex Gain', nature: 'income', codeFrom: 4350, codeTo: 4399, normalBalance: 'credit', fields: [] },
  { value: 'expense_direct', label: 'Direct Expense / COGS', nature: 'expense', codeFrom: 5100, codeTo: 5199, normalBalance: 'debit', fields: [] },
  { value: 'expense_indirect', label: 'Indirect Expense', nature: 'expense', codeFrom: 5200, codeTo: 5299, normalBalance: 'debit', fields: [] },
  { value: 'expense_admin', label: 'Administrative Expense', nature: 'expense', codeFrom: 5300, codeTo: 5349, normalBalance: 'debit', fields: [] },
  { value: 'expense_selling', label: 'Selling & Distribution Expense', nature: 'expense', codeFrom: 5350, codeTo: 5399, normalBalance: 'debit', fields: [] },
  { value: 'expense_finance', label: 'Finance Cost', nature: 'expense', codeFrom: 5400, codeTo: 5449, normalBalance: 'debit', fields: [] },
  { value: 'depreciation_expense', label: 'Depreciation & Amortisation', nature: 'expense', codeFrom: 5450, codeTo: 5499, normalBalance: 'debit', fields: [] },
  { value: 'forex_loss', label: 'Forex Loss', nature: 'expense', codeFrom: 5500, codeTo: 5549, normalBalance: 'debit', fields: [] },
];

export const EXPENSE_SUBTYPES = COA_SUBTYPES.filter((s) => s.nature === 'expense');

export function subtypeByValue(value) {
  return COA_SUBTYPES.find((s) => s.value === value) || null;
}

export function subtypesForNature(nature) {
  return COA_SUBTYPES.filter((s) => s.nature === nature);
}

export function validateCodeForSubtype(code, subtypeValue) {
  const row = subtypeByValue(subtypeValue);
  if (!row) return null;
  if (!/^\d{4}$/.test(String(code))) return 'Account code must be a 4-digit number.';
  const num = parseInt(code, 10);
  if (num < row.codeFrom || num > row.codeTo) {
    return `Code for ${row.label} should be between ${row.codeFrom} and ${row.codeTo}.`;
  }
  return null;
}

export const SOURCE_LABELS = {
  bank: 'Bank (operational)',
  cash: 'Cash (operational)',
  expense_head: 'Expense head (operational)',
  customer: 'Customer (auto)',
  vendor: 'Vendor (auto)',
  system: 'System',
  manual: 'General ledger',
};

export const STATEMENT_TYPES = [
  { value: 'balance_sheet', label: 'Balance Sheet' },
  { value: 'profit_loss', label: 'Profit & Loss' },
  { value: 'trial_balance', label: 'Trial Balance' },
  { value: 'notes', label: 'Notes to Accounts' },
];

/** Flatten report group tree for select dropdowns. */
export function flattenReportGroups(nodes, depth = 0) {
  const out = [];
  (nodes || []).forEach((node) => {
    out.push({
      id: node.id,
      name: node.name,
      statement_type: node.statement_type,
      label: `${'— '.repeat(depth)}${node.name}`,
    });
    out.push(...flattenReportGroups(node.children, depth + 1));
  });
  return out;
}
