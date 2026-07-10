import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDateDDMMYYYY, formatDocumentMoney, sameId, toAmount } from '../utils/formatMoney';
import {
  advanceAvailableBalance,
  advanceOriginalAmount,
  advanceReferenceLabel,
  getCustomerAvailableAdvances,
} from '../utils/advanceHelpers';
import { invoiceOutstandingAmount } from '../utils/accountingHelpers';

/**
 * Adjust customer advance receipts against an invoice (or standalone adjustment).
 * variant="invoice-save" — opened from new sales invoice save; shows skip + confirm.
 */
export default function AdvanceAdjustmentModal({
  open,
  onClose,
  onConfirm,
  onSkip,
  variant = 'default',
  customerId,
  invoiceAmount,
  invoiceId = null,
  invoices = [],
  receipts = [],
  advanceAdjustments = [],
  creditNotes = [],
  title = 'Adjust Advance to Invoice',
  confirmLabel = 'Confirm Adjustment',
}) {
  const [rows, setRows] = useState([]);
  const isInvoiceSave = variant === 'invoice-save';

  const availableAdvances = useMemo(
    () => getCustomerAvailableAdvances(customerId, receipts, advanceAdjustments),
    [customerId, receipts, advanceAdjustments]
  );

  const totalAvailable = useMemo(
    () => availableAdvances.reduce((s, row) => s + row.availableBalance, 0),
    [availableAdvances]
  );

  const targetInvoice = invoiceId ? invoices.find((i) => sameId(i.id, invoiceId)) : null;
  const invoiceOutstanding = targetInvoice
    ? invoiceOutstandingAmount(targetInvoice, receipts, creditNotes, advanceAdjustments)
    : toAmount(invoiceAmount);

  useEffect(() => {
    if (!open) return;
    setRows(
      availableAdvances.map(({ receipt, availableBalance }) => ({
        advance_receipt_id: receipt.id,
        advance_reference: advanceReferenceLabel(receipt),
        payment_date: receipt.payment_date,
        original_amount: advanceOriginalAmount(receipt),
        available_balance: availableBalance,
        adjustment_amount: '',
        selected: false,
      }))
    );
  }, [open, availableAdvances]);

  if (!open || typeof document === 'undefined') return null;

  const totalAdjustment = rows.reduce((s, r) => (r.selected ? s + toAmount(r.adjustment_amount) : s), 0);
  const netReceivable = Math.max(0, toAmount(invoiceAmount || invoiceOutstanding) - totalAdjustment);

  const toggleRow = (idx, checked) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[idx], selected: checked };
      if (checked && !row.adjustment_amount) {
        const other = prev.reduce((s, r, i) => (r.selected && i !== idx ? s + toAmount(r.adjustment_amount) : s), 0);
        const cap = Math.min(row.available_balance, Math.max(0, toAmount(invoiceAmount || invoiceOutstanding) - other));
        row.adjustment_amount = cap > 0 ? String(cap.toFixed(2)) : '';
      }
      next[idx] = row;
      return next;
    });
  };

  const setAdjustment = (idx, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], adjustment_amount: value, selected: true };
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = rows.filter((r) => r.selected && toAmount(r.adjustment_amount) > 0.009);
    if (!selected.length) {
      alert('Select at least one advance and enter an adjustment amount.');
      return;
    }
    let pending = invoiceOutstanding;
    for (const row of selected) {
      const amt = toAmount(row.adjustment_amount);
      const rec = receipts.find((r) => sameId(r.id, row.advance_receipt_id));
      const avail = advanceAvailableBalance(rec, advanceAdjustments);
      const cap = Math.min(avail, pending);
      if (amt > cap + 0.02) {
        alert(`Adjustment for ${row.advance_reference} cannot exceed ${formatDocumentMoney(cap)}.`);
        return;
      }
      pending = Math.max(0, pending - amt);
    }
    onConfirm(
      selected.map((r) => ({
        advance_receipt_id: r.advance_receipt_id,
        adjustment_amount: toAmount(r.adjustment_amount),
      }))
    );
  };

  const handleBackdropMouseDown = (e) => {
    if (e.target !== e.currentTarget) return;
    if (isInvoiceSave) return;
    onClose?.();
  };

  return createPortal(
    <div
      className="portal-modal-overlay portal-modal-overlay-solid"
      style={{ zIndex: 12000 }}
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
    >
      <div
        className="portal-modal-card portal-modal-card-solid"
        style={{ maxWidth: 920, width: '96%', maxHeight: '90vh', overflowY: 'auto' }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="advance-adjustment-title"
      >
        <div className="table-header-row" style={{ marginBottom: 12 }}>
          <h3 id="advance-adjustment-title" className="chart-title" style={{ margin: 0 }}>{title}</h3>
          <button type="button" className="btn-secondary" data-no-btn-spinner onClick={onClose}>
            {isInvoiceSave ? 'Back to Invoice' : 'Close'}
          </button>
        </div>

        {isInvoiceSave && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 10,
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              color: '#0c4a6e',
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            This customer has <strong>{availableAdvances.length}</strong> unadjusted advance receipt(s)
            {totalAvailable > 0 && (
              <> (total available: <strong>{formatDocumentMoney(totalAvailable)}</strong>)</>
            )}
            . Select which advance(s) to apply below, or save the invoice without adjustment.
            The sales invoice form stays open behind this window.
          </div>
        )}

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Invoice amount: <strong>{formatDocumentMoney(invoiceAmount || invoiceOutstanding)}</strong>
          {targetInvoice && (
            <> · Outstanding: <strong>{formatDocumentMoney(invoiceOutstanding)}</strong></>
          )}
        </p>

        <div className="premium-table-wrapper" style={{ maxHeight: 360, overflowY: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th />
                <th>Advance Ref</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Original</th>
                <th style={{ textAlign: 'right' }}>Available</th>
                <th style={{ textAlign: 'right' }}>Adjustment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.advance_receipt_id}>
                  <td>
                    <input type="checkbox" checked={row.selected} onChange={(e) => toggleRow(idx, e.target.checked)} />
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{row.advance_reference}</td>
                  <td>{formatDateDDMMYYYY(row.payment_date)}</td>
                  <td style={{ textAlign: 'right' }}>{formatDocumentMoney(row.original_amount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatDocumentMoney(row.available_balance)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: 120, textAlign: 'right' }}
                      min="0"
                      step="0.01"
                      value={row.adjustment_amount}
                      onChange={(e) => setAdjustment(idx, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="empty-state">No unadjusted advances for this customer.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Invoice amount</span>
            <div style={{ fontWeight: 700 }}>{formatDocumentMoney(invoiceAmount || invoiceOutstanding)}</div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Advance adjustment</span>
            <div style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>− {formatDocumentMoney(totalAdjustment)}</div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Net receivable</span>
            <div style={{ fontWeight: 700 }}>{formatDocumentMoney(netReceivable)}</div>
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 20, flexWrap: 'wrap' }}>
          {isInvoiceSave && onSkip && (
            <button type="button" className="btn-secondary" data-no-btn-spinner onClick={onSkip}>
              Skip &amp; Save Invoice
            </button>
          )}
          <button type="button" className="btn-secondary" data-no-btn-spinner onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" data-no-btn-spinner onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
