import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { showApiError } from '../utils/apiErrors';

export function RecordDeleteButton({ label, onDelete, disabled = false, size = 'sm' }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (disabled || busy) return;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await onDelete();
    } catch (err) {
      showApiError(`Deleting ${label}`, err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`btn-danger-outline ${size === 'sm' ? 'btn-danger-sm' : ''} ${busy ? 'btn-submitting' : ''}`}
      onClick={handleClick}
      disabled={disabled || busy}
      title={`Delete ${label}`}
    >
      <Trash2 size={12} />
      Delete
    </button>
  );
}
