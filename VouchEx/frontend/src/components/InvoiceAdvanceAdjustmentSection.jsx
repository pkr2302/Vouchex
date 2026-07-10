import { formatDateDDMMYYYY, formatDocumentMoney, toAmount } from '../utils/formatMoney';

/**
 * Inline advance adjustment on the sales invoice form (no popup).
 */
export default function InvoiceAdvanceAdjustmentSection({
  availableAdvances = [],
  applyAdvance,
  onApplyAdvanceChange,
  rows,
  onRowsChange,
  invoiceAmount,
  currency = 'INR',
}) {
  if (!availableAdvances.length) return null;

  const totalAvailable = availableAdvances.reduce((s, row) => s + row.availableBalance, 0);
  const totalAdjustment = rows.reduce(
    (s, r) => (r.selected ? s + toAmount(r.adjustment_amount) : s),
    0
  );
  const netReceivable = Math.max(0, toAmount(invoiceAmount) - totalAdjustment);

  const toggleRow = (idx, checked) => {
    onRowsChange((prev) => {
      const next = [...prev];
      const row = { ...next[idx], selected: checked };
      if (checked && !row.adjustment_amount) {
        const other = prev.reduce(
          (s, r, i) => (r.selected && i !== idx ? s + toAmount(r.adjustment_amount) : s),
          0
        );
        const cap = Math.min(
          row.available_balance,
          Math.max(0, toAmount(invoiceAmount) - other)
        );
        row.adjustment_amount = cap > 0 ? String(cap.toFixed(2)) : '';
      }
      next[idx] = row;
      return next;
    });
  };

  const setAdjustment = (idx, value) => {
    onRowsChange((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], adjustment_amount: value, selected: true };
      return next;
    });
  };

  return (
    <div
      className="data-card"
      style={{
        marginTop: 20,
        marginBottom: 8,
        border: '1px solid #bae6fd',
        background: 'linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%)',
      }}
    >
      <h4 className="form-section-title" style={{ margin: '0 0 10px', color: '#0c4a6e' }}>
        Advance Receipt Available
      </h4>
      <p style={{ fontSize: 13, lineHeight: 1.55, margin: '0 0 14px', color: '#334155' }}>
        This customer has <strong>{availableAdvances.length}</strong> unadjusted advance receipt(s)
        {totalAvailable > 0 && (
          <> (total available: <strong>{formatDocumentMoney(totalAvailable, currency)}</strong>)</>
        )}
        .
      </p>

      <div className="form-group" style={{ marginBottom: 14 }}>
        <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
          Apply advance against this invoice?
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="radio"
              name="invoice-apply-advance"
              checked={!applyAdvance}
              onChange={() => onApplyAdvanceChange(false)}
            />
            No — save invoice without advance adjustment
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="radio"
              name="invoice-apply-advance"
              checked={applyAdvance}
              onChange={() => onApplyAdvanceChange(true)}
            />
            Yes — adjust available advance(s) below
          </label>
        </div>
      </div>

      {applyAdvance && (
        <>
          <div className="premium-table-wrapper" style={{ maxHeight: 280, overflowY: 'auto' }}>
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
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => toggleRow(idx, e.target.checked)}
                      />
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{row.advance_reference}</td>
                    <td>{formatDateDDMMYYYY(row.payment_date)}</td>
                    <td style={{ textAlign: 'right' }}>{formatDocumentMoney(row.original_amount, currency)}</td>
                    <td style={{ textAlign: 'right' }}>{formatDocumentMoney(row.available_balance, currency)}</td>
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
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Invoice amount</span>
              <div style={{ fontWeight: 700 }}>{formatDocumentMoney(invoiceAmount, currency)}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Advance adjustment</span>
              <div style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>
                − {formatDocumentMoney(totalAdjustment, currency)}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Net receivable</span>
              <div style={{ fontWeight: 700 }}>{formatDocumentMoney(netReceivable, currency)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
