import { formatDocumentMoney } from './formatMoney';
import { computeAttentionItems } from './dashboardBriefing';

export function buildMobileNotifications({
  invoices = [],
  receipts = [],
  creditNotes = [],
  expenses = [],
  payments = [],
  inventory = [],
  calendarReminders = [],
  companyDetails = {},
  isFinancialYearLocked = false,
  account = null,
}) {
  const items = [];

  const attention = computeAttentionItems({
    invoices,
    receipts,
    creditNotes,
    expenses,
    payments,
    inventory,
    calendarReminders,
    companyDetails,
    isFinancialYearLocked,
  });

  attention.forEach((a) => {
    items.push({
      id: a.id,
      severity: a.severity,
      title: a.title,
      body: a.detail,
      tab: a.tab,
      amount: a.amount,
    });
  });

  const today = new Date().toISOString().slice(0, 10);
  (calendarReminders || []).forEach((r) => {
    if (!r.due_date || r.due_date > today) return;
    items.push({
      id: `cal-${r.id}`,
      severity: r.kind === 'task' ? 'warning' : 'info',
      title: r.title,
      body: r.kind === 'task' ? 'Task due today' : 'Reminder due today',
      tab: 'dashboard',
    });
  });

  if (account?.subscription?.status === 'trial') {
    const days = account.subscription.trial_days_remaining;
    if (days != null && days <= 7) {
      items.push({
        id: 'trial-expiry',
        severity: 'info',
        title: 'Trial ending soon',
        body: `${days} day(s) left on your trial`,
        tab: 'settings',
      });
    }
  }

  return items;
}

export function notificationCount(notifications) {
  return notifications?.length || 0;
}
