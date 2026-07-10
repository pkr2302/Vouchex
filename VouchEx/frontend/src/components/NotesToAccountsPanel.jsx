import { useCallback, useEffect, useState } from 'react';
import { portalApi } from '../services/portalApi';
import { formatDocumentMoney } from '../utils/formatMoney';
import { showApiError } from '../utils/apiErrors';
import { exportNotesToAccountsExcel } from '../utils/financialExport';
import { Modal } from './portalShared';

function GlLedgerStatementModal({ open, onClose, account, fromDate, toDate }) {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!account?.gl_account_id) return;
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
  const label = account.party_name || account.account_name;

  return (
    <Modal open={open} title={`Ledger — ${label}`} onClose={onClose} width={920} variant="solid">
      {loading && <p className="empty-state">Loading statement…</p>}
      {statement && (
        <div className="premium-table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Date</th><th>Journal</th><th>Particulars</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Credit</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {(statement.rows || []).map((row, idx) => (
                <tr key={`${row.journal_id}-${idx}`}>
                  <td>{row.date}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.journal_no}</td>
                  <td>{row.particulars}</td>
                  <td style={{ textAlign: 'right' }}>{row.debit > 0 ? formatDocumentMoney(row.debit, 'INR') : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{row.credit > 0 ? formatDocumentMoney(row.credit, 'INR') : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatDocumentMoney(row.running_balance, 'INR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function NoteSectionTable({ section, onDrill }) {
  if (!section.rows?.length) {
    return <p className="empty-state" style={{ marginTop: 8 }}>No balances to disclose for this note.</p>;
  }

  const partySection = section.id === 'trade_receivables' || section.id === 'trade_payables';

  return (
    <div className="premium-table-wrapper">
      <table className="premium-table">
        <thead>
          <tr>
            <th>{partySection ? 'Party' : 'Account'}</th>
            <th>Code</th>
            <th style={{ textAlign: 'right' }}>Balance</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.account_code}>
              <td>{row.party_name || row.account_name}</td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.account_code}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatDocumentMoney(row.balance, 'INR')}</td>
              <td style={{ textAlign: 'right' }}>
                {row.gl_account_id ? (
                  <button type="button" className="btn-secondary-sm" onClick={() => onDrill(row)}>Ledger</button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}><strong>Total</strong></td>
            <td style={{ textAlign: 'right' }}><strong>{formatDocumentMoney(section.total, 'INR')}</strong></td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function NotesToAccountsPanel({ notes, loading, onRefresh, frameworkMeta, appliedPeriod }) {
  const [drillAccount, setDrillAccount] = useState(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const meta = notes || frameworkMeta || {};
  const fromDate = appliedPeriod?.from;
  const toDate = appliedPeriod?.to || appliedPeriod?.asOf;

  return (
    <div>
      <div className="table-header-row" style={{ marginBottom: 12 }}>
        <div>
          <h3 className="chart-title">{meta.report_titles?.notes_to_accounts || 'Notes to Accounts'}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Disclosure schedules for the selected period.
            {appliedPeriod?.periodLabel ? ` · ${appliedPeriod.periodLabel}` : ''}
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading && !notes && <p className="empty-state">Loading notes…</p>}

      {(notes?.sections || []).map((section) => (
        <div key={section.id} className="table-card" style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 4 }}>{section.title}</h4>
          {section.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{section.description}</p>}
          <NoteSectionTable section={section} onDrill={(row) => { setDrillAccount(row); setLedgerOpen(true); }} />
        </div>
      ))}

      <GlLedgerStatementModal open={ledgerOpen} onClose={() => setLedgerOpen(false)} account={drillAccount} fromDate={fromDate} toDate={toDate} />
    </div>
  );
}

export { exportNotesToAccountsExcel };
