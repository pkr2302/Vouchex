import { formatDocumentMoney } from './formatMoney';

function norm(s) {
  return (s || '').toString().toLowerCase().trim();
}

function push(results, item) {
  if (!item?.label) return;
  results.push(item);
}

/** Quick-jump destinations shown in mobile command palette */
export const QUICK_DESTINATIONS = [
  { id: 'dest-dashboard', type: 'destination', label: 'Home Dashboard', sublabel: 'Overview & KPIs', tab: 'dashboard', keywords: 'home dashboard overview' },
  { id: 'dest-customers', type: 'destination', label: 'Customers', sublabel: 'Customer master', tab: 'customer-master', keywords: 'customers clients debtors master' },
  { id: 'dest-vendors', type: 'destination', label: 'Vendors', sublabel: 'Supplier master', tab: 'vendor-master', keywords: 'vendors suppliers creditors master' },
  { id: 'dest-sales', type: 'destination', label: 'Sales Invoices', sublabel: 'Raise & manage invoices', tab: 'sales', keywords: 'sales invoice billing' },
  { id: 'dest-receipts', type: 'destination', label: 'Receipts', sublabel: 'Customer collections', tab: 'receipt', keywords: 'receipt collection payment in' },
  { id: 'dest-payments', type: 'destination', label: 'Payments', sublabel: 'Vendor disbursements', tab: 'payment', keywords: 'payment vendor outflow' },
  { id: 'dest-ledgers', type: 'destination', label: 'Ledgers', sublabel: 'Chart of accounts', tab: 'coa', keywords: 'ledgers chart accounts coa' },
  { id: 'dest-daybook', type: 'destination', label: 'Day Book', sublabel: 'Journal entries', tab: 'day-book', keywords: 'day book journal entries' },
  { id: 'dest-debtors', type: 'destination', label: 'Debtors', sublabel: 'Receivables listing', tab: 'debtors', keywords: 'debtors receivables outstanding' },
  { id: 'dest-creditors', type: 'destination', label: 'Creditors', sublabel: 'Payables listing', tab: 'creditors', keywords: 'creditors payables outstanding' },
  { id: 'dest-gst', type: 'destination', label: 'GST & Taxation', sublabel: 'GSTR reports', tab: 'taxation', keywords: 'gst gstr taxation tax' },
  { id: 'dest-financials', type: 'destination', label: 'Financial Statements', sublabel: 'P&L, Balance Sheet', tab: 'financials', keywords: 'financial statements pl balance sheet' },
  { id: 'dest-settings', type: 'destination', label: 'Settings', sublabel: 'Company profile', tab: 'settings', keywords: 'settings company profile' },
];

/** Transaction-only destinations for mobile app mode */
export const MOBILE_QUICK_DESTINATIONS = [
  { id: 'dest-home', type: 'destination', label: 'Quick Record', sublabel: 'Home shortcuts', tab: 'mobile-home', keywords: 'home quick record' },
  { id: 'dest-customers', type: 'destination', label: 'Customers', sublabel: 'Customer master', tab: 'customer-master', keywords: 'customers clients master' },
  { id: 'dest-vendors', type: 'destination', label: 'Vendors', sublabel: 'Supplier master', tab: 'vendor-master', keywords: 'vendors suppliers master' },
  { id: 'dest-sales', type: 'destination', label: 'Sales Invoices', sublabel: 'Raise invoices', tab: 'sales', keywords: 'sales invoice billing' },
  { id: 'dest-sales-return', type: 'destination', label: 'Sales Returns', sublabel: 'Credit notes', tab: 'sales-return', keywords: 'sales return credit' },
  { id: 'dest-receipts', type: 'destination', label: 'Receipts', sublabel: 'Collections', tab: 'receipt', keywords: 'receipt collection' },
  { id: 'dest-purchase', type: 'destination', label: 'Purchase', sublabel: 'Purchase bills', tab: 'purchase', keywords: 'purchase bill' },
  { id: 'dest-purchase-return', type: 'destination', label: 'Purchase Returns', sublabel: 'Debit notes', tab: 'purchase-return', keywords: 'purchase return debit' },
  { id: 'dest-expense', type: 'destination', label: 'Expenses', sublabel: 'Record expense', tab: 'expense', keywords: 'expense' },
  { id: 'dest-payments', type: 'destination', label: 'Payments', sublabel: 'Vendor payments', tab: 'payment', keywords: 'payment vendor' },
  { id: 'dest-inventory', type: 'destination', label: 'Inventory', sublabel: 'Stock items', tab: 'inventory', keywords: 'inventory stock' },
  { id: 'dest-consumption', type: 'destination', label: 'Consumption', sublabel: 'Stock usage', tab: 'consumption', keywords: 'consumption' },
  { id: 'dest-settings', type: 'destination', label: 'Settings', sublabel: 'Company profile', tab: 'settings', keywords: 'settings' },
];

