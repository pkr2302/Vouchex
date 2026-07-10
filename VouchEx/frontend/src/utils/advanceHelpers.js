import { toAmount, sameId, dateOnly, isTruthyFlag } from './formatMoney';
import { invoiceEffectiveTotal, invoiceSettledAmount, invoiceAdvanceAdjustedTotal } from './accountingHelpers';

/** Indian FY label e.g. 2026-27 from YYYY-MM-DD. */
export function indianFinancialYearLabel(value) {
  const base = dateOnly(value) || dateOnly(new Date());
  if (!base) return `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, '0')}`;
  const [y, m] = base.split('-').map((n) => parseInt(n, 10));
  if (m >= 4) {
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  }
  return `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

export function nextAdvanceReference(paymentDate, receipts = []) {
  const fy = indianFinancialYearLabel(paymentDate);
  const prefix = `ADV/${fy}/`;
  let maxSeq = 0;
  for (const r of receipts) {
    if (!isTruthyFlag(r?.is_advance) || !r.advance_reference?.startsWith(prefix)) continue;
    const m = String(r.advance_reference).match(/\/(\d+)$/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return `${prefix}${String(maxSeq + 1).padStart(6, '0')}`;
}

export function advanceOriginalAmount(receipt) {
  if (!receipt) return 0;
  return toAmount(receipt.amount_received) + toAmount(receipt.tds_deducted) + toAmount(receipt.discount_allowed);
}

export function advanceAppliedTotal(receiptId, advanceAdjustments = []) {
  return (advanceAdjustments || [])
    .filter((a) => sameId(a.advance_receipt_id, receiptId))
    .reduce((s, a) => s + toAmount(a.adjustment_amount), 0);
}

export function advanceAvailableBalance(receipt, advanceAdjustments = []) {
  return Math.max(0, advanceOriginalAmount(receipt) - advanceAppliedTotal(receipt?.id, advanceAdjustments));
}

export function advanceStatusLabel(receipt, advanceAdjustments = []) {
  const original = advanceOriginalAmount(receipt);
  const applied = advanceAppliedTotal(receipt?.id, advanceAdjustments);
  if (original <= 0.009) return '—';
  if (applied <= 0.009) return 'Unadjusted';
  if (applied >= original - 0.009) return 'Fully Adjusted';
  return 'Partially Adjusted';
}

export { invoiceAdvanceAdjustedTotal } from './accountingHelpers';

export function getCustomerAvailableAdvances(customerId, receipts = [], advanceAdjustments = []) {
  return (receipts || [])
    .filter((r) => isTruthyFlag(r.is_advance) && sameId(r.customer_id, customerId))
    .map((r) => ({
      receipt: r,
      originalAmount: advanceOriginalAmount(r),
      availableBalance: advanceAvailableBalance(r, advanceAdjustments),
      status: advanceStatusLabel(r, advanceAdjustments),
    }))
    .filter((row) => row.availableBalance > 0.009)
    .sort((a, b) => String(b.receipt.payment_date).localeCompare(String(a.receipt.payment_date)));
}

export function invoiceNetReceivable(inv, receipts, creditNotes, advanceAdjustments) {
  const gross = invoiceEffectiveTotal(inv, creditNotes);
  const advanceAdj = invoiceAdvanceAdjustedTotal(inv?.id, advanceAdjustments);
  const cashRec = invoiceSettledAmount(receipts, inv?.id);
  return Math.max(0, gross - advanceAdj - cashRec);
}

export function advanceReferenceLabel(receipt) {
  return receipt?.advance_reference || receipt?.receipt_number || '—';
}

export function canEditAdvanceReference(receipt, advanceAdjustments = []) {
  if (!isTruthyFlag(receipt?.is_advance)) return false;
  return advanceAppliedTotal(receipt.id, advanceAdjustments) <= 0.009;
}
