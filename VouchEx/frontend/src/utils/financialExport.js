import { downloadExcelFromCsv, downloadExcelMultiSheet } from '../components/portalShared';
import { formatReportDateShort } from './financialPeriod';
import { flattenGroupsWithSubtotals, flattenUnmappedWithSubtotal } from './financialReportRows';

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function moneyPlain(amount) {
  return Number(amount || 0).toFixed(2);
}

function indentLabel(label, depth) {
  return `${'  '.repeat(depth || 0)}${label}`;
}

function buildGroupedExportRows(data, mode, amountSource, includeAccounts = false) {
  return [
    ...flattenGroupsWithSubtotals(data.groups, { mode, amountSource, includeAccounts }),
    ...flattenUnmappedWithSubtotal(data.unmapped, { mode, amountSource }),
  ];
}

export function exportTrialBalanceExcel(data, { heading } = {}) {
  const lines = [
    escapeCsv(heading || 'Trial Balance'),
    `Period,${escapeCsv(formatReportDateShort(data?.from))} to ${escapeCsv(formatReportDateShort(data?.to || data?.as_of))}`,
    '',
    'Account,Opening,Debit,Credit,Closing',
  ];

  if (data?.view_mode === 'grouped' || Array.isArray(data?.groups)) {
    const flatRows = buildGroupedExportRows(data, 'tb', 'closing', data.detail === 'detailed');
    for (const row of flatRows) {
      if (row.type === 'header') {
        lines.push([escapeCsv(indentLabel(row.label, row.depth)), '', '', '', ''].join(','));
      } else {
        lines.push([
          escapeCsv(indentLabel(row.label, row.depth)),
          moneyPlain(row.opening),
          moneyPlain(row.debit),
          moneyPlain(row.credit),
          moneyPlain(row.closing),
        ].join(','));
      }
    }
    if (data.totals) {
      lines.push([
        'Grand Total',
        moneyPlain(data.totals.opening_balance),
        moneyPlain(data.totals.debit),
        moneyPlain(data.totals.credit),
        moneyPlain(data.totals.closing_balance),
      ].join(','));
    }
  } else {
    for (const row of data.rows || []) {
      lines.push([
        escapeCsv(`${row.account_code} — ${row.account_name}`),
        moneyPlain(row.opening_balance ?? 0),
        moneyPlain(row.debit),
        moneyPlain(row.credit),
        moneyPlain(row.closing_balance ?? row.balance ?? 0),
      ].join(','));
    }
    if (data.totals) {
      lines.push([
        'Grand Total',
        moneyPlain(data.totals.opening_balance),
        moneyPlain(data.totals.debit),
        moneyPlain(data.totals.credit),
        moneyPlain(data.totals.closing_balance),
      ].join(','));
    }
  }

  downloadExcelFromCsv(lines.join('\n'), 'TRIAL BALANCE', 'vouchex_trial_balance.xls');
}

export function exportProfitLossExcel(data, { heading, showCurrent = true, showPrevious = true, colLabels = {}, summaryRows = [] } = {}) {
  const headers = ['Line item'];
  if (showCurrent) headers.push(colLabels.current || 'Current Year');
  if (showPrevious) headers.push(colLabels.previous || 'Previous Year');

  const lines = [escapeCsv(heading || 'Profit and Loss'), '', headers.join(',')];

  const addAmountRow = (label, currentVal, previousVal) => {
    const cols = [escapeCsv(label)];
    if (showCurrent) cols.push(moneyPlain(currentVal));
    if (showPrevious) cols.push(moneyPlain(previousVal));
    lines.push(cols.join(','));
  };

  if (data?.view_mode === 'grouped' || Array.isArray(data?.groups)) {
    const flatRows = buildGroupedExportRows(data, 'amount', 'period', data.detail === 'detailed');
    for (const row of flatRows) {
      if (row.type === 'header') {
        addAmountRow(indentLabel(row.label, row.depth), '', '');
      } else {
        addAmountRow(indentLabel(row.label, row.depth), row.current, row.previous);
      }
    }
    for (const row of summaryRows) {
      addAmountRow(row.label, row.current, row.previous);
    }
  } else {
    for (const row of data.income || []) {
      addAmountRow(row.account_name, row.amount, row.previous_amount ?? 0);
    }
    addAmountRow('Total Income', data.total_income, data.prev_total_income ?? 0);
    for (const row of data.expenses || []) {
      addAmountRow(row.account_name, row.amount, row.previous_amount ?? 0);
    }
    addAmountRow('Total Expenses', data.total_expense, data.prev_total_expense ?? 0);
    addAmountRow('Net Profit / (Loss)', data.net_profit, data.prev_net_profit ?? 0);
  }

  downloadExcelFromCsv(lines.join('\n'), 'PROFIT AND LOSS', 'vouchex_profit_and_loss.xls');
}

