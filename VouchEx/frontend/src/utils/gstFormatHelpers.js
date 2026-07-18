import { bifurcateStoredTax, calcLineTax, isExportPlaceOfSupply, isIntraState } from './gstUtils';
import { toAmount, dateOnly } from './formatMoney';

function localDateFromCalendar(value) {
  const base = dateOnly(value);
  if (!base) return null;
  const [y, m, d] = base.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** GST state code → name (GSTN master / Place of Supply format). */
export const GST_STATE_CODES = {
  'Jammu and Kashmir': '01',
  'Himachal Pradesh': '02',
  Punjab: '03',
  Chandigarh: '04',
  Uttarakhand: '05',
  Haryana: '06',
  Delhi: '07',
  Rajasthan: '08',
  'Uttar Pradesh': '09',
  Bihar: '10',
  Sikkim: '11',
  'Arunachal Pradesh': '12',
  Nagaland: '13',
  Manipur: '14',
  Mizoram: '15',
  Tripura: '16',
  Meghalaya: '17',
  Assam: '18',
  'West Bengal': '19',
  Jharkhand: '20',
  Odisha: '21',
  Chhattisgarh: '22',
  'Madhya Pradesh': '23',
  Gujarat: '24',
  Maharashtra: '27',
  Karnataka: '29',
  Goa: '30',
  Kerala: '32',
  'Tamil Nadu': '33',
  Puducherry: '34',
  Telangana: '36',
  'Andhra Pradesh': '37',
  Ladakh: '38',
  Overseas: '96',
};

export function roundGst(value) {
  return Math.round(toAmount(value) * 100) / 100;
}

/** Valid 15-character GSTIN (reject NIL, blank, partial). */
export function isValidGstin(gstin) {
  const g = String(gstin || '').trim().toUpperCase();
  if (!g || g === 'NIL' || g === 'NA' || g === 'N/A') return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g);
}