/** Quick create shortcuts in mobile search command center */
export const QUICK_CREATE_ACTIONS = [
  { id: 'create-invoice', type: 'action', label: 'Create Invoice', sublabel: 'Raise new sales invoice', tab: 'sales', openForm: true, keywords: 'create invoice sales new raise' },
  { id: 'create-receipt', type: 'action', label: 'Create Receipt', sublabel: 'Record customer collection', tab: 'receipt', openForm: true, keywords: 'create receipt collection' },
  { id: 'create-payment', type: 'action', label: 'Create Payment', sublabel: 'Record vendor payment', tab: 'payment', openForm: true, keywords: 'create payment vendor' },
  { id: 'create-customer', type: 'action', label: 'Add Customer', sublabel: 'New customer master', tab: 'customer-master', openForm: true, keywords: 'add customer client new' },
  { id: 'create-vendor', type: 'action', label: 'Add Vendor', sublabel: 'New supplier master', tab: 'vendor-master', openForm: true, keywords: 'add vendor supplier new' },
];

export const MOBILE_QUICK_CREATE_ACTIONS = [
  { id: 'create-invoice', type: 'action', label: 'Create Invoice', sublabel: 'Raise sales invoice', tab: 'sales', openForm: true, keywords: 'create invoice sales' },
  { id: 'create-sales-return', type: 'action', label: 'Sales Return', sublabel: 'Credit note', tab: 'sales-return', openForm: true, keywords: 'sales return credit' },
  { id: 'create-receipt', type: 'action', label: 'Create Receipt', sublabel: 'Customer collection', tab: 'receipt', openForm: true, keywords: 'create receipt' },
  { id: 'create-purchase', type: 'action', label: 'Purchase Bill', sublabel: 'Record purchase', tab: 'purchase', openForm: true, keywords: 'create purchase' },
  { id: 'create-purchase-return', type: 'action', label: 'Purchase Return', sublabel: 'Debit note', tab: 'purchase-return', openForm: true, keywords: 'purchase return debit' },
  { id: 'create-expense', type: 'action', label: 'Expense', sublabel: 'Record expense', tab: 'expense', openForm: true, keywords: 'create expense' },
  { id: 'create-payment', type: 'action', label: 'Payment', sublabel: 'Vendor payment', tab: 'payment', openForm: true, keywords: 'create payment' },
  { id: 'create-customer', type: 'action', label: 'Add Customer', sublabel: 'New customer', tab: 'customer-master', openForm: true, keywords: 'add customer' },
  { id: 'create-vendor', type: 'action', label: 'Add Vendor', sublabel: 'New vendor', tab: 'vendor-master', openForm: true, keywords: 'add vendor' },
  { id: 'create-inventory', type: 'action', label: 'Stock Item', sublabel: 'Add inventory', tab: 'inventory', openForm: true, keywords: 'inventory stock' },
  { id: 'create-consumption', type: 'action', label: 'Consumption', sublabel: 'Stock usage', tab: 'consumption', openForm: true, keywords: 'consumption' },
];

