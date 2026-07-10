import { useMemo, useEffect } from 'react';
import { useSimulator } from '../../context/SimulatorContext';
import { trackTabVisit } from '../../hooks/useRecentRecords';
import { MOBILE_HOME_TAB, defaultTabForHub } from '../../utils/mobileAppConfig';
import MobileBottomNav from './MobileBottomNav';
import MobileGlobalSearch from './MobileGlobalSearch';
import MobileNotificationsPanel from './MobileNotificationsPanel';
import MobileSettingsSheet from './MobileSettingsSheet';
import MobileTransactionDrawer from './MobileTransactionDrawer';

export default function MobilePortalShell({
  activeTab,
  navigateTab,
  notificationsOpen,
  setNotificationsOpen,
  notifications = [],
  searchOpen,
  setSearchOpen,
  drawerOpen,
  setDrawerOpen,
  settingsOpen,
  setSettingsOpen,
  onOpenSettingsSection,
  userName,
}) {
  const sim = useSimulator();

  useEffect(() => {
    if (activeTab && activeTab !== MOBILE_HOME_TAB) {
      trackTabVisit(activeTab, activeTab);
    }
  }, [activeTab]);

  const searchData = useMemo(
    () => ({
      customers: sim.customers,
      vendors: sim.vendors,
      invoices: sim.invoices,
      expenses: sim.expenses,
      receipts: sim.receipts,
      payments: sim.payments,
      inventory: sim.inventory,
      companyDetails: sim.companyDetails,
      creditNotes: sim.creditNotes,
      debitNotes: sim.debitNotes,
      coaChart: [],
      mobileMode: true,
    }),
    [
      sim.customers,
      sim.vendors,
      sim.invoices,
      sim.expenses,
      sim.receipts,
      sim.payments,
      sim.inventory,
      sim.companyDetails,
      sim.creditNotes,
      sim.debitNotes,
    ]
  );

  const handleSelectHub = (hubKey) => {
    if (hubKey === MOBILE_HOME_TAB) {
      navigateTab(MOBILE_HOME_TAB);
      return;
    }
    navigateTab(defaultTabForHub(hubKey));
  };

  return (
    <div className="mobile-portal-shell mobile-only">
      <MobileBottomNav activeTab={activeTab} onSelectHub={handleSelectHub} />

      <MobileTransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={navigateTab}
        userName={userName}
      />

      <MobileGlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigateTab}
        data={searchData}
      />

      <MobileSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenSettings={onOpenSettingsSection}
      />

      <MobileNotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onNavigate={navigateTab}
      />
    </div>
  );
}
