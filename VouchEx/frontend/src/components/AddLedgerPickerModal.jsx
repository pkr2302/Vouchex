import { Modal } from './portalShared';

const OPTIONS = [
  { kind: 'bank', label: 'Bank Account', hint: 'Savings, current, or forex bank ledger' },
  { kind: 'cash', label: 'Cash Account', hint: 'Petty cash or cash-in-hand' },
  { kind: 'expense_head', label: 'Expense Head', hint: 'Purchase / expense category for bills' },
  { kind: 'manual', label: 'Other General Ledger…', hint: 'Any other GL account (capital, loan, etc.)' },
];

export function AddLedgerPickerModal({ open, onClose, onPick }) {
  return (
    <Modal open={open} title="Add Ledger" onClose={onClose} width={420} variant="solid">
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 0, marginBottom: 12 }}>
        Choose the type of account you want to create:
      </p>
      {OPTIONS.map((opt) => (
        <button
          key={opt.kind}
          type="button"
          className="btn-secondary"
          style={{ display: 'block', width: '100%', marginBottom: 8, textAlign: 'left', padding: '10px 14px' }}
          onClick={() => {
            onPick(opt.kind);
            onClose();
          }}
        >
          <div style={{ fontWeight: 600 }}>{opt.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.hint}</div>
        </button>
      ))}
    </Modal>
  );
}
