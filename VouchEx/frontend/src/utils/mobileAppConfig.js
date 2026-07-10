/**
 * Mobile transaction app — allowed modules only.
 * Desktop uses full SidebarNav; mobile uses bottom hubs + this allow-list.
 */

export const MOBILE_HOME_TAB = 'mobile-home';

/** Tabs users can open on mobile (transaction recording only). */
export const MOBILE_TRANSACTION_TABS = new Set([
  MOBILE_HOME_TAB,
  'customer-master',
  'vendor-master',
  'sales',
  'sales-return',
  'receipt',
  'purchase',
  'purchase-return',
  'expense',
  'payment',
  'inventory',
  'consumption',
  'settings',
]);

/** Report / analysis tabs — desktop only on mobile show friendly gate. */
export const MOBILE_DESKTOP_ONLY_TABS = new Set([
  'dashboard',
  'company-360',
  'coa',
  'financials',
  'ledgers',
  'day-book',
  'sales-register',
  'purchase-register',
  'misc-entries',
  'debtors',
  'creditors',
  'cash-bank',
  'taxation',
  'tax-calendar',
]);

export const MOBILE_BOTTOM_NAV = [
  { id: 'home', hub: MOBILE_HOME_TAB, label: 'Home', iconKey: 'home' },
  { id: 'sales', hub: 'sales', label: 'Sales', iconKey: 'sales' },
  { id: 'buy', hub: 'buy', label: 'Buy', iconKey: 'buy' },
  { id: 'stock', hub: 'stock', label: 'Stock', iconKey: 'stock' },
  { id: 'parties', hub: 'parties', label: 'Parties', iconKey: 'parties' },
];

export const MOBILE_HUBS = {
  sales: {
    id: 'sales',
    label: 'Sales',
    tabs: [
      { id: 'sales', label: 'Invoices', short: 'Invoice' },
      { id: 'sales-return', label: 'Returns', short: 'Return' },
      { id: 'receipt', label: 'Receipts', short: 'Receipt' },
    ],
  },
  buy: {
    id: 'buy',
    label: 'Buy & Pay',
    tabs: [
      { id: 'purchase', label: 'Purchase', short: 'Purchase' },
      { id: 'purchase-return', label: 'Returns', short: 'Return' },
      { id: 'expense', label: 'Expenses', short: 'Expense' },
      { id: 'payment', label: 'Payments', short: 'Payment' },
    ],
  },
  stock: {
    id: 'stock',
    label: 'Stock',
    tabs: [
      { id: 'inventory', label: 'Inventory', short: 'Stock' },
      { id: 'consumption', label: 'Consumption', short: 'Use' },
    ],
  },
  parties: {
    id: 'parties',
    label: 'Parties',
    tabs: [
      { id: 'customer-master', label: 'Customers', short: 'Customer' },
      { id: 'vendor-master', label: 'Vendors', short: 'Vendor' },
    ],
  },
};

export function hubForTab(tabId) {
  if (tabId === MOBILE_HOME_TAB) return null;
  for (const hub of Object.values(MOBILE_HUBS)) {
    if (hub.tabs.some((t) => t.id === tabId)) return hub.id;
  }
  if (tabId === 'settings') return null;
  return null;
}

export function defaultTabForHub(hubId) {
  if (hubId === MOBILE_HOME_TAB) return MOBILE_HOME_TAB;
  const hub = MOBILE_HUBS[hubId];
  return hub?.tabs[0]?.id || MOBILE_HOME_TAB;
}

export function isMobileTransactionTab(tabId) {
  return MOBILE_TRANSACTION_TABS.has(tabId);
}

export function isMobileDesktopOnlyTab(tabId) {
  return MOBILE_DESKTOP_ONLY_TABS.has(tabId);
}

export function mobilePageTitle(tabId) {
  if (tabId === MOBILE_HOME_TAB) return 'Quick Record';
  const hub = hubForTab(tabId);
  if (hub && MOBILE_HUBS[hub]) {
    const sub = MOBILE_HUBS[hub].tabs.find((t) => t.id === tabId);
    if (sub) return sub.label;
  }
  if (tabId === 'settings') return 'Settings';
  return null;
}

/** Grouped quick-record — order matches how a shop owner thinks */
export const MOBILE_RECORD_GROUPS = [
  {
    id: 'sales',
    title: 'Sell & collect',
    subtitle: 'Money coming in from customers',
    items: [
      { id: 'sales', label: 'New invoice', desc: 'Bill a customer', tab: 'sales', openForm: true, primary: true },
      { id: 'receipt', label: 'Receipt', desc: 'Payment received', tab: 'receipt', openForm: true },
      { id: 'sales-return', label: 'Sales return', desc: 'Credit note / refund', tab: 'sales-return', openForm: true },
    ],
  },
  {
    id: 'buy',
    title: 'Buy & pay',
    subtitle: 'Purchases and money going out',
    items: [
      { id: 'purchase', label: 'Purchase bill', desc: 'Stock or goods bought', tab: 'purchase', openForm: true },
      { id: 'expense', label: 'Expense', desc: 'Rent, bills, misc.', tab: 'expense', openForm: true },
      { id: 'payment', label: 'Payment', desc: 'Pay a supplier', tab: 'payment', openForm: true },
      { id: 'purchase-return', label: 'Purchase return', desc: 'Debit note to vendor', tab: 'purchase-return', openForm: true },
    ],
  },
  {
    id: 'people',
    title: 'Customers & vendors',
    subtitle: 'People you trade with',
    items: [
      { id: 'customer', label: 'Add customer', desc: 'New buyer / client', tab: 'customer-master', openForm: true },
      { id: 'vendor', label: 'Add vendor', desc: 'New supplier', tab: 'vendor-master', openForm: true },
    ],
  },
  {
    id: 'stock',
    title: 'Stock',
    subtitle: 'Inventory on hand',
    items: [
      { id: 'inventory', label: 'Stock item', desc: 'Add or update product', tab: 'inventory', openForm: true },
      { id: 'consumption', label: 'Consumption', desc: 'Stock used in production', tab: 'consumption', openForm: true },
    ],
  },
];

/** Flat list for legacy / search — derived from groups */
export const MOBILE_QUICK_RECORD = MOBILE_RECORD_GROUPS.flatMap((g) =>
  g.items.map((item) => ({
    ...item,
    tone: item.id === 'sales' ? 'blue' : item.id.includes('return') ? 'indigo' : item.id === 'receipt' ? 'teal' : item.id === 'purchase' ? 'amber' : item.id === 'expense' ? 'rose' : item.id === 'payment' ? 'violet' : item.id.includes('customer') || item.id.includes('vendor') ? 'slate' : 'green',
    label: item.label.replace(/^New |^Add /, '').replace(/^./, (c) => c.toUpperCase()),
  }))
);

/** Browse (list view) shortcuts in drawer */
export const MOBILE_BROWSE_GROUPS = [
  { id: 'browse-sales', label: 'All invoices', tab: 'sales' },
  { id: 'browse-receipts', label: 'All receipts', tab: 'receipt' },
  { id: 'browse-purchase', label: 'All purchases', tab: 'purchase' },
  { id: 'browse-payments', label: 'All payments', tab: 'payment' },
  { id: 'browse-customers', label: 'All customers', tab: 'customer-master' },
  { id: 'browse-vendors', label: 'All vendors', tab: 'vendor-master' },
  { id: 'browse-inventory', label: 'All stock items', tab: 'inventory' },
];
