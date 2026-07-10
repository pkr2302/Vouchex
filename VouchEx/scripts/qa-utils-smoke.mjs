/**
 * Standalone smoke tests for VouchEx utility logic (no Vite/browser).
 * Run: node scripts/qa-utils-smoke.mjs
 */

function toAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function sameId(a, b) {
  if (a == null || a === '' || b == null || b === '') return false;
  return Number(a) === Number(b);
}

function pickBestSeriesGroup(groups) {
  let best = null;
  for (const entry of groups.values()) {
    if (!best || entry.count > best.count || (entry.count === best.count && entry.max > best.max)) {
      best = entry;
    }
  }
  return best;
}

function nextNumberInSeries(existingNumbers, fallback = '') {
  const nums = (existingNumbers || []).map((n) => String(n || '').trim()).filter(Boolean);
  if (!nums.length) return fallback;

  const leadingGroups = new Map();
  for (const n of nums) {
    const m = n.match(/^(\d+)(.+)$/);
    if (!m || !m[2]) continue;
    const suffix = m[2];
    const val = parseInt(m[1], 10);
    if (Number.isNaN(val)) continue;
    if (!leadingGroups.has(suffix)) leadingGroups.set(suffix, { suffix, max: val, padLen: m[1].length, count: 0 });
    const g = leadingGroups.get(suffix);
    g.count += 1;
    if (val > g.max) { g.max = val; g.padLen = Math.max(g.padLen, m[1].length); }
  }
  const lb = pickBestSeriesGroup(leadingGroups);
  if (lb) return String(lb.max + 1).padStart(lb.padLen, '0') + lb.suffix;

  const trailingGroups = new Map();
  for (const n of nums) {
    const m = n.match(/^(.+?)(\d+)$/);
    if (!m) continue;
    const prefix = m[1];
    const val = parseInt(m[2], 10);
    if (Number.isNaN(val)) continue;
    if (!trailingGroups.has(prefix)) trailingGroups.set(prefix, { prefix, max: val, padLen: m[2].length, count: 0 });
    const g = trailingGroups.get(prefix);
    g.count += 1;
    if (val > g.max) { g.max = val; g.padLen = Math.max(g.padLen, m[2].length); }
  }
  const tb = pickBestSeriesGroup(trailingGroups);
  if (tb) return tb.prefix + String(tb.max + 1).padStart(tb.padLen, '0');
  return fallback || nums[nums.length - 1];
}

function buildForexConversionQueue(invoices, receipts, currencyConversions) {
  const rows = [];
  for (const inv of invoices || []) {
    const cur = String(inv.currency || 'INR').toUpperCase();
    if (!cur || cur === 'INR' || inv.status === 'Cancelled') continue;
    const invReceipts = (receipts || []).filter(
      (r) => sameId(r.invoice_id, inv.id) && String(r.currency || 'INR').toUpperCase() === cur
    );
    const fcReceived = invReceipts.reduce((s, r) => s + toAmount(r.amount_received), 0);
    if (fcReceived <= 0.009) continue;
    const fcConverted = (currencyConversions || [])
      .filter((c) => sameId(c.invoice_id, inv.id))
      .reduce((s, c) => s + toAmount(c.from_amount), 0);
    const remaining = Math.max(0, fcReceived - fcConverted);
    if (remaining <= 0.009) continue;
    const fromLedgers = [...new Set(invReceipts.map((r) => r.deposit_to).filter(Boolean))];
    rows.push({ invoiceId: inv.id, remaining, defaultFromLedger: fromLedgers[0] || '' });
  }
  return rows;
}

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.error(`FAIL  ${name}`); }
}

assert('toAmount empty', toAmount('') === 0);
assert('sameId string/number', sameId('5', 5));
assert('invoice series fy', nextNumberInSeries(['0001/2026-27', '0003/2026-27', '0002/2026-27']) === '0004/2026-27');
assert('invoice series INV', nextNumberInSeries(['INV-2026-001', 'INV-2026-008']) === 'INV-2026-009');

const forex = buildForexConversionQueue(
  [{ id: 1, currency: 'USD', status: 'Partially Paid' }],
  [{ invoice_id: 1, currency: 'USD', amount_received: 1000, deposit_to: 'USD Bank' }],
  [{ invoice_id: 1, from_amount: 400 }]
);
assert('forex remaining 600', forex.length === 1 && forex[0].remaining === 600);
assert('forex from ledger', forex[0].defaultFromLedger === 'USD Bank');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
