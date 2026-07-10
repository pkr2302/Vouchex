import { useEffect, useMemo, useState } from 'react';
import { Modal, Req, Opt, AmountInput } from './portalShared';
import { showApiError } from '../utils/apiErrors';
import {
  COA_NATURES,
  COA_SUBTYPES,
  EXPENSE_SUBTYPES,
  flattenReportGroups,
  subtypesForNature,
  subtypeByValue,
  validateCodeForSubtype,
} from '../utils/coaCatalog';

const KIND_LABELS = {
  bank: 'Bank Account',
  cash: 'Cash Account',
  expense_head: 'Expense Head',
};

const DEFAULT_SUBTYPE = {
  bank: 'bank',
  cash: 'cash',
  expense_head: 'expense_indirect',
};

function emptyLegacyForm(kind) {
  return {
    name: '',
    account_code: '',
    ledger_type: kind === 'expense_head' ? 'expense' : 'asset',
    account_subtype: DEFAULT_SUBTYPE[kind] || 'asset',
    opening_balance: '',
    opening_balance_date: '',
    description: '',
    ifsc: '',
    account_number: '',
    branch: '',
    location: '',
  };
}

function recordToLegacyForm(record, kind) {
  if (!record) return emptyLegacyForm(kind);
  return {
    name: record.name || '',
    account_code: record.account_code || '',
    ledger_type: record.ledger_type || (kind === 'expense_head' ? 'expense' : 'asset'),
    account_subtype: record.account_subtype || DEFAULT_SUBTYPE[kind],
    opening_balance: record.opening_balance ? record.opening_balance : '',
    opening_balance_date: record.opening_balance_date || '',
    description: record.description || '',
    ifsc: record.ifsc || '',
    account_number: record.account_number || '',
    branch: record.branch || '',
    location: record.location || '',
  };
}

function normalizeLegacyPayload(form, kind) {
  const base = {
    name: form.name.trim(),
    account_code: form.account_code.trim() || null,
    ledger_type: form.ledger_type || null,
    account_subtype: form.account_subtype || DEFAULT_SUBTYPE[kind],
    opening_balance: form.opening_balance === '' ? 0 : parseFloat(form.opening_balance) || 0,
    opening_balance_date: form.opening_balance_date || null,
    description: form.description.trim() || null,
  };
  if (kind === 'bank') {
    return {
      ...base,
      ifsc: form.ifsc.trim() || null,
      account_number: form.account_number.trim() || null,
      branch: form.branch.trim() || null,
    };
  }
  if (kind === 'cash') {
    return { ...base, location: form.location.trim() || null };
  }
  return base;
}

function emptyManualForm(subtype) {
  const row = subtypeByValue(subtype) || COA_SUBTYPES[0];
  return {
    code: String(row.codeFrom),
    name: '',
    account_subtype: row.value,
    account_nature: row.nature,
    normal_balance_side: row.normalBalance,
    opening_balance: '',
    opening_balance_date: '',
    description: '',
    report_group_id: '',
    metadata: {},
  };
}

function accountToManualForm(account) {
  const row = subtypeByValue(account.account_subtype);
  return {
    code: account.code || '',
    name: account.name || '',
    account_subtype: account.account_subtype || '',
    account_nature: account.account_type || row?.nature || 'asset',
    normal_balance_side: account.normal_balance_side || row?.normalBalance || 'debit',
    opening_balance: account.opening_balance || '',
    opening_balance_date: account.opening_balance_date || '',
    description: account.description || '',
    report_group_id: account.report_group_id || '',
    metadata: account.metadata || {},
  };
}

