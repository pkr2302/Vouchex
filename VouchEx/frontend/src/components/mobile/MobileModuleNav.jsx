import MobileSubTabMenu from './MobileSubTabMenu';

export function MobileSettingsNav({ settingsMainTab, settingsSubTab, setSettingsSubTab, isSuperAdmin, isGroupAdmin, isAdmin }) {
  const companyTabs = [
    { id: 'profile', label: 'Company Details', description: 'Profile, bank, framework' },
  ];
  if (isAdmin) {
    companyTabs.push({ id: 'gst-compliance', label: 'GST Compliance', description: 'E-Invoice & E-Way bill' });
  }
  if (isAdmin) {
    if (isSuperAdmin || isGroupAdmin) {
      companyTabs.push({
        id: 'companies',
        label: 'Manage Companies',
        description: isGroupAdmin ? 'Create companies' : 'Create & delete companies',
      });
    }
    companyTabs.push(
      { id: 'user-mgmt', label: 'User Management', description: 'Team access' },
      { id: 'lock-controls', label: 'Financial Year Lock', description: 'Period controls' }
    );
  }

  const websiteTabs = [
    { id: 'sessions', label: 'Login & Audit Trail', description: 'Security logs' },
    { id: 'backup', label: 'Data Backups', description: 'Download & restore' },
    { id: 'system-health', label: 'System Health', description: 'Server status' },
    { id: 'subscriptions', label: 'Subscriptions', description: 'Payments & plans' },
  ];

  const tabs = isSuperAdmin && settingsMainTab === 'website' ? websiteTabs : companyTabs;

  return (
    <MobileSubTabMenu
      className="mobile-settings-nav"
      tabs={tabs}
      activeId={settingsSubTab}
      onSelect={setSettingsSubTab}
    />
  );
}

export function MobileTaxationNav({ active, onSelect }) {
  const tabs = [
    { id: 'summary', label: 'Summary', description: 'GST overview' },
    { id: 'gstr1', label: 'GSTR-1', description: 'Outward supplies' },
    { id: 'gstr2b', label: 'GSTR-2B', description: 'ITC statement' },
    { id: 'gstr3b', label: 'GSTR-3B', description: 'Monthly return' },
    { id: 'tds', label: 'TDS', description: 'TDS summary' },
    { id: 'compliance', label: 'Compliance', description: 'ECRS logs' },
  ];
  return <MobileSubTabMenu className="mobile-tax-nav" tabs={tabs} activeId={active} onSelect={onSelect} />;
}

export function MobileReceiptNav({ active, onSelect }) {
  const tabs = [
    { id: 'record', label: 'Record Receipt', description: 'Settle invoices' },
    { id: 'advance', label: 'Record Advance', description: 'Customer advance' },
    { id: 'registry', label: 'Payment Registry', description: 'All receipts' },
    { id: 'dashboard', label: 'Dashboard', description: 'Receipt metrics' },
    { id: 'ageing', label: 'Debtors Ageing', description: 'Outstanding AR' },
    { id: 'forex', label: 'Forex Receipts', description: 'Multi-currency' },
  ];
  return <MobileSubTabMenu className="mobile-receipt-nav" tabs={tabs} activeId={active} onSelect={onSelect} />;
}

export function MobilePaymentNav({ active, onSelect }) {
  const tabs = [
    { id: 'registry', label: 'Payment Registry', description: 'All payments' },
    { id: 'dashboard', label: 'Dashboard', description: 'Payment metrics' },
    { id: 'ageing', label: 'Creditors Ageing', description: 'Outstanding AP' },
    { id: 'advance', label: 'Advance Payment', description: 'Record advance' },
  ];
  return <MobileSubTabMenu className="mobile-payment-nav" tabs={tabs} activeId={active} onSelect={onSelect} />;
}
