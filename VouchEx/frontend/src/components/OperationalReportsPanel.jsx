import { formatDocumentMoney, formatINR } from '../utils/formatMoney';

const BUCKET_META = [
  { key: '0-30', label: '0–30 days', color: 'var(--accent-green)' },
  { key: '31-60', label: '31–60 days', color: 'var(--accent-teal)' },
  { key: '60-90', label: '61–90 days', color: 'var(--accent-amber)' },
  { key: '90+', label: '90+ days', color: 'var(--accent-red)' },
];

export function AgeingBucketsPanel({ title, data, partyLabel }) {
  if (!data) return null;

  const total = data.total || 0;
  const buckets = data.buckets || {};

  return (
    <div className="table-card" style={{ marginBottom: 20 }}>
      <h3 className="chart-title">{title} (as of {data.as_of})</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
        Total outstanding: <strong>{formatDocumentMoney(total, 'INR')}</strong>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '16px 0' }}>
        {BUCKET_META.map((b) => (
          <div key={b.key} style={{ textAlign: 'center', padding: 12, background: 'var(--bg-tertiary)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{b.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: b.color }}>₹{formatINR(buckets[b.key] || 0)}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {total > 0 ? `${Math.round(((buckets[b.key] || 0) / total) * 100)}%` : '0%'}
            </div>
          </div>
        ))}
      </div>

      {(data.parties || []).length > 0 ? (
        <div className="premium-table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th>{partyLabel}</th>
                <th>Document</th>
                <th>Due date</th>
                <th>Days past due</th>
                <th>Bucket</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {data.parties.map((row) => (
                <tr key={`${row.document_type}-${row.document_id}`}>
                  <td>{row.party_name || '—'}</td>
                  <td style={{ fontSize: 12 }}>{row.document_number || `#${row.document_id}`}</td>
                  <td>{row.due_date || '—'}</td>
                  <td>{row.days_past_due}</td>
                  <td>{row.bucket}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatDocumentMoney(row.outstanding, 'INR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">No outstanding {partyLabel.toLowerCase()} balances in this period.</p>
      )}
    </div>
  );
}

export function OperationalReportsPanel({ receivables, payables, cashBank }) {
  return (
    <>
      <AgeingBucketsPanel title="Receivables Ageing (Debtors)" data={receivables} partyLabel="Customer" />
      <AgeingBucketsPanel title="Payables Ageing (Creditors)" data={payables} partyLabel="Vendor" />

      {cashBank && (
        <div className="table-card">
          <h3 className="chart-title">Cash &amp; Bank Summary (as of {cashBank.as_of})</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Balances from GL (includes opening balances and all posted vouchers).
          </p>
          {(cashBank.rows || []).length > 0 ? (
            <>
              <div className="premium-table-wrapper" style={{ marginTop: 12 }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Ledger</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashBank.rows.map((row) => (
                      <tr key={row.gl_account_id}>
                        <td style={{ fontFamily: 'monospace' }}>{row.account_code}</td>
                        <td>{row.account_name}</td>
                        <td style={{ textTransform: 'capitalize' }}>{row.ledger_kind}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatDocumentMoney(row.balance, 'INR')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}><strong>Total Bank</strong></td>
                      <td style={{ textAlign: 'right' }}><strong>{formatDocumentMoney(cashBank.totals.bank, 'INR')}</strong></td>
                    </tr>
                    <tr>
                      <td colSpan={3}><strong>Total Cash</strong></td>
                      <td style={{ textAlign: 'right' }}><strong>{formatDocumentMoney(cashBank.totals.cash, 'INR')}</strong></td>
                    </tr>
                    <tr>
                      <td colSpan={3}><strong>Combined</strong></td>
                      <td style={{ textAlign: 'right' }}><strong>{formatDocumentMoney(cashBank.totals.combined, 'INR')}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <p className="empty-state" style={{ marginTop: 12 }}>
              No bank or cash ledgers with balances. Add them in Chart of Accounts and sync GL.
            </p>
          )}
        </div>
      )}
    </>
  );
}
