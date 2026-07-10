import { Modal } from './portalShared';

const TYPE_LABELS = {
  customers: 'Customer openings',
  vendors: 'Vendor openings',
  banks: 'Bank openings',
  cash: 'Cash openings',
  expense_heads: 'Expense head openings',
  inventory_openings: 'Inventory openings',
  invoices: 'Sales invoices',
  receipts: 'Receipts',
  expenses: 'Expenses / purchases',
  payments: 'Payments',
  credit_notes: 'Credit notes',
  debit_notes: 'Debit notes',
  forex: 'Forex conversions',
  consumptions: 'Consumption entries',
};

export function GlSyncResultModal({ open, onClose, result }) {
  if (!result) return null;

  const summary = result.summary || {};
  const errors = result.errors || [];
  const postedByType = summary.posted_by_type || {};

  return (
    <Modal open={open} title="GL sync result" onClose={onClose} width={680} variant="solid">
      <div style={{ fontSize: 14, lineHeight: 1.55 }}>
        <p style={{ marginTop: 0 }}>
          <strong>{summary.posted_total ?? 0}</strong> new posting(s) created.
          {' '}
          {(summary.skipped_already_in_gl ?? 0) > 0 && (
            <>{summary.skipped_already_in_gl} already in GL (skipped). </>
          )}
          {errors.length > 0 ? (
            <span style={{ color: 'var(--accent-red)' }}><strong>{errors.length}</strong> could not be posted.</span>
          ) : (
            <span style={{ color: 'var(--accent-teal)' }}>All records synced successfully.</span>
          )}
        </p>

        {Object.keys(postedByType).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h5 style={{ margin: '0 0 8px', fontSize: 13 }}>Posted</h5>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {Object.entries(postedByType).map(([key, count]) => (
                <li key={key}>{TYPE_LABELS[key] || key}: {count}</li>
              ))}
            </ul>
          </div>
        )}

        {errors.length > 0 && (
          <div>
            <h5 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--accent-red)' }}>Failed to post</h5>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((err) => (
                    <tr key={`${err.type}-${err.id}`}>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        <strong>{TYPE_LABELS[err.type] || err.type}</strong>
                        <br />
                        {err.label || `#${err.id}`}
                      </td>
                      <td style={{ fontSize: 12 }}>{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
