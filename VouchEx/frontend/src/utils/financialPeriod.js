import { dateOnly, addDaysToDateOnly } from './formatMoney';

/** First FY available in the portal (25-26 when opened in 2025). */
export const PORTAL_FY_START_YEAR = 2025;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getFinancialYearStartYear(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 4 ? y : y - 1;
}

export function formatFinancialYearLabel(startYear) {
  const end = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(end).slice(-2)}`;
}

export function getFinancialYearOptions(referenceDate = new Date()) {
  const currentStart = getFinancialYearStartYear(referenceDate);
  const options = [];
  for (let y = currentStart; y >= PORTAL_FY_START_YEAR; y -= 1) {
    options.push({ startYear: y, label: formatFinancialYearLabel(y) });
  }
  return options;
}

export function fyDateRange(startYear) {
  return {
    from: `${startYear}-04-01`,
    to: `${startYear + 1}-03-31`,
  };
}

export function todayIso() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function shiftYear(isoDate, yearsDelta) {
  const base = dateOnly(isoDate);
  if (!base) return '';
  const [y, m, d] = base.split('-').map((n) => parseInt(n, 10));
  return `${y + yearsDelta}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function ordinalDay(day) {
  const n = parseInt(day, 10);
  if (n >= 11 && n <= 13) return `${n}th`;
  const mod = n % 10;
  if (mod === 1) return `${n}st`;
  if (mod === 2) return `${n}nd`;
  if (mod === 3) return `${n}rd`;
  return `${n}th`;
}

