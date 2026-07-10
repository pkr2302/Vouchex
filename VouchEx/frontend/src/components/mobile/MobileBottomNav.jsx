import {
  Home,
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
} from 'lucide-react';
import { MOBILE_BOTTOM_NAV, MOBILE_HOME_TAB, hubForTab } from '../../utils/mobileAppConfig';

const ICONS = {
  home: Home,
  sales: TrendingUp,
  buy: ShoppingBag,
  stock: Package,
  parties: Users,
};

export default function MobileBottomNav({ activeTab, onSelectHub }) {
  const activeHub = activeTab === MOBILE_HOME_TAB ? 'home' : hubForTab(activeTab);

  return (
    <nav className="mobile-bottom-nav mobile-only" aria-label="Main navigation">
      {MOBILE_BOTTOM_NAV.map((item) => {
        const Icon = ICONS[item.iconKey] || Home;
        const isActive = item.id === 'home'
          ? activeTab === MOBILE_HOME_TAB
          : activeHub === item.hub;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-bottom-nav__item${isActive ? ' mobile-bottom-nav__item--active' : ''}`}
            onClick={() => onSelectHub(item.hub)}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