export function CoaLedgerFormModal({ open, onClose, kind, record, onSave }) {
  const [form, setForm] = useState(emptyLegacyForm(kind));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm(recordToLegacyForm(record, kind));
  }, [open, record, kind]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Ledger name is required.');
    setBusy(true);
    try {
      await onSave(normalizeLegacyPayload(form, kind));
      onClose();
    } catch (err) {
      showApiError(record ? 'Updating ledger' : 'Creating ledger', err);
    } finally {
      setBusy(false);
    }
  };

  const title = record ? `Edit ${KIND_LABELS[kind]}` : `Add ${KIND_LABELS[kind]}`;
  const expenseSubtypeOptions = EXPENSE_SUBTYPES;

  return (
    <Modal open={open} title={title} onClose={onClose} width={600} variant="solid">
      <form onSubmit={handleSubmit} className="master-form" style={{ margin: 0, padding: 0 }}>
        <div className="form-grid-2">
          <div className="form-group">
            <Req>Account Code</Req>
            <input
              type="text"
              className="form-input"
              placeholder={kind === 'bank' ? '1100–1199' : kind === 'cash' ? '1200–1299' : '5200–5549'}
              value={form.account_code}
              onChange={(e) => setField('account_code', e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="form-group">
            <Req>Ledger Name</Req>
            <input
              type="text"
              className="form-input"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              disabled={busy}
              required
            />
          </div>
        </div>

        {kind === 'expense_head' && (
          <div className="form-group">
            <Req>Expense Classification</Req>
            <select
              className="form-input"
              value={form.account_subtype}
              onChange={(e) => setField('account_subtype', e.target.value)}
              disabled={busy}
            >
              {expenseSubtypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {kind === 'bank' && (
          <>
            <div className="form-grid-2">
              <div className="form-group">
                <Opt>IFSC</Opt>
                <input type="text" className="form-input" value={form.ifsc} onChange={(e) => setField('ifsc', e.target.value)} disabled={busy} />
              </div>
              <div className="form-group">
                <Opt>Account Number</Opt>
                <input type="text" className="form-input" value={form.account_number} onChange={(e) => setField('account_number', e.target.value)} disabled={busy} />
              </div>
            </div>
            <div className="form-group">
              <Opt>Branch</Opt>
              <input type="text" className="form-input" value={form.branch} onChange={(e) => setField('branch', e.target.value)} disabled={busy} />
            </div>
          </>
        )}

        {kind === 'cash' && (
          <div className="form-group">
            <Opt>Location / Custodian</Opt>
            <input type="text" className="form-input" value={form.location} onChange={(e) => setField('location', e.target.value)} disabled={busy} />
          </div>
        )}

        <div className="form-grid-2">
          <div className="form-group">
            <Opt>Opening Balance (₹)</Opt>
            <AmountInput value={form.opening_balance} onChange={(v) => setField('opening_balance', v)} disabled={busy} />
          </div>
          <div className="form-group">
            <Opt>Opening Balance Date</Opt>
            <input type="date" className="form-input" value={form.opening_balance_date} onChange={(e) => setField('opening_balance_date', e.target.value)} disabled={busy} />
          </div>
        </div>
        <div className="form-group">
          <Opt>Description</Opt>
          <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} disabled={busy} />
        </div>
        <div className="btn-row">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{record ? 'Save Changes' : 'Add Ledger'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function CoaAccountFormModal({ open, onClose, account, reportGroups, onSave, groupOnly = false }) {
  const flatGroups = useMemo(() => flattenReportGroups(reportGroups), [reportGroups]);
  const [form, setForm] = useState(emptyManualForm('sales_revenue'));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (account) {
      setForm(accountToManualForm(account));
    } else {
      setForm(emptyManualForm('sales_revenue'));
    }
  }, [open, account]);

  const subtypeRow = subtypeByValue(form.account_subtype);
  const natureOptions = subtypesForNature(form.account_nature);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const onNatureChange = (nature) => {
    const first = subtypesForNature(nature)[0];
    setForm((prev) => ({
      ...prev,
      account_nature: nature,
      account_subtype: first?.value || '',
      normal_balance_side: first?.normalBalance || 'debit',
      code: first ? String(first.codeFrom) : prev.code,
    }));
  };

  const onSubtypeChange = (subtype) => {
    const row = subtypeByValue(subtype);
    setForm((prev) => ({
      ...prev,
      account_subtype: subtype,
      normal_balance_side: row?.normalBalance || prev.normal_balance_side,
      code: row && !account ? String(row.codeFrom) : prev.code,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (groupOnly) {
      setBusy(true);
      try {
        await onSave({
          report_group_id: form.report_group_id || null,
          report_group_id_only: true,
        });
        onClose();
      } catch (err) {
        showApiError('Updating report group assignment', err);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!form.name.trim()) return alert('Account name is required.');
    const codeErr = validateCodeForSubtype(form.code, form.account_subtype);
    if (codeErr) return alert(codeErr);

    setBusy(true);
    try {
      await onSave({
        code: form.code.trim(),
        name: form.name.trim(),
        account_subtype: form.account_subtype,
        normal_balance_side: form.normal_balance_side,
        opening_balance: form.opening_balance === '' ? 0 : parseFloat(form.opening_balance) || 0,
        opening_balance_date: form.opening_balance_date || null,
        description: form.description.trim() || null,
        report_group_id: form.report_group_id || null,
        metadata: form.metadata,
      });
      onClose();
    } catch (err) {
      showApiError(account ? 'Updating account' : 'Creating account', err);
    } finally {
      setBusy(false);
    }
  };

  const title = groupOnly
    ? 'Assign Report Group'
    : account
      ? 'Edit General Ledger'
      : 'Add General Ledger';

  return (
    <Modal open={open} title={title} onClose={onClose} width={620} variant="solid">
      <form onSubmit={handleSubmit} className="master-form" style={{ margin: 0, padding: 0 }}>
        {!groupOnly && (
          <>
            <div className="form-grid-2">
              <div className="form-group">
                <Req>Account Nature</Req>
                <select className="form-input" value={form.account_nature} onChange={(e) => onNatureChange(e.target.value)} disabled={busy || Boolean(account)}>
                  {COA_NATURES.map((n) => (
                    <option key={n.value} value={n.value}>{n.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <Req>Ledger Type</Req>
                <select className="form-input" value={form.account_subtype} onChange={(e) => onSubtypeChange(e.target.value)} disabled={busy || Boolean(account)}>
                  {natureOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <Req>GL Code</Req>
                <input
                  type="text"
                  className="form-input"
                  placeholder={subtypeRow ? `${subtypeRow.codeFrom}–${subtypeRow.codeTo}` : '4 digits'}
                  value={form.code}
                  onChange={(e) => setField('code', e.target.value)}
                  disabled={busy || Boolean(account?.id && account?.source === 'manual')}
                />
              </div>
              <div className="form-group">
                <Req>Account Name</Req>
                <input type="text" className="form-input" value={form.name} onChange={(e) => setField('name', e.target.value)} disabled={busy} required />
              </div>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <Req>Normal Balance</Req>
                <select className="form-input" value={form.normal_balance_side} onChange={(e) => setField('normal_balance_side', e.target.value)} disabled={busy}>
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="form-group">
                <Opt>Opening Balance (₹)</Opt>
                <AmountInput value={form.opening_balance} onChange={(v) => setField('opening_balance', v)} disabled={busy} />
              </div>
            </div>
            <div className="form-group">
              <Opt>Opening Balance Date</Opt>
              <input type="date" className="form-input" value={form.opening_balance_date} onChange={(e) => setField('opening_balance_date', e.target.value)} disabled={busy} />
            </div>
            <div className="form-group">
              <Opt>Description</Opt>
              <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} disabled={busy} />
            </div>
          </>
        )}
        <div className="form-group">
          <Opt>Report Group (for financial statements)</Opt>
          <select className="form-input" value={form.report_group_id} onChange={(e) => setField('report_group_id', e.target.value)} disabled={busy}>
            <option value="">— Unassigned —</option>
            {flatGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.label} ({g.statement_type})</option>
            ))}
          </select>
        </div>
        <div className="btn-row">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>Save</button>
        </div>
      </form>
    </Modal>
  );
}
