import { Plus, Receipt, TrendingDown, CreditCard, ShoppingCart, Users, Truck } from 'lucide-react';
import { queuePortalFormIntent } from '../utils/portalFormIntent';

export default function DashboardQuickActions({ setActiveTab }) {
  if (!setActiveTab) return null;

  const goToTabWithAddForm = (tabId) => {
    queuePortalFormIntent(tabId, 'add');
    setActiveTab(tabId);
  };

  const actions = [
    { key: 'invoice', label: 'Add Sales Invoice', icon: Plus, onClick: () => setActiveTab('sales') },
    { key: 'purchase', label: 'Add Purchase Invoice', icon: ShoppingCart, onClick: () => setActiveTab('purchase') },
    { key: 'receipt', label: 'Add Receipt', icon: Receipt, onClick: () => setActiveTab('receipt') },
    { key: 'expense', label: 'Record Expense', icon: TrendingDown, onClick: () => setActiveTab('expense') },
    { key: 'payment', label: 'Add Payment', icon: CreditCard, onClick: () => setActiveTab('payment') },
    { key: 'customer', label: 'Add Customer Profile', icon: Users, onClick: () => goToTabWithAddForm('customer-master') },
    { key: 'vendor', label: 'Add Vendor Profile', icon: Truck, onClick: () => goToTabWithAddForm('vendor-master') },
  ];

  return (
    <div className="dashboard-quick-actions">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button key={action.key} type="button" className="dashboard-quick-actions__btn" onClick={action.onClick}>
            <span className="dashboard-quick-actions__icon">
              <Icon size={15} />
            </span>
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
