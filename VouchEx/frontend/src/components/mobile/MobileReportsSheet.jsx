import { X, ChevronRight } from 'lucide-react';

const REPORT_LINKS = [
  { id: 'financials', label: 'Financial Statements', desc: 'P&L, Balance Sheet, Trial Balance' },
  { id: 'company-360', label: 'Company 360°', desc: 'KPIs and charts' },
  { id: 'ledgers', label: 'Ledgers', desc: 'Account-wise statements' },
  { id: 'day-book', label: 'Day Book', desc: 'All journal entries' },
  { id: 'sales-register', label: 'Sales Register', desc: 'GST sales register' },
  { id: 'purchase-register', label: 'Purchase Register', desc: 'GST purchase register' },
  { id: 'taxation', label: 'Taxation', desc: 'GSTR, TDS, compliance' },
  { id: 'debtors', label: 'Debtors', desc: 'Receivables & ageing' },
  { id: 'creditors', label: 'Creditors', desc: 'Payables & ageing' },
];

export default function MobileReportsSheet({ open, onClose, onNavigate }) {
  if (!open) return null;

  return (
    <div className="mobile-reports-sheet mobile-only" role="dialog" aria-modal="true" aria-label="Reports">
      <button type="button" className="mobile-reports-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="mobile-reports-sheet__panel">
        <div className="mobile-reports-sheet__header">
          <h3>Reports & Registers</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <ul className="mobile-reports-sheet__list">
          {REPORT_LINKS.map((link) => (
            <li key={link.id}>
              <button
                type="button"
                onClick={() => {
                  onNavigate(link.id);
                  onClose();
                }}
              >
                <div>
                  <strong>{link.label}</strong>
                  <span>{link.desc}</span>
                </div>
                <ChevronRight size={18} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
