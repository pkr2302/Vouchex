import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  PieChart,
  BookOpen,
  Scale,
  Users,
  Truck,
  TrendingUp,
  RotateCcw,
  Receipt,
  ShoppingCart,
  Undo2,
  TrendingDown,
  CreditCard,
  Package,
  Factory,
  Percent,
  HandCoins,
  Building2,
  Wallet,
  BookText,
  CalendarDays,
  Wand2,
  Settings,
  ChevronRight,
} from 'lucide-react';

const STORAGE_KEY = 'vouchex.sidebar.groups.expanded';

const NAV_GROUPS = [
  {
    heading: 'Executive Summary',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'company-360', label: 'Company 360°', icon: PieChart },
      { id: 'coa', label: 'Chart of Accounts', icon: BookOpen },
      { id: 'financials', label: 'Financial Statements', icon: Scale },
    ],
  },
  {
    heading: 'Masters',
    items: [
      { id: 'customer-master', label: 'Customer Master', icon: Users },
      { id: 'vendor-master', label: 'Vendor Master', icon: Truck },
    ],
  },
  {
    heading: 'Income',
    items: [
      { id: 'sales', label: 'Sales', icon: TrendingUp },
      { id: 'sales-return', label: 'Sales Return', icon: RotateCcw },
      { id: 'receipt', label: 'Receipts', icon: Receipt },
      { id: 'debtors', label: 'Debtors', icon: HandCoins },
    ],
  },
  {
    heading: 'Expenses',
    items: [
      { id: 'purchase', label: 'Purchase', icon: ShoppingCart },
      { id: 'purchase-return', label: 'Purchase Return', icon: Undo2 },
      { id: 'expense', label: 'Expenses', icon: TrendingDown },
      { id: 'payment', label: 'Payments', icon: CreditCard },
      { id: 'creditors', label: 'Creditors', icon: Building2 },
    ],
  },
  {
    heading: 'Cash & Bank',
    items: [
      { id: 'cash-bank', label: 'Cash & Bank', icon: Wallet },
    ],
  },
  {
    heading: 'Inventory',
    items: [
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'consumption', label: 'Consumption', icon: Factory },
    ],
  },
  {
    heading: 'Registers',
    items: [
      { id: 'ledgers', label: 'Ledgers', icon: BookText },
      { id: 'day-book', label: 'Day Book', icon: CalendarDays },
      { id: 'sales-register', label: 'Sales Register', icon: TrendingUp },
      { id: 'purchase-register', label: 'Purchase Register', icon: ShoppingCart },
      { id: 'misc-entries', label: 'Misc Entries', icon: Wand2 },
    ],
  },
  {
    heading: 'Taxation',
    items: [{ id: 'taxation', label: 'Taxation', icon: Percent }],
  },
  {
    heading: 'Settings',
    items: [{ id: 'settings', label: 'Settings', icon: Settings }],
  },
];

function defaultExpandedState() {
  const state = {};
  NAV_GROUPS.forEach((g) => {
    state[g.heading] = true;
  });
  return state;
}

function loadExpandedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultExpandedState();
    const parsed = JSON.parse(raw);
    const merged = defaultExpandedState();
    NAV_GROUPS.forEach((g) => {
      if (typeof parsed[g.heading] === 'boolean') {
        merged[g.heading] = parsed[g.heading];
      }
    });
    return merged;
  } catch {
    return defaultExpandedState();
  }
}

function groupSlug(heading) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function TAB_TITLES() {
  const map = {};
  NAV_GROUPS.forEach((g) => g.items.forEach((i) => { map[i.id] = i.label; }));
  return map;
}

export default function SidebarNav({ activeTab, setActiveTab }) {
  const [expanded, setExpanded] = useState(loadExpandedState);

  const activeGroupHeading = useMemo(
    () => NAV_GROUPS.find((g) => g.items.some((i) => i.id === activeTab))?.heading ?? null,
    [activeTab]
  );

  useEffect(() => {
    if (!activeGroupHeading) return;
    setExpanded((prev) => {
      if (prev[activeGroupHeading]) return prev;
      const next = { ...prev, [activeGroupHeading]: true };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [activeGroupHeading]);

  const toggleGroup = useCallback((heading) => {
    setExpanded((prev) => {
      const next = { ...prev, [heading]: !prev[heading] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ul className="sidebar-menu sidebar-menu--grouped">
      {NAV_GROUPS.map((group) => {
        const isExpanded = expanded[group.heading] !== false;
        const hasActiveChild = group.items.some((i) => i.id === activeTab);
        const panelId = `sidebar-group-${groupSlug(group.heading)}`;

        return (
          <li
            key={group.heading}
            className={[
              'sidebar-group',
              isExpanded ? 'sidebar-group--expanded' : 'sidebar-group--collapsed',
              hasActiveChild ? 'sidebar-group--has-active' : '',
            ].filter(Boolean).join(' ')}
          >
            <button
              type="button"
              className="sidebar-group-heading"
              onClick={() => toggleGroup(group.heading)}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              title={isExpanded ? `Collapse ${group.heading}` : `Expand ${group.heading}`}
            >
              <span className="sidebar-group-chevron" aria-hidden="true">
                <ChevronRight size={14} strokeWidth={2.5} />
              </span>
              <span className="sidebar-group-label">{group.heading}</span>
              {hasActiveChild && !isExpanded && (
                <span className="sidebar-group-active-dot" aria-hidden="true" />
              )}
            </button>
            <ul id={panelId} className="sidebar-group-items">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id} className="menu-item">
                    <a
                      href="#"
                      className={`menu-link ${activeTab === item.id ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab(item.id);
                      }}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
