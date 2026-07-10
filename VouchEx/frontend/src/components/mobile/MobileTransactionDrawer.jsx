import { useEffect } from 'react';
import {
  FileText,
  RotateCcw,
  Receipt,
  ShoppingCart,
  Undo2,
  TrendingDown,
  CreditCard,
  Users,
  Truck,
  Package,
  Factory,
  Plus,
  List,
  ChevronRight,
  X,
} from 'lucide-react';
import { VouchExBrand } from '../VouchExBrand';
import {
  MOBILE_RECORD_GROUPS,
  MOBILE_BROWSE_GROUPS,
  MOBILE_HOME_TAB,
} from '../../utils/mobileAppConfig';

const ICONS = {
  sales: FileText,
  'sales-return': RotateCcw,
  receipt: Receipt,
  purchase: ShoppingCart,
  'purchase-return': Undo2,
  expense: TrendingDown,
  payment: CreditCard,
  customer: Users,
  vendor: Truck,
  inventory: Package,
  consumption: Factory,
};

export default function MobileTransactionDrawer({ open, onClose, onNavigate, userName }) {
  useEffect(() => {
    const root = document.documentElement;
    if (open) {
      root.classList.add('nav-scroll-lock');
    } else {
      root.classList.remove('nav-scroll-lock');
    }
    return () => root.classList.remove('nav-scroll-lock');
  }, [open]);

  if (!open) return null;

  const handleAction = (item) => {
    onNavigate?.(item.tab, item.openForm ? { openForm: true } : undefined);
    onClose?.();
  };

  return (
    <div className="mobile-tx-drawer mobile-only" role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" className="mobile-tx-drawer__backdrop" onClick={onClose} aria-label="Close menu" />
      <aside className="mobile-tx-drawer__panel">
        <div className="mobile-tx-drawer__head">
          <VouchExBrand variant="mobile-drawer" />
          <button type="button" className="mobile-tx-drawer__close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        {userName && (
          <p className="mobile-tx-drawer__user">Hi, {userName.split(' ')[0]}</p>
        )}

        <div className="mobile-tx-drawer__body">
          {MOBILE_RECORD_GROUPS.map((group) => (
            <section key={group.id} className="mobile-tx-drawer__section">
              <h4 className="mobile-tx-drawer__section-title">{group.title}</h4>
              <p className="mobile-tx-drawer__section-sub">{group.subtitle}</p>
              <ul className="mobile-tx-drawer__list">
                {group.items.map((item) => {
                  const Icon = ICONS[item.id] || FileText;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`mobile-tx-drawer__row${item.primary ? ' mobile-tx-drawer__row--primary' : ''}`}
                        onClick={() => handleAction(item)}
                      >
                        <span className="mobile-tx-drawer__row-icon"><Icon size={18} /></span>
                        <span className="mobile-tx-drawer__row-text">
                          <strong>{item.label}</strong>
                          <small>{item.desc}</small>
                        </span>
                        {item.openForm ? <Plus size={16} className="mobile-tx-drawer__row-action" /> : <ChevronRight size={16} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <section className="mobile-tx-drawer__section">
            <h4 className="mobile-tx-drawer__section-title">Browse records</h4>
            <p className="mobile-tx-drawer__section-sub">View & edit what you already entered</p>
            <ul className="mobile-tx-drawer__list mobile-tx-drawer__list--compact">
              {MOBILE_BROWSE_GROUPS.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    className="mobile-tx-drawer__row mobile-tx-drawer__row--browse"
                    onClick={() => {
                      onNavigate?.(group.tab);
                      onClose?.();
                    }}
                  >
                    <span className="mobile-tx-drawer__row-icon"><List size={18} /></span>
                    <span className="mobile-tx-drawer__row-text">
                      <strong>{group.label}</strong>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            className="mobile-tx-drawer__home-link"
            onClick={() => {
              onNavigate?.(MOBILE_HOME_TAB);
              onClose?.();
            }}
          >
            Back to Quick Record home
          </button>
        </div>
      </aside>
    </div>
  );
}
