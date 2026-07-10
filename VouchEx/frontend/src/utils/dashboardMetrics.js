import { sumField, toAmount, sameId, formatINR } from './formatMoney';
import {
  invoiceOutstandingAmount,
  expenseOutstandingAmount,
  portalToday,
} from './accountingHelpers';

export const DASHBOARD_REFERENCE_DATE = portalToday();

export const DASHBOARD_PANEL_IDS = [
  'invoices-receivables',
  'expense-breakdown',
  'profit-loss',
  'sales-trajectory',
  'financial-analytics',
];

export function formatRupee(value) {
  return `₹${formatINR(value)}`;
}

const parseDate = (dStr) => new Date(dStr);

export function periodStartDate(filterPeriod, today = DASHBOARD_REFERENCE_DATE, customStartDate = '') {
  if (filterPeriod === 'All Time') return null;
  if (filterPeriod === 'Last Day') {
    const d = new Date(today);
    d.setDate(today.getDate() - 1);
    return d;
  }
  if (filterPeriod === 'Last Month') {
    const d = new Date(today);
    d.setMonth(today.getMonth() - 1);
    return d;
  }
  if (filterPeriod === 'Last Quarter') {
    const d = new Date(today);
    d.setMonth(today.getMonth() - 3);
    return d;
  }
  if (filterPeriod === 'Last Year') {
    const d = new Date(today);
    d.setFullYear(today.getFullYear() - 1);
    return d;
  }
  if (filterPeriod === 'Custom Range' && customStartDate) {
    return new Date(customStartDate);
  }
  return null;
}

export function previousPeriodStartDate(filterPeriod, today = DASHBOARD_REFERENCE_DATE, customStartDate = '', customEndDate = '') {
  if (filterPeriod === 'All Time') return null;
  if (filterPeriod === 'Last Day') {
    const d = new Date(today);
    d.setDate(today.getDate() - 2);
    return d;
  }
  if (filterPeriod === 'Last Month') {
    const d = new Date(today);
    d.setMonth(today.getMonth() - 2);
    return d;
  }
  if (filterPeriod === 'Last Quarter') {
    const d = new Date(today);
    d.setMonth(today.getMonth() - 6);
    return d;
  }
  if (filterPeriod === 'Last Year') {
    const d = new Date(today);
    d.setFullYear(today.getFullYear() - 2);
    return d;
  }
  if (filterPeriod === 'Custom Range' && customStartDate && customEndDate) {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const spanMs = end.getTime() - start.getTime();
    return new Date(start.getTime() - spanMs - 86400000);
  }
  return null;
}

export function isDateInPeriod(dateStr, filterPeriod, today = DASHBOARD_REFERENCE_DATE, customStartDate = '', customEndDate = '') {
  if (!dateStr || dateStr === 'NIL') return false;
  const date = parseDate(dateStr);
  const start = periodStartDate(filterPeriod, today, customStartDate);
  if (filterPeriod === 'All Time') return true;
  if (filterPeriod === 'Custom Range') {
    if (!customStartDate || !customEndDate) return true;
    const end = new Date(customEndDate);
    return date >= start && date <= end;
  }
  return start ? date >= start : true;
}

export function isDateBeforePeriod(dateStr, filterPeriod, today = DASHBOARD_REFERENCE_DATE, customStartDate = '') {
  if (!dateStr || dateStr === 'NIL') return false;
  if (filterPeriod === 'All Time') return false;
  const date = parseDate(dateStr);
  const start = periodStartDate(filterPeriod, today, customStartDate);
  return start ? date < start : false;
}

export function isDateInPreviousPeriod(dateStr, filterPeriod, today = DASHBOARD_REFERENCE_DATE, customStartDate = '', customEndDate = '') {
  if (!dateStr || dateStr === 'NIL') return false;
  if (filterPeriod === 'All Time') return false;
  const date = parseDate(dateStr);
  const prevStart = previousPeriodStartDate(filterPeriod, today, customStartDate, customEndDate);
  const curStart = periodStartDate(filterPeriod, today, customStartDate);
  if (!prevStart || !curStart) return false;
  return date >= prevStart && date < curStart;
}