/** Long report date: "1st April 2026" */
export function formatReportDateLong(value) {
  const base = dateOnly(value);
  if (!base) return '';
  const [y, m, d] = base.split('-').map((n) => parseInt(n, 10));
  return `${ordinalDay(d)} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** dd/mm/yyyy display */
export function formatReportDateShort(value) {
  const base = dateOnly(value);
  if (!base) return '';
  const [y, m, d] = base.split('-').map((n) => parseInt(n, 10));
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export const PERIOD_LABELS = {
  ytd: 'Year to Date',
  half_h1: 'Half Yearly (Apr–Sep)',
  half_h2: 'Half Yearly (Oct–Mar)',
  quarter_q1: 'Quarterly (Q1)',
  quarter_q2: 'Quarterly (Q2)',
  quarter_q3: 'Quarterly (Q3)',
  quarter_q4: 'Quarterly (Q4)',
  custom: 'Custom Period',
};

export function resolvePresetPeriod(fyStartYear, presetKey, subKey = null, referenceDate = new Date()) {
  const fyEndYear = fyStartYear + 1;
  const today = todayIso();
  const currentFyStart = getFinancialYearStartYear(referenceDate);
  const isCurrentFy = fyStartYear === currentFyStart;

  if (presetKey === 'ytd') {
    const from = `${fyStartYear}-04-01`;
    const fullTo = `${fyEndYear}-03-31`;
    const to = isCurrentFy ? today : fullTo;
    return { from, to, asOf: to, periodLabel: PERIOD_LABELS.ytd };
  }

  if (presetKey === 'half') {
    if (subKey === 'h1') {
      return {
        from: `${fyStartYear}-04-01`,
        to: `${fyStartYear}-09-30`,
        asOf: `${fyStartYear}-09-30`,
        periodLabel: PERIOD_LABELS.half_h1,
      };
    }
    if (subKey === 'h2') {
      return {
        from: `${fyStartYear}-10-01`,
        to: `${fyEndYear}-03-31`,
        asOf: `${fyEndYear}-03-31`,
        periodLabel: PERIOD_LABELS.half_h2,
      };
    }
  }

  if (presetKey === 'quarter') {
    const map = {
      q1: { from: `${fyStartYear}-04-01`, to: `${fyStartYear}-06-30` },
      q2: { from: `${fyStartYear}-07-01`, to: `${fyStartYear}-09-30` },
      q3: { from: `${fyStartYear}-10-01`, to: `${fyStartYear}-12-31` },
      q4: { from: `${fyEndYear}-01-01`, to: `${fyEndYear}-03-31` },
    };
    const range = map[subKey];
    if (range) {
      return {
        ...range,
        asOf: range.to,
        periodLabel: PERIOD_LABELS[`quarter_${subKey}`],
      };
    }
  }

  return null;
}

export function getDefaultAppliedPeriod(referenceDate = new Date()) {
  const fyStartYear = getFinancialYearStartYear(referenceDate);
  const preset = resolvePresetPeriod(fyStartYear, 'ytd', null, referenceDate);
  return {
    fyStartYear,
    presetKey: 'ytd',
    subKey: null,
    from: preset.from,
    to: preset.to,
    asOf: preset.asOf,
    periodLabel: preset.periodLabel,
  };
}

export function previousYearPeriod(period) {
  return {
    from: shiftYear(period.from, -1),
    to: shiftYear(period.to, -1),
    asOf: shiftYear(period.asOf || period.to, -1),
    fyStartYear: period.fyStartYear - 1,
    periodLabel: period.periodLabel,
  };
}

export function validatePeriodDraft({
  fyStartYear,
  presetKey,
  subKey,
  from,
  to,
}) {
  if (!from || !to) {
    return 'Please enter both From and To dates.';
  }
  if (from > to) {
    return 'From date cannot be after To date.';
  }

  if (presetKey && presetKey !== 'custom') {
    const expected = resolvePresetPeriod(fyStartYear, presetKey, subKey);
    if (expected && (expected.from !== from || expected.to !== to)) {
      return 'Period preset and manual dates do not match. Clear the preset or use dates that match your selection.';
    }
    const fy = fyDateRange(fyStartYear);
    if (from < fy.from || to > fy.to) {
      return `Dates must fall within financial year ${formatFinancialYearLabel(fyStartYear)} (${formatReportDateShort(fy.from)} to ${formatReportDateShort(fy.to)}).`;
    }
  }

  return null;
}

export function buildTrialBalanceHeading(companyName, period) {
  const name = companyName || 'Company';
  const from = formatReportDateLong(period.from);
  const to = formatReportDateLong(period.to);
  const suffix = period.periodLabel && period.periodLabel !== PERIOD_LABELS.custom
    ? ` (${period.periodLabel})`
    : '';
  return `Trial Balance of "${name}" for the period "${from} to ${to}"${suffix}`;
}

export function buildProfitLossHeading(companyName, period) {
  const name = companyName || 'Company';
  const from = formatReportDateLong(period.from);
  const to = formatReportDateLong(period.to);
  const suffix = period.periodLabel && period.periodLabel !== PERIOD_LABELS.custom
    ? ` (${period.periodLabel})`
    : '';
  return `Statement of Profit and Loss of "${name}" for the period "${from} to ${to}"${suffix}`;
}

export function buildBalanceSheetHeading(companyName, period) {
  const name = companyName || 'Company';
  const asAt = formatReportDateLong(period.asOf || period.to);
  const suffix = period.periodLabel && period.periodLabel !== PERIOD_LABELS.custom
    ? ` (${period.periodLabel})`
    : '';
  return `Balance Sheet of "${name}" as at "${asAt}"${suffix}`;
}

export function comparativeColumnLabels(period) {
  const currentFy = formatFinancialYearLabel(period.fyStartYear);
  const prevFy = formatFinancialYearLabel(period.fyStartYear - 1);
  return { current: `FY ${currentFy}`, previous: `FY ${prevFy}` };
}

/** Merge previous-year amounts into grouped tree by group id. */
export function mergeComparativeGroups(currentGroups = [], previousGroups = []) {
  const prevById = new Map();
  const indexPrev = (nodes) => {
    for (const node of nodes || []) {
      prevById.set(node.id, node);
      indexPrev(node.children);
    }
  };
  indexPrev(previousGroups);

  const walk = (nodes) => (nodes || []).map((node) => {
    const prev = prevById.get(node.id);
    const periodAmount = Math.abs((node.debit || 0) - (node.credit || 0));
    const prevPeriodAmount = prev ? Math.abs((prev.debit || 0) - (prev.credit || 0)) : 0;
    const closingAmount = Math.abs(node.closing_balance ?? node.balance ?? 0);
    const prevClosingAmount = prev ? Math.abs(prev.closing_balance ?? prev.balance ?? 0) : 0;
    return {
      ...node,
      current_amount: periodAmount,
      previous_amount: prevPeriodAmount,
      current_closing: closingAmount,
      previous_closing: prevClosingAmount,
      accounts: (node.accounts || []).map((acct) => {
        const prevAcct = (prev?.accounts || []).find((a) => a.account_code === acct.account_code);
        return {
          ...acct,
          current_amount: Math.abs((acct.debit || 0) - (acct.credit || 0)),
          previous_amount: prevAcct ? Math.abs((prevAcct.debit || 0) - (prevAcct.credit || 0)) : 0,
          current_closing: Math.abs(acct.closing_balance ?? acct.balance ?? 0),
          previous_closing: prevAcct ? Math.abs(prevAcct.closing_balance ?? prevAcct.balance ?? 0) : 0,
        };
      }),
      children: walk(node.children),
    };
  });

  return walk(currentGroups);
}

export function mergeComparativeUnmapped(current = [], previous = []) {
  const prevByCode = new Map((previous || []).map((r) => [r.account_code, r]));
  return (current || []).map((row) => {
    const prev = prevByCode.get(row.account_code);
    return {
      ...row,
      current_amount: Math.abs((row.debit || 0) - (row.credit || 0)),
      previous_amount: prev ? Math.abs((prev.debit || 0) - (prev.credit || 0)) : 0,
      current_closing: Math.abs(row.closing_balance ?? row.balance ?? 0),
      previous_closing: prev ? Math.abs(prev.closing_balance ?? prev.balance ?? 0) : 0,
    };
  });
}

export { addDaysToDateOnly };
