import { Modal } from './portalShared';
import { formatDateDDMMYYYY } from '../utils/formatMoney';
import { formatINR } from '../utils/formatMoney';

export function PartyLedgerModal({ open, onClose, party, partyType, ledgerRows = [] }) {
  if (!party) return null;

  const totalDebit = ledgerRows.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredit = ledgerRows.reduce((s, r) => s + (r.credit || 0), 0);
  const closing =
    ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].running_balance : 0;
  const isDebtor = partyType === 'customer';

  return (
    <Modal open={open} title={`${isDebtor ? 'Debtor' : 'Creditor'} Ledger — ${party.name}`} onClose={onClose} width={920} variant="solid">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="table-card" style={{ padding: 12, margin: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Debit</div>
          <div style={{ fontWeight: 700 }}>₹{formatINR(totalDebit)}</div>
        </div>
        <div className="table-card" style={{ padding: 12, margin: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Credit</div>
          <div style={{ fontWeight: 700 }}>₹{formatINR(totalCredit)}</div>
        </div>
        <div className="table-card" style={{ padding: 12, margin: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isDebtor ? 'Outstanding (Dr)' : 'Payable (Cr)'}</div>
          <div style={{ fontWeight: 700, color: closing > 0 ? 'var(--accent-amber)' : 'var(--accent-teal)' }}>
            ₹{formatINR(closing)}
          </div>
        </div>
      </div>

      <div className="premium-table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Ref</th>
              <th style={{ textAlign: 'right' }}>Debit</th>
              <th style={{ textAlign: 'right' }}>Credit</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledgerRows.map((row, idx) => (
              <tr key={`${row.reference}-${idx}`}>
                <td>{formatDateDDMMYYYY(row.date)}</td>
                <td>{row.description}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.reference}</td>
                <td style={{ textAlign: 'right' }}>{row.debit > 0 ? `₹${formatINR(row.debit)}` : '—'}</td>
                <td style={{ textAlign: 'right' }}>{row.credit > 0 ? `₹${formatINR(row.credit)}` : '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{formatINR(row.running_balance)}</td>
              </tr>
            ))}
            {ledgerRows.length === 0 && (
              <tr><td colSpan={6} className="empty-state">No ledger entries for this party.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