function pendingReceivablesForInvoices(invoiceList, allReceipts, creditNotes = [], advanceAdjustments = [], receiptDateFilter) {
  return invoiceList.reduce((sum, inv) => {
    if (inv.status === 'Paid' || inv.status === 'Cancelled') return sum;
    const outstanding = invoiceOutstandingAmount(inv, allReceipts, creditNotes, advanceAdjustments);
    if (receiptDateFilter && inv.status === 'Partially Paid') {
      const recs = allReceipts.filter((r) => sameId(r.invoice_id, inv.id) && receiptDateFilter(r.payment_date));
      if (!recs.length) return sum;
    }
    return sum + outstanding;
  }, 0);
}

function pendingPayablesForExpenses(expenseList, allPayments, debitNotes = [], paymentDateFilter) {
  return expenseList.reduce((sum, exp) => {
    if (exp.payment_status === 'Paid') return sum;
    const outstanding = expenseOutstandingAmount(exp, allPayments, debitNotes);
    if (paymentDateFilter && exp.payment_status === 'Partially Paid') {
      const pays = allPayments.filter((p) => sameId(p.expense_id, exp.id) && paymentDateFilter(p.payment_date));
      if (!pays.length) return sum;
    }
    return sum + outstanding;
  }, 0);
}

function sliceMetrics(invoices, receipts, expenses, payments, creditNotes, debitNotes, advanceAdjustments, dateInPeriod) {
  const filteredInvoices = invoices.filter((inv) => dateInPeriod(inv.issue_date) && inv.status !== 'Cancelled');
  const filteredReceipts = receipts.filter((rec) => dateInPeriod(rec.payment_date));
  const filteredExpenses = expenses.filter((exp) => dateInPeriod(exp.expense_date));
  const filteredPayments = payments.filter((pay) => dateInPeriod(pay.payment_date));

  const salesRevenue = sumField(filteredInvoices, 'total_amount');
  const cashInflow = sumField(filteredReceipts, 'amount_received');
  const cashOutflow = sumField(filteredPayments, 'amount_paid');
  const accountsReceivable = pendingReceivablesForInvoices(filteredInvoices, receipts, creditNotes, advanceAdjustments);
  const accountsPayable = pendingPayablesForExpenses(filteredExpenses, payments, debitNotes);
  const grossProfit = salesRevenue - sumField(filteredExpenses, 'total_amount');

  return {
    salesRevenue,
    cashInflow,
    cashOutflow,
    accountsReceivable,
    accountsPayable,
    grossProfit,
    totalExpenses: sumField(filteredExpenses, 'total_amount'),
    filteredInvoices,
    filteredReceipts,
    filteredExpenses,
    filteredPayments,
  };
}

