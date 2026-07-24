import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';
import FinancialPeriodBar, { getDefaultAppliedPeriod } from './FinancialPeriodBar';
import { downloadExcelFromCsv } from './portalShared';
import {
  formatDateDDMMYYYY,
  formatDocumentMoney,
  toAmount,
} from '../utils/formatMoney';
import {
  buildSalesSettlementComparison,
  buildPurchaseSettlementComparison,
  formatSettlementCsvSales,
  formatSettlementCsvPurchase,
} from '../utils/settlementComparison';

/**
 * Comparative settlement report:
 * - sales: invoice date vs receipt date + TDS receivable
 * - purchase: bill date vs payment date + TDS deducted
 */
export default function SettlementComparisonReport({ mode = 'sales' }) {
  const {
    invoices,
    receipts,
    creditNotes,
    advanceAdjustments,
    expenses,
    payments,
    debitNotes,
    addConsoleLog,
  } = useSimulator();

  const [appliedPeriod, setAppliedPeriod] = useState(() => getDefaultAppliedPeriod());
  const [draftPeriod, setDraftPeriod] = useState(() => getDefaultAppliedPeriod());
  const [periodError, setPeriodError] = useState('');
  const [onlyWithTds, setOnlyWithTds] = useState(false);
  const [onlyUnsettled, setOnlyUnsettled] = useState(false);

  const isSales = mode === 'sales';

  const report = useMemo(() => {
    if (isSales) {
      return buildSalesSettlementComparison({
        invoices,
        receipts,
        creditNotes,
        advanceAdjustments,
        from: appliedPeriod.from,
        to: appliedPeriod.to,
      });
    }
    return buildPurchaseSettlementComparison({
      expenses,
      payments,
      debitNotes,
      from: appliedPeriod.from,
      to: appliedPeriod.to,
      recordTypes: ['purchase', 'expense'],
    });
  }, [
    isSales,
    invoices,
    receipts,
    creditNotes,
    advanceAdjustments,
    expenses,
    payments,
    debitNotes,
    appliedPeriod.from,
    appliedPeriod.to,
  ]);

  const rows = useMemo(() => {
    let list = report.rows || [];
    if (onlyWithTds) {
      list = list.filter((r) =>
        isSales ? toAmount(r.tds_receivable) > 0.009 : toAmount(r.tds_deducted) > 0.009
      );
    }
    if (onlyUnsettled) {
      list = list.filter((r) => toAmount(r.outstanding) > 0.009);
    }
    return list;
  }, [report.rows, onlyWithTds, onlyUnsettled, isSales]);

  const displayTotals = useMemo(() => {
    if (!onlyWithTds && !onlyUnsettled) return report.totals || {};
    const seen = new Set();
    let docAmount = 0;
    let cash = 0;
    let tds = 0;
    let discount = 0;
    let outstanding = 0;
    rows.forEach((r) => {
      cash += isSales ? r.cash_received : r.cash_paid;
      tds += isSales ? r.tds_receivable : r.tds_deducted;
      if (isSales) discount += r.discount_allowed;
      const id = isSales ? r.invoice_id : r.expense_id;
      if (!seen.has(id)) {
        seen.add(id);
        docAmount += isSales ? r.invoice_amount : r.bill_amount;
        outstanding += r.outstanding;
      }
    });
    return isSales
      ? {
          invoices: seen.size,
          invoice_amount: docAmount,
          cash_received: cash,
          tds_receivable: tds,
          discount_allowed: discount,
          outstanding,
        }
      : {
          bills: seen.size,
          bill_amount: docAmount,
          cash_paid: cash,
          tds_deducted: tds,
          outstanding,
        };
  }, [rows, onlyWithTds, onlyUnsettled, report.totals, isSales]);

  const handleApplyPeriod = (period, error) => {
    if (error) {
      setPeriodError(error);
      return;
    }
    setPeriodError('');
    setDraftPeriod(period);
    setAppliedPeriod(period);
  };

  const handleExport = (format) => {
    const filteredReport = { ...report, rows };
    const csv = isSales
      ? formatSettlementCsvSales(filteredReport)
      : formatSettlementCsvPurchase(filteredReport);
    const base = isSales ? 'sales_invoice_receipt_comparison' : 'purchase_bill_payment_comparison';
    if (format === 'csv') {
      const encodedUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
      const link = document.createElement('a');
      link.href = encodedUri;
      link.download = `vouchex_${base}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadExcelFromCsv(csv, isSales ? 'SALES SETTLEMENT' : 'PURCHASE SETTLEMENT', `vouchex_${base}.xls`);
    }
    addConsoleLog?.(
      'event',
      `GET /api/reports/${base}?format=${format}`,
      `Exported ${isSales ? 'sales invoice↔receipt' : 'purchase bill↔payment'} comparison as ${format.toUpperCase()}.`
    );
  };

  const totals = displayTotals;

  return (
    <div className="settlement-comparison">
      <div className="table-header-row" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h3 className="chart-title" style={{ margin: 0 }}>
            {isSales ? 'Invoice ↔ Receipt comparison' : 'Bill ↔ Payment comparison'}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {isSales
              ? 'Invoice raise date vs receipt booking date, cash collected, and TDS receivable — side by side.'
              : 'Purchase/expense bill date vs payment date, cash paid, and TDS deducted — side by side.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '6px 12px' }}
            onClick={() => handleExport('csv')}
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, var(--accent-teal), #0f766e)', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '6px 12px' }}
            onClick={() => handleExport('excel')}
          >
            <FileSpreadsheet size={12} /> Export Excel
          </button>
        </div>
      </div>

      <FinancialPeriodBar
        draft={draftPeriod}
        onDraftChange={setDraftPeriod}
        onApply={handleApplyPeriod}
        periodError={periodError}
      />

      <div className="settlement-comparison__filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, margin: '12px 0 16px', fontSize: 12 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyWithTds} onChange={(e) => setOnlyWithTds(e.target.checked)} />
          {isSales ? 'Only rows with TDS receivable' : 'Only rows with TDS deducted'}
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyUnsettled} onChange={(e) => setOnlyUnsettled(e.target.checked)} />
          Only unsettled bills
        </label>
      </div>

      <div className="settlement-comparison__summary" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 14, fontSize: 13 }}>
        {isSales ? (
          <>
            <span>Invoices: <strong>{totals.invoices || 0}</strong></span>
            <span>Invoiced: <strong>{formatDocumentMoney(totals.invoice_amount, 'INR')}</strong></span>
            <span>Cash received: <strong>{formatDocumentMoney(totals.cash_received, 'INR')}</strong></span>
            <span>TDS receivable: <strong style={{ color: 'var(--accent-teal)' }}>{formatDocumentMoney(totals.tds_receivable, 'INR')}</strong></span>
            <span>Outstanding: <strong style={{ color: 'var(--accent-amber)' }}>{formatDocumentMoney(totals.outstanding, 'INR')}</strong></span>
          </>
        ) : (
          <>
            <span>Bills: <strong>{totals.bills || 0}</strong></span>
            <span>Billed: <strong>{formatDocumentMoney(totals.bill_amount, 'INR')}</strong></span>
            <span>Cash paid: <strong>{formatDocumentMoney(totals.cash_paid, 'INR')}</strong></span>
            <span>TDS deducted: <strong style={{ color: 'var(--accent-teal)' }}>{formatDocumentMoney(totals.tds_deducted, 'INR')}</strong></span>
            <span>Outstanding: <strong style={{ color: 'var(--accent-amber)' }}>{formatDocumentMoney(totals.outstanding, 'INR')}</strong></span>
          </>
        )}
      </div>

      <div className="premium-table-wrapper settlement-comparison__table">
        <table className="premium-table">
          <thead>
            {isSales ? (
              <tr>
                <th colSpan={4} className="settlement-comparison__group settlement-comparison__group--left">Invoice raised</th>
                <th colSpan={6} className="settlement-comparison__group settlement-comparison__group--right">Receipt booked</th>
                <th colSpan={2} className="settlement-comparison__group">Balance</th>
              </tr>
            ) : (
              <tr>
                <th colSpan={5} className="settlement-comparison__group settlement-comparison__group--left">Purchase / bill raised</th>
                <th colSpan={5} className="settlement-comparison__group settlement-comparison__group--right">Payment booked</th>
                <th colSpan={2} className="settlement-comparison__group">Balance</th>
              </tr>
            )}
            {isSales ? (
              <tr>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Invoice Date</th>
                <th style={{ textAlign: 'right' }}>Invoice Amt</th>
                <th>Receipt No</th>
                <th>Receipt Date</th>
                <th style={{ textAlign: 'right' }}>Cash Received</th>
                <th style={{ textAlign: 'right' }}>TDS Receivable</th>
                <th style={{ textAlign: 'right' }}>Discount</th>
                <th style={{ textAlign: 'right' }}>Days</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
                <th>Status</th>
              </tr>
            ) : (
              <tr>
                <th>Bill No</th>
                <th>Vendor Bill</th>
                <th>Vendor</th>
                <th>Bill Date</th>
                <th style={{ textAlign: 'right' }}>Bill Amt</th>
                <th>Payment No</th>
                <th>Payment Date</th>
                <th style={{ textAlign: 'right' }}>Cash Paid</th>
                <th style={{ textAlign: 'right' }}>TDS Deducted</th>
                <th style={{ textAlign: 'right' }}>Days</th>
                <th style={{ textAlign: 'right' }}>Outstanding</th>
                <th>Status</th>
              </tr>
            )}
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={12} className="empty-state">
                  No {isSales ? 'invoices' : 'bills'} in this period
                  {onlyWithTds || onlyUnsettled ? ' matching the selected filters' : ''}.
                </td>
              </tr>
            )}
            {isSales &&
              rows.map((r) => (
                <tr key={r.key} className={!r.has_settlement ? 'settlement-comparison__row--open' : undefined}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.invoice_number}</td>
                  <td>{r.party}</td>
                  <td>{formatDateDDMMYYYY(r.invoice_date)}</td>
                  <td style={{ textAlign: 'right' }}>{formatDocumentMoney(r.invoice_amount, r.currency)}</td>
                  <td>{r.receipt_number || '—'}</td>
                  <td>{r.receipt_date ? formatDateDDMMYYYY(r.receipt_date) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {r.has_settlement ? formatDocumentMoney(r.cash_received, r.currency) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: toAmount(r.tds_receivable) > 0 ? 700 : 400, color: toAmount(r.tds_receivable) > 0 ? 'var(--accent-teal)' : undefined }}>
                    {r.has_settlement ? formatDocumentMoney(r.tds_receivable, r.currency) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.has_settlement ? formatDocumentMoney(r.discount_allowed, r.currency) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.days_to_collect == null ? '—' : r.days_to_collect}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: toAmount(r.outstanding) > 0.009 ? 'var(--accent-amber)' : 'var(--accent-green, #059669)' }}>
                    {formatDocumentMoney(r.outstanding, r.currency)}
                  </td>
                  <td>
                    <span className={`status-badge ${String(r.status).toLowerCase().includes('paid') && !String(r.status).toLowerCase().includes('partial') ? 'paid' : 'unpaid'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            {!isSales &&
              rows.map((r) => (
                <tr key={r.key} className={!r.has_settlement ? 'settlement-comparison__row--open' : undefined}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.bill_number}</td>
                  <td>{r.vendor_bill_no || '—'}</td>
                  <td>{r.party}</td>
                  <td>{formatDateDDMMYYYY(r.bill_date)}</td>
                  <td style={{ textAlign: 'right' }}>{formatDocumentMoney(r.bill_amount, r.currency)}</td>
                  <td>{r.payment_number || '—'}</td>
                  <td>{r.payment_date ? formatDateDDMMYYYY(r.payment_date) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {r.has_settlement ? formatDocumentMoney(r.cash_paid, r.currency) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: toAmount(r.tds_deducted) > 0 ? 700 : 400, color: toAmount(r.tds_deducted) > 0 ? 'var(--accent-teal)' : undefined }}>
                    {r.has_settlement ? formatDocumentMoney(r.tds_deducted, r.currency) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {r.days_to_pay == null ? '—' : r.days_to_pay}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: toAmount(r.outstanding) > 0.009 ? 'var(--accent-amber)' : 'var(--accent-green, #059669)' }}>
                    {formatDocumentMoney(r.outstanding, r.currency)}
                  </td>
                  <td>
                    <span className={`status-badge ${String(r.status).toLowerCase().includes('paid') && !String(r.status).toLowerCase().includes('partial') ? 'paid' : 'unpaid'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
