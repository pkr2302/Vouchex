import { useEffect, useMemo, useState } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Modal, Req, Opt } from './portalShared';
import { STATEMENT_TYPES, flattenReportGroups } from '../utils/coaCatalog';
import { frameworkByValue } from '../utils/accountingFramework';
import { showApiError } from '../utils/apiErrors';
import { RecordDeleteButton } from './RecordDeleteButton';

const DRAG_TYPE = 'application/vnd.vouchex.gl-account';

function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function InstructionsModal({ open, onClose, framework }) {
  return (
    <Modal open={open} title="How to set up report groups" onClose={onClose} width={640} variant="solid">
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)' }}>
        <p style={{ marginTop: 0 }}>
          Financial reports (Balance Sheet and Profit &amp; Loss) are shown under <strong>headings</strong>, not as one long list.
          You decide which heading each ledger belongs under.
        </p>
        <ol style={{ paddingLeft: 20, margin: '0 0 16px' }}>
          <li style={{ marginBottom: 10 }}>
            In <strong>Settings → Company Profile</strong>, set <strong>Accounting framework</strong> to AS or Ind AS (ask your accountant if unsure).
            Current setting: <strong>{framework.label}</strong>.
          </li>
          <li style={{ marginBottom: 10 }}>
            Click <strong>Load report group template</strong> to add a standard heading structure, or <strong>Add Group</strong> to create your own.
          </li>
          <li style={{ marginBottom: 10 }}>
            Click <strong>Automatic Map</strong> to place obvious ledgers (bank → Bank balances, customers → Trade receivables, etc.).
            Anything unclear stays in the unmapped list for you to finish.
          </li>
          <li style={{ marginBottom: 10 }}>
            For the rest: <strong>drag</strong> a ledger from the right panel and <strong>drop</strong> it on a group in the tree,
            or <strong>tick several ledgers</strong>, click a group in the tree, then <strong>Map selected to this group</strong>.
          </li>
          <li style={{ marginBottom: 10 }}>
            To <strong>remove</strong> a ledger from a group: click <strong>Unmap</strong> in the middle panel, or
            <strong> drag</strong> it from the middle panel back to the unmapped list on the right.
          </li>
          <li>
            Click a group in the tree to see all ledgers already placed under it in the middle panel.
          </li>
        </ol>
      </div>
    </Modal>
  );
}

