import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { portalApi } from '../services/portalApi';
import { formatDocumentMoney } from '../utils/formatMoney';
import { showApiError } from '../utils/apiErrors';

const GUIDED_ACTIONS = [
  {
    id: 'transfer',
    title: 'Bank / Cash transfer',
    description: 'Move money between bank and cash ledgers (contra entry).',
    fields: ['date', 'from_account_id', 'to_account_id', 'amount', 'memo'],
    api: 'glGuidedBankCashTransfer',
  },
  {
    id: 'capital',
    title: 'Capital introduction',
    description: 'Owner brings capital into the business bank account.',
    fields: ['date', 'bank_account_id', 'amount', 'memo'],
    api: 'glGuidedCapitalIntroduction',
  },
  {
    id: 'drawings',
    title: 'Owner withdrawal',
    description: 'Record drawings from bank to owner.',
    fields: ['date', 'bank_account_id', 'amount', 'memo'],
    api: 'glGuidedOwnerWithdrawal',
  },
  {
    id: 'loan-received',
    title: 'Loan received',
    description: 'Borrow funds — credit loan liability, debit bank.',
    fields: ['date', 'bank_account_id', 'loan_account_id', 'amount', 'memo'],
    api: 'glGuidedLoanReceived',
  },
  {
    id: 'loan-repayment',
    title: 'Loan repayment',
    description: 'Repay loan from bank account.',
    fields: ['date', 'bank_account_id', 'loan_account_id', 'amount', 'memo'],
    api: 'glGuidedLoanRepayment',
  },
  {
    id: 'depreciation',
    title: 'Depreciation',
    description: 'Charge depreciation — debit expense, credit accumulated depreciation.',
    fields: ['date', 'expense_account_id', 'asset_account_id', 'amount', 'memo'],
    api: 'glGuidedDepreciation',
  },
  {
    id: 'statutory',
    title: 'Pay GST / TDS / statutory',
    description: 'Settle statutory liability from bank.',
    fields: ['date', 'bank_account_id', 'statutory_account_id', 'amount', 'memo'],
    api: 'glGuidedStatutoryPayment',
  },
];

const EMPTY_MANUAL_LINE = () => ({ gl_account_id: '', debit: '', credit: '', memo: '' });

function accountOptions(accounts, filterFn) {
  return (accounts || []).filter(filterFn).map((a) => (
    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
  ));
}

