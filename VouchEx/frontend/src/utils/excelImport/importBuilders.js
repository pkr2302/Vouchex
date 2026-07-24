import {
  cellAmount,
  cellBool,
  cellDate,
  cellStr,
  downloadWorkbook,
  findPartyByName,
} from './excelImportCore';
import { aggregateLinesTax, calcLineTax, emptyLineItem, isIntraState } from '../gstUtils';
import { toAmount, nextDocumentNumber, sameId, buildPartyAddressLine } from '../formatMoney';

const SALES_HEADERS = [
  'Invoice Number',
  'Invoice Date',
  'Due Date',
  'Customer Name',
  'Place of Supply',
  'Currency',
  'Invoice Type',
  'Item Description',
  'HSN/SAC',
  'Quantity',
  'Rate',
  'Tax Rate (%)',
  'Discount',
];

const PURCHASE_HEADERS = [
  'Vendor Bill No',
  'Bill Date',
  'Due Date',
  'Vendor Name',
  'Expense Head',
  'Description',
  'HSN/SAC',
  'Amount',
  'Tax Rate (%)',
  'ITC Eligible',
  'Payment Status',
  'Currency',
  'Place of Supply',
];

const RECEIPT_HEADERS = [
  'Customer Name',
  'Invoice Number',
  'Payment Date',
  'Amount Received',
  'TDS Deducted',
  'Discount Allowed',
  'Payment Mode',
  'Deposit To',
  'Reference No',
  'Currency',
];

const PAYMENT_HEADERS = [
  'Payee',
  'Expense Number',
  'Payment Date',
  'Amount Paid',
  'TDS Deducted',
  'Payment Mode',
  'Paid From',
  'Reference No',
  'Currency',
];

export const EXCEL_IMPORT_SPECS = {
  sales: {
    id: 'sales',
    title: 'Import sales invoices',
    description:
      'One row per line item. Rows with the same Invoice Number are grouped into one invoice. Customer Name must match Customer Master.',
    templateFile: 'vouchex_sales_import_template.xlsx',
    sheetName: 'Sales',
    headers: SALES_HEADERS,
    sampleRows: [
      [
        'INV-2026-1001',
        '2026-07-01',
        '2026-07-31',
        'Acme Traders',
        'Maharashtra',
        'INR',
        'B2B',
        'Consulting services',
        '998314',
        1,
        10000,
        18,
        0,
      ],
      [
        'INV-2026-1001',
        '2026-07-01',
        '2026-07-31',
        'Acme Traders',
        'Maharashtra',
        'INR',
        'B2B',
        'Support retainer',
        '998313',
        1,
        5000,
        18,
        0,
      ],
    ],
  },
  purchase: {
    id: 'purchase',
    title: 'Import purchase / expense bills',
    description:
      'One row per vendor bill. Vendor Name must match Vendor Master. Vendor Bill No must be unique per vendor.',
    templateFile: 'vouchex_purchase_import_template.xlsx',
    sheetName: 'Purchase',
    headers: PURCHASE_HEADERS,
    sampleRows: [
      [
        'SUP-8822',
        '2026-07-05',
        '2026-08-05',
        'Steel Suppliers Pvt Ltd',
        'Purchase',
        'Raw material purchase',
        '7208',
        25000,
        18,
        'Yes',
        'Unpaid',
        'INR',
        'Gujarat',
      ],
    ],
  },
  receipts: {
    id: 'receipts',
    title: 'Import receipts',
    description:
      'One row per collection. Customer Name and Invoice Number must already exist. Partial amounts are allowed.',
    templateFile: 'vouchex_receipts_import_template.xlsx',
    sheetName: 'Receipts',
    headers: RECEIPT_HEADERS,
    sampleRows: [
      [
        'Acme Traders',
        'INV-2026-1001',
        '2026-07-15',
        10000,
        0,
        0,
        'Bank',
        'HDFC Current',
        'UTR123',
        'INR',
      ],
    ],
  },
  payments: {
    id: 'payments',
    title: 'Import payments',
    description:
      'One row per payment. Expense Number must match an existing purchase/expense bill (e.g. EXP…). Partial amounts are allowed.',
    templateFile: 'vouchex_payments_import_template.xlsx',
    sheetName: 'Payments',
    headers: PAYMENT_HEADERS,
    sampleRows: [
      [
        'Steel Suppliers Pvt Ltd',
        'EXP2026070001',
        '2026-07-20',
        15000,
        0,
        'Bank Transfer / IMPS',
        'HDFC Current',
        'UTR987',
        'INR',
      ],
    ],
  },
};

