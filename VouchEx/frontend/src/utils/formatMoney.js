/** Parse API/string amounts safely (avoids "0590.00112100" string concat bugs). */
import { getCurrencySymbol } from './currencyData';

export function toAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value).replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Indian currency display: 590 → 590.00, 590000 → 5,90,000.00 */
export function formatINR(value, decimals = 2) {
  const n = toAmount(value);
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** PDF / print amounts — always 2 decimals with Indian grouping. */
export function formatPdfINR(value) {
  return `₹${formatINR(value)}`;
}

/** Invoice line: subtotal (taxable) and total incl. GST. */
export function invoiceLineAmounts(item) {
  const subtotal = toAmount(item?.line_total);
  const tax =
    toAmount(item?.cgst) + toAmount(item?.sgst) + toAmount(item?.igst);
  return { subtotal, total: subtotal + tax };
}

export function sumField(rows, field) {
  return rows.reduce((sum, row) => sum + toAmount(row[field]), 0);
}

/** Safe numeric ID equality (API may return string or number). */
export function sameId(a, b) {
  if (a == null || a === '' || b == null || b === '') return false;
  return Number(a) === Number(b);
}

/** Parse API/string to YYYY-MM-DD — calendar date only, no UTC day shift. */
export function dateOnly(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (raw.toUpperCase() === 'NIL') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (raw.includes('T') || /^\d{4}-\d{2}-\d{2}\s/.test(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    return raw.split(/[T\s]/)[0];
  }
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, dd, mm, yyyy] = slash;
    return `${yyyy}-${String(parseInt(mm, 10)).padStart(2, '0')}-${String(parseInt(dd, 10)).padStart(2, '0')}`;
  }
  return raw.slice(0, 10);
}

