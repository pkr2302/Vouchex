import { useCallback, useEffect, useMemo, useState } from 'react';
import { portalApi } from '../services/portalApi';
import { formatDocumentMoney } from '../utils/formatMoney';
import { showApiError } from '../utils/apiErrors';
import FinancialPeriodBar, { getDefaultAppliedPeriod } from './FinancialPeriodBar';
import LedgerStatementModal from './LedgerStatementModal';
import { buildTrialBalanceHeading } from '../utils/financialPeriod';
import { useSimulator } from '../context/SimulatorContext';

const VIEW_META = {
  ledger: {
    title: 'Ledgers',
    description: 'View ledger-wise statements for any GL account in the selected period.',
  },
  'day-book': {
    title: 'Day Book',
    description: 'Chronological list of all journal lines posted in the period.',
  },
  sales: {
    title: 'Sales Register',
    description: 'GST-friendly register of sales invoices and credit notes.',
  },
  purchase: {
    title: 'Purchase Register',
    description: 'GST-friendly register of purchases, expenses, and debit notes.',
  },
};

function RegisterTable({ columns, rows, emptyLabel, tableClassName = '' }) {
  if (!rows?.length) return <p className="empty-state">{emptyLabel}</p>;
  return (
    <div className={`premium-table-wrapper ${tableClassName}`.trim()}>
      <table className="premium-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className || ''} style={col.align ? { textAlign: col.align } : undefined}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row._key || idx}>
              {columns.map((col) => (
                <td key={col.key} className={col.className || ''} style={col.align ? { textAlign: col.align } : undefined}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RegistersTab({ view = 'ledger' }) {
  const { companyDetails } = useSimulator();
  const companyName = companyDetails?.name || 'Company';
  const meta = VIEW_META[view] || VIEW_META.ledger;

  const [appliedPeriod, setAppliedPeriod] = useState(() => getDefaultAppliedPeriod());
  const [draftPeriod, setDraftPeriod] = useState(() => getDefaultAppliedPeriod());
  const [periodError, setPeriodError] = useState('');
  const [loading, setLoading] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [dayBook, setDayBook] = useState(null);
  const [salesRegister, setSalesRegister] = useState(null);
  const [purchaseRegister, setPurchaseRegister] = useState(null);
  const [statementAccount, setStatementAccount] = useState(null);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await portalApi.glLedgerAccounts();
      setAccounts(res.accounts || []);
    } catch (err) {
      showApiError('Loading ledger accounts', err);
    }
  }, []);

  const loadData = useCallback(async (period) => {
    if (!period?.from || !period?.to || view === 'ledger') return;
    setLoading(true);
    setPeriodError('');
    try {
      const qs = `?from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}`;
      if (view === 'day-book') {
        const res = await portalApi.glDayBook(qs);
        setDayBook(res.day_book);
      } else if (view === 'sales') {
        const res = await portalApi.glSalesRegister(qs);
        setSalesRegister(res.sales_register);
      } else if (view === 'purchase') {
        const res = await portalApi.glPurchaseRegister(qs);
        setPurchaseRegister(res.purchase_register);
      }
    } catch (err) {
      showApiError(`Loading ${meta.title.toLowerCase()}`, err);
    } finally {
      setLoading(false);
    }
  }, [view, meta.title]);

  useEffect(() => {
    if (view === 'ledger') loadAccounts();
  }, [view, loadAccounts]);

  useEffect(() => {
    if (view !== 'ledger') loadData(appliedPeriod);
  }, [view, appliedPeriod, loadData]);

  const handleApplyPeriod = (period, error) => {
    if (error) {
      setPeriodError(error);
      return;
    }
    setPeriodError('');
    setDraftPeriod(period);
    setAppliedPeriod(period);
  };

  const selectedAccount = useMemo(
    () => accounts.find((a) => String(a.id) === String(selectedAccountId)) || null,
    [accounts, selectedAccountId]
  );

  const heading = buildTrialBalanceHeading(companyName, appliedPeriod);

  const gstColumns = [
    { key: 'date', label: 'Date' },
    { key: 'document_type', label: 'Type', className: 'col-type' },
    { key: 'document_number', label: 'Number' },
    { key: 'party_name', label: 'Party', className: 'col-party' },
    { key: 'gstin', label: 'GSTIN', className: 'col-gstin' },
    { key: 'taxable_value', label: 'Taxable', align: 'right', render: (r) => formatDocumentMoney(r.taxable_value, 'INR') },
    { key: 'cgst', label: 'CGST', align: 'right', className: 'col-tax', render: (r) => formatDocumentMoney(r.cgst, 'INR') },
    { key: 'sgst', label: 'SGST', align: 'right', className: 'col-tax', render: (r) => formatDocumentMoney(r.sgst, 'INR') },
    { key: 'igst', label: 'IGST', align: 'right', className: 'col-tax', render: (r) => formatDocumentMoney(r.igst, 'INR') },
    { key: 'invoice_value', label: 'Total', align: 'right', render: (r) => formatDocumentMoney(r.invoice_value, 'INR') },
  ];

  const dayBookRows = (dayBook?.rows || []).map((r, i) => ({ ...r, _key: `${r.journal_number}-${i}` }));
  const salesRows = (salesRegister?.rows || []).map((r, i) => ({ ...r, _key: `${r.document_number}-${i}` }));
  const purchaseRows = (purchaseRegister?.rows || []).map((r, i) => ({ ...r, _key: `${r.document_number}-${i}` }));

  return (
    <div className="dashboard-tab">
      <div className="table-header-row" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="chart-title">{meta.title}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{meta.description}</p>
        </div>
        {view !== 'ledger' && (
          <button type="button" className="btn-secondary" onClick={() => loadData(appliedPeriod)} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        )}
      </div>

      <FinancialPeriodBar
        draft={draftPeriod}
        onDraftChange={setDraftPeriod}
        onApply={handleApplyPeriod}
        periodError={periodError}
        loading={loading}
      />

      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, marginTop: 12 }}>{heading}</p>

      {view === 'ledger' && (
        <div className="table-card">
          <div className="form-grid-2" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>Ledger account</label>
              <select className="form-input" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                <option value="">Select account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="button"
                className="btn-primary"
                disabled={!selectedAccount}
                onClick={() => setStatementAccount(selectedAccount ? {
                  gl_account_id: selectedAccount.id,
                  account_code: selectedAccount.code,
                  account_name: selectedAccount.name,
                } : null)}
              >
                View ledger statement
              </button>
            </div>
          </div>
          {!accounts.length && <p className="empty-state">No active GL accounts. Sync GL or add accounts in Chart of Accounts.</p>}
        </div>
      )}

      {view === 'day-book' && (
        <>
          {dayBook?.totals && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
              <span>Total Debit: <strong>{formatDocumentMoney(dayBook.totals.debit, 'INR')}</strong></span>
              <span>Total Credit: <strong>{formatDocumentMoney(dayBook.totals.credit, 'INR')}</strong></span>
            </div>
          )}
          <RegisterTable
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'journal_number', label: 'Journal' },
              { key: 'account_code', label: 'Code' },
              { key: 'account_name', label: 'Account' },
              { key: 'particulars', label: 'Particulars' },
              { key: 'debit', label: 'Debit', align: 'right', render: (r) => (r.debit > 0 ? formatDocumentMoney(r.debit, 'INR') : '—') },
              { key: 'credit', label: 'Credit', align: 'right', render: (r) => (r.credit > 0 ? formatDocumentMoney(r.credit, 'INR') : '—') },
            ]}
            rows={dayBookRows}
            emptyLabel="No journal lines in this period."
          />
        </>
      )}

      {view === 'sales' && (
        <>
          {salesRegister?.totals && (
            <div style={{ marginBottom: 12, fontSize: 13 }}>
              Total invoice value: <strong>{formatDocumentMoney(salesRegister.totals.invoice_value, 'INR')}</strong>
              {' · '}Taxable: <strong>{formatDocumentMoney(salesRegister.totals.taxable_value, 'INR')}</strong>
            </div>
          )}
          <RegisterTable columns={gstColumns} rows={salesRows} emptyLabel="No sales invoices or credit notes in this period." tableClassName="register-gst-table" />
        </>
      )}

      {view === 'purchase' && (
        <>
          {purchaseRegister?.totals && (
            <div style={{ marginBottom: 12, fontSize: 13 }}>
              Total value: <strong>{formatDocumentMoney(purchaseRegister.totals.invoice_value, 'INR')}</strong>
              {' · '}Taxable: <strong>{formatDocumentMoney(purchaseRegister.totals.taxable_value, 'INR')}</strong>
            </div>
          )}
          <RegisterTable columns={gstColumns} rows={purchaseRows} emptyLabel="No purchases, expenses, or debit notes in this period." tableClassName="register-gst-table" />
        </>
      )}

      <LedgerStatementModal
        open={Boolean(statementAccount)}
        account={statementAccount}
        fromDate={appliedPeriod.from}
        toDate={appliedPeriod.to}
        onClose={() => setStatementAccount(null)}
      />
    </div>
  );
}
