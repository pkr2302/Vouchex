/** Company UPI helpers — VPA validation + pay URI for invoice QR. */

/** NPCI-style VPA: local-part @ PSP handle (e.g. company@okaxis). */
const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,63}$/;

export function normalizeUpiId(value) {
  return String(value || '').trim();
}

export function isValidUpiId(value) {
  const v = normalizeUpiId(value);
  if (!v) return true; // empty allowed (optional field)
  return VPA_RE.test(v);
}

export function upiValidationMessage(value) {
  const v = normalizeUpiId(value);
  if (!v) return '';
  if (!VPA_RE.test(v)) {
    return 'Enter a valid UPI ID (e.g. company@okaxis).';
  }
  return '';
}

/**
 * Build UPI deep-link for scan-to-pay.
 * @param {{ pa: string, pn?: string, am?: number|string, tn?: string, cu?: string }} opts
 */
export function buildUpiPayUri({ pa, pn = '', am, tn = '', cu = 'INR' }) {
  const vpa = normalizeUpiId(pa);
  if (!vpa) return '';
  const params = new URLSearchParams();
  params.set('pa', vpa);
  if (pn) params.set('pn', String(pn).slice(0, 50));
  const amount = Number(am);
  if (Number.isFinite(amount) && amount > 0) {
    params.set('am', amount.toFixed(2));
  }
  params.set('cu', cu || 'INR');
  if (tn) params.set('tn', String(tn).slice(0, 50));
  return `upi://pay?${params.toString()}`;
}