/** Local midnight Date from a calendar date string (for ageing/sorting only). */
export function parseDateOnlyLocal(value) {
  const base = dateOnly(value);
  if (!base) return null;
  const [y, m, d] = base.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const PORTAL_DATE_FIELDS = {
  invoices: ['issue_date', 'due_date'],
  receipts: ['payment_date'],
  payments: ['payment_date'],
  expenses: ['expense_date', 'due_date'],
  creditNotes: ['issue_date', 'original_invoice_date'],
  debitNotes: ['issue_date', 'original_expense_date'],
  customers: ['opening_balance_date'],
  vendors: ['opening_balance_date'],
  consumptions: ['consumption_date'],
  currencyConversions: ['conversion_date'],
  calendarReminders: ['reminder_date'],
};

function normalizeRowDates(row, fields) {
  if (!row || typeof row !== 'object') return row;
  const next = { ...row };
  for (const field of fields) {
    if (next[field] != null && next[field] !== '') {
      next[field] = dateOnly(next[field]);
    }
  }
  return next;
}

/** Normalize API/bootstrap date fields to YYYY-MM-DD (fixes UTC ISO drift from Laravel). */
export function normalizePortalBootstrapData(data) {
  if (!data || typeof data !== 'object') return data;
  const out = { ...data };
  for (const [collection, fields] of Object.entries(PORTAL_DATE_FIELDS)) {
    if (Array.isArray(out[collection])) {
      out[collection] = out[collection].map((row) => normalizeRowDates(row, fields));
    }
  }
  if (out.coaRecords && typeof out.coaRecords === 'object') {
    const coa = { ...out.coaRecords };
    for (const key of ['expense_heads', 'banks', 'cash']) {
      if (Array.isArray(coa[key])) {
        coa[key] = coa[key].map((row) => normalizeRowDates(row, ['opening_balance_date']));
      }
    }
    out.coaRecords = coa;
  }
  return out;
}

/** Add calendar days to YYYY-MM-DD without UTC timezone shift. */
export function addDaysToDateOnly(isoDate, days) {
  const base = dateOnly(isoDate);
  if (!base) return '';
  const [y, m, d] = base.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return base;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const mm = dt.getMonth() + 1;
  const dd = dt.getDate();
  return `${dt.getFullYear()}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export const PAYMENT_TERMS_PRESETS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45'];

/** Whole days from terms like "Net 30" or "Net 7"; null if not a Net-days term. */
export function parseNetDaysFromPaymentTerms(paymentTerms) {
  if (!paymentTerms) return null;
  const m = String(paymentTerms).trim().match(/^Net\s+(\d+)$/i);
  if (!m) return null;
  return parseInt(m[1], 10);
}

export function isValidPaymentTerms(paymentTerms) {
  if (!paymentTerms || !String(paymentTerms).trim()) return false;
  const term = String(paymentTerms).trim();
  if (PAYMENT_TERMS_PRESETS.includes(term)) return true;
  return parseNetDaysFromPaymentTerms(term) !== null;
}

/** Due date from customer payment terms + issue date (local calendar). */
export function dueDateFromPaymentTerms(issueDateStr, paymentTerms) {
  const base = dateOnly(issueDateStr);
  if (!base) return '';
  if (!paymentTerms || paymentTerms === 'Due on Receipt') return base;
  const netDays = parseNetDaysFromPaymentTerms(paymentTerms);
  if (netDays !== null) return addDaysToDateOnly(base, netDays);
  return base;
}

/** True when a PDF/label value should be treated as empty (not shown). */
export function isBlankFieldValue(value) {
  if (value == null) return true;
  const s = String(value).trim();
  return !s || s === '—' || s.toUpperCase() === 'NIL';
}

export function isTruthyFlag(value) {
  return value === true || value === 1 || value === '1';
}

/** Label for receipt registry "Settled Invoice" column. */
export function receiptSettledInvoiceLabel(rec, invoices = []) {
  if (rec?.invoice_id) {
    const linked = invoices.find((i) => sameId(i.id, rec.invoice_id));
    const num =
      rec.invoice_number && rec.invoice_number !== 'NIL'
        ? rec.invoice_number
        : linked?.invoice_number;
    if (num) return num;
  }
  if (rec?.invoice_number && rec.invoice_number !== 'NIL') return rec.invoice_number;
  if (isTruthyFlag(rec?.is_advance)) return 'ADVANCE RECEIPT';
  return '—';
}

/** Label for payment registry "Settled Expense Bill" column. */
export function paymentSettledExpenseLabel(pay, expenses = []) {
  if (pay?.expense_id) {
    const linked = expenses.find((e) => sameId(e.id, pay.expense_id));
    const num =
      pay.expense_number && pay.expense_number !== 'NIL'
        ? pay.expense_number
        : linked?.expense_number;
    if (num) return num;
  }
  if (pay?.expense_number && pay.expense_number !== 'NIL') return pay.expense_number;
  if (isTruthyFlag(pay?.is_advance)) return 'ADVANCE PAYMENT';
  return '—';
}

/** Payment voucher type badge text. */
export function paymentVoucherTypeLabel(pay) {
  if (pay?.expense_id || (pay?.expense_number && pay.expense_number !== 'NIL')) {
    return 'Settlement';
  }
  return isTruthyFlag(pay?.is_advance) ? 'Advance' : 'Settlement';
}

/** Next PREFIX-YEAR-NNN from existing document numbers (not row count). */
export function nextDocumentNumber(prefix, year, existingNumbers) {
  const patternPrefix = `${prefix}-${year}-`;
  let maxSeq = 0;
  for (const raw of existingNumbers || []) {
    const num = String(raw || '');
    if (!num.startsWith(patternPrefix)) continue;
    const m = num.match(/-(\d+)$/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return `${patternPrefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

/** Registry tables: newest document first (date desc, then id desc). */
export function sortRegistryNewestFirst(rows, dateField = 'issue_date') {
  return [...(rows || [])].sort((a, b) => {
    const dateCmp = String(dateOnly(b[dateField]) || '').localeCompare(String(dateOnly(a[dateField]) || ''));
    if (dateCmp !== 0) return dateCmp;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

/** Display date as d/m/yyyy (no forced zero-padding) from ISO or YYYY-MM-DD strings. */
export function formatDateDDMMYYYY(value) {
  if (!value || String(value).trim().toUpperCase() === 'NIL') return '—';
  const base = dateOnly(value);
  if (!base) return '—';
  const [y, m, d] = base.split('-');
  return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
}

function normalizeCurrencyCode(currency) {
  const raw = String(currency || 'INR').trim();
  if (!raw) return 'INR';
  return raw.split(/[\s(]/)[0].toUpperCase();
}

/** Numeric amount for a document currency (2 decimals). */
export function formatDocumentAmount(value, currency = 'INR') {
  const n = toAmount(value);
  const code = normalizeCurrencyCode(currency);
  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Screen display with currency symbol. */
export function formatDocumentMoney(value, currency = 'INR') {
  const code = normalizeCurrencyCode(currency);
  return `${getCurrencySymbol(code)}${formatDocumentAmount(value, code)}`;
}

/** PDF/print display with currency symbol. */
export function formatPdfDocument(value, currency = 'INR') {
  return formatDocumentMoney(value, currency);
}

/** Foreign-currency invoices with FC receipts still to convert to INR. */
export function buildForexConversionQueue(invoices, receipts, currencyConversions) {
  const rows = [];
  for (const inv of invoices || []) {
    const cur = String(inv.currency || 'INR').toUpperCase();
    if (!cur || cur === 'INR' || inv.status === 'Cancelled') continue;

    const invReceipts = (receipts || []).filter(
      (r) => sameId(r.invoice_id, inv.id)
        && String(r.currency || inv.currency || 'INR').toUpperCase() === cur
    );
    const fcReceived = invReceipts.reduce((s, r) => s + toAmount(r.amount_received), 0);
    if (fcReceived <= 0.009) continue;

    const fcConverted = (currencyConversions || [])
      .filter((c) => sameId(c.invoice_id, inv.id))
      .reduce((s, c) => s + toAmount(c.from_amount), 0);
    const remaining = Math.max(0, fcReceived - fcConverted);
    if (remaining <= 0.009) continue;

    const fromLedgers = [...new Set(invReceipts.map((r) => r.deposit_to).filter(Boolean))];
    rows.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      customerName: inv.customer_name,
      currency: cur,
      fcReceived,
      fcConverted,
      remaining,
      defaultFromLedger: fromLedgers[0] || '',
    });
  }
  return rows;
}