function GuidedActionForm({ action, accounts, onSuccess }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, amount: '', memo: '' });
  const [busy, setBusy] = useState(false);

  const bankCash = useMemo(
    () => accounts.filter((a) => ['bank', 'cash'].includes(a.source) || ['asset_bank', 'asset_cash'].includes(a.account_subtype)),
    [accounts]
  );
  const loanAccounts = useMemo(
    () => accounts.filter((a) => a.account_type === 'liability' && (a.account_subtype?.includes('loan') || a.name?.toLowerCase().includes('loan'))),
    [accounts]
  );
  const statutoryAccounts = useMemo(
    () => accounts.filter((a) => a.account_type === 'liability' && (
      a.account_subtype?.includes('tax') || a.account_subtype?.includes('gst') || a.account_subtype?.includes('tds')
      || a.code?.startsWith('SYS-') || a.name?.toLowerCase().includes('gst') || a.name?.toLowerCase().includes('tds')
    )),
    [accounts]
  );
  const expenseAccounts = useMemo(() => accounts.filter((a) => a.account_type === 'expense'), [accounts]);
  const assetAccounts = useMemo(
    () => accounts.filter((a) => a.account_type === 'asset' && a.account_subtype?.includes('fixed')),
    [accounts]
  );

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        date: form.date,
        amount: parseFloat(form.amount),
        memo: form.memo || undefined,
      };
      if (action.fields.includes('from_account_id')) payload.from_account_id = parseInt(form.from_account_id, 10);
      if (action.fields.includes('to_account_id')) payload.to_account_id = parseInt(form.to_account_id, 10);
      if (action.fields.includes('bank_account_id')) payload.bank_account_id = parseInt(form.bank_account_id, 10);
      if (action.fields.includes('loan_account_id')) payload.loan_account_id = parseInt(form.loan_account_id, 10);
      if (action.fields.includes('expense_account_id')) payload.expense_account_id = parseInt(form.expense_account_id, 10);
      if (action.fields.includes('asset_account_id')) payload.asset_account_id = parseInt(form.asset_account_id, 10);
      if (action.fields.includes('statutory_account_id')) payload.statutory_account_id = parseInt(form.statutory_account_id, 10);

      await portalApi[action.api](payload);
      setForm({ date: today, amount: '', memo: '' });
      onSuccess?.();
    } catch (err) {
      showApiError(action.title, err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="table-card" style={{ marginTop: 12 }}>
      <div className="form-grid-2">
        <div className="form-group">
          <label>Date</label>
          <input type="date" className="form-input" value={form.date} onChange={(e) => setField('date', e.target.value)} required />
        </div>
        {action.fields.includes('amount') && (
          <div className="form-group">
            <label>Amount (₹)</label>
            <input type="number" step="0.01" min="0.01" className="form-input" value={form.amount} onChange={(e) => setField('amount', e.target.value)} required />
          </div>
        )}
        {action.fields.includes('from_account_id') && (
          <div className="form-group">
            <label>From account</label>
            <select className="form-input" value={form.from_account_id || ''} onChange={(e) => setField('from_account_id', e.target.value)} required>
              <option value="">Select…</option>
              {accountOptions(bankCash, () => true)}
            </select>
          </div>
        )}
        {action.fields.includes('to_account_id') && (
          <div className="form-group">
            <label>To account</label>
            <select className="form-input" value={form.to_account_id || ''} onChange={(e) => setField('to_account_id', e.target.value)} required>
              <option value="">Select…</option>
              {accountOptions(bankCash, () => true)}
            </select>
          </div>
        )}
        {action.fields.includes('bank_account_id') && (
          <div className="form-group">
            <label>Bank / Cash account</label>
            <select className="form-input" value={form.bank_account_id || ''} onChange={(e) => setField('bank_account_id', e.target.value)} required>
              <option value="">Select…</option>
              {accountOptions(bankCash, () => true)}
            </select>
          </div>
        )}
        {action.fields.includes('loan_account_id') && (
          <div className="form-group">
            <label>Loan account</label>
            <select className="form-input" value={form.loan_account_id || ''} onChange={(e) => setField('loan_account_id', e.target.value)} required>
              <option value="">Select…</option>
              {accountOptions(loanAccounts.length ? loanAccounts : accounts.filter((a) => a.account_type === 'liability'), () => true)}
            </select>
          </div>
        )}
        {action.fields.includes('expense_account_id') && (
          <div className="form-group">
            <label>Depreciation expense</label>
            <select className="form-input" value={form.expense_account_id || ''} onChange={(e) => setField('expense_account_id', e.target.value)} required>
              <option value="">Select…</option>
              {accountOptions(expenseAccounts, () => true)}
            </select>
          </div>
        )}
        {action.fields.includes('asset_account_id') && (
          <div className="form-group">
            <label>Accumulated depreciation / asset</label>
            <select className="form-input" value={form.asset_account_id || ''} onChange={(e) => setField('asset_account_id', e.target.value)} required>
              <option value="">Select…</option>
              {accountOptions(assetAccounts.length ? assetAccounts : accounts.filter((a) => a.account_type === 'asset'), () => true)}
            </select>
          </div>
        )}
        {action.fields.includes('statutory_account_id') && (
          <div className="form-group">
            <label>Statutory liability (GST/TDS)</label>
            <select className="form-input" value={form.statutory_account_id || ''} onChange={(e) => setField('statutory_account_id', e.target.value)} required>
              <option value="">Select…</option>
              {accountOptions(statutoryAccounts.length ? statutoryAccounts : accounts.filter((a) => a.account_type === 'liability'), () => true)}
            </select>
          </div>
        )}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Narration (optional)</label>
          <input type="text" className="form-input" value={form.memo || ''} onChange={(e) => setField('memo', e.target.value)} placeholder="Brief description" />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={busy} style={{ marginTop: 12 }}>
        {busy ? 'Posting…' : 'Post to GL'}
      </button>
    </form>
  );
}