export function downloadImportTemplate(type) {
  const spec = EXCEL_IMPORT_SPECS[type];
  if (!spec) throw new Error(`Unknown import type: ${type}`);
  const aoa = [spec.headers, ...spec.sampleRows];
  downloadWorkbook(spec.templateFile, spec.sheetName, aoa);
}

function partyAddress(party) {
  if (!party) return '';
  return buildPartyAddressLine({
    address: party.billing_address,
    city: party.billing_city,
    state: party.billing_state,
    pincode: party.billing_pincode,
  });
}

/** Build sales invoice create jobs from spreadsheet rows. */
export function buildSalesImportJobs(rows, ctx) {
  const { customers, invoices, companyState } = ctx;
  const groups = new Map();

  rows.forEach((row) => {
    const invoiceNumber = cellStr(row, ['Invoice Number', 'invoice_number', 'Invoice No']);
    const customerName = cellStr(row, ['Customer Name', 'Customer', 'client_name']);
    const groupKey = `${normalizeLoose(invoiceNumber) || `__row_${row.__row}`}::${normalizeLoose(customerName)}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(row);
  });

  const jobs = [];
  const usedNumbers = new Set(invoices.map((i) => String(i.invoice_number || '').toUpperCase()));

  groups.forEach((groupRows) => {
    const first = groupRows[0];
    const customerName = cellStr(first, ['Customer Name', 'Customer', 'client_name']);
    const customer = findPartyByName(customers, customerName, ['trade_name']);
    const invoiceDate =
      cellDate(first, ['Invoice Date', 'Issue Date', 'Date'], '') ||
      new Date().toISOString().slice(0, 10);
    let invoiceNumber = cellStr(first, ['Invoice Number', 'invoice_number', 'Invoice No']);
    if (!invoiceNumber) {
      invoiceNumber = nextDocumentNumber(
        'INV',
        invoiceDate.slice(0, 4),
        [...usedNumbers]
      );
    }
    usedNumbers.add(String(invoiceNumber).toUpperCase());

    const placeOfSupply =
      cellStr(first, ['Place of Supply', 'POS', 'place_of_supply']) ||
      customer?.billing_state ||
      companyState ||
      'Gujarat';
    const currency = cellStr(first, ['Currency'], customer?.currency || 'INR') || 'INR';
    const invoiceType = cellStr(first, ['Invoice Type', 'Type'], 'B2B') || 'B2B';
    const discount = cellAmount(first, ['Discount', 'Invoice Discount'], 0);

    const label = `${invoiceNumber} · ${customerName || 'Unknown'}`;
    if (!customer) {
      jobs.push({
        label,
        row: first.__row,
        error: `Customer "${customerName}" not found in Customer Master.`,
      });
      return;
    }
    if (invoices.some((i) => String(i.invoice_number).toUpperCase() === String(invoiceNumber).toUpperCase())) {
      jobs.push({
        label,
        row: first.__row,
        skip: true,
        error: `Invoice ${invoiceNumber} already exists — skipped.`,
      });
      return;
    }

    const lineItems = groupRows.map((row) => {
      const description = cellStr(row, ['Item Description', 'Description', 'Item']);
      const qty = cellAmount(row, ['Quantity', 'Qty'], 1) || 1;
      const rate = cellAmount(row, ['Rate', 'Unit Price', 'Price'], 0);
      const taxRate = cellAmount(row, ['Tax Rate (%)', 'Tax Rate', 'GST %'], 18);
      const base = {
        ...emptyLineItem(),
        description: description || 'Imported item',
        quantity: qty,
        rate,
        hsn_sac: cellStr(row, ['HSN/SAC', 'HSN', 'SAC'], ''),
        tax_rate_override: taxRate,
        supply_mechanism: 'FCM',
      };
      const tax = calcLineTax(base, placeOfSupply, companyState, null, '');
      return { ...base, ...tax, line_total: tax.taxable };
    });

    if (!lineItems.some((l) => l.description && toAmount(l.rate) > 0)) {
      jobs.push({
        label,
        row: first.__row,
        error: 'At least one line with description and rate is required.',
      });
      return;
    }

    const totals = aggregateLinesTax(lineItems, discount, placeOfSupply, companyState, null, '');
    const billLine = partyAddress(customer);
    const invoice = {
      invoice_number: invoiceNumber,
      invoice_type: invoiceType,
      customer_id: customer.id,
      customer_name: customer.name,
      issue_date: invoiceDate,
      due_date: cellDate(first, ['Due Date'], '') || null,
      billing_address: billLine,
      shipping_address: billLine,
      place_of_supply: placeOfSupply,
      currency,
      conversion_rate: 1,
      gstin: customer.gstin || 'NIL',
      subtotal: totals.subtotal,
      discount: toAmount(discount),
      tax_amount: totals.tax_amount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      payable_tax: totals.payable_tax,
      total_amount: totals.total_amount,
      status: 'Unpaid',
    };

    jobs.push({
      label,
      row: first.__row,
      invoice,
      items: lineItems,
    });
  });

  return jobs;
}

function normalizeLoose(v) {
  return String(v || '')
    .trim()
    .toLowerCase();
}

export function buildPurchaseImportJobs(rows, ctx) {
  const { vendors, expenses, companyState, recordType = 'purchase' } = ctx;
  const jobs = [];

  rows.forEach((row) => {
    const vendorName = cellStr(row, ['Vendor Name', 'Supplier', 'Payee']);
    const billNo = cellStr(row, ['Vendor Bill No', 'Bill No', 'Invoice Number', 'Supplier Invoice No']);
    const vendor = findPartyByName(vendors, vendorName, ['trade_name']);
    const label = `${billNo || 'Bill'} · ${vendorName || 'Unknown'}`;

    if (!vendor) {
      jobs.push({ label, row: row.__row, error: `Vendor "${vendorName}" not found in Vendor Master.` });
      return;
    }
    if (!billNo) {
      jobs.push({ label, row: row.__row, error: 'Vendor Bill No is required.' });
      return;
    }
    const duplicate = expenses.some(
      (exp) =>
        sameId(exp.vendor_id, vendor.id) &&
        String(exp.invoice_number || '').toUpperCase() === billNo.toUpperCase()
    );
    if (duplicate) {
      jobs.push({
        label,
        row: row.__row,
        skip: true,
        error: `Bill ${billNo} for ${vendor.name} already exists — skipped.`,
      });
      return;
    }

    const amount = cellAmount(row, ['Amount', 'Subtotal', 'Taxable Amount'], 0);
    if (amount <= 0) {
      jobs.push({ label, row: row.__row, error: 'Amount must be positive.' });
      return;
    }

    const taxRate = cellAmount(row, ['Tax Rate (%)', 'Tax Rate', 'GST %'], 18);
    const taxAmount = (amount * taxRate) / 100;
    const placeOfSupply =
      cellStr(row, ['Place of Supply', 'POS'], vendor.billing_state || companyState || 'Gujarat') ||
      companyState ||
      'Gujarat';
    const intra = isIntraState(placeOfSupply, companyState);
    const cgst = intra ? taxAmount / 2 : 0;
    const sgst = intra ? taxAmount / 2 : 0;
    const igst = intra ? 0 : taxAmount;
    const paymentStatusRaw = cellStr(row, ['Payment Status', 'Status'], 'Unpaid') || 'Unpaid';
    const paymentStatus = /paid/i.test(paymentStatusRaw) && !/unpaid|partial/i.test(paymentStatusRaw)
      ? 'Paid'
      : 'Unpaid';
    const expenseDate =
      cellDate(row, ['Bill Date', 'Expense Date', 'Invoice Date', 'Date'], '') ||
      new Date().toISOString().slice(0, 10);

    jobs.push({
      label,
      row: row.__row,
      payload: {
        record_type: recordType,
        invoice_number: billNo,
        description: cellStr(row, ['Description'], ''),
        expense_head: cellStr(row, ['Expense Head', 'Category'], recordType === 'purchase' ? 'Purchase' : 'General') || 'Purchase',
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        expense_date: expenseDate,
        amount,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        cgst,
        sgst,
        igst,
        total_amount: amount + taxAmount,
        place_of_supply: placeOfSupply,
        currency: cellStr(row, ['Currency'], vendor.currency || 'INR') || 'INR',
        conversion_rate: 1,
        supply_mechanism: 'FCM',
        payment_status: paymentStatus,
        hsn_sac: cellStr(row, ['HSN/SAC', 'HSN', 'SAC'], ''),
        is_recurring: false,
        recurring_frequency: '',
        reminders_opt_in: false,
        itc_eligible: cellBool(row, ['ITC Eligible', 'ITC'], true),
        tds_deducted: 0,
        attachment: 'excel_import.xlsx',
        due_date: cellDate(row, ['Due Date'], '') || null,
        paid_from_account: '',
        payment_reference: '',
      },
    });
  });

  return jobs;
}

export function buildReceiptImportJobs(rows, ctx) {
  const { customers, invoices, bankAccounts, cashLedgers } = ctx;
  const jobs = [];
  const defaultDeposit = bankAccounts?.[0] || cashLedgers?.[0] || '';

  rows.forEach((row) => {
    const customerName = cellStr(row, ['Customer Name', 'Customer', 'Client']);
    const invoiceNumber = cellStr(row, ['Invoice Number', 'Invoice No', 'Settled Invoice']);
    const customer = findPartyByName(customers, customerName, ['trade_name']);
    const label = `${invoiceNumber || 'Receipt'} · ${customerName || 'Unknown'}`;

    if (!customer) {
      jobs.push({ label, row: row.__row, error: `Customer "${customerName}" not found.` });
      return;
    }
    if (!invoiceNumber) {
      jobs.push({ label, row: row.__row, error: 'Invoice Number is required.' });
      return;
    }

    const invoice = invoices.find(
      (inv) =>
        sameId(inv.customer_id, customer.id) &&
        String(inv.invoice_number || '').toUpperCase() === invoiceNumber.toUpperCase()
    );
    if (!invoice) {
      jobs.push({
        label,
        row: row.__row,
        error: `Invoice ${invoiceNumber} not found for customer ${customer.name}.`,
      });
      return;
    }

    const cash = cellAmount(row, ['Amount Received', 'Net Amount Received', 'Amount'], 0);
    const tds = cellAmount(row, ['TDS Deducted', 'TDS'], 0);
    const discount = cellAmount(row, ['Discount Allowed', 'Discount'], 0);
    if (cash <= 0) {
      jobs.push({ label, row: row.__row, error: 'Amount Received must be positive.' });
      return;
    }

    jobs.push({
      label,
      row: row.__row,
      payload: {
        customer_id: customer.id,
        customer_name: customer.name,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        payment_date:
          cellDate(row, ['Payment Date', 'Receipt Date', 'Date'], '') ||
          new Date().toISOString().slice(0, 10),
        amount_received: cash,
        tds_deducted: tds,
        discount_allowed: discount,
        currency: cellStr(row, ['Currency'], invoice.currency || 'INR') || 'INR',
        payment_mode: cellStr(row, ['Payment Mode', 'Mode'], 'Bank') || 'Bank',
        deposit_to: cellStr(row, ['Deposit To', 'Deposited To'], defaultDeposit) || defaultDeposit,
        reference_no: cellStr(row, ['Reference No', 'UTR', 'Cheque No'], '') || 'NIL',
        is_advance: false,
      },
    });
  });

  return jobs;
}

export function buildPaymentImportJobs(rows, ctx) {
  const { expenses, bankAccounts, cashLedgers } = ctx;
  const jobs = [];
  const defaultPaidFrom = bankAccounts?.[0] || cashLedgers?.[0] || '';

  rows.forEach((row) => {
    const expenseNumber = cellStr(row, ['Expense Number', 'Bill No', 'Expense No', 'Voucher No']);
    const payee = cellStr(row, ['Payee', 'Vendor Name', 'Supplier']);
    const label = `${expenseNumber || 'Payment'} · ${payee || 'Unknown'}`;

    if (!expenseNumber) {
      jobs.push({ label, row: row.__row, error: 'Expense Number is required.' });
      return;
    }

    const expense = expenses.find(
      (exp) => String(exp.expense_number || '').toUpperCase() === expenseNumber.toUpperCase()
    );
    if (!expense) {
      jobs.push({ label, row: row.__row, error: `Expense/bill ${expenseNumber} not found.` });
      return;
    }

    const paid = cellAmount(row, ['Amount Paid', 'Net Amount Paid', 'Amount'], 0);
    const tds = cellAmount(row, ['TDS Deducted', 'TDS'], 0);
    if (paid <= 0) {
      jobs.push({ label, row: row.__row, error: 'Amount Paid must be positive.' });
      return;
    }

    jobs.push({
      label,
      row: row.__row,
      payload: {
        expense_id: expense.id,
        expense_number: expense.expense_number,
        payee: payee || expense.vendor_name,
        payment_date:
          cellDate(row, ['Payment Date', 'Date'], '') || new Date().toISOString().slice(0, 10),
        amount_paid: paid,
        tds_deducted: tds,
        currency: cellStr(row, ['Currency'], expense.currency || 'INR') || 'INR',
        payment_mode: cellStr(row, ['Payment Mode', 'Mode'], 'Bank Transfer / IMPS') || 'Bank Transfer / IMPS',
        paid_from: cellStr(row, ['Paid From', 'Source Account'], defaultPaidFrom) || defaultPaidFrom,
        reference_no: cellStr(row, ['Reference No', 'UTR', 'Cheque No'], '') || 'NIL',
        is_advance: false,
      },
    });
  });

  return jobs;
}