function AutoMapResultModal({ open, onClose, result }) {
  if (!result) return null;
  const mapped = result.mapped || [];
  const skipped = result.skipped || [];
  return (
    <Modal open={open} title="Automatic mapping result" onClose={onClose} width={620} variant="solid">
      <p style={{ marginTop: 0, fontSize: 14 }}>
        <strong>{mapped.length}</strong> ledger(s) mapped automatically.
        {skipped.length > 0 && (
          <> <strong>{skipped.length}</strong> still need your decision (listed below).</>
        )}
      </p>
      {mapped.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 13 }}>Mapped</h5>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, maxHeight: 160, overflow: 'auto' }}>
            {mapped.map((row) => (
              <li key={row.gl_account_id}>{row.code} — {row.name} → {row.report_group_name}</li>
            ))}
          </ul>
        </div>
      )}
      {skipped.length > 0 && (
        <div>
          <h5 style={{ margin: '0 0 8px', fontSize: 13 }}>Still unmapped</h5>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
            {skipped.map((row) => (
              <li key={row.gl_account_id}>{row.code} — {row.name}: {row.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

function GroupTreeNode({
  node,
  depth,
  selectedId,
  dropTargetId,
  onSelect,
  onEdit,
  onDelete,
  onDropAccount,
  onDragEnterGroup,
}) {
  const isSelected = sameId(selectedId, node.id);
  const isDropTarget = sameId(dropTargetId, node.id);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    onDragEnterGroup(node.id);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    try {
      const { id } = JSON.parse(raw);
      if (id) onDropAccount(id, node.id);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => e.key === 'Enter' && onSelect(node.id)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          paddingLeft: 8 + depth * 16,
          borderRadius: 6,
          cursor: 'pointer',
          background: isDropTarget
            ? 'var(--accent-teal-soft)'
            : isSelected
              ? 'rgba(45, 212, 191, 0.15)'
              : 'transparent',
          border: isDropTarget ? '2px dashed var(--accent-teal)' : '2px solid transparent',
          marginBottom: 2,
          transition: 'background 0.15s, border 0.15s',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: depth === 0 ? 700 : 500 }}>{node.name}</span>
        <div className="registry-actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => onEdit(node)}>Edit</button>
          {!node.is_system && (
            <RecordDeleteButton label={node.name} onDelete={() => onDelete(node.id)} size="sm" />
          )}
        </div>
      </div>
      {(node.children || []).map((child) => (
        <GroupTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          dropTargetId={dropTargetId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onDropAccount={onDropAccount}
          onDragEnterGroup={onDragEnterGroup}
        />
      ))}
    </>
  );
}

function GroupFormModal({ open, onClose, group, parentOptions, onSave }) {
  const [form, setForm] = useState({
    name: '',
    parent_id: '',
    code: '',
    statement_type: 'balance_sheet',
    nature: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: group?.name || '',
      parent_id: group?.parent_id || '',
      code: group?.code || '',
      statement_type: group?.statement_type || 'balance_sheet',
      nature: group?.nature || '',
    });
  }, [open, group]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Group name is required.');
    setBusy(true);
    try {
      await onSave({
        name: form.name.trim(),
        parent_id: form.parent_id || null,
        code: form.code.trim() || null,
        statement_type: form.statement_type,
        nature: form.nature || null,
      });
      onClose();
    } catch (err) {
      showApiError(group ? 'Updating group' : 'Creating group', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={group ? 'Edit Report Group' : 'Add Report Group'} onClose={onClose} width={520} variant="solid">
      <form onSubmit={handleSubmit} className="master-form" style={{ margin: 0 }}>
        <div className="form-group">
          <Req>Group Name</Req>
          <input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} disabled={busy} />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <Opt>Parent Group</Opt>
            <select className="form-input" value={form.parent_id} onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value }))} disabled={busy}>
              <option value="">— Top level —</option>
              {parentOptions.filter((g) => !sameId(g.id, group?.id)).map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <Opt>Code</Opt>
            <input className="form-input" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} disabled={busy} />
          </div>
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <Req>Statement</Req>
            <select className="form-input" value={form.statement_type} onChange={(e) => setForm((p) => ({ ...p, statement_type: e.target.value }))} disabled={busy}>
              {STATEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <Opt>Nature</Opt>
            <select className="form-input" value={form.nature} onChange={(e) => setForm((p) => ({ ...p, nature: e.target.value }))} disabled={busy}>
              <option value="">Heading / neutral</option>
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
        </div>
        <div className="btn-row">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>Save</button>
        </div>
      </form>
    </Modal>
  );
}

function DraggableAccount({ account, selected, onToggle, onDragStart, onDragEnd }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, account)}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        padding: '8px 10px',
        marginBottom: 6,
        borderRadius: 8,
        border: selected ? '2px solid var(--accent-teal)' : '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        cursor: 'grab',
        fontSize: 12,
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(account.id)}
        style={{ marginTop: 4 }}
        onClick={(e) => e.stopPropagation()}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{account.code}</div>
        <div style={{ marginTop: 2 }}>{account.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{account.account_subtype_label}</div>
      </div>
    </div>
  );
}

