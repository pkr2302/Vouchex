import React, { useState } from 'react';
import { RecordDeleteButton } from './RecordDeleteButton';
import { showApiError } from '../utils/apiErrors';

export function CoaLedgerRow({ record, onUpdate, onDelete, accentColor }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(record.name);
  const [busy, setBusy] = useState(false);

  const startEdit = () => {
    setDraft(record.name);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(record.name);
    setEditing(false);
  };

  const saveEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return alert('Enter a ledger name.');
    if (trimmed === record.name) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onUpdate(record.id, trimmed);
      setEditing(false);
    } catch (err) {
      showApiError('Updating chart of accounts ledger', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li
      style={{
        padding: '8px 12px',
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
      {editing ? (
        <>
          <input
            type="text"
            className="form-input"
            style={{ padding: '6px 10px', fontSize: '12px', flex: '1 1 120px', minWidth: 0 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
          />
          <button type="button" className="btn-primary" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={saveEdit} disabled={busy}>
            Save
          </button>
          <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={cancelEdit} disabled={busy}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <span style={{ flex: '1 1 auto', minWidth: 0 }}>{record.name}</span>
          <div className="registry-actions" style={{ marginLeft: 'auto' }}>
            <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: '11px' }} onClick={startEdit}>
              Edit
            </button>
            <RecordDeleteButton label={record.name} onDelete={() => onDelete(record.id)} size="sm" />
          </div>
        </>
      )}
    </li>
  );
}
