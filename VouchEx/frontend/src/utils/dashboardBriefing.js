import { STATUTORY_EVENTS } from '../data/statutoryDueDates';
import {
  buildInvoicesReceivablesTracks,
  computeDashboardMetrics,
  DASHBOARD_REFERENCE_DATE,
} from './dashboardMetrics';
import { computeBankCashBalances } from './ledgerBalances';
import { sumField, toAmount, dateOnly } from './formatMoney';
import { invoiceOutstandingAmount, expenseOutstandingAmount } from './accountingHelpers';
import { resolveRegisteredState } from './gstUtils';

function parseDate(dStr) {
  return new Date(dStr);
}

function dateOnlyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function invoiceOutstanding(inv, receipts, creditNotes = [], advanceAdjustments = []) {
  return invoiceOutstandingAmount(inv, receipts, creditNotes, advanceAdjustments);
}

function expenseOutstanding(exp, payments) {
  const paid = payments
    .filter((p) => Number(p.expense_id) === Number(exp.id))
    .reduce((sum, p) => sum + toAmount(p.amount_paid) + toAmount(p.tds_deducted), 0);
  return Math.max(0, toAmount(exp.total_amount) - paid);
}

function isCurrentMonth(dateStr, today = DASHBOARD_REFERENCE_DATE) {
  if (!dateStr) return false;
  const d = parseDate(dateStr);
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
}

function daysUntil(dateStr, today = DASHBOARD_REFERENCE_DATE) {
  const target = parseDate(dateStr);
  const ref = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((t - ref) / 86400000);
}

export function computeAttentionItems({
  invoices = [],
  receipts = [],
  creditNotes = [],
  advanceAdjustments = [],
  expenses = [],
  payments = [],
  inventory = [],
  calendarReminders = [],
  companyDetails = {},
  isFinancialYearLocked = false,
  today = DASHBOARD_REFERENCE_DATE,
}) {
  const refDay = dateOnlyFromDate(today);
  const items = [];

  if (isFinancialYearLocked) {
    items.push({
      id: 'period-locked',
      severity: 'warning',
      title: 'Financial period locked',
      detail: 'Unlock in Settings before editing books for this period.',
      tab: 'settings',
      count: null,
      amount: null,
    });
  }

  const regState = resolveRegisteredState(companyDetails);
  if (!companyDetails.gstin?.trim() || !regState) {
    items.push({
      id: 'company-profile',
      severity: 'warning',
      title: 'Company profile incomplete',
      detail: 'Add GSTIN and registered state in Settings for correct GST bifurcation.',
      tab: 'settings',
      count: null,
      amount: null,
    });
  }

  let overdueArCount = 0;
  let overdueArAmount = 0;
  invoices.forEach((inv) => {
    if (inv.status === 'Cancelled' || !['Unpaid', 'Partially Paid'].includes(inv.status)) return;
    const outstanding = invoiceOutstanding(inv, receipts, creditNotes, advanceAdjustments);
    if (outstanding <= 0) return;
    const due = inv.due_date ? dateOnly(inv.due_date) : null;
    if (due && due < refDay) {
      overdueArCount += 1;
      overdueArAmount += outstanding;
    }
  });

  if (overdueArCount > 0) {
    items.push({
      id: 'overdue-receivables',
      severity: 'critical',
      title: 'Overdue customer invoices',
      detail: `${overdueArCount} invoice(s) past due date`,
      tab: 'sales',
      count: overdueArCount,
      amount: overdueArAmount,
    });
  }

  let overdueApCount = 0;
  let overdueApAmount = 0;
  expenses.forEach((exp) => {
    const outstanding = expenseOutstanding(exp, payments);
    if (outstanding <= 0) return;
    const due = dateOnly(exp.due_date || exp.expense_date);
    if (due && due < refDay) {
      overdueApCount += 1;
      overdueApAmount += outstanding;
    }
  });

  if (overdueApCount > 0) {
    items.push({
      id: 'overdue-payables',
      severity: 'critical',
      title: 'Overdue vendor bills',
      detail: `${overdueApCount} unpaid bill(s) past due`,
      tab: 'payment',
      count: overdueApCount,
      amount: overdueApAmount,
    });
  }

  const lowStock = inventory.filter(
    (inv) => inv.type === 'Product' && toAmount(inv.quantity) <= toAmount(inv.low_stock_threshold || 0)
  );
  if (lowStock.length > 0) {
    items.push({
      id: 'low-stock',
      severity: 'warning',
      title: 'Low stock SKUs',
      detail: lowStock.slice(0, 3).map((p) => p.name).join(', ') + (lowStock.length > 3 ? '…' : ''),
      tab: 'inventory',
      count: lowStock.length,
      amount: null,
    });
  }

  const overdueTasks = calendarReminders.filter(
    (r) => r.kind === 'task' && r.reminder_date && dateOnly(r.reminder_date) < refDay
  );
  if (overdueTasks.length > 0) {
    items.push({
      id: 'overdue-tasks',
      severity: 'warning',
      title: 'Overdue tasks',
      detail: 'Compliance or internal tasks past their target date',
      tab: 'dashboard',
      count: overdueTasks.length,
      amount: null,
    });
  }

  const receivablesTracks = buildInvoicesReceivablesTracks({
    invoices,
    receipts,
    creditNotes,
    advanceAdjustments,
    filterPeriod: 'Last Month',
    bankAccounts: [],
    cashLedgers: [],
    today,
  });
  if (receivablesTracks.paid.notDeposited > 0) {
    items.push({
      id: 'undeposited-receipts',
      severity: 'info',
      title: 'Receipts not in bank/cash ledger',
      detail: 'Collections recorded but not deposited to a COA ledger',
      tab: 'receipt',
      count: null,
      amount: receivablesTracks.paid.notDeposited,
    });
  }

  const openInvoices = invoices.filter(
    (inv) => inv.status !== 'Cancelled' && ['Unpaid', 'Partially Paid'].includes(inv.status)
  );
  let openArTotal = 0;
  openInvoices.forEach((inv) => {
    openArTotal += invoiceOutstanding(inv, receipts, creditNotes, advanceAdjustments);
  });
  if (openArTotal > 0 && overdueArCount === 0) {
    items.push({
      id: 'open-receivables',
      severity: 'info',
      title: 'Outstanding receivables',
      detail: `${openInvoices.length} open invoice(s) — none overdue yet`,
      tab: 'receipt',
      count: openInvoices.length,
      amount: openArTotal,
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'all-clear',
      severity: 'ok',
      title: 'All clear for now',
      detail: 'No overdue items or stock alerts. Keep an eye on upcoming compliance dates below.',
      tab: null,
      count: null,
      amount: null,
    });
  }

  return items;
}