export function ReportGroupMasterPanel() {
  const {
    coaChart,
    reportGroups,
    companyDetails,
    createReportGroup,
    updateReportGroup,
    deleteReportGroup,
    loadReportGroupTemplate,
    assignCoaReportGroups,
    autoMapCoaReportGroups,
  } = useSimulator();

  const framework = frameworkByValue(companyDetails?.accounting_framework || 'AS');

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupModal, setGroupModal] = useState(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [autoMapResult, setAutoMapResult] = useState(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [unmapDropActive, setUnmapDropActive] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [autoMapBusy, setAutoMapBusy] = useState(false);

  const flatGroups = useMemo(() => flattenReportGroups(reportGroups), [reportGroups]);
  const groupNameById = useMemo(() => {
    const map = {};
    flatGroups.forEach((g) => { map[g.id] = g.name; });
    return map;
  }, [flatGroups]);

  const accountsInGroup = useMemo(() => {
    if (selectedGroupId == null) return [];
    return coaChart.filter((a) => sameId(a.report_group_id, selectedGroupId));
  }, [coaChart, selectedGroupId]);

  const unmappedAccounts = useMemo(
    () => coaChart.filter((a) => !a.report_group_id),
    [coaChart]
  );

  const toggleAccount = (id) => {
    setSelectedAccountIds((prev) =>
      prev.some((x) => sameId(x, id)) ? prev.filter((x) => !sameId(x, id)) : [...prev, id]
    );
  };

  const assignAccountsToGroup = async (accountIds, reportGroupId) => {
    if (!accountIds.length) return;
    setAssignBusy(true);
    setDropTargetId(null);
    setUnmapDropActive(false);
    try {
      await assignCoaReportGroups(
        accountIds.map((gl_account_id) => ({ gl_account_id, report_group_id: reportGroupId }))
      );
      setSelectedGroupId(reportGroupId);
      setSelectedAccountIds((prev) => prev.filter((id) => !accountIds.some((aid) => sameId(aid, id))));
    } catch (err) {
      showApiError('Mapping ledger to group', err);
    } finally {
      setAssignBusy(false);
      setDraggingId(null);
    }
  };

  const unmapAccounts = async (accountIds) => {
    if (!accountIds.length) return;
    setAssignBusy(true);
    setDropTargetId(null);
    setUnmapDropActive(false);
    try {
      await assignCoaReportGroups(
        accountIds.map((gl_account_id) => ({ gl_account_id, report_group_id: null }))
      );
      setSelectedAccountIds((prev) => prev.filter((id) => !accountIds.some((aid) => sameId(aid, id))));
    } catch (err) {
      showApiError('Unmapping ledger from group', err);
    } finally {
      setAssignBusy(false);
      setDraggingId(null);
    }
  };

  const assignSelectedToGroup = () => {
    if (!selectedGroupId) return alert('Click a group in the tree first.');
    if (!selectedAccountIds.length) return alert('Select at least one unmapped ledger.');
    assignAccountsToGroup(selectedAccountIds, selectedGroupId);
  };

  const handleDragStartUnmapped = (e, account) => {
    setDraggingId(account.id);
    const ids = selectedAccountIds.some((x) => sameId(x, account.id)) && selectedAccountIds.length > 0
      ? selectedAccountIds
      : [account.id];
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ id: account.id, ids, source: 'unmapped' }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartMapped = (e, account) => {
    setDraggingId(account.id);
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ id: account.id, ids: [account.id], source: 'mapped' }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDropTargetId(null);
    setUnmapDropActive(false);
  };

  const handleDropOnGroup = (accountId, groupId) => {
    const raw = typeof accountId === 'object' ? null : accountId;
    const ids = selectedAccountIds.some((x) => sameId(x, raw)) && selectedAccountIds.length > 0
      ? selectedAccountIds
      : [raw];
    assignAccountsToGroup(ids, groupId);
  };

  const handleDropOnUnmapped = (e) => {
    e.preventDefault();
    setUnmapDropActive(false);
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    try {
      const { id, ids, source } = JSON.parse(raw);
      if (source === 'mapped') {
        unmapAccounts(ids?.length ? ids : [id]);
      }
    } catch {
      /* ignore */
    }
  };

  const handleUnmapClick = (accountId) => {
    if (!window.confirm('Remove this ledger from the report group? It will return to the unmapped list.')) return;
    unmapAccounts([accountId]);
  };

  const handleLoadTemplate = async () => {
    const label = framework.label;
    if (!window.confirm(`Load the standard report group structure for ${label}?\n\nThis only works when you have no groups yet.`)) return;
    try {
      await loadReportGroupTemplate(framework.template);
    } catch (err) {
      showApiError('Loading template', err);
    }
  };

  const handleAutoMap = async () => {
    if (!reportGroups.length) {
      return alert('Load a report group template or add groups before using Automatic Map.');
    }
    setAutoMapBusy(true);
    try {
      const res = await autoMapCoaReportGroups();
      setAutoMapResult(res.auto_map);
    } catch (err) {
      showApiError('Automatic mapping', err);
    } finally {
      setAutoMapBusy(false);
    }
  };

  const saveGroup = async (payload) => {
    if (groupModal?.group) {
      await updateReportGroup(groupModal.group.id, payload);
    } else {
      await createReportGroup({
        ...payload,
        parent_id: groupModal?.parentId || payload.parent_id,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="table-header-row">
        <h4 className="quick-login-title" style={{ margin: 0 }}>Report Group Master</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={() => setInstructionsOpen(true)}>Instructions</button>
          <button type="button" className="btn-secondary" onClick={handleLoadTemplate}>
            Load template ({companyDetails?.accounting_framework === 'IND_AS' ? 'Ind AS' : 'AS'})
          </button>
          <button type="button" className="btn-secondary" onClick={handleAutoMap} disabled={autoMapBusy}>
            {autoMapBusy ? 'Mapping…' : 'Automatic Map'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setGroupModal({ parentId: selectedGroupId })}
          >
            Add Group
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(280px, 1.1fr) minmax(220px, 0.9fr)', gap: 16 }}>
        <div className="table-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 13 }}>Group tree — drop ledgers here</h5>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 400, paddingRight: 4 }}>
            {!reportGroups.length && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No groups yet. Load a template or add a group.</p>
            )}
            {reportGroups.map((node) => (
              <GroupTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedGroupId}
                dropTargetId={dropTargetId}
                onSelect={setSelectedGroupId}
                onEdit={(g) => setGroupModal({ group: g })}
                onDelete={deleteReportGroup}
                onDropAccount={handleDropOnGroup}
                onDragEnterGroup={setDropTargetId}
              />
            ))}
          </div>
        </div>

        <div className="table-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          <h5 style={{ margin: '0 0 8px', fontSize: 13 }}>
            {selectedGroupId != null
              ? `Ledgers in “${groupNameById[selectedGroupId] || 'group'}” (${accountsInGroup.length})`
              : 'Click a group to see mapped ledgers'}
          </h5>
          {selectedGroupId != null && (
            <>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>
                Drag a row back to the unmapped list, or click Unmap.
              </p>
              {selectedAccountIds.length > 0 && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ marginBottom: 8, width: '100%' }}
                  disabled={assignBusy}
                  onClick={assignSelectedToGroup}
                >
                  Map {selectedAccountIds.length} selected to this group
                </button>
              )}
              <div className="premium-table-wrapper" style={{ flex: 1, overflowY: 'auto', maxHeight: 340 }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Account</th>
                      <th>Type</th>
                      <th style={{ width: 80 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {accountsInGroup.map((a) => (
                      <tr
                        key={a.id}
                        draggable
                        onDragStart={(e) => handleDragStartMapped(e, a)}
                        onDragEnd={handleDragEnd}
                        style={{ cursor: 'grab', opacity: sameId(draggingId, a.id) ? 0.5 : 1 }}
                      >
                        <td>{a.code}</td>
                        <td>{a.name}</td>
                        <td>{a.account_subtype_label}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: 11, padding: '2px 8px' }}
                            disabled={assignBusy}
                            onClick={() => handleUnmapClick(a.id)}
                          >
                            Unmap
                          </button>
                        </td>
                      </tr>
                    ))}
                    {accountsInGroup.length === 0 && (
                      <tr><td colSpan={4} className="empty-state">No ledgers here yet — drag or map selected ledgers.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {assignBusy && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Saving mapping…</p>
          )}
        </div>

        <div
          className="table-card"
          style={{
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 420,
            outline: unmapDropActive ? '2px dashed var(--accent-teal)' : undefined,
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setUnmapDropActive(true);
          }}
          onDragLeave={() => setUnmapDropActive(false)}
          onDrop={handleDropOnUnmapped}
        >
          <h5 style={{ margin: '0 0 4px', fontSize: 13 }}>Unmapped ledgers ({unmappedAccounts.length})</h5>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px' }}>
            Drag onto a group, or drop mapped ledgers here to unmap.
          </p>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 360, opacity: draggingId ? 0.85 : 1 }}>
            {unmappedAccounts.map((a) => (
              <DraggableAccount
                key={a.id}
                account={a}
                selected={selectedAccountIds.some((x) => sameId(x, a.id))}
                onToggle={toggleAccount}
                onDragStart={handleDragStartUnmapped}
                onDragEnd={handleDragEnd}
              />
            ))}
            {unmappedAccounts.length === 0 && (
              <p className="empty-state" style={{ fontSize: 12 }}>All ledgers are mapped — drop here to unmap.</p>
            )}
          </div>
        </div>
      </div>

      <InstructionsModal open={instructionsOpen} onClose={() => setInstructionsOpen(false)} framework={framework} />
      <AutoMapResultModal open={Boolean(autoMapResult)} onClose={() => setAutoMapResult(null)} result={autoMapResult} />
      <GroupFormModal
        open={Boolean(groupModal)}
        group={groupModal?.group}
        parentOptions={flatGroups}
        onClose={() => setGroupModal(null)}
        onSave={saveGroup}
      />
    </div>
  );
}
