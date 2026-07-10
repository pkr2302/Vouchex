import { useMemo, useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { CoaLedgerFormModal, CoaAccountFormModal } from './CoaLedgerFormModal';
import { ReportGroupMasterPanel } from './ReportGroupMasterPanel';
import { RecordDeleteButton } from './RecordDeleteButton';
import { Modal } from './portalShared';
import { AddLedgerPickerModal } from './AddLedgerPickerModal';
import { COA_NATURES, SOURCE_LABELS, flattenReportGroups } from '../utils/coaCatalog';
import { formatINR } from '../utils/formatMoney';

function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function CoaInstructionsModal({ open, onClose }) {
  return (
    <Modal open={open} title="Chart of Accounts — instructions" onClose={onClose} width={640} variant="solid">
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
        <p style={{ marginTop: 0 }}>
          The Chart of Accounts is the master list of every money &quot;bucket&quot; your business uses — bank accounts,
          cash, money customers owe you, sales, purchases, expenses, GST, loans, and capital.
        </p>
        <p>
          When you raise an invoice, record a receipt, or enter an expense, VouchEx automatically posts amounts to these
          buckets. You do not need to pass manual journal entries for everyday work.
        </p>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>All Ledgers</p>
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li>See every account in one list — banks, cash, expense categories, customers, vendors, and system accounts.</li>
          <li>Use <strong>+ Add Ledger</strong> for a new bank, cash box, expense category, or any other account type.</li>
          <li>Each account has a <strong>4-digit code</strong> and a <strong>type</strong> so reports stay in order.</li>
        </ul>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Report Groupings</p>
        <p style={{ margin: 0 }}>
          Before Balance Sheet and Profit &amp; Loss can print in the proper format, each ledger must be placed under a
          report group. Open that tab, use <strong>Automatic Map</strong> for obvious cases, then drag or select the rest.
        </p>
      </div>
    </Modal>
  );
}

export function ChartOfAccountsTab() {
  const {
    coaChart,
    reportGroups,
    createBankLedger,
    updateBankLedger,
    deleteBankLedger,
    createCashLedger,
    updateCashLedger,
    deleteCashLedger,
    createExpenseHead,
    updateExpenseHead,
    deleteExpenseHead,
    createCoaAccount,
    updateCoaAccount,
    deleteCoaAccount,
  } = useSimulator();

  const [view, setView] = useState('ledgers');
  const [natureFilter, setNatureFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [legacyModal, setLegacyModal] = useState(null);
  const [manualModal, setManualModal] = useState(null);
  const [groupModal, setGroupModal] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const groupNameById = useMemo(() => {
    const map = {};
    flattenReportGroups(reportGroups).forEach((g) => {
      map[g.id] = g.name;
      map[String(g.id)] = g.name;
    });
    return map;
  }, [reportGroups]);

  const filteredChart = useMemo(() => {
    let rows = [...(coaChart || [])];
    if (natureFilter) rows = rows.filter((r) => r.account_type === natureFilter);
    if (sourceFilter) rows = rows.filter((r) => r.source === sourceFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.code?.toLowerCase().includes(q) ||
          r.account_subtype_label?.toLowerCase().includes(q)
      );
    }
    return rows.sort((a, b) => String(a.code).localeCompare(String(b.code)));
  }, [coaChart, natureFilter, sourceFilter, search]);

  const openAdd = (kind) => {
    if (kind === 'manual') {
      setManualModal({ account: null });
    } else {
      setLegacyModal({ kind, record: null });
    }
  };

  const openEdit = (row) => {
    if (row.source === 'bank') {
      setLegacyModal({
        kind: 'bank',
        record: {
          id: row.source_id,
          name: row.name,
          account_code: row.code?.startsWith('BANK-') ? '' : row.code,
          ledger_type: row.account_type,
          account_subtype: row.account_subtype,
          opening_balance: row.opening_balance,
          opening_balance_date: row.opening_balance_date,
          description: row.description,
          ifsc: row.metadata?.ifsc,
          account_number: row.metadata?.account_number,
          branch: row.metadata?.branch,
        },
      });
    } else if (row.source === 'cash') {
      setLegacyModal({
        kind: 'cash',
        record: {
          id: row.source_id,
          name: row.name,
          account_code: row.code?.startsWith('CASH-') ? '' : row.code,
          ledger_type: row.account_type,
          account_subtype: row.account_subtype,
          opening_balance: row.opening_balance,
          opening_balance_date: row.opening_balance_date,
          description: row.description,
          location: row.metadata?.location,
        },
      });
    } else if (row.source === 'expense_head') {
      setLegacyModal({
        kind: 'expense_head',
        record: {
          id: row.source_id,
          name: row.name,
          account_code: row.code?.startsWith('EXP-') ? '' : row.code,
          ledger_type: row.account_type,
          account_subtype: row.account_subtype,
          opening_balance: row.opening_balance,
          opening_balance_date: row.opening_balance_date,
          description: row.description,
        },
      });
    } else if (row.editable) {
      setManualModal({ account: row });
    } else {
      setGroupModal({ account: row, groupOnly: true });
    }
  };

  const handleLegacySave = async (payload) => {
    const { kind, record } = legacyModal;
    const handlers = {
      bank: { create: createBankLedger, update: updateBankLedger },
      cash: { create: createCashLedger, update: updateCashLedger },
      expense_head: { create: createExpenseHead, update: updateExpenseHead },
    };
    const h = handlers[kind];
    if (record?.id) await h.update(record.id, payload);
    else await h.create(payload);
  };

  const handleManualSave = async (payload) => {
    if (manualModal?.account?.id) {
      await updateCoaAccount(manualModal.account.id, payload);
    } else if (groupModal?.account?.id) {
      await updateCoaAccount(groupModal.account.id, payload);
    } else {
      await createCoaAccount(payload);
    }
  };

  const handleDelete = async (row) => {
    if (row.source === 'bank') return deleteBankLedger(row.source_id);
    if (row.source === 'cash') return deleteCashLedger(row.source_id);
    if (row.source === 'expense_head') return deleteExpenseHead(row.source_id);
    if (row.editable) return deleteCoaAccount(row.id);
    return false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="master-form" style={{ margin: 0 }}>
        <div className="table-header-row" style={{ marginBottom: 12 }}>
          <h3 className="form-section-title" style={{ margin: 0 }}>Chart of Accounts</h3>
          <button type="button" className="btn-secondary" onClick={() => setInstructionsOpen(true)}>Instructions</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" className={`sub-tab-btn ${view === 'ledgers' ? 'active' : ''}`} onClick={() => setView('ledgers')}>
            All Ledgers
          </button>
          <button type="button" className={`sub-tab-btn ${view === 'groups' ? 'active' : ''}`} onClick={() => setView('groups')}>
            Report Groupings
          </button>
        </div>

        {view === 'ledgers' && (
          <>
            <div className="table-header-row" style={{ marginBottom: 12 }}>
              <div className="form-grid-4" style={{ flex: 1, margin: 0 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <input
                    type="search"
                    className="form-input"
                    placeholder="Search name or code…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <select className="form-input" value={natureFilter} onChange={(e) => setNatureFilter(e.target.value)}>
                    <option value="">All natures</option>
                    {COA_NATURES.map((n) => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <select className="form-input" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                    <option value="">All sources</option>
                    {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                data-no-btn-spinner="true"
                onClick={() => setAddOpen(true)}
              >
                + Add Ledger
              </button>
            </div>

            <div className="table-card" style={{ padding: 0 }}>
              <div className="premium-table-wrapper">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Account Name</th>
                      <th>Nature</th>
                      <th>Ledger Type</th>
                      <th>Source</th>
                      <th>Opening</th>
                      <th>Report Group</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChart.map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontFamily: 'monospace' }}>{row.code}</td>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td style={{ textTransform: 'capitalize' }}>{row.account_type}</td>
                        <td style={{ fontSize: 12 }}>{row.account_subtype_label || '—'}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{SOURCE_LABELS[row.source] || row.source}</td>
                        <td>₹{formatINR(row.opening_balance || 0)}</td>
                        <td style={{ fontSize: 12 }}>
                          {row.report_group_id
                            ? groupNameById[row.report_group_id] || groupNameById[String(row.report_group_id)] || `Group #${row.report_group_id}`
                            : <span style={{ color: 'var(--accent-amber)' }}>Unmapped</span>}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="registry-actions">
                            <button type="button" className="btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => openEdit(row)}>
                              {row.editable || ['bank', 'cash', 'expense_head'].includes(row.source) ? 'Edit' : 'Assign group'}
                            </button>
                            {(row.editable || ['bank', 'cash', 'expense_head'].includes(row.source)) && (
                              <RecordDeleteButton label={row.name} onDelete={() => handleDelete(row)} size="sm" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredChart.length === 0 && (
                      <tr>
                        <td colSpan={8} className="empty-state">
                          No ledgers yet. Add bank, cash, expense heads or general ledgers to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {view === 'groups' && <ReportGroupMasterPanel />}
      </div>

      <CoaLedgerFormModal
        open={Boolean(legacyModal)}
        kind={legacyModal?.kind}
        record={legacyModal?.record}
        onClose={() => setLegacyModal(null)}
        onSave={handleLegacySave}
      />

      <CoaAccountFormModal
        open={Boolean(manualModal)}
        account={manualModal?.account}
        reportGroups={reportGroups}
        onClose={() => setManualModal(null)}
        onSave={handleManualSave}
      />

      <CoaAccountFormModal
        open={Boolean(groupModal)}
        account={groupModal?.account}
        reportGroups={reportGroups}
        groupOnly
        onClose={() => setGroupModal(null)}
        onSave={handleManualSave}
      />

      <AddLedgerPickerModal open={addOpen} onClose={() => setAddOpen(false)} onPick={openAdd} />

      <CoaInstructionsModal open={instructionsOpen} onClose={() => setInstructionsOpen(false)} />
    </div>
  );
}