export function computeComplianceSnapshot({
  calendarReminders = [],
  today = DASHBOARD_REFERENCE_DATE,
}) {
  const refDay = dateOnlyFromDate(today);

  const upcomingStatutory = STATUTORY_EVENTS.filter((ev) => ev.date >= refDay)
    .slice(0, 3)
    .map((ev) => ({
      id: ev.id,
      title: ev.title,
      date: ev.date,
      daysLeft: daysUntil(ev.date, today),
      category: ev.category,
    }));

  const overdueReminders = calendarReminders.filter(
    (r) => r.reminder_date && dateOnly(r.reminder_date) < refDay
  ).length;

  const dueThisWeek = STATUTORY_EVENTS.filter((ev) => {
    const d = daysUntil(ev.date, today);
    return d >= 0 && d <= 7;
  }).length;

  const monthLabel = today.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return {
    monthLabel,
    upcomingStatutory,
    overdueReminders,
    dueThisWeek,
  };
}

export function computeGstReadiness({
  invoices = [],
  expenses = [],
  companyDetails = {},
  today = DASHBOARD_REFERENCE_DATE,
}) {
  const monthInvoices = invoices.filter(
    (inv) => inv.status !== 'Cancelled' && isCurrentMonth(inv.issue_date, today)
  );
  const monthExpenses = expenses.filter((exp) => isCurrentMonth(exp.expense_date, today));

  const outwardTaxable = monthInvoices.reduce(
    (s, inv) => s + toAmount(inv.subtotal) - toAmount(inv.discount),
    0
  );
  const itcEligible = monthExpenses.reduce((s, exp) => s + toAmount(exp.tax_amount), 0);

  const dataIssues = [];
  monthInvoices.forEach((inv) => {
    if (inv.invoice_type === 'B2B' && (!inv.gstin || inv.gstin === 'NIL')) {
      dataIssues.push({ type: 'invoice', ref: inv.invoice_number, issue: 'Missing customer GSTIN' });
    }
    if (!inv.place_of_supply?.trim()) {
      dataIssues.push({ type: 'invoice', ref: inv.invoice_number, issue: 'Missing place of supply' });
    }
  });

  const regState = resolveRegisteredState(companyDetails);
  const periodLabel = today.toLocaleString('en-IN', { month: 'short', year: 'numeric' });

  return {
    periodLabel,
    outwardTaxable,
    itcEligible,
    invoiceCount: monthInvoices.length,
    expenseCount: monthExpenses.length,
    dataIssueCount: dataIssues.length,
    dataIssues: dataIssues.slice(0, 5),
    hasGstin: Boolean(companyDetails.gstin?.trim()),
    registeredState: regState,
  };
}

