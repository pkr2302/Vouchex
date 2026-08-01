/** Convert a money amount to Indian English words (rupees & paise). */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ` ${ONES[o]}` : ''}`.trim();
}

function threeDigits(n) {
  if (n === 0) return '';
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h && r) return `${ONES[h]} Hundred ${twoDigits(r)}`;
  if (h) return `${ONES[h]} Hundred`;
  return twoDigits(r);
}

/** Integer 0 … 99,99,99,999 → Indian words (no currency suffix). */
export function integerToIndianWords(n) {
  const num = Math.floor(Math.abs(Number(n) || 0));
  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = num % 1000;

  const parts = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * e.g. 913382.54 → "Rupees Nine Lakh Thirteen Thousand Three Hundred Eighty Two and Paise Fifty Four Only"
 * Non-INR currencies fall back to "… Only" without Rupees/Paise labels.
 */
export function amountInWords(value, currency = 'INR') {
  const raw = Number(value);
  const n = Number.isFinite(raw) ? Math.abs(raw) : 0;
  const rupees = Math.floor(n + 1e-9);
  const paise = Math.round((n - rupees) * 100);

  const code = String(currency || 'INR').toUpperCase().includes('INR') ? 'INR' : String(currency || '').toUpperCase();
  const majorWords = integerToIndianWords(rupees);
  const minorWords = paise > 0 ? integerToIndianWords(paise) : '';

  if (code === 'INR') {
    let out = `Rupees ${majorWords}`;
    if (paise > 0) out += ` and Paise ${minorWords}`;
    return `${out} Only`;
  }

  let out = majorWords;
  if (paise > 0) out += ` and ${String(paise).padStart(2, '0')}/100`;
  return `${out} Only`;
}