export function buildGlobalSearchIndex({
  customers = [],
  vendors = [],
  invoices = [],
  expenses = [],
  receipts = [],
  payments = [],
  inventory = [],
  companyDetails = {},
  creditNotes = [],
  debitNotes = [],
  coaChart = [],
  journals = [],
  includeDestinations = true,
  mobileMode = false,
}) {
  const results = [];

  if (includeDestinations) {
    (mobileMode ? MOBILE_QUICK_DESTINATIONS : QUICK_DESTINATIONS).forEach((d) => push(results, d));
  }

  customers.forEach((c) => {
    push(results, {
      id: `customer-${c.id}`,
      type: 'customer',
      label: c.name,
      sublabel: c.gstin ? `GSTIN ${c.gstin}` : c.email || 'Customer',
      tab: 'customer-master',
      keywords: [c.name, c.gstin, c.email, c.phone, c.pan].filter(Boolean).join(' '),
    });
  });

  vendors.forEach((v) => {
    push(results, {
      id: `vendor-${v.id}`,
      type: 'vendor',
      label: v.name,
      sublabel: v.gstin ? `GSTIN ${v.gstin}` : 'Vendor',
      tab: 'vendor-master',
      keywords: [v.name, v.gstin, v.email, v.pan].filter(Boolean).join(' '),
    });
  });

  invoices.forEach((inv) => {
    push(results, {
      id: `invoice-${inv.id}`,
      type: 'invoice',
      label: inv.invoice_number,
      sublabel: `${inv.customer_name || '—'} · ${formatDocumentMoney(inv.total_amount, inv.currency || 'INR')}`,
      tab: 'sales',
      keywords: [inv.invoice_number, inv.customer_name, inv.gstin, inv.po_number, inv.status].filter(Boolean).join(' '),
    });
  });

  expenses.forEach((exp) => {
    const isPurchase = (exp.record_type || 'expense') === 'purchase';
    push(results, {
      id: `expense-${exp.id}`,
      type: isPurchase ? 'purchase' : 'expense',
      label: exp.expense_number || exp.invoice_number || `#${exp.id}`,
      sublabel: `${exp.vendor_name || exp.description || '—'} · ${formatDocumentMoney(exp.total_amount, exp.currency || 'INR')}`,
      tab: isPurchase ? 'purchase' : 'expense',
      keywords: [exp.expense_number, exp.invoice_number, exp.vendor_name, exp.description, exp.expense_head].filter(Boolean).join(' '),
    });
  });

  receipts.forEach((rec) => {
    push(results, {
      id: `receipt-${rec.id}`,
      type: 'receipt',
      label: rec.receipt_number,
      sublabel: `${rec.customer_name || '—'} · ${formatDocumentMoney(rec.amount_received, 'INR')}`,
      tab: 'receipt',
      keywords: [rec.receipt_number, rec.customer_name, rec.reference].filter(Boolean).join(' '),
    });
  });

  payments.forEach((pay) => {
    push(results, {
      id: `payment-${pay.id}`,
      type: 'payment',
      label: pay.payment_number,
      sublabel: `${pay.payee || '—'} · ${formatDocumentMoney(pay.amount_paid, 'INR')}`,
      tab: 'payment',
      keywords: [pay.payment_number, pay.payee, pay.reference].filter(Boolean).join(' '),
    });
  });

  creditNotes.forEach((cn) => {
    push(results, {
      id: `credit-note-${cn.id}`,
      type: 'credit_note',
      label: cn.credit_note_number,
      sublabel: `${cn.customer_name || '—'} · ${formatDocumentMoney(cn.total_amount, 'INR')}`,
      tab: 'sales-return',
      keywords: [cn.credit_note_number, cn.customer_name, cn.original_invoice_number, cn.reason].filter(Boolean).join(' '),
    });
  });

  debitNotes.forEach((dn) => {
    push(results, {
      id: `debit-note-${dn.id}`,
      type: 'debit_note',
      label: dn.debit_note_number,
      sublabel: `${dn.vendor_name || '—'} · ${formatDocumentMoney(dn.total_amount, 'INR')}`,
      tab: 'purchase-return',
      keywords: [dn.debit_note_number, dn.vendor_name, dn.original_expense_number, dn.reason].filter(Boolean).join(' '),
    });
  });

  (mobileMode ? [] : coaChart || []).forEach((row) => {
    push(results, {
      id: `ledger-${row.id || row.code}-${row.source_id || row.name}`,
      type: 'ledger',
      label: row.name,
      sublabel: `${row.code || '—'} · ${row.account_subtype_label || row.account_type || 'Ledger'}`,
      tab: 'coa',
      keywords: [row.name, row.code, row.account_subtype_label, row.account_type, row.source].filter(Boolean).join(' '),
    });
  });

  (mobileMode ? [] : journals || []).forEach((j, i) => {
    push(results, {
      id: `journal-${j.id || j.journal_number || i}`,
      type: 'journal',
      label: j.journal_number || `Journal #${j.id || i + 1}`,
      sublabel: j.narration || j.description || j.journal_date || 'Journal entry',
      tab: 'day-book',
      keywords: [j.journal_number, j.narration, j.description, j.journal_date, j.reference].filter(Boolean).join(' '),
    });
  });

  inventory.forEach((item) => {
    push(results, {
      id: `product-${item.id}`,
      type: 'product',
      label: item.name,
      sublabel: `${item.type} · ${item.sku || item.code || ''}`,
      tab: 'inventory',
      keywords: [item.name, item.sku, item.code, item.type].filter(Boolean).join(' '),
    });
  });

  if (companyDetails.gstin) {
    push(results, {
      id: 'company-gstin',
      type: 'company',
      label: companyDetails.name || 'Company',
      sublabel: `GSTIN ${companyDetails.gstin}`,
      tab: 'settings',
      keywords: [companyDetails.name, companyDetails.gstin, companyDetails.pan].filter(Boolean).join(' '),
    });
  }

  return results;
}

export function filterSearchIndex(index, query, { destinationsOnly = false } = {}) {
  const q = norm(query);
  if (!q) {
    if (destinationsOnly) {
      return index.filter((item) => item.type === 'destination').slice(0, 14);
    }
    return index.filter((item) => item.type === 'destination').slice(0, 12);
  }
  const terms = q.split(/\s+/).filter(Boolean);
  return index
    .filter((item) => {
      const hay = norm(`${item.label} ${item.sublabel} ${item.keywords || ''}`);
      return terms.every((t) => hay.includes(t));
    })
    .slice(0, 30);
}

export const SEARCH_TYPE_LABELS = {
  customer: 'Customer',
  vendor: 'Vendor',
  invoice: 'Invoice',
  purchase: 'Purchase',
  expense: 'Expense',
  receipt: 'Receipt',
  payment: 'Payment',
  product: 'Product',
  company: 'Company',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  ledger: 'Ledger',
  journal: 'Journal',
  destination: 'Go to',
  action: 'Create',
  tab: 'Page',
};
