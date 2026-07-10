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

/** GST portal JSON expects 2-digit state code only (e.g. "24"). */
export function formatPlaceOfSupplyCode(stateName) {
  if (!stateName) return '';
  const trimmed = stateName.trim();
  if (GST_STATE_CODES[trimmed]) return GST_STATE_CODES[trimmed];
  if (/^\d{2}$/.test(trimmed)) return trimmed;
  const prefixed = trimmed.match(/^(\d{2})-/);
  if (prefixed) return prefixed[1];
  return trimmed;
}

/** B2B HSN must be at least 6 digits. */
export function formatHsn6(hsn) {
  const raw = String(hsn || '').replace(/\D/g, '');
  if (!raw) return '';
  return raw.length >= 6 ? raw.slice(0, 8) : raw.padStart(6, '0');
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

/** B2CL: unregistered, inter-state, invoice value > ₹2.5 lakh. */
export function isB2clInvoice(inv, companyState) {
  if (inv.status === 'Cancelled' || isExportInvoice(inv) || isB2bInvoice(inv)) return false;
  if (toAmount(inv.total_amount) <= 250000) return false;
  return !isIntraState(inv.place_of_supply, companyState);
}

export function isExportInvoice(inv) {
  return inv.invoice_type === 'Export' || isExportPlaceOfSupply(inv.place_of_supply);
}
