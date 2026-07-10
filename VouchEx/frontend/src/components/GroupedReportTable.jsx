import { formatDocumentMoney } from '../utils/formatMoney';
import { flattenGroupsWithSubtotals, flattenUnmappedWithSubtotal } from '../utils/financialReportRows';

function AmountCells({ amounts, mode, showCurrent, showPrevious, bold = false, fontSize }) {
  const style = { textAlign: 'right', fontWeight: bold ? 700 : undefined, fontSize };
  if (mode === 'tb') {
    return (
      <>
        <td style={style}>{formatDocumentMoney(amounts.opening ?? 0, 'INR')}</td>
        <td style={style}>{formatDocumentMoney(amounts.debit ?? 0, 'INR')}</td>
        <td style={style}>{formatDocumentMoney(amounts.credit ?? 0, 'INR')}</td>
        <td style={{ ...style, fontWeight: 700 }}>{formatDocumentMoney(amounts.closing ?? 0, 'INR')}</td>
      </>
    );
  }
  return (
    <>
      {showCurrent && <td style={style}>{formatDocumentMoney(amounts.current ?? 0, 'INR')}</td>}
      {showPrevious && <td style={{ ...style, color: bold ? undefined : 'var(--text-muted)' }}>{formatDocumentMoney(amounts.previous ?? 0, 'INR')}</td>}
    </>
  );
}

function ReportRow({ row, mode, showCurrent, showPrevious, colSpan, onAccountClick }) {
  const pad = 8 + (row.depth || 0) * 18;
  const isHeader = row.type === 'header';
  const isSubtotal = row.type === 'subtotal';
  const isGrand = row.type === 'grand';
  const clickable = row.type === 'line' && row.gl_account_id && onAccountClick;

  if (isHeader) {
    return (
      <tr>
        <td colSpan={colSpan} style={{ paddingLeft: pad, fontWeight: 700, paddingTop: 10, color: 'var(--text-primary)' }}>
          {row.label}
        </td>
      </tr>
    );
  }

  return (
    <tr style={{
      background: isSubtotal || isGrand ? 'var(--bg-tertiary)' : undefined,
      borderTop: isGrand ? '2px solid var(--border-color)' : undefined,
    }}
    >
      <td
        style={{
          paddingLeft: pad + (isSubtotal ? 8 : 0),
          fontWeight: isSubtotal || isGrand ? 700 : isSubtotal ? 600 : 400,
          fontStyle: isSubtotal ? 'italic' : undefined,
          fontSize: row.type === 'line' && row.depth > 1 ? 12 : undefined,
          color: clickable ? 'var(--accent-teal)' : (row.type === 'line' && row.depth > 1 ? 'var(--text-muted)' : undefined),
          cursor: clickable ? 'pointer' : undefined,
          textDecoration: clickable ? 'underline' : undefined,
        }}
        onClick={clickable ? () => onAccountClick(row) : undefined}
        title={clickable ? 'View ledger statement' : undefined}
      >
        {row.label}
      </td>
      <AmountCells
        amounts={row}
        mode={mode}
        showCurrent={showCurrent}
        showPrevious={showPrevious}
        bold={isSubtotal || isGrand}
        fontSize={row.type === 'line' && row.depth > 1 ? 12 : undefined}
      />
    </tr>
  );
}

export function GroupedReportTable({
  groups,
  unmapped = [],
  mode = 'tb',
  detail = 'condensed',
  emptyLabel = 'No data',
  showCurrent = true,
  showPrevious = false,
  amountSource = 'closing',
  currentLabel = 'Current Year',
  previousLabel = 'Previous Year',
  footerTotals = null,
  summaryRows = [],
  onAccountClick = null,
}) {
  if (!groups?.length && !unmapped?.length && !summaryRows?.length) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  const includeAccounts = detail === 'detailed';
  const flatRows = [
    ...flattenGroupsWithSubtotals(groups, { mode, amountSource, includeAccounts }),
    ...flattenUnmappedWithSubtotal(unmapped, { mode, amountSource }),
    ...(summaryRows || []).map((r) => ({ ...r, type: r.type || 'grand' })),
  ];

  const colSpan = mode === 'tb' ? 5 : 1 + (showCurrent ? 1 : 0) + (showPrevious ? 1 : 0);

  const footerRow = footerTotals && mode === 'tb' ? {
    type: 'grand',
    depth: 0,
    label: 'Grand Total',
    opening: footerTotals.opening_balance ?? 0,
    debit: footerTotals.debit ?? 0,
    credit: footerTotals.credit ?? 0,
    closing: footerTotals.closing_balance ?? 0,
  } : null;

  return (
    <div className="premium-table-wrapper">
      <table className="premium-table">
        <thead>
          <tr>
            <th>Group / Account</th>
            {mode === 'tb' && (
              <>
                <th style={{ textAlign: 'right' }}>Opening</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Credit</th>
                <th style={{ textAlign: 'right' }}>Closing</th>
              </>
            )}
            {mode === 'amount' && (
              <>
                {showCurrent && <th style={{ textAlign: 'right' }}>{currentLabel}</th>}
                {showPrevious && <th style={{ textAlign: 'right' }}>{previousLabel}</th>}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {flatRows.map((row, idx) => (
            <ReportRow
              key={`${row.type}-${row.label}-${idx}`}
              row={row}
              mode={mode}
              showCurrent={showCurrent}
              showPrevious={showPrevious}
              colSpan={colSpan}
              onAccountClick={onAccountClick}
            />
          ))}
          {footerRow && (
            <ReportRow row={footerRow} mode={mode} showCurrent={showCurrent} showPrevious={showPrevious} colSpan={colSpan} />
          )}
        </tbody>
      </table>
    </div>
  );
}