export function computeTrendPercent(current, previous) {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' };
  if (previous === 0) return { pct: 100, direction: current >= 0 ? 'up' : 'down' };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { pct, direction: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat' };
}

export function computeDashboardMetrics({
  invoices = [],
  receipts = [],
  expenses = [],
  payments = [],
  creditNotes = [],
  debitNotes = [],
  advanceAdjustments = [],
  filterPeriod = 'All Time',
  customStartDate = '',
  customEndDate = '',
  today = DASHBOARD_REFERENCE_DATE,
}) {
  const inPeriod = (d) => isDateInPeriod(d, filterPeriod, today, customStartDate, customEndDate);
  const beforePeriod = (d) => isDateBeforePeriod(d, filterPeriod, today, customStartDate);
  const inPrevious = (d) => isDateInPreviousPeriod(d, filterPeriod, today, customStartDate, customEndDate);

  const current = sliceMetrics(invoices, receipts, expenses, payments, creditNotes, debitNotes, advanceAdjustments, inPeriod);
  const previous = filterPeriod === 'All Time'
    ? null
    : sliceMetrics(invoices, receipts, expenses, payments, creditNotes, debitNotes, advanceAdjustments, inPrevious);

  const carryInvoices = invoices.filter((inv) => beforePeriod(inv.issue_date) && inv.status !== 'Cancelled');
  const carryReceipts = receipts.filter((rec) => beforePeriod(rec.payment_date));
  const carryExpenses = expenses.filter((exp) => beforePeriod(exp.expense_date));
  const carryPayments = payments.filter((pay) => beforePeriod(pay.payment_date));

  const carryForward = {
    cashInflow: sumField(carryReceipts, 'amount_received'),
    cashOutflow: sumField(carryPayments, 'amount_paid'),
    accountsReceivable: pendingReceivablesForInvoices(carryInvoices, receipts, creditNotes, advanceAdjustments, (d) => beforePeriod(d)),
    accountsPayable: pendingPayablesForExpenses(carryExpenses, payments, debitNotes, (d) => beforePeriod(d)),
  };

  const trends = previous
    ? {
        salesRevenue: computeTrendPercent(current.salesRevenue, previous.salesRevenue),
        cashInflow: computeTrendPercent(current.cashInflow, previous.cashInflow),
        cashOutflow: computeTrendPercent(current.cashOutflow, previous.cashOutflow),
        accountsReceivable: computeTrendPercent(current.accountsReceivable, previous.accountsReceivable),
        accountsPayable: computeTrendPercent(current.accountsPayable, previous.accountsPayable),
        grossProfit: computeTrendPercent(current.grossProfit, previous.grossProfit),
      }
    : {
        salesRevenue: { pct: 0, direction: 'flat' },
        cashInflow: { pct: 0, direction: 'flat' },
        cashOutflow: { pct: 0, direction: 'flat' },
        accountsReceivable: { pct: 0, direction: 'flat' },
        accountsPayable: { pct: 0, direction: 'flat' },
        grossProfit: { pct: 0, direction: 'flat' },
      };

  return {
    ...current,
    carryForward,
    trends,
    filterPeriod,
    showCarryForward: filterPeriod !== 'All Time',
    trendLabel: filterPeriod === 'All Time' ? 'vs prior year slice' : 'vs last period',
  };
}

export function buildWaterfallChartData(metrics) {
  const revenue = metrics.salesRevenue;
  const expenses = metrics.totalExpenses;
  const receipts = metrics.cashInflow;
  const receivables = metrics.accountsReceivable;
  const payables = metrics.accountsPayable;
  const netProfit = metrics.grossProfit;

  const deltas = [
    { name: 'Revenue', delta: revenue, kind: 'total-start' },
    { name: 'Expenses', delta: -expenses, kind: 'delta' },
    { name: 'Receipts', delta: receipts, kind: 'delta' },
    { name: 'Receivables', delta: -receivables, kind: 'delta' },
    { name: 'Payables', delta: payables, kind: 'delta' },
    { name: 'Net Profit', delta: netProfit, kind: 'total-end' },
  ];

  let running = 0;
  return deltas.map((step) => {
    if (step.kind === 'total-start') {
      running = step.delta;
      return { name: step.name, base: 0, value: step.delta, kind: 'total', signed: step.delta };
    }
    if (step.kind === 'total-end') {
      return { name: step.name, base: 0, value: step.delta, kind: 'total', signed: step.delta };
    }
    const signed = step.delta;
    const base = signed >= 0 ? running : running + signed;
    running += signed;
    return { name: step.name, base, value: Math.abs(signed), kind: signed >= 0 ? 'gain' : 'loss', signed };
  });
}

export function buildInflowOutflowGroups(metrics) {
  return [
    {
      group: 'Revenue vs Expenses',
      inflow: metrics.salesRevenue,
      outflow: metrics.totalExpenses,
    },
    {
      group: 'Receipts vs Payments',
      inflow: metrics.cashInflow,
      outflow: metrics.cashOutflow,
    },
  ];
}

export function buildMonthlyTrajectory(invoices, expenses, monthsBack = 6, today = DASHBOARD_REFERENCE_DATE) {
  const points = [];
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    const inMonth = (dateStr) => {
      if (!dateStr) return false;
      const dt = parseDate(dateStr);
      return dt.getFullYear() === y && dt.getMonth() === m;
    };
    const revenue = sumField(
      invoices.filter((inv) => inMonth(inv.issue_date) && inv.status !== 'Cancelled'),
      'total_amount'
    );
    const expenseTotal = sumField(
      expenses.filter((exp) => inMonth(exp.expense_date)),
      'total_amount'
    );
    points.push({ label, revenue, expenses: expenseTotal });
  }
  return points;
}