function ManualJournalForm({ accounts, onSuccess }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState([EMPTY_MANUAL_LINE(), EMPTY_MANUAL_LINE()]);
  const [busy, setBusy] = useState(false);

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, EMPTY_MANUAL_LINE()]);
  const removeLine = (idx) => setLines((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!balanced) return;
    setBusy(true);
    try {
      await portalApi.glGuidedManualJournal({
        date,
        memo: memo || undefined,
        lines: lines.map((l) => ({
          gl_account_id: parseInt(l.gl_account_id, 10),
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          memo: l.memo || undefined,
        })),
      });
      setMemo('');
      setLines([EMPTY_MANUAL_LINE(), EMPTY_MANUAL_LINE()]);
      onSuccess?.();
    } catch (err) {
      showApiError('Manual journal', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="table-card" style={{ marginTop: 16 }}>
      <h3 className="chart-title">Manual journal (advanced)</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
        For rare adjustments only — most day-to-day entries post automatically from vouchers.
      </p>
      <div className="form-grid-2" style={{ marginBottom: 12 }}>
        <div className="form-group">
          <label>Date</label>
          <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Narration</label>
          <input type="text" className="form-input" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
      </div>
      <div className="premium-table-wrapper">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Account</th>
              <th style={{ textAlign: 'right' }}>Debit</th>
              <th style={{ textAlign: 'right' }}>Credit</th>
              <th>Line memo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td>
                  <select className="form-input" value={line.gl_account_id} onChange={(e) => updateLine(idx, { gl_account_id: e.target.value })} required>
                    <option value="">Select account…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input type="number" step="0.01" min="0" className="form-input" style={{ textAlign: 'right' }} value={line.debit} onChange={(e) => updateLine(idx, { debit: e.target.value, credit: e.target.value ? '' : line.credit })} />
                </td>
                <td>
                  <input type="number" step="0.01" min="0" className="form-input" style={{ textAlign: 'right' }} value={line.credit} onChange={(e) => updateLine(idx, { credit: e.target.value, debit: e.target.value ? '' : line.debit })} />
                </td>
                <td>
                  <input type="text" className="form-input" value={line.memo} onChange={(e) => updateLine(idx, { memo: e.target.value })} />
                </td>
                <td>
                  <button type="button" className="btn-secondary" style={{ fontSize: 11 }} onClick={() => removeLine(idx)} disabled={lines.length <= 2}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13 }}>
          Debit: <strong>{formatDocumentMoney(totalDebit, 'INR')}</strong>
          {' · '}Credit: <strong>{formatDocumentMoney(totalCredit, 'INR')}</strong>
          {!balanced && totalDebit + totalCredit > 0 && (
            <span style={{ color: 'var(--accent-red)', marginLeft: 8 }}>Entries must balance</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-secondary" onClick={addLine}>Add line</button>
          <button type="submit" className="btn-primary" disabled={busy || !balanced}>{busy ? 'Posting…' : 'Post journal'}</button>
        </div>
      </div>
    </form>
  );
}

export default function GuidedActionsTab() {
  const { coaChart, refreshPortalData } = useSimulator();
  const [activeAction, setActiveAction] = useState(GUIDED_ACTIONS[0].id);
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const accounts = useMemo(
    () => (coaChart || []).filter((a) => a.active !== false),
    [coaChart]
  );

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await portalApi.glGuidedJournals('?limit=30');
      setRecent(res.journals || []);
    } catch (err) {
      showApiError('Loading recent journals', err);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const onPosted = async () => {
    await loadRecent();
    refreshPortalData?.();
  };

  const action = GUIDED_ACTIONS.find((a) => a.id === activeAction) || GUIDED_ACTIONS[0];

  return (
    <div className="dashboard-tab">
      <div className="table-header-row" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="chart-title">Misc Entries</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Plain-language GL entries for capital, transfers, loans, depreciation, statutory payments, and rare manual journals.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={loadRecent} disabled={loadingRecent}>
          {loadingRecent ? 'Loading…' : 'Refresh history'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
        {GUIDED_ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`table-card ${activeAction === a.id ? 'active-card' : ''}`}
            style={{
              textAlign: 'left', padding: 14, margin: 0, cursor: 'pointer',
              border: activeAction === a.id ? '2px solid var(--accent-teal)' : undefined,
            }}
            onClick={() => setActiveAction(a.id)}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>{a.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{a.description}</div>
          </button>
        ))}
      </div>

      <h3 className="chart-title">{action.title}</h3>
      <GuidedActionForm action={action} accounts={accounts} onSuccess={onPosted} />

      <ManualJournalForm accounts={accounts} onSuccess={onPosted} />

      <div className="table-card" style={{ marginTop: 16 }}>
        <h3 className="chart-title">Recent guided &amp; manual journals</h3>
        {!recent.length && <p className="empty-state">No guided journals posted yet.</p>}
        {recent.length > 0 && (
          <div className="premium-table-wrapper manual-journal-table">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Journal</th>
                  <th>Type</th>
                  <th>Narration</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((j) => (
                  <tr key={j.id}>
                    <td>{j.journal_date}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{j.journal_number}</td>
                    <td style={{ fontSize: 11 }}>{j.source_type?.replace(/_/g, ' ')}</td>
                    <td>{j.memo || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{formatDocumentMoney(j.total_debit, 'INR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