function noteSectionToSheet(section) {
  const rows = [[section.title], [section.description || ''], ['']];
  if (section.id === 'unmapped_ledgers') {
    rows.push(['Account', 'Code', 'Type', 'Debit', 'Credit', 'Balance']);
    for (const row of section.rows || []) {
      rows.push([row.account_name, row.account_code, row.account_type || '', moneyPlain(row.debit), moneyPlain(row.credit), moneyPlain(row.balance)]);
    }
  } else if (section.id === 'tax_balances') {
    rows.push(['Account', 'Code', 'Balance']);
    for (const row of section.rows || []) {
      rows.push([row.account_name, row.account_code, moneyPlain(row.balance)]);
    }
  } else {
    rows.push(['Party / Ledger', 'Code', 'Balance']);
    for (const row of section.rows || []) {
      rows.push([row.party_name || row.account_name, row.account_code, moneyPlain(row.balance)]);
    }
  }
  rows.push(['Total', '', moneyPlain(section.total)]);
  return rows;
}

export function exportBalanceSheetExcel(data, {
  heading,
  showCurrent = true,
  showPrevious = true,
  colLabels = {},
  notes = null,
  summaryRows = [],
} = {}) {
  const headers = ['Line item'];
  if (showCurrent) headers.push(colLabels.current || 'Current Year');
  if (showPrevious) headers.push(colLabels.previous || 'Previous Year');

  const bsRows = [[heading || 'Balance Sheet'], [''], headers];

  const addAmountRow = (label, currentVal, previousVal) => {
    const cells = [label];
    if (showCurrent) cells.push(moneyPlain(currentVal));
    if (showPrevious) cells.push(moneyPlain(previousVal));
    bsRows.push(cells);
  };

  if (data?.view_mode === 'grouped' || Array.isArray(data?.groups)) {
    const flatRows = buildGroupedExportRows(data, 'amount', 'closing', data.detail === 'detailed');
    for (const row of flatRows) {
      if (row.type === 'header') {
        addAmountRow(indentLabel(row.label, row.depth), '', '');
      } else {
        addAmountRow(indentLabel(row.label, row.depth), row.current, row.previous);
      }
    }
    for (const row of summaryRows) {
      addAmountRow(row.label, row.current, row.previous);
    }
  } else {
    for (const section of ['assets', 'liabilities', 'equity']) {
      addAmountRow(section.toUpperCase(), '', '');
      for (const row of data[section] || []) {
        addAmountRow(row.account_name, row.balance, row.previous_balance ?? 0);
      }
    }
    for (const row of summaryRows) {
      addAmountRow(row.label, row.current, row.previous);
    }
  }

  const sheets = [{ name: 'Balance Sheet', rows: bsRows }];

  if (notes?.sections?.length) {
    for (const section of notes.sections) {
      const shortName = section.title.replace(/^Note — /, '').slice(0, 31);
      sheets.push({ name: shortName || section.id, rows: noteSectionToSheet(section) });
    }
  }

  if (sheets.length === 1) {
    const lines = bsRows.map((cells) => cells.map((c) => escapeCsv(c)).join(','));
    downloadExcelFromCsv(lines.join('\n'), 'BALANCE SHEET', 'vouchex_balance_sheet.xls');
  } else {
    downloadExcelMultiSheet(sheets, 'vouchex_balance_sheet.xls');
  }
}

export function exportNotesToAccountsExcel(notes, { companyName = 'Company' } = {}) {
  const title = notes?.report_titles?.notes_to_accounts || 'Notes to Accounts';
  const sheets = (notes?.sections || []).map((section) => ({
    name: section.title.replace(/^Note — /, '').slice(0, 31) || section.id,
    rows: [[`${companyName} — ${title}`], [`As of ${formatReportDateShort(notes?.as_of)}`], [''], ...noteSectionToSheet(section)],
  }));
  if (!sheets.length) {
    downloadExcelFromCsv(`${escapeCsv(companyName)} — Notes`, 'NOTES', 'vouchex_notes_to_accounts.xls');
    return;
  }
  downloadExcelMultiSheet(sheets, 'vouchex_notes_to_accounts.xls');
}