export function buildExpenseBreakdown(expenses, dateInPeriod) {
  const map = {};
  expenses
    .filter((exp) => dateInPeriod(exp.expense_date))
    .forEach((exp) => {
      const head = exp.expense_head || 'Uncategorized';
      map[head] = (map[head] || 0) + toAmount(exp.total_amount);
    });
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function buildWorkingCapitalMetrics(metrics) {
  const cashOnHand = Math.max(0, metrics.cashInflow - metrics.cashOutflow);
  const debtToIncome = metrics.salesRevenue > 0 ? metrics.accountsPayable / metrics.salesRevenue : 0;
  const recvToPay = metrics.accountsPayable > 0
    ? metrics.accountsReceivable / metrics.accountsPayable
    : metrics.accountsReceivable > 0 ? 2 : 0;

  return [
    {
      id: 'debt-income',
      label: 'Payables / Revenue',
      value: debtToIncome,
      display: `${(debtToIncome * 100).toFixed(1)}%`,
      target: 0.35,
      warn: 0.5,
      critical: 0.75,
      caption: 'Outstanding payables relative to sales revenue',
    },
    {
      id: 'recv-pay',
      label: 'Receivables / Payables',
      value: recvToPay,
      display: recvToPay.toFixed(2),
      target: 1,
      warn: 1.5,
      critical: 2,
      caption: 'Debtors vs creditors balance',
    },
    {
      id: 'cash-liquidity',
      label: 'Net cash movement',
      value: Math.min(1, cashOnHand / Math.max(metrics.salesRevenue, 1)),
      display: cashOnHand,
      isCurrency: true,
      target: 0.25,
      warn: 0.1,
      critical: 0.05,
      caption: 'Receipts minus payments in selected period',
    },
  ];
}

export function workingCapitalZone(value, target, warn, critical, lowerIsBetter = false) {
  if (lowerIsBetter) {
    if (value <= target) return 'safe';
    if (value <= warn) return 'warning';
    return 'critical';
  }
  if (value >= target) return 'safe';
  if (value >= warn * 0.6) return 'warning';
  return 'critical';
}

function invoiceOutstanding(inv, allReceipts, creditNotes = [], advanceAdjustments = []) {
  return invoiceOutstandingAmount(inv, allReceipts, creditNotes, advanceAdjustments);
}

function isReceiptDeposited(receipt, bankAccounts = [], cashLedgers = []) {
  const banks = bankAccounts.map((b) => (typeof b === 'string' ? b : String(b?.name || ''))).filter(Boolean);
  const cash = cashLedgers.map((c) => (typeof c === 'string' ? c : String(c?.name || ''))).filter(Boolean);
  const deposit = String(receipt.deposit_to || '').trim();
  const mode = String(receipt.payment_mode || '');
  if (deposit && banks.includes(deposit)) return true;
  if (mode.startsWith('Bank:')) {
    const name = mode.replace(/^Bank:\s*/i, '').trim();
    return banks.includes(name);
  }
  if (deposit && cash.includes(deposit)) return false;
  if (mode.startsWith('Cash:')) return false;
  if (deposit && !cash.includes(deposit)) return true;
  return false;
}

export function buildInvoicesReceivablesTracks({
  invoices = [],
  receipts = [],
  creditNotes = [],
  advanceAdjustments = [],
  filterPeriod,
  customStartDate = '',
  customEndDate = '',
  bankAccounts = [],
  cashLedgers = [],
  today = DASHBOARD_REFERENCE_DATE,
}) {
  const inPeriod = (d) => isDateInPeriod(d, filterPeriod, today, customStartDate, customEndDate);
  const refDay = dateOnlyFromDate(today);

  const openInvoices = invoices.filter(
    (inv) =>
      inv.status !== 'Cancelled'
      && ['Unpaid', 'Partially Paid'].includes(inv.status)
  );

  let overdue = 0;
  let notDue = 0;
  openInvoices.forEach((inv) => {
    const outstanding = invoiceOutstanding(inv, receipts, creditNotes, advanceAdjustments);
    if (outstanding <= 0) return;
    const due = inv.due_date ? dateOnlyFromDate(parseDate(inv.due_date)) : (inv.issue_date ? dateOnlyFromDate(parseDate(inv.issue_date)) : null);
    if (due && due < refDay) overdue += outstanding;
    else notDue += outstanding;
  });

  const periodReceipts = receipts.filter((r) => inPeriod(r.payment_date));
  let deposited = 0;
  let notDeposited = 0;
  periodReceipts.forEach((r) => {
    const amt = toAmount(r.amount_received);
    if (isReceiptDeposited(r, bankAccounts, cashLedgers)) deposited += amt;
    else notDeposited += amt;
  });

  const unpaidTotal = overdue + notDue;
  const paidTotal = deposited + notDeposited;

  return {
    unpaid: { total: unpaidTotal, overdue, notDue },
    paid: { total: paidTotal, deposited, notDeposited },
  };
}

function dateOnlyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildProfitLossComparison(metrics) {
  return {
    income: metrics.salesRevenue,
    expenses: metrics.totalExpenses,
    netProfit: metrics.grossProfit,
  };
}

export function buildSalesTrajectoryFiltered({
  invoices = [],
  filterPeriod,
  customStartDate = '',
  customEndDate = '',
  today = DASHBOARD_REFERENCE_DATE,
}) {
  const inPeriod = (d) => isDateInPeriod(d, filterPeriod, today, customStartDate, customEndDate);
  const start = periodStartDate(filterPeriod, today, customStartDate);
  const end = filterPeriod === 'Custom Range' && customEndDate
    ? new Date(customEndDate)
    : today;

  const points = [];
  const pushPoint = (label, from, to) => {
    const sales = invoices
      .filter((inv) => {
        if (!inv.issue_date || inv.status === 'Cancelled') return false;
        const dt = parseDate(inv.issue_date);
        return dt >= from && dt <= to;
      })
      .reduce((s, inv) => s + toAmount(inv.total_amount), 0);
    points.push({ label, sales });
  };

  if (filterPeriod === 'Last Day') {
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      pushPoint(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), from, to);
    }
    return points;
  }

  if (filterPeriod === 'Last Month') {
    for (let i = 29; i >= 0; i -= 3) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const from = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      pushPoint(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), from, to);
    }
    return points;
  }

  if (filterPeriod === 'Last Year') {
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      pushPoint(d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), from, to);
    }
    return points;
  }

  if (filterPeriod === 'Custom Range' && start && end) {
    const spanDays = Math.max(1, Math.ceil((end - start) / 86400000));
    const step = spanDays > 60 ? 'month' : 'day';
    if (step === 'month') {
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        const from = new Date(cursor);
        const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
        pushPoint(cursor.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), from, to);
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + Math.max(1, Math.floor(spanDays / 12)))) {
        const from = new Date(d);
        const to = new Date(from);
        to.setHours(23, 59, 59);
        pushPoint(from.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), from, to);
      }
    }
    return points.length ? points : [{ label: 'No data', sales: 0 }];
  }

  return buildMonthlyTrajectory(invoices, [], 6, today).map((p) => ({ label: p.label, sales: p.revenue }));
}

export function loadDashboardPanelOrder(userId) {
  const key = `vouchex_dashboard_layout_${userId || 'guest'}`;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved) && saved.length === DASHBOARD_PANEL_IDS.length) {
      const valid = saved.every((id) => DASHBOARD_PANEL_IDS.includes(id));
      if (valid && new Set(saved).size === DASHBOARD_PANEL_IDS.length) return saved;
    }
  } catch {
    /* ignore */
  }
  return [...DASHBOARD_PANEL_IDS];
}

export function saveDashboardPanelOrder(userId, order) {
  const key = `vouchex_dashboard_layout_${userId || 'guest'}`;
  localStorage.setItem(key, JSON.stringify(order));
}
