import { useCallback, useEffect, useState } from 'react';
import { portalApi } from '../services/portalApi';
import { formatDocumentMoney } from '../utils/formatMoney';
import { showApiError } from '../utils/apiErrors';
import { Modal } from './portalShared';

export default function LedgerStatementModal({ open, onClose, account, fromDate, toDate }) {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const glAccountId = account?.gl_account_id ?? account?.id;
    if (!glAccountId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ gl_account_id: String(glAccountId) });
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const res = await portalApi.glLedgerStatement(`?${params.toString()}`);
      setStatement(res.ledger_statement);
    } catch (err) {
      showApiError('Loading ledger statement', err);
    } finally {
      setLoading(false);
    }
  }, [account, fromDate, toDate]);

  useEffect(() => {
    if (open && account) load();
    if (!open) setStatement(null);
  }, [open, account, load]);

  if (!account) return null;

  const titleName = account.account_name || account.name || account.party_name || 'Ledger';
  const code = account.account_code || account.code;

  return (
    <Modal
      open={open}
      title={`${code ? `${code} — ` : ''}${titleName}`}
      onClose={onClose}
      width={920}
      variant="solid"
    >
      {loading && <p className="empty-state">Loading statement…</p>}
      {statement && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }} className="ledger-statement-summary">
            <div className="table-card" style={{ padding: 12, margin: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Opening</div>
              <div style={{ fontWeight: 700 }}>{formatDocumentMoney(statement.opening_balance, 'INR')}</div>
            </div>
            <div className="table-card" style={{ padding: 12, margin: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Closing</div>
              <div style={{ fontWeight: 700 }}>{formatDocumentMoney(statement.closing_balance, 'INR')}</div>
            </div>
            <div className="table-card" style={{ padding: 12, margin: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Entries</div>
              <div style={{ fontWeight: 700 }}>{statement.rows?.length || 0}</div>
            </div>
          </div>
          <div className="premium-table-wrapper" style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Journal</th>
                  <th>Source</th>
                  <th>Particulars</th>
                  <th style={{ textAlign: 'right' }}>Debit</th>
                  <th style={{ textAlign: 'right' }}>Credit</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6}><em>Opening balance</em></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatDocumentMoney(statement.opening_balance, 'INR')}</td>
                </tr>
                {(statement.rows || []).map((row, idx) => (
                  <tr key={`${row.journal_number}-${idx}`}>
                    <td>{row.date}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.journal_number}</td>
                    <td style={{ fontSize: 11 }}>{row.source_type || '—'}</td>
                    <td style={{ fontSize: 12 }}>{row.description || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{row.debit > 0 ? formatDocumentMoney(row.debit, 'INR') : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{row.credit > 0 ? formatDocumentMoney(row.credit, 'INR') : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatDocumentMoney(row.balance, 'INR')}</td>
                  </tr>
                ))}
                {statement.rows?.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">No GL postings in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
