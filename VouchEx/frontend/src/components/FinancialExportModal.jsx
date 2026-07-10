import { Modal } from './portalShared';

export function FinancialExportModal({
  open,
  onClose,
  title,
  showComparativeOptions = false,
  includeNotesOption = false,
  exportCurrent,
  exportPrevious,
  includeNotes,
  onExportCurrentChange,
  onExportPreviousChange,
  onIncludeNotesChange,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <Modal open={open} title={title || 'Export options'} onClose={onClose} width={420} variant="solid">
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        Choose which columns to include in the export.
      </p>
      {showComparativeOptions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={exportCurrent} onChange={(e) => onExportCurrentChange(e.target.checked)} />
            Current year figures
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={exportPrevious} onChange={(e) => onExportPreviousChange(e.target.checked)} />
            Previous year figures
          </label>
        </div>
      )}
      {includeNotesOption && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 16 }}>
          <input type="checkbox" checked={includeNotes} onChange={(e) => onIncludeNotesChange(e.target.checked)} />
          Include Notes to Accounts
        </label>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn-primary"
          onClick={onConfirm}
          disabled={showComparativeOptions && !exportCurrent && !exportPrevious}
        >
          Export
        </button>
      </div>
    </Modal>
  );
}
