import { useCallback, useEffect, useMemo, useState } from 'react';
import { portalApi } from '../services/portalApi';
import { formatDocumentMoney, formatINR } from '../utils/formatMoney';
import { showApiError } from '../utils/apiErrors';
import { Modal } from './portalShared';

function BalanceBar({ label, amount, max, color }) {
  const pct = max > 0 ? Math.max(4, (Math.abs(amount) / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span>{label}</span>
        <strong>{formatDocumentMoney(amount, 'INR')}</strong>
      </div>
      <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function LedgerStatementModal({ open, onClose, account, fromDate, toDate }) {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ gl_account_id: String(account.gl_account_id) });
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
  }, [open, account, load]);

  if (!account) return null;

  return (
    <Modal
      open={open}
      title={`${account.account_name} — Bank Statement`}
      onClose={onClose}
      width={920}
      variant="solid"
    >
      {loading && <p className="empty-state">Loading statement…</p>}
      {statement && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
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

export default function CashBankTab() {
  const [subView, setSubView] = useState('cash');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statementAccount, setStatementAccount] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (toDate) params.set('as_of', toDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await portalApi.glOperationalReports(qs);
      setSummary(res.cash_bank_summary);
    } catch (err) {
      showApiError('Loading cash & bank summary', err);
    } finally {
      setLoading(false);
    }
  }, [toDate]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const cashRows = useMemo(
    () => (summary?.rows || []).filter((r) => r.ledger_kind === 'cash'),
    [summary]
  );
  const bankRows = useMemo(
    () => (summary?.rows || []).filter((r) => r.ledger_kind === 'bank'),
    [summary]
  );
  const activeRows = subView === 'cash' ? cashRows : bankRows;
  const maxBal = useMemo(
    () => Math.max(...activeRows.map((r) => Math.abs(r.balance)), 1),
    [activeRows]
  );

  const totalCash = summary?.totals?.cash ?? 0;
  const totalBank = summary?.totals?.bank ?? 0;

  return (
    <div className="dashboard-tab">
      <div className="table-header-row" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="chart-title">Cash &amp; Bank</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            GL balances and ledger-wise statements — includes opening balances and all posted vouchers.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={loadSummary} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" className={`sub-tab-btn ${subView === 'cash' ? 'active' : ''}`} onClick={() => setSubView('cash')}>
          Cash &amp; Equivalents
        </button>
        <button type="button" className={`sub-tab-btn ${subView === 'bank' ? 'active' : ''}`} onClick={() => setSubView('bank')}>
          Bank Accounts
        </button>
      </div>

      <div className="form-grid-4" style={{ marginBottom: 16 }}>
        <div className="form-group">
          <label>Statement from</label>
          <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>As of / statement to</label>
          <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="table-card" style={{ padding: 16, margin: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Cash</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-teal)' }}>₹{formatINR(totalCash)}</div>
        </div>
        <div className="table-card" style={{ padding: 16, margin: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Bank</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-blue)' }}>₹{formatINR(totalBank)}</div>
        </div>
        <div className="table-card" style={{ padding: 16, margin: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Combined</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>₹{formatINR(summary?.totals?.combined ?? 0)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 0.9fr) minmax(320px, 1.4fr)', gap: 16 }}>
        <div className="table-card">
          <h3 className="chart-title">{subView === 'cash' ? 'Cash ledger balances' : 'Bank ledger balances'}</h3>
          {activeRows.length > 0 ? (
            activeRows.map((row) => (
              <BalanceBar
                key={row.gl_account_id}
                label={`${row.account_code} — ${row.account_name}`}
                amount={row.balance}
                max={maxBal}
                color={subView === 'cash' ? 'var(--accent-teal)' : 'var(--accent-blue)'}
              />
            ))
          ) : (
            <p className="empty-state">No {subView} ledgers with balances. Add ledgers in Chart of Accounts and sync GL.</p>
          )}
        </div>

        <div className="table-card" style={{ padding: 0 }}>
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Ledger</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th style={{ textAlign: 'right' }}>Statement</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((row) => (
                  <tr key={row.gl_account_id}>
                    <td style={{ fontFamily: 'monospace' }}>{row.account_code}</td>
                    <td>{row.account_name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatDocumentMoney(row.balance, 'INR')}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => setStatementAccount(row)}
                      >
                        View statement
                      </button>
                    </td>
                  </tr>
                ))}
                {activeRows.length === 0 && (
                  <tr><td colSpan={4} className="empty-state">No ledgers to show.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <LedgerStatementModal
        open={Boolean(statementAccount)}
        account={statementAccount}
        fromDate={fromDate}
        toDate={toDate}
        onClose={() => setStatementAccount(null)}
      />
    </div>
  );
}
