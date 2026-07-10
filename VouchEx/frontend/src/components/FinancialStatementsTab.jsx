import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import { portalApi } from '../services/portalApi';
import { formatDocumentMoney } from '../utils/formatMoney';
import { showApiError } from '../utils/apiErrors';
import { GroupedReportTable } from './GroupedReportTable';
import { GlSyncResultModal } from './GlSyncResultModal';
import NotesToAccountsPanel from './NotesToAccountsPanel';
import LedgerStatementModal from './LedgerStatementModal';
import { PdfPrintModal } from './PdfPrintModal';
import FinancialPeriodBar, { getDefaultAppliedPeriod } from './FinancialPeriodBar';
import { FinancialExportModal } from './FinancialExportModal';
import { frameworkByValue } from '../utils/accountingFramework';
import {
  buildTrialBalanceHeading,
  buildProfitLossHeading,
  buildBalanceSheetHeading,
  comparativeColumnLabels,
  mergeComparativeGroups,
  mergeComparativeUnmapped,
  previousYearPeriod,
} from '../utils/financialPeriod';
import {
  exportTrialBalanceExcel,
  exportProfitLossExcel,
  exportBalanceSheetExcel,
} from '../utils/financialExport';

const TABS = [
  { id: 'trial-balance', label: 'Trial Balance' },
  { id: 'profit-loss', label: 'Profit & Loss' },
  { id: 'balance-sheet', label: 'Balance Sheet' },
  { id: 'notes', label: 'Notes to Accounts' },
];

const FINANCIAL_VIEWS = new Set(['trial-balance', 'profit-loss', 'balance-sheet']);

function buildQuery({ from, to, asOf, grouped, detail }) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (asOf) params.set('as_of', asOf);
  params.set('grouped', grouped ? '1' : '0');
  if (grouped) params.set('detail', detail);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function isGroupedPayload(data) {
  return data?.view_mode === 'grouped' && Array.isArray(data?.groups);
}

function mergeFlatPl(current, previous) {
  const prevIncome = new Map((previous?.income || []).map((r) => [r.account_code, r.amount]));
  const prevExpenses = new Map((previous?.expenses || []).map((r) => [r.account_code, r.amount]));
  return {
    income: (current?.income || []).map((r) => ({ ...r, previous_amount: prevIncome.get(r.account_code) ?? 0 })),
    expenses: (current?.expenses || []).map((r) => ({ ...r, previous_amount: prevExpenses.get(r.account_code) ?? 0 })),
    total_income: current?.total_income ?? 0,
    total_expense: current?.total_expense ?? 0,
    net_profit: current?.net_profit ?? 0,
    prev_total_income: previous?.total_income ?? 0,
    prev_total_expense: previous?.total_expense ?? 0,
    prev_net_profit: previous?.net_profit ?? 0,
  };
}

function mergeFlatBs(current, previous) {
  const mergeCol = (rows, prevRows) => {
    const prevMap = new Map((prevRows || []).map((r) => [r.account_code, r.balance]));
    return (rows || []).map((r) => ({ ...r, previous_balance: prevMap.get(r.account_code) ?? 0 }));
  };
  return {
    assets: mergeCol(current?.assets, previous?.assets),
    liabilities: mergeCol(current?.liabilities, previous?.liabilities),
    equity: mergeCol(current?.equity, previous?.equity),
    totals: current?.totals,
    prev_totals: previous?.totals,
  };
}

