/**
 * Curated India compliance calendar (GST, TDS, Income Tax, ROC).
 * Dates follow common statutory patterns; extensions may apply — disclaimer shown in UI.
 */

export const STATUTORY_DISCLAIMER =
  'Due dates shown are indicative based on standard compliance schedules. Governments may extend or change deadlines via notifications. Always confirm the final due date on the official portal linked below before filing or payment.';

export const CALENDAR_FILTERS = [
  { id: 'all', label: 'All statutory dates' },
  { id: 'gst_regular', label: 'Regular GST (Monthly)' },
  { id: 'gst_qrmp', label: 'QRMP GST' },
  { id: 'gst_composition', label: 'Composition (CMP-08)' },
  { id: 'gst_tds', label: 'GST TDS (GSTR-7 / GSTR-8)' },
  { id: 'tds', label: 'Income Tax TDS deposit' },
  { id: 'income_tax', label: 'Income Tax / Advance tax' },
  { id: 'roc', label: 'ROC / MCA' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateStr(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function nextMonth(y, m) {
  if (m === 12) return [y + 1, 1];
  return [y, m + 1];
}

function addEvent(events, seen, payload) {
  const key = `${payload.date}|${payload.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  events.push(payload);
}

/**
 * @param {number} fromYear
 * @param {number} toYear
 */
export function buildStatutoryDueDates(fromYear = 2025, toYear = 2027) {
  const events = [];
  const seen = new Set();

  for (let y = fromYear; y <= toYear; y += 1) {
    for (let taxMonth = 1; taxMonth <= 12; taxMonth += 1) {
      const period = `${MONTHS[taxMonth - 1]} ${y}`;
      const [dy, dm] = nextMonth(y, taxMonth);

      addEvent(events, seen, {
        id: `gstr1-${y}-${taxMonth}`,
        date: dateStr(dy, dm, 11),
        category: 'gst',
        color: 'gst',
        tags: ['gst_regular', 'all'],
        title: 'GSTR-1 (Monthly filers)',
        description: `GSTR-1 for outward supplies of ${period}. Typical due date: 11th of the following month for regular monthly filers.`,
        officialUrl: 'https://www.gst.gov.in/',
        officialLabel: 'GST Portal',
      });

      addEvent(events, seen, {
        id: `gstr3b-${y}-${taxMonth}`,
        date: dateStr(dy, dm, 20),
        category: 'gst',
        color: 'gst',
        tags: ['gst_regular', 'all'],
        title: 'GSTR-3B (Monthly filers)',
        description: `GSTR-3B summary return and tax payment for ${period}. Typical due date: 20th of the following month.`,
        officialUrl: 'https://www.gst.gov.in/',
        officialLabel: 'GST Portal',
      });

      addEvent(events, seen, {
        id: `gstr7-${y}-${taxMonth}`,
        date: dateStr(dy, dm, 10),
        category: 'gst',
        color: 'gst_tds',
        tags: ['gst_tds', 'all'],
        title: 'GSTR-7 (GST TDS)',
        description: `Return for tax deducted at source under GST for ${period}. Due 10th of the following month.`,
        officialUrl: 'https://www.gst.gov.in/',
        officialLabel: 'GST Portal',
      });

      addEvent(events, seen, {
        id: `gstr8-${y}-${taxMonth}`,
        date: dateStr(dy, dm, 10),
        category: 'gst',
        color: 'gst_tds',
        tags: ['gst_tds', 'all'],
        title: 'GSTR-8 (TCS)',
        description: `Return for tax collected at source (e-commerce operators) for ${period}. Due 10th of the following month.`,
        officialUrl: 'https://www.gst.gov.in/',
        officialLabel: 'GST Portal',
      });

      addEvent(events, seen, {
        id: `tds7-${y}-${taxMonth}`,
        date: dateStr(dy, dm, 7),
        category: 'tds',
        color: 'tds',
        tags: ['tds', 'all'],
        title: 'TDS deposit (7th)',
        description: `Deposit of tax deducted at source (other than section 194-IA/IB/M/S) for ${period}. Due 7th of the following month.`,
        officialUrl: 'https://www.incometax.gov.in/Pages/yearly-deadlines.aspx',
        officialLabel: 'Income Tax Dept — Due dates',
      });
    }

    const qrmpMonths = [
      { fileMonth: 4, quarter: 'Jan–Mar', tags: ['gst_qrmp'] },
      { fileMonth: 7, quarter: 'Apr–Jun', tags: ['gst_qrmp'] },
      { fileMonth: 10, quarter: 'Jul–Sep', tags: ['gst_qrmp'] },
      { fileMonth: 1, fileYear: y + 1, quarter: 'Oct–Dec', tags: ['gst_qrmp'] },
    ];
    qrmpMonths.forEach((q, idx) => {
      const fm = q.fileMonth;
      const fy = q.fileYear ?? y;
      addEvent(events, seen, {
        id: `qrmp-gstr1-${y}-${idx}`,
        date: dateStr(fy, fm, 13),
        category: 'gst',
        color: 'gst_qrmp',
        tags: [...q.tags, 'all'],
        title: 'GSTR-1 (QRMP)',
        description: `Quarterly GSTR-1 for ${q.quarter} ${y} (QRMP taxpayers). Indicative due date: 13th.`,
        officialUrl: 'https://www.gst.gov.in/',
        officialLabel: 'GST Portal',
      });
      addEvent(events, seen, {
        id: `qrmp-gstr3b-${y}-${idx}`,
        date: dateStr(fy, fm, 22),
        category: 'gst',
        color: 'gst_qrmp',
        tags: [...q.tags, 'all'],
        title: 'GSTR-3B (QRMP)',
        description: `Quarterly GSTR-3B for ${q.quarter} ${y} (QRMP). Indicative due date: 22nd (category may vary by turnover).`,
        officialUrl: 'https://www.gst.gov.in/',
        officialLabel: 'GST Portal',
      });
    });

    const cmpMonths = [
      { m: 4, q: 'Jan–Mar' },
      { m: 7, q: 'Apr–Jun' },
      { m: 10, q: 'Jul–Sep' },
      { m: 1, yOff: 1, q: 'Oct–Dec' },
    ];
    cmpMonths.forEach((c, idx) => {
      const fy = y + (c.yOff || 0);
      addEvent(events, seen, {
        id: `cmp08-${y}-${idx}`,
        date: dateStr(fy, c.m, 18),
        category: 'gst',
        color: 'composition',
        tags: ['gst_composition', 'all'],
        title: 'CMP-08 (Composition)',
        description: `Composition scheme statement for quarter ${c.q}. Typical due: 18th of month after quarter.`,
        officialUrl: 'https://www.gst.gov.in/',
        officialLabel: 'GST Portal',
      });
    });

    [
      { m: 6, d: 15, label: 'Advance tax — 15 June (15%)' },
      { m: 9, d: 15, label: 'Advance tax — 15 September (45%)' },
      { m: 12, d: 15, label: 'Advance tax — 15 December (75%)' },
      { m: 3, d: 15, yOff: 1, label: 'Advance tax — 15 March (100%)' },
    ].forEach((a, idx) => {
      const fy = y + (a.yOff || 0);
      addEvent(events, seen, {
        id: `adv-tax-${y}-${idx}`,
        date: dateStr(fy, a.m, a.d),
        category: 'income_tax',
        color: 'income_tax',
        tags: ['income_tax', 'all'],
        title: a.label,
        description: 'Advance income tax instalment for companies and taxpayers under advance tax provisions.',
        officialUrl: 'https://www.incometax.gov.in/Pages/yearly-deadlines.aspx',
        officialLabel: 'Income Tax Dept — Due dates',
      });
    });

    addEvent(events, seen, {
      id: `gstr9-${y}`,
      date: dateStr(y, 12, 31),
      category: 'gst',
      color: 'gst',
      tags: ['gst_regular', 'all'],
      title: 'GSTR-9 / GSTR-9C (Annual)',
      description: `Annual GST return for FY ending Mar ${y}. Due 31 December ${y} (subject to turnover thresholds).`,
      officialUrl: 'https://www.gst.gov.in/',
      officialLabel: 'GST Portal',
    });

    addEvent(events, seen, {
      id: `itr-co-${y}`,
      date: dateStr(y, 10, 31),
      category: 'income_tax',
      color: 'income_tax',
      tags: ['income_tax', 'all'],
      title: 'Income tax return (Companies)',
      description: 'Indicative deadline for company ITR (audit cases may differ). Verify on Income Tax portal.',
      officialUrl: 'https://www.incometax.gov.in/Pages/yearly-deadlines.aspx',
      officialLabel: 'Income Tax Dept — Due dates',
    });

    addEvent(events, seen, {
      id: `mgt7-${y}`,
      date: dateStr(y, 10, 31),
      category: 'roc',
      color: 'roc',
      tags: ['roc', 'all'],
      title: 'ROC — MGT-7 (Annual return)',
      description: 'Annual return filing for companies (indicative; verify AOC-4/MGT-7 due dates on MCA).',
      officialUrl: 'https://www.mca.gov.in/',
      officialLabel: 'MCA Portal',
    });

    addEvent(events, seen, {
      id: `aoc4-${y}`,
      date: dateStr(y, 10, 29),
      category: 'roc',
      color: 'roc',
      tags: ['roc', 'all'],
      title: 'ROC — AOC-4 (Financial statements)',
      description: 'Filing of financial statements with ROC (indicative; adjourned dates may apply).',
      officialUrl: 'https://www.mca.gov.in/',
      officialLabel: 'MCA Portal',
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export const STATUTORY_EVENTS = buildStatutoryDueDates(2025, 2027);

export function filterStatutoryEvents(events, activeFilterIds) {
  if (!activeFilterIds?.length || activeFilterIds.includes('all')) {
    return events;
  }
  return events.filter((ev) => ev.tags.some((t) => activeFilterIds.includes(t)));
}

export function statutoryColorClass(color) {
  const map = {
    gst: 'tax-cal-dot--gst',
    gst_qrmp: 'tax-cal-dot--gst-light',
    gst_tds: 'tax-cal-dot--gst-tds',
    composition: 'tax-cal-dot--composition',
    tds: 'tax-cal-dot--tds',
    income_tax: 'tax-cal-dot--income-tax',
    roc: 'tax-cal-dot--roc',
  };
  return map[color] || 'tax-cal-dot--gst';
}
