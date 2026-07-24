import {
  toAmount,
  sameId,
  dateOnly,
  formatDateDDMMYYYY,
  formatDocumentMoney,
} from './formatMoney';
import {
  invoiceOutstandingAmount,
  expenseOutstandingAmount,
  receiptSettlementTotal,
  paymentSettlementTotal,
  invoiceSettledAmount,
  expenseSettledAmount,
} from './accountingHelpers';

function daysBetween(fromDate, toDate) {
  const a = dateOnly(fromDate);
  const b = dateOnly(toDate);
  if (!a || !b) return null;
  const [ay, am, ad] = a.split('-').map((n) => parseInt(n, 10));
  const [by, bm, bd] = b.split('-').map((n) => parseInt(n, 10));
  const ms = new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function inPeriod(day, from, to) {
  const d = dateOnly(day);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/**
 * Sales: invoice raised vs corresponding receipt(s), with TDS receivable.
 * One row per receipt; invoices with no receipt get a single empty-receipt row.
 */
export function buildSalesSettlementComparison({
  invoices = [],
  receipts = [],
  creditNotes = [],
  advanceAdjustments = [],
  from = '',
  to = '',
} = {}) {
  const scopedInvoices = (invoices || [])
    .filter((inv) => inv.status !== 'Cancelled')
    .filter((inv) => !from && !to ? true : inPeriod(inv.issue_date, from, to))
    .sort((a, b) => String(dateOnly(b.issue_date)).localeCompare(String(dateOnly(a.issue_date))));

  const rows = [];

  scopedInvoices.forEach((inv) => {
    const invReceipts = (receipts || [])
      .filter((r) => sameId(r.invoice_id, inv.id) && !r.is_advance)
      .sort((a, b) => String(dateOnly(a.payment_date)).localeCompare(String(dateOnly(b.payment_date))));

    const outstanding = invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments);
    const settled = invoiceSettledAmount(receipts, inv.id);
    const currency = inv.currency || 'INR';

    if (!invReceipts.length) {
      rows.push({
        key: `inv-${inv.id}-open`,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        party: inv.customer_name,
        invoice_date: dateOnly(inv.issue_date),
        invoice_amount: toAmount(inv.total_amount),
        receipt_number: '',
        receipt_date: '',
        cash_received: 0,
        tds_receivable: 0,
        discount_allowed: 0,
        settled_on_voucher: 0,
        days_to_collect: null,
        outstanding,
        status: inv.status || 'Unpaid',
        currency,
        has_settlement: false,
      });
      return;
    }

    invReceipts.forEach((rec) => {
      rows.push({
        key: `inv-${inv.id}-rec-${rec.id}`,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        party: inv.customer_name,
        invoice_date: dateOnly(inv.issue_date),
        invoice_amount: toAmount(inv.total_amount),
        receipt_number: rec.receipt_number,
        receipt_date: dateOnly(rec.payment_date),
        cash_received: toAmount(rec.amount_received),
        tds_receivable: toAmount(rec.tds_deducted),
        discount_allowed: toAmount(rec.discount_allowed),
        settled_on_voucher: receiptSettlementTotal(rec),
        days_to_collect: daysBetween(inv.issue_date, rec.payment_date),
        outstanding,
        status: inv.status || 'Unpaid',
        currency,
        has_settlement: true,
        total_settled: settled,
      });
    });
  });

  const seenInvoices = new Set();
  let invoiceTotal = 0;
  let cashTotal = 0;
  let tdsTotal = 0;
  let discountTotal = 0;
  let outstandingTotal = 0;

  rows.forEach((row) => {
    cashTotal += row.cash_received;
    tdsTotal += row.tds_receivable;
    discountTotal += row.discount_allowed;
    if (!seenInvoices.has(row.invoice_id)) {
      seenInvoices.add(row.invoice_id);
      invoiceTotal += row.invoice_amount;
      outstandingTotal += row.outstanding;
    }
  });

  return {
    rows,
    totals: {
      invoices: seenInvoices.size,
      invoice_amount: invoiceTotal,
      cash_received: cashTotal,
      tds_receivable: tdsTotal,
      discount_allowed: discountTotal,
      outstanding: outstandingTotal,
    },
  };
}

/**
 * Purchase: bill raised vs corresponding payment(s), with TDS deducted.
 */
export function buildPurchaseSettlementComparison({
  expenses = [],
  payments = [],
  debitNotes = [],
  from = '',
  to = '',
  recordTypes = null,
} = {}) {
  const scoped = (expenses || [])
    .filter((exp) => {
      if (recordTypes?.length) {
        const rt = exp.record_type || 'expense';
        if (!recordTypes.includes(rt)) return false;
      }
      return !from && !to ? true : inPeriod(exp.expense_date, from, to);
    })
    .sort((a, b) => String(dateOnly(b.expense_date)).localeCompare(String(dateOnly(a.expense_date))));

  const rows = [];

  scoped.forEach((exp) => {
    const expPayments = (payments || [])
      .filter((p) => sameId(p.expense_id, exp.id) && !p.is_advance)
      .sort((a, b) => String(dateOnly(a.payment_date)).localeCompare(String(dateOnly(b.payment_date))));

    const outstanding = expenseOutstandingAmount(exp, payments, debitNotes);
    const settled = expenseSettledAmount(payments, exp.id);
    const currency = exp.currency || 'INR';

    if (!expPayments.length) {
      rows.push({
        key: `exp-${exp.id}-open`,
        expense_id: exp.id,
        bill_number: exp.expense_number,
        vendor_bill_no: exp.invoice_number || '',
        party: exp.vendor_name,
        bill_date: dateOnly(exp.expense_date),
        bill_amount: toAmount(exp.total_amount),
        payment_number: '',
        payment_date: '',
        cash_paid: 0,
        tds_deducted: 0,
        settled_on_voucher: 0,
        days_to_pay: null,
        outstanding,
        status: exp.payment_status || 'Unpaid',
        currency,
        has_settlement: false,
      });
      return;
    }

    expPayments.forEach((pay) => {
      rows.push({
        key: `exp-${exp.id}-pay-${pay.id}`,
        expense_id: exp.id,
        bill_number: exp.expense_number,
        vendor_bill_no: exp.invoice_number || '',
        party: exp.vendor_name,
        bill_date: dateOnly(exp.expense_date),
        bill_amount: toAmount(exp.total_amount),
        payment_number: pay.payment_number,
        payment_date: dateOnly(pay.payment_date),
        cash_paid: toAmount(pay.amount_paid),
        tds_deducted: toAmount(pay.tds_deducted),
        settled_on_voucher: paymentSettlementTotal(pay),
        days_to_pay: daysBetween(exp.expense_date, pay.payment_date),
        outstanding,
        status: exp.payment_status || 'Unpaid',
        currency,
        has_settlement: true,
        total_settled: settled,
      });
    });
  });

  const seenBills = new Set();
  let billTotal = 0;
  let cashTotal = 0;
  let tdsTotal = 0;
  let outstandingTotal = 0;

  rows.forEach((row) => {
    cashTotal += row.cash_paid;
    tdsTotal += row.tds_deducted;
    if (!seenBills.has(row.expense_id)) {
      seenBills.add(row.expense_id);
      billTotal += row.bill_amount;
      outstandingTotal += row.outstanding;
    }
  });

  return {
    rows,
    totals: {
      bills: seenBills.size,
      bill_amount: billTotal,
      cash_paid: cashTotal,
      tds_deducted: tdsTotal,
      outstanding: outstandingTotal,
    },
  };
}

export function formatSettlementCsvSales(report) {
  let csv =
    'Invoice No,Customer,Invoice Date,Invoice Amount,Receipt No,Receipt Date,Cash Received,TDS Receivable,Discount,Settled on Receipt,Days Inv→Receipt,Outstanding,Status\n';
  (report.rows || []).forEach((r) => {
    csv += `"${r.invoice_number}","${r.party}","${formatDateDDMMYYYY(r.invoice_date)}",${toAmount(r.invoice_amount).toFixed(2)},"${r.receipt_number || ''}","${r.receipt_date ? formatDateDDMMYYYY(r.receipt_date) : ''}",${toAmount(r.cash_received).toFixed(2)},${toAmount(r.tds_receivable).toFixed(2)},${toAmount(r.discount_allowed).toFixed(2)},${toAmount(r.settled_on_voucher).toFixed(2)},${r.days_to_collect ?? ''},${toAmount(r.outstanding).toFixed(2)},"${r.status}"\n`;
  });
  const t = report.totals || {};
  csv += `"TOTALS (${t.invoices || 0} invoices)",,,${toAmount(t.invoice_amount).toFixed(2)},,,,${toAmount(t.cash_received).toFixed(2)},${toAmount(t.tds_receivable).toFixed(2)},${toAmount(t.discount_allowed).toFixed(2)},,,,${toAmount(t.outstanding).toFixed(2)},\n`;
  return csv;
}

export function formatSettlementCsvPurchase(report) {
  let csv =
    'Bill No,Vendor Bill No,Vendor,Bill Date,Bill Amount,Payment No,Payment Date,Cash Paid,TDS Deducted,Settled on Payment,Days Bill→Payment,Outstanding,Status\n';
  (report.rows || []).forEach((r) => {
    csv += `"${r.bill_number}","${r.vendor_bill_no || ''}","${r.party}","${formatDateDDMMYYYY(r.bill_date)}",${toAmount(r.bill_amount).toFixed(2)},"${r.payment_number || ''}","${r.payment_date ? formatDateDDMMYYYY(r.payment_date) : ''}",${toAmount(r.cash_paid).toFixed(2)},${toAmount(r.tds_deducted).toFixed(2)},${toAmount(r.settled_on_voucher).toFixed(2)},${r.days_to_pay ?? ''},${toAmount(r.outstanding).toFixed(2)},"${r.status}"\n`;
  });
  const t = report.totals || {};
  csv += `"TOTALS (${t.bills || 0} bills)",,,,${toAmount(t.bill_amount).toFixed(2)},,,,${toAmount(t.cash_paid).toFixed(2)},${toAmount(t.tds_deducted).toFixed(2)},,,,${toAmount(t.outstanding).toFixed(2)},\n`;
  return csv;
}

export function moneyCell(value, currency = 'INR') {
  if (!value && value !== 0) return '—';
  return formatDocumentMoney(value, currency);
}