/** GST offline utility: 15-May-2026 */
export function formatGstDate(dateStr) {
  if (!dateStr) return '';
  const d = localDateFromCalendar(dateStr);
  if (!d) return String(dateStr);
  const day = d.getDate();
  const mon = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${mon}-${year}`;
}

/** GST portal JSON: 15-05-2026 (DD-MM-YYYY). */
export function formatGstJsonDate(dateStr) {
  if (!dateStr) return '';
  const d = localDateFromCalendar(dateStr);
  if (!d) return String(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** VouchrIt template: dd-mm-yyyy */
export function formatVouchrItDate(dateStr) {
  if (!dateStr) return '';
  const d = localDateFromCalendar(dateStr);
  if (!d) return String(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function formatPlaceOfSupply(stateName) {
  if (!stateName) return '';
  const trimmed = stateName.trim();
  const code = GST_STATE_CODES[trimmed] || '';
  if (code) return `${code}-${trimmed}`;
  return trimmed;
}

/** GST portal JSON expects 2-digit state code only (e.g. "24"). Returns '' if unknown. */
export function formatPlaceOfSupplyCode(stateName) {
  if (!stateName) return '';
  const trimmed = String(stateName).trim();
  if (GST_STATE_CODES[trimmed]) return GST_STATE_CODES[trimmed];
  if (/^\d{2}$/.test(trimmed)) return trimmed;
  const prefixed = trimmed.match(/^(\d{2})(?:-|$)/);
  if (prefixed) return prefixed[1];
  // Do not return free-text state names — GSTN schema requires ^[0-9]{2}$
  const byLower = Object.entries(GST_STATE_CODES).find(([name]) => name.toLowerCase() === trimmed.toLowerCase());
  return byLower ? byLower[1] : '';
}

/** Offline-tool UQC: services (HSN 99*) use NA; goods use NOS. */
export function formatGstUqc(hsnOrUqc, fallback = 'NOS') {
  const hsn = String(hsnOrUqc || '').replace(/\D/g, '');
  if (hsn.startsWith('99')) return 'NA';
  const u = String(fallback || 'NOS').trim().toUpperCase();
  if (!u || u === 'NA') return hsn.startsWith('99') ? 'NA' : 'NOS';
  // Offline tool accepts code or CODE-DESCRIPTION; prefer short code for JSON
  return u.includes('-') ? u.split('-')[0] : u;
}

/**
 * Normalize HSN/SAC for GSTR-1.
 * GSTN accepts 4-digit (AATO ≤ ₹5 Cr) or 6/8-digit codes — do not zero-pad 4-digit HSN to 6.
 */
export function formatHsnCode(hsn) {
  const raw = String(hsn || '').replace(/\D/g, '');
  if (!raw) return '';
  if (raw.length < 4) return ''; // below minimum reportable length
  if (raw.length === 4 || raw.length === 6 || raw.length === 8) return raw;
  if (raw.length === 5) return raw.padStart(6, '0');
  if (raw.length === 7) return raw.slice(0, 6);
  return raw.slice(0, 8);
}

/** @deprecated Prefer formatHsnCode — kept for existing imports; supports 4/6/8 digit HSN. */
export function formatHsn6(hsn) {
  return formatHsnCode(hsn);
}

export function getInvoiceLines(inv, invoiceItems) {
  return invoiceItems.filter((it) => Number(it.invoice_id) === Number(inv.id));
}

export function getCreditNoteLines(cn, creditNoteItems) {
  return creditNoteItems.filter((it) => Number(it.credit_note_id) === Number(cn.id));
}

/** Group line items by GST rate for GSTR-1 rate-wise rows. */
export function groupLinesByRate(lines, inv, companyState) {
  const buckets = new Map();

  const addBucket = (line, rate, taxable, mechanism, ecoGstin = '') => {
    const key = `${rate}|${mechanism}|${ecoGstin}`;
    if (!buckets.has(key)) {
      buckets.set(key, { rate, taxable: 0, cess: 0, mechanism, ecoGstin, cgst: 0, sgst: 0, igst: 0 });
    }
    const b = buckets.get(key);
    b.taxable += taxable;
    const t = calcLineTax({ ...line, tax_rate_override: rate }, inv.place_of_supply, companyState, null, inv.export_treatment);
    b.cgst += t.cgst;
    b.sgst += t.sgst;
    b.igst += t.igst;
  };

  if (lines.length === 0) {
    const rate = toAmount(inv.tax_rate) || 18;
    const taxable = toAmount(inv.subtotal);
    addBucket({}, rate, taxable, 'FCM');
    return [...buckets.values()];
  }

  lines.forEach((line) => {
    const rate = toAmount(line.tax_rate_override ?? line.tax_rate ?? 18);
    const qty = line.quantity === '' || line.quantity == null ? 1 : toAmount(line.quantity);
    const unitRate = toAmount(line.unit_price ?? line.rate);
    const taxable = toAmount(line.line_total) || qty * unitRate;
    const mechanism = line.supply_mechanism || 'FCM';
    const ecoGstin = line.ecom_gstin || inv.ecom_gstin || '';
    addBucket(line, rate, taxable, mechanism, ecoGstin);
  });

  return [...buckets.values()];
}

export function lineTaxSplit(line, inv, companyState) {
  const rate = toAmount(line.tax_rate_override ?? line.tax_rate ?? 18);
  const t = calcLineTax(
    {
      ...line,
      rate: line.unit_price ?? line.rate,
      quantity: line.quantity ?? 1,
      tax_rate_override: rate,
    },
    inv.place_of_supply,
    companyState
  );
  return { rate, ...t, taxable: t.taxable };
}

export function isEcomLine(line, inv) {
  return (line.supply_mechanism || inv.supply_mechanism) === 'ECO';
}

export function isB2bInvoice(inv) {
  return isValidGstin(inv.gstin);
}

export function isB2cInvoice(inv) {
  return !isB2bInvoice(inv) && !isExportInvoice(inv);
}

/** B2CL: unregistered, inter-state, invoice value above threshold (₹2.5L till Jul-2024, ₹1L from Aug-2024). */
export function getB2clThreshold(invoiceDate) {
  const d = localDateFromCalendar(invoiceDate);
  if (!d) return 100000;
  // GSTN: B2C large limit reduced to ₹1 lakh from August 2024 return period.
  const cutoff = new Date(2024, 7, 1); // 1 Aug 2024
  return d < cutoff ? 250000 : 100000;
}

export function isB2clInvoice(inv, companyState) {
  if (inv.status === 'Cancelled' || isExportInvoice(inv) || isB2bInvoice(inv)) return false;
  if (toAmount(inv.total_amount) <= getB2clThreshold(inv.issue_date)) return false;
  return !isIntraState(inv.place_of_supply, companyState);
}

export function isExportInvoice(inv) {
  return inv.invoice_type === 'Export' || isExportPlaceOfSupply(inv.place_of_supply);
}