export function computeMiniKpis({
  invoices = [],
  receipts = [],
  creditNotes = [],
  advanceAdjustments = [],
  debitNotes = [],
  expenses = [],
  payments = [],
  bankAccounts = [],
  cashLedgers = [],
  today = DASHBOARD_REFERENCE_DATE,
}) {
  const monthMetrics = computeDashboardMetrics({
    invoices,
    receipts,
    creditNotes,
    advanceAdjustments,
    debitNotes,
    expenses,
    payments,
    filterPeriod: 'Last Month',
    today,
  });

  let openAr = 0;
  invoices.forEach((inv) => {
    if (inv.status === 'Cancelled' || !['Unpaid', 'Partially Paid'].includes(inv.status)) return;
    openAr += invoiceOutstanding(inv, receipts, creditNotes, advanceAdjustments);
  });

  let openAp = 0;
  expenses.forEach((exp) => {
    if (exp.payment_status === 'Paid') return;
    openAp += expenseOutstandingAmount(exp, payments, debitNotes);
  });

  const { bankBalance, cashBalance, hasBankLedgers, hasCashLedgers } = computeBankCashBalances(
    receipts,
    payments,
    bankAccounts,
    cashLedgers
  );
  let cashTotal = null;
  if (hasBankLedgers || hasCashLedgers) {
    cashTotal = (bankBalance ?? 0) + (cashBalance ?? 0);
  }

  return [
    {
      key: 'sales-month',
      label: 'Sales (last 30 days)',
      value: monthMetrics.salesRevenue,
      trend: monthMetrics.trends?.salesRevenue,
    },
    {
      key: 'receivables',
      label: 'Outstanding receivables',
      value: openAr,
    },
    {
      key: 'payables',
      label: 'Outstanding payables',
      value: openAp,
    },
    {
      key: 'cash',
      label: 'Bank + cash balance',
      value: cashTotal,
      unavailable: cashTotal === null,
    },
  ];
}

const ACTIVITY_META = {
  invoice: { label: 'Sales invoice', tab: 'sales' },
  receipt: { label: 'Receipt', tab: 'receipt' },
  payment: { label: 'Payment', tab: 'payment' },
  expense: { label: 'Expense', tab: 'expense' },
  purchase: { label: 'Purchase', tab: 'purchase' },
  credit_note: { label: 'Credit note', tab: 'sales-return' },
  debit_note: { label: 'Debit note', tab: 'purchase-return' },
};

export function computeRecentActivity({
  invoices = [],
  receipts = [],
  payments = [],
  expenses = [],
  creditNotes = [],
  debitNotes = [],
  limit = 10,
}) {
  const events = [];

  invoices.forEach((inv) => {
    events.push({
      id: `inv-${inv.id}`,
      type: 'invoice',
      date: inv.issue_date,
      title: inv.invoice_number,
      subtitle: inv.customer_name,
      amount: toAmount(inv.total_amount),
    });
  });

  receipts.forEach((r) => {
    events.push({
      id: `rec-${r.id}`,
      type: 'receipt',
      date: r.payment_date,
      title: r.receipt_number || `Receipt #${r.id}`,
      subtitle: r.customer_name || r.payer || 'Customer',
      amount: toAmount(r.amount_received),
    });
  });

  payments.forEach((p) => {
    events.push({
      id: `pay-${p.id}`,
      type: 'payment',
      date: p.payment_date,
      title: p.voucher_number || `Payment #${p.id}`,
      subtitle: p.payee || 'Vendor',
      amount: toAmount(p.amount_paid),
    });
  });

  expenses.forEach((exp) => {
    const isPurchase = (exp.record_type || 'expense') === 'purchase';
    events.push({
      id: `exp-${exp.id}`,
      type: isPurchase ? 'purchase' : 'expense',
      date: exp.expense_date,
      title: exp.expense_number || exp.description || `Bill #${exp.id}`,
      subtitle: exp.vendor_name || exp.expense_head || 'Expense',
      amount: toAmount(exp.total_amount),
    });
  });

  creditNotes.forEach((cn) => {
    events.push({
      id: `cn-${cn.id}`,
      type: 'credit_note',
      date: cn.issue_date,
      title: cn.credit_note_number,
      subtitle: cn.customer_name,
      amount: toAmount(cn.total_amount),
    });
  });

  debitNotes.forEach((dn) => {
    events.push({
      id: `dn-${dn.id}`,
      type: 'debit_note',
      date: dn.issue_date,
      title: dn.debit_note_number,
      subtitle: dn.vendor_name,
      amount: toAmount(dn.total_amount),
    });
  });

  return events
    .filter((e) => e.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, limit)
    .map((e) => ({
      ...e,
      meta: ACTIVITY_META[e.type] || { label: e.type, tab: 'dashboard' },
    }));
}

export function computeDashboardBriefing(ctx) {
  return {
    attention: computeAttentionItems(ctx),
    compliance: computeComplianceSnapshot(ctx),
    gstReadiness: computeGstReadiness(ctx),
    miniKpis: computeMiniKpis(ctx),
    recentActivity: computeRecentActivity(ctx),
  };
}