export default function FinancialStatementsTab() {
  const { companyDetails } = useSimulator();
  const companyName = companyDetails?.name || 'Company';

  const [activeView, setActiveView] = useState('trial-balance');
  const [appliedPeriod, setAppliedPeriod] = useState(() => getDefaultAppliedPeriod());
  const [draftPeriod, setDraftPeriod] = useState(() => getDefaultAppliedPeriod());
  const [periodError, setPeriodError] = useState('');
  const [detail, setDetail] = useState('condensed');
  const [grouped, setGrouped] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [trialBalance, setTrialBalance] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [prevProfitLoss, setPrevProfitLoss] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [prevBalanceSheet, setPrevBalanceSheet] = useState(null);
  const [notesData, setNotesData] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportKind, setExportKind] = useState(null);
  const [exportAsPdf, setExportAsPdf] = useState(false);
  const [exportCurrent, setExportCurrent] = useState(true);
  const [exportPrevious, setExportPrevious] = useState(true);
  const [exportIncludeNotes, setExportIncludeNotes] = useState(true);
  const [ledgerAccount, setLedgerAccount] = useState(null);

  const colLabels = useMemo(() => comparativeColumnLabels(appliedPeriod), [appliedPeriod]);

  const openLedger = useCallback((row) => {
    if (!row?.gl_account_id) return;
    setLedgerAccount({
      gl_account_id: row.gl_account_id,
      account_code: row.account_code,
      account_name: row.account_name || row.label,
    });
  }, []);

  const plSummaryRows = useMemo(() => {
    const hasCogs = (profitLoss?.total_cogs ?? 0) > 0 || (prevProfitLoss?.total_cogs ?? 0) > 0;
    if (hasCogs) {
      return [
        { label: 'Total Income', current: profitLoss?.total_income ?? 0, previous: prevProfitLoss?.total_income ?? 0 },
        { label: 'Cost of Goods Sold (COGS)', current: profitLoss?.total_cogs ?? 0, previous: prevProfitLoss?.total_cogs ?? 0 },
        { label: 'Gross Profit', current: profitLoss?.gross_profit ?? 0, previous: prevProfitLoss?.gross_profit ?? 0 },
        { label: 'Other Expenses', current: profitLoss?.operating_expense ?? 0, previous: prevProfitLoss?.operating_expense ?? 0 },
        { label: 'Net Profit / (Loss)', current: profitLoss?.net_profit ?? 0, previous: prevProfitLoss?.net_profit ?? 0 },
      ];
    }
    return [
      { label: 'Total Income', current: profitLoss?.total_income ?? 0, previous: prevProfitLoss?.total_income ?? 0 },
      { label: 'Total Expenses', current: profitLoss?.total_expense ?? 0, previous: prevProfitLoss?.total_expense ?? 0 },
      { label: 'Net Profit / (Loss)', current: profitLoss?.net_profit ?? 0, previous: prevProfitLoss?.net_profit ?? 0 },
    ];
  }, [profitLoss, prevProfitLoss]);

  const bsSummaryRows = useMemo(() => [
    { label: 'Total Assets', current: balanceSheet?.totals?.assets ?? 0, previous: prevBalanceSheet?.totals?.assets ?? 0 },
    { label: 'Total Liabilities + Equity', current: balanceSheet?.totals?.liabilities_and_equity ?? 0, previous: prevBalanceSheet?.totals?.liabilities_and_equity ?? 0 },
  ], [balanceSheet, prevBalanceSheet]);

  const loadReports = useCallback(async (period) => {
    if (!period?.from || !period?.to) return;
    setLoading(true);
    setPeriodError('');
    try {
      const prev = previousYearPeriod(period);
      const tbQs = buildQuery({ from: period.from, to: period.to, grouped, detail });
      const plQs = buildQuery({ from: period.from, to: period.to, grouped, detail });
      const bsQs = buildQuery({ asOf: period.asOf || period.to, grouped, detail });
      const prevPlQs = buildQuery({ from: prev.from, to: prev.to, grouped, detail });
      const prevBsQs = buildQuery({ asOf: prev.asOf, grouped, detail });
      const notesQs = buildQuery({ from: period.from, to: period.to, asOf: period.asOf || period.to });

      const [tb, pl, bs, plPrev, bsPrev, notesRes] = await Promise.all([
        portalApi.glTrialBalance(tbQs),
        portalApi.glProfitAndLoss(plQs),
        portalApi.glBalanceSheet(bsQs),
        portalApi.glProfitAndLoss(prevPlQs),
        portalApi.glBalanceSheet(prevBsQs),
        portalApi.glNotesToAccounts(notesQs),
      ]);

      setTrialBalance(tb.trial_balance);
      setProfitLoss(pl.profit_and_loss);
      setPrevProfitLoss(plPrev.profit_and_loss);
      setBalanceSheet(bs.balance_sheet);
      setPrevBalanceSheet(bsPrev.balance_sheet);
      setNotesData(notesRes.notes_to_accounts);
    } catch (err) {
      showApiError('Loading financial statements', err);
    } finally {
      setLoading(false);
    }
  }, [grouped, detail]);

  useEffect(() => {
    loadReports(appliedPeriod);
  }, [appliedPeriod, loadReports]);

  const handleApplyPeriod = (period, error) => {
    if (error) {
      setPeriodError(error);
      return;
    }
    setPeriodError('');
    setDraftPeriod(period);
    setAppliedPeriod(period);
  };

  const applyViewMode = (nextGrouped, nextDetail = detail) => {
    setGrouped(nextGrouped);
    setDetail(nextDetail);
  };

  const runBackfill = async () => {
    setSyncBusy(true);
    try {
      const res = await portalApi.glBackfill();
      setSyncResult(res.backfill);
      setSyncModalOpen(true);
      await loadReports(appliedPeriod);
    } catch (err) {
      showApiError('GL backfill', err);
    } finally {
      setSyncBusy(false);
    }
  };

  const presentationMeta = trialBalance || profitLoss || balanceSheet || {};
  const framework = frameworkByValue(presentationMeta.accounting_framework || 'AS');
  const groupedUnavailable = grouped && trialBalance && !isGroupedPayload(trialBalance);
  const activeDetail = trialBalance?.detail || profitLoss?.detail || balanceSheet?.detail || detail;
  const viewBadge = grouped
    ? (isGroupedPayload(trialBalance) ? `Grouped · ${activeDetail === 'detailed' ? 'Detailed' : 'Condensed'}` : 'Grouped (server not ready)')
    : 'Ledger list';

  const tbHeading = buildTrialBalanceHeading(companyName, appliedPeriod);
  const plHeading = buildProfitLossHeading(companyName, appliedPeriod);
  const bsHeading = buildBalanceSheetHeading(companyName, appliedPeriod);

  const plComparative = useMemo(() => {
    if (!profitLoss) return null;
    if (isGroupedPayload(profitLoss)) {
      return {
        ...profitLoss,
        groups: mergeComparativeGroups(profitLoss.groups, prevProfitLoss?.groups),
        unmapped: mergeComparativeUnmapped(profitLoss.unmapped, prevProfitLoss?.unmapped),
      };
    }
    return mergeFlatPl(profitLoss, prevProfitLoss);
  }, [profitLoss, prevProfitLoss]);

  const bsComparative = useMemo(() => {
    if (!balanceSheet) return null;
    if (isGroupedPayload(balanceSheet)) {
      return {
        ...balanceSheet,
        groups: mergeComparativeGroups(balanceSheet.groups, prevBalanceSheet?.groups),
        unmapped: mergeComparativeUnmapped(balanceSheet.unmapped, prevBalanceSheet?.unmapped),
      };
    }
    return mergeFlatBs(balanceSheet, prevBalanceSheet);
  }, [balanceSheet, prevBalanceSheet]);

  const openExport = (kind, asPdf = false) => {
    setExportKind(kind);
    setExportAsPdf(asPdf);
    setExportCurrent(true);
    setExportPrevious(true);
    setExportIncludeNotes(kind === 'balance-sheet');
    setExportModalOpen(true);
  };

  const handleExportExcel = () => {
    if (activeView === 'trial-balance' && trialBalance) {
      exportTrialBalanceExcel(
        { ...trialBalance, view_mode: isGroupedPayload(trialBalance) ? 'grouped' : 'ledger', detail: activeDetail },
        { heading: tbHeading, companyName }
      );
      return;
    }
    openExport(activeView, false);
  };

  const handleExportPdf = () => {
    if (activeView === 'trial-balance' && trialBalance) {
      setPdfOpen(true);
      return;
    }
    openExport(activeView, true);
  };

  const runExport = () => {
    const opts = {
      companyName,
      period: appliedPeriod,
      heading: exportKind === 'trial-balance' ? tbHeading : exportKind === 'profit-loss' ? plHeading : bsHeading,
      showCurrent: exportCurrent,
      showPrevious: exportPrevious,
      colLabels,
      notes: exportIncludeNotes ? notesData : null,
      summaryRows: exportKind === 'profit-loss' ? plSummaryRows : exportKind === 'balance-sheet' ? bsSummaryRows : [],
    };

    if (exportKind === 'profit-loss' && plComparative) {
      if (exportAsPdf) setPdfOpen(true);
      else exportProfitLossExcel({ ...plComparative, view_mode: isGroupedPayload(profitLoss) ? 'grouped' : 'ledger', detail: activeDetail, prev: prevProfitLoss }, opts);
    } else if (exportKind === 'balance-sheet' && bsComparative) {
      if (exportAsPdf) setPdfOpen(true);
      else exportBalanceSheetExcel({ ...bsComparative, view_mode: isGroupedPayload(balanceSheet) ? 'grouped' : 'ledger', detail: activeDetail, prev: prevBalanceSheet, notes: exportIncludeNotes ? notesData : null }, opts);
    }
    setExportModalOpen(false);
  };

  const canExport = (activeView === 'trial-balance' && trialBalance)
    || (activeView === 'profit-loss' && profitLoss)
    || (activeView === 'balance-sheet' && balanceSheet);

  return (
    <div className="dashboard-tab">
      <div className="table-header-row financial-toolbar" style={{ marginBottom: 12 }}>
        <div>
          <h2 className="chart-title">Financial Statements</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {presentationMeta.framework_label || framework.label}
            {presentationMeta.schedule_division ? ` · ${presentationMeta.schedule_division}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {canExport && (
            <>
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, var(--accent-teal), #0f766e)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={handleExportExcel}
              >
                <FileSpreadsheet size={14} /> Export Excel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={handleExportPdf}
              >
                <Download size={14} /> Export PDF
              </button>
            </>
          )}
          <button type="button" className="btn-secondary" onClick={runBackfill} disabled={syncBusy}>
            {syncBusy ? 'Syncing…' : 'Sync GL from existing data'}
          </button>
        </div>
      </div>

      <FinancialPeriodBar
        draft={draftPeriod}
        onDraftChange={setDraftPeriod}
        onApply={handleApplyPeriod}
        periodError={periodError}
        loading={loading}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }} className="financial-subtabs tab-nav-sub">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`sub-tab-btn ${activeView === t.id ? 'active' : ''}`} onClick={() => setActiveView(t.id)}>
            {t.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {FINANCIAL_VIEWS.has(activeView) && (
          <>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={grouped} disabled={loading} onChange={(e) => applyViewMode(e.target.checked)} />
              Grouped view
            </label>
            {grouped && (
              <>
                <button type="button" className={`sub-tab-btn ${detail === 'condensed' ? 'active' : ''}`} disabled={loading} onClick={() => applyViewMode(true, 'condensed')}>Condensed</button>
                <button type="button" className={`sub-tab-btn ${detail === 'detailed' ? 'active' : ''}`} disabled={loading} onClick={() => applyViewMode(true, 'detailed')}>Detailed</button>
              </>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 10px', borderRadius: 8, background: 'var(--bg-tertiary)' }}>
              {loading ? 'Updating…' : viewBadge}
            </span>
          </>
        )}
      </div>

      {groupedUnavailable && (
        <p style={{ fontSize: 13, color: 'var(--accent-amber)', marginBottom: 12 }}>
          Grouped view is not active on the server yet. Upload the latest GL reporting files, or turn off Grouped view.
        </p>
      )}

      {profitLoss?.books_start_date && appliedPeriod.from < profitLoss.books_start_date && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Reports are limited from books start date ({profitLoss.books_start_date}). Earlier periods are excluded from GL totals.
        </p>
      )}

      {grouped && activeDetail === 'condensed' && FINANCIAL_VIEWS.has(activeView) && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Switch to <strong>Detailed</strong> view to drill down into individual ledger accounts.
        </p>
      )}

      {activeView === 'trial-balance' && trialBalance && (
        <div className="table-card">
          <h3 className="chart-title" style={{ fontSize: 15, lineHeight: 1.45 }}>{tbHeading}</h3>
          {isGroupedPayload(trialBalance) ? (
            <GroupedReportTable
              key={`tb-${activeDetail}`}
              groups={trialBalance.groups}
              unmapped={trialBalance.unmapped}
              mode="tb"
              detail={activeDetail}
              footerTotals={trialBalance.totals}
              onAccountClick={openLedger}
            />
          ) : (
            <div className="premium-table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Account</th><th>Type</th>
                    <th style={{ textAlign: 'right' }}>Opening</th>
                    <th style={{ textAlign: 'right' }}>Debit</th>
                    <th style={{ textAlign: 'right' }}>Credit</th>
                    <th style={{ textAlign: 'right' }}>Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.rows?.map((row) => (
                    <tr key={row.account_code}>
                      <td>{row.account_code}</td>
                      <td
                        style={{ cursor: row.gl_account_id ? 'pointer' : undefined, color: row.gl_account_id ? 'var(--accent-teal)' : undefined, textDecoration: row.gl_account_id ? 'underline' : undefined }}
                        onClick={row.gl_account_id ? () => openLedger(row) : undefined}
                        title={row.gl_account_id ? 'View ledger' : undefined}
                      >
                        {row.account_name}
                      </td>
                      <td>{row.account_type}</td>
                      <td style={{ textAlign: 'right' }}>{formatDocumentMoney(row.opening_balance ?? 0, 'INR')}</td>
                      <td style={{ textAlign: 'right' }}>{formatDocumentMoney(row.debit, 'INR')}</td>
                      <td style={{ textAlign: 'right' }}>{formatDocumentMoney(row.credit, 'INR')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatDocumentMoney(row.closing_balance ?? row.balance ?? 0, 'INR')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}><strong>Totals</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{formatDocumentMoney(trialBalance.totals?.opening_balance ?? 0, 'INR')}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{formatDocumentMoney(trialBalance.totals?.debit, 'INR')}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{formatDocumentMoney(trialBalance.totals?.credit, 'INR')}</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{formatDocumentMoney(trialBalance.totals?.closing_balance ?? 0, 'INR')}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {activeView === 'profit-loss' && plComparative && (
        <div className="table-card">
          <h3 className="chart-title" style={{ fontSize: 15, lineHeight: 1.45 }}>{plHeading}</h3>
          {isGroupedPayload(profitLoss) ? (
            <>
              <GroupedReportTable
                key={`pl-${activeDetail}`}
                groups={plComparative.groups}
                unmapped={plComparative.unmapped}
                mode="amount"
                detail={activeDetail}
                showCurrent
                showPrevious
                amountSource="period"
                currentLabel={colLabels.current}
                previousLabel={colLabels.previous}
                summaryRows={plSummaryRows}
                onAccountClick={openLedger}
              />
            </>
          ) : (
            <div className="premium-table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr><th>Account</th><th style={{ textAlign: 'right' }}>{colLabels.current}</th><th style={{ textAlign: 'right' }}>{colLabels.previous}</th></tr>
                </thead>
                <tbody>
                  <tr><td colSpan={3} style={{ fontWeight: 700, color: 'var(--accent-teal)' }}>Income</td></tr>
                  {plComparative.income?.map((r) => (
                    <tr key={r.account_code}>
                      <td
                        style={{ cursor: r.gl_account_id ? 'pointer' : undefined, color: r.gl_account_id ? 'var(--accent-teal)' : undefined }}
                        onClick={r.gl_account_id ? () => openLedger(r) : undefined}
                      >
                        {r.account_name}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatDocumentMoney(r.amount, 'INR')}</td>
                      <td style={{ textAlign: 'right' }}>{formatDocumentMoney(r.previous_amount ?? 0, 'INR')}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}><td>Total Income</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(plComparative.total_income, 'INR')}</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(plComparative.prev_total_income, 'INR')}</td></tr>
                  {(plComparative.total_cogs ?? 0) > 0 && (
                    <>
                      <tr style={{ fontWeight: 600 }}><td>Cost of Goods Sold (COGS)</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(plComparative.total_cogs, 'INR')}</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(prevProfitLoss?.total_cogs ?? 0, 'INR')}</td></tr>
                      <tr style={{ fontWeight: 700 }}><td>Gross Profit</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(plComparative.gross_profit, 'INR')}</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(prevProfitLoss?.gross_profit ?? 0, 'INR')}</td></tr>
                      <tr style={{ fontWeight: 600 }}><td>Other Expenses</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(plComparative.operating_expense, 'INR')}</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(prevProfitLoss?.operating_expense ?? 0, 'INR')}</td></tr>
                    </>
                  )}
                  <tr><td colSpan={3} style={{ fontWeight: 700, color: 'var(--accent-amber)', paddingTop: 12 }}>Expenses</td></tr>
                  {plComparative.expenses?.map((r) => (
                    <tr key={r.account_code}>
                      <td
                        style={{ cursor: r.gl_account_id ? 'pointer' : undefined, color: r.gl_account_id ? 'var(--accent-teal)' : undefined }}
                        onClick={r.gl_account_id ? () => openLedger(r) : undefined}
                      >
                        {r.account_name}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatDocumentMoney(r.amount, 'INR')}</td>
                      <td style={{ textAlign: 'right' }}>{formatDocumentMoney(r.previous_amount ?? 0, 'INR')}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}><td>Total Expenses</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(plComparative.total_expense, 'INR')}</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(plComparative.prev_total_expense, 'INR')}</td></tr>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border-color)' }}><td>Net Profit / (Loss)</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(plComparative.net_profit, 'INR')}</td><td style={{ textAlign: 'right' }}>{formatDocumentMoney(plComparative.prev_net_profit, 'INR')}</td></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeView === 'balance-sheet' && bsComparative && (
        <div className="table-card">
          <h3 className="chart-title" style={{ fontSize: 15, lineHeight: 1.45 }}>{bsHeading}</h3>
          {isGroupedPayload(balanceSheet) ? (
            <>
              <GroupedReportTable
                key={`bs-${activeDetail}`}
                groups={bsComparative.groups}
                unmapped={bsComparative.unmapped}
                mode="amount"
                detail={activeDetail}
                showCurrent
                showPrevious
                amountSource="closing"
                currentLabel={colLabels.current}
                previousLabel={colLabels.previous}
                summaryRows={bsSummaryRows}
                onAccountClick={openLedger}
              />
            </>
          ) : (
            <div className="premium-table-wrapper">
              <table className="premium-table">
                <thead><tr><th>Account</th><th style={{ textAlign: 'right' }}>{colLabels.current}</th><th style={{ textAlign: 'right' }}>{colLabels.previous}</th></tr></thead>
                <tbody>
                  {['assets', 'liabilities', 'equity'].map((section) => (
                    <React.Fragment key={section}>
                      <tr><td colSpan={3} style={{ fontWeight: 700, textTransform: 'capitalize' }}>{section}</td></tr>
                      {(bsComparative[section] || []).map((r) => (
                        <tr key={r.account_code}>
                          <td
                            style={{ cursor: r.gl_account_id ? 'pointer' : undefined, color: r.gl_account_id ? 'var(--accent-teal)' : undefined }}
                            onClick={r.gl_account_id ? () => openLedger(r) : undefined}
                          >
                            {r.account_name}
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatDocumentMoney(r.balance, 'INR')}</td>
                          <td style={{ textAlign: 'right' }}>{formatDocumentMoney(r.previous_balance ?? 0, 'INR')}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeView === 'notes' && (
        <NotesToAccountsPanel notes={notesData} loading={loading} onRefresh={() => loadReports(appliedPeriod)} frameworkMeta={presentationMeta} appliedPeriod={appliedPeriod} />
      )}

      <FinancialExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title={exportKind === 'balance-sheet' ? 'Export Balance Sheet' : exportKind === 'profit-loss' ? 'Export Profit & Loss' : 'Export Trial Balance'}
        showComparativeOptions={exportKind === 'profit-loss' || exportKind === 'balance-sheet'}
        includeNotesOption={exportKind === 'balance-sheet'}
        exportCurrent={exportCurrent}
        exportPrevious={exportPrevious}
        includeNotes={exportIncludeNotes}
        onExportCurrentChange={setExportCurrent}
        onExportPreviousChange={setExportPrevious}
        onIncludeNotesChange={setExportIncludeNotes}
        onConfirm={runExport}
      />

      {pdfOpen && activeView === 'trial-balance' && trialBalance && (
        <PdfPrintModal screenTitle={tbHeading} onClose={() => setPdfOpen(false)}>
          <h1 style={{ fontSize: 18, marginBottom: 16 }}>{tbHeading}</h1>
          {isGroupedPayload(trialBalance) ? (
            <GroupedReportTable groups={trialBalance.groups} unmapped={trialBalance.unmapped} mode="tb" detail={activeDetail} footerTotals={trialBalance.totals} />
          ) : (
            <div className="premium-table-wrapper">
              <table className="premium-table">
                <thead><tr><th>Account</th><th>Opening</th><th>Debit</th><th>Credit</th><th>Closing</th></tr></thead>
                <tbody>
                  {trialBalance.rows?.map((row) => (
                    <tr key={row.account_code}><td>{row.account_name}</td><td>{formatDocumentMoney(row.opening_balance ?? 0, 'INR')}</td><td>{formatDocumentMoney(row.debit, 'INR')}</td><td>{formatDocumentMoney(row.credit, 'INR')}</td><td>{formatDocumentMoney(row.closing_balance ?? row.balance ?? 0, 'INR')}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PdfPrintModal>
      )}

      {pdfOpen && activeView === 'profit-loss' && plComparative && (
        <PdfPrintModal screenTitle={plHeading} onClose={() => setPdfOpen(false)}>
          <h1 style={{ fontSize: 18, marginBottom: 16 }}>{plHeading}</h1>
          {isGroupedPayload(profitLoss) ? (
            <GroupedReportTable
              groups={plComparative.groups}
              unmapped={plComparative.unmapped}
              mode="amount"
              detail={activeDetail}
              showCurrent={exportCurrent}
              showPrevious={exportPrevious}
              amountSource="period"
              currentLabel={colLabels.current}
              previousLabel={colLabels.previous}
              summaryRows={plSummaryRows}
            />
          ) : (
            <p>Net Profit: {formatDocumentMoney(plComparative.net_profit, 'INR')}</p>
          )}
        </PdfPrintModal>
      )}

      {pdfOpen && activeView === 'balance-sheet' && bsComparative && (
        <PdfPrintModal screenTitle={bsHeading} onClose={() => setPdfOpen(false)}>
          <h1 style={{ fontSize: 18, marginBottom: 16 }}>{bsHeading}</h1>
          {isGroupedPayload(balanceSheet) && (
            <GroupedReportTable
              groups={bsComparative.groups}
              unmapped={bsComparative.unmapped}
              mode="amount"
              detail={activeDetail}
              showCurrent={exportCurrent}
              showPrevious={exportPrevious}
              amountSource="closing"
              currentLabel={colLabels.current}
              previousLabel={colLabels.previous}
              summaryRows={bsSummaryRows}
            />
          )}
          {exportIncludeNotes && notesData && (
            <div style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: 16 }}>Notes to Accounts</h2>
              {(notesData.sections || []).map((section) => (
                <div key={section.id} style={{ marginTop: 12 }}>
                  <h3 style={{ fontSize: 14 }}>{section.title}</h3>
                  <p style={{ fontSize: 11 }}>Total: {formatDocumentMoney(section.total, 'INR')}</p>
                </div>
              ))}
            </div>
          )}
        </PdfPrintModal>
      )}

      <GlSyncResultModal open={syncModalOpen} onClose={() => setSyncModalOpen(false)} result={syncResult} />

      <LedgerStatementModal
        open={Boolean(ledgerAccount)}
        account={ledgerAccount}
        fromDate={appliedPeriod.from}
        toDate={appliedPeriod.to}
        onClose={() => setLedgerAccount(null)}
      />
    </div>
  );
}
