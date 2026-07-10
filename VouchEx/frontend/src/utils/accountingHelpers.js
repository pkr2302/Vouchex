import { toAmount, sameId, dateOnly } from './formatMoney';

/** Calendar today as local YYYY-MM-DD (no UTC drift). */
export function portalTodayDateOnly() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local midnight Date for ageing/KPI calculations. */
export function portalToday() {
  const s = portalTodayDateOnly();
  const [y, m, day] = s.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, day);
}

export function receiptSettlementTotal(receipt) {
  return toAmount(receipt?.amount_received) + toAmount(receipt?.tds_deducted) + toAmount(receipt?.discount_allowed);
}

export function paymentSettlementTotal(payment) {
  return toAmount(payment?.amount_paid) + toAmount(payment?.tds_deducted);
}

export function creditNotesForInvoice(creditNotes, invoiceId) {
  return (creditNotes || []).filter((cn) => sameId(cn.original_invoice_id, invoiceId));
}

export function creditNoteTotalForInvoice(creditNotes, invoiceId) {
  return creditNotesForInvoice(creditNotes, invoiceId).reduce((s, cn) => s + toAmount(cn.total_amount), 0);
}

export function debitNotesForExpense(debitNotes, expenseId) {
  return (debitNotes || []).filter((dn) => sameId(dn.original_expense_id, expenseId));
}

export function debitNoteTotalForExpense(debitNotes, expenseId) {
  return debitNotesForExpense(debitNotes, expenseId).reduce((s, dn) => s + toAmount(dn.total_amount), 0);
}

export function invoiceEffectiveTotal(inv, creditNotes = []) {
  return Math.max(0, toAmount(inv?.total_amount) - creditNoteTotalForInvoice(creditNotes, inv?.id));
}

export function expenseEffectiveTotal(exp, debitNotes = []) {
  return Math.max(0, toAmount(exp?.total_amount) - debitNoteTotalForExpense(debitNotes, exp?.id));
}

export function invoiceSettledAmount(receipts, invoiceId) {
  return (receipts || [])
    .filter((r) => sameId(r.invoice_id, invoiceId))
    .reduce((s, r) => s + receiptSettlementTotal(r), 0);
}

export function invoiceAdvanceAdjustedTotal(invoiceId, advanceAdjustments = []) {
  return (advanceAdjustments || [])
    .filter((a) => sameId(a.invoice_id, invoiceId))
    .reduce((s, a) => s + toAmount(a.adjustment_amount), 0);
}

export function expenseSettledAmount(payments, expenseId) {
  return (payments || [])
    .filter((p) => sameId(p.expense_id, expenseId))
    .reduce((s, p) => s + paymentSettlementTotal(p), 0);
}

export function invoiceOutstandingAmount(inv, receipts, creditNotes = [], advanceAdjustments = []) {
  if (!inv || inv.status === 'Cancelled' || inv.status === 'Paid') return 0;
  const net = invoiceEffectiveTotal(inv, creditNotes);
  const settled = invoiceSettledAmount(receipts, inv.id);
  const advanceAdj = invoiceAdvanceAdjustedTotal(inv.id, advanceAdjustments);
  return Math.max(0, net - settled - advanceAdj);
}

export function expenseOutstandingAmount(exp, payments, debitNotes = []) {
  if (!exp || exp.payment_status === 'Paid') return 0;
  const net = expenseEffectiveTotal(exp, debitNotes);
  const settled = expenseSettledAmount(payments, exp.id);
  return Math.max(0, net - settled);
}

export function daysOverdue(referenceDate, dueOrIssueDate) {
  const ref = dateOnly(referenceDate);
  const due = dateOnly(dueOrIssueDate);
  if (!ref || !due) return 0;
  const [ry, rm, rd] = ref.split('-').map((n) => parseInt(n, 10));
  const [dy, dm, dd] = due.split('-').map((n) => parseInt(n, 10));
  const refMs = new Date(ry, rm - 1, rd).getTime();
  const dueMs = new Date(dy, dm - 1, dd).getTime();
  return Math.floor((refMs - dueMs) / 86400000);
}

export function receivableAgeingBucket(daysPastDue) {
  if (daysPastDue <= 30) return '0-30';
  if (daysPastDue <= 60) return '31-60';
  if (daysPastDue <= 90) return '60-90';
  return '90+';
}

/** Taxable value on invoice/expense (excl. GST) — subtotal/amount minus discount. */
export function documentTaxableNet(doc) {
  if (!doc) return 0;
  const subtotal = toAmount(doc.subtotal ?? doc.amount);
  const discount = toAmount(doc.discount ?? 0);
  return Math.max(0, subtotal - discount);
}

export function documentTotalNet(doc) {
  return toAmount(doc?.total_amount);
}

/**
 * Indian TDS base: taxable (ex-GST) portion of the amount being settled on the bill.
 * @param {object} doc - invoice or expense
 * @param {number|string} settlementInclGst - cash + TDS + discount (full settlement against bill)
 */
export function tdsBaseForSettlement(doc, settlementInclGst) {
  return documentTaxableOutstanding(doc, settlementInclGst);
}

/** Net cash/bank movement after TDS and receipt discount. */
export function netCashFromSettlement(settlementInclGst, tds, discount = 0) {
  const net = toAmount(settlementInclGst) - toAmount(tds) - toAmount(discount);
  return Math.round(Math.max(0, net) * 100) / 100;
}

export function settlementFromComponents(cash, tds, discount = 0) {
  return toAmount(cash) + toAmount(tds) + toAmount(discount);
}

export function tdsAmountFromPercent(base, percent) {
  const b = toAmount(base);
  const p = parseFloat(percent);
  if (!Number.isFinite(p) || b <= 0) return 0;
  return Math.round((b * p) / 100 * 100) / 100;
}

export function tdsPercentFromAmount(base, amount) {
  const b = toAmount(base);
  const a = toAmount(amount);
  if (b <= 0 || a <= 0) return '';
  const pct = (a / b) * 100;
  const rounded = Math.round(pct * 10000) / 10000;
  return String(rounded);
}

/** Full-document taxable outstanding (pro-rated by remaining balance incl. GST). */
export function documentTaxableOutstanding(doc, outstandingInclGst) {
  const outstanding = toAmount(outstandingInclGst);
  if (outstanding <= 0) return 0;
  const total = documentTotalNet(doc);
  const taxable = documentTaxableNet(doc);
  if (total <= 0 || taxable <= 0) return outstanding;
  return outstanding * (taxable / total);
}
