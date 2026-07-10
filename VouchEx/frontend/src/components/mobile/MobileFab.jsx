import { useState } from 'react';
import {
  Plus,
  FileText,
  RotateCcw,
  Receipt,
  ShoppingCart,
  Undo2,
  TrendingDown,
  CreditCard,
  UserPlus,
  Truck,
  Package,
  Factory,
  X,
} from 'lucide-react';

const CREATE_ACTIONS = [
  { id: 'sales', label: 'Sales Invoice', icon: FileText, tab: 'sales', desc: 'Raise new invoice' },
  { id: 'sales-return', label: 'Sales Return', icon: RotateCcw, tab: 'sales-return', desc: 'Credit note' },
  { id: 'receipt', label: 'Receipt', icon: Receipt, tab: 'receipt', desc: 'Customer collection' },
  { id: 'purchase', label: 'Purchase Bill', icon: ShoppingCart, tab: 'purchase', desc: 'Record purchase' },
  { id: 'purchase-return', label: 'Purchase Return', icon: Undo2, tab: 'purchase-return', desc: 'Debit note' },
  { id: 'expense', label: 'Expense', icon: TrendingDown, tab: 'expense', desc: 'Record expense' },
  { id: 'payment', label: 'Payment', icon: CreditCard, tab: 'payment', desc: 'Vendor payment' },
  { id: 'customer', label: 'Customer', icon: UserPlus, tab: 'customer-master', desc: 'Add customer' },
  { id: 'vendor', label: 'Vendor', icon: Truck, tab: 'vendor-master', desc: 'Add vendor' },
  { id: 'inventory', label: 'Stock Item', icon: Package, tab: 'inventory', desc: 'Add inventory' },
  { id: 'consumption', label: 'Consumption', icon: Factory, tab: 'consumption', desc: 'Stock usage' },
];

export default function MobileFab({ onNavigate, forceOpen, onForceClose }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  const close = () => {
    setOpen(false);
    onForceClose?.();
  };

  const handleAction = (action) => {
    onNavigate?.(action.tab, { openForm: 'add' });
    close();
  };

  return (
    <>
      {isOpen && (
        <div className="mobile-fab-backdrop mobile-only" onClick={close} aria-hidden="true" />
      )}
      <div className={`mobile-fab-menu mobile-only${isOpen ? ' mobile-fab-menu--open' : ''}`}>
        {CREATE_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              className="mobile-fab-menu__item"
              style={{ '--fab-delay': `${i * 35}ms` }}
              onClick={() => handleAction(action)}
            >
              <span className="mobile-fab-menu__icon"><Icon size={18} /></span>
              <span className="mobile-fab-menu__text">
                <strong>{action.label}</strong>
                <small>{action.desc}</small>
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`mobile-fab mobile-only${isOpen ? ' mobile-fab--open' : ''}`}
        aria-label={isOpen ? 'Close create menu' : 'Record transaction'}
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : setOpen(true))}
      >
        {isOpen ? <X size={26} /> : <Plus size={26} strokeWidth={2.5} />}
      </button>
    </>
  );
}
