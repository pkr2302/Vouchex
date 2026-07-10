/** Shared row flattening with section headers, subtotals, and grand totals (Tally-style). */

function nodeAmounts(node, mode, amountSource) {
  if (mode === 'tb') {
    return {
      opening: node.opening_balance ?? 0,
      debit: node.debit ?? 0,
      credit: node.credit ?? 0,
      closing: node.closing_balance ?? node.balance ?? 0,
    };
  }
  const current = amountSource === 'period'
    ? (node.current_amount ?? Math.abs((node.debit || 0) - (node.credit || 0)))
    : (node.current_closing ?? Math.abs(node.closing_balance ?? node.balance ?? 0));
  const previous = amountSource === 'period'
    ? (node.previous_amount ?? 0)
    : (node.previous_closing ?? 0);
  return { current, previous };
}

function sumRows(rows, mode) {
  if (mode === 'tb') {
    return rows.reduce(
      (acc, r) => ({
        opening: acc.opening + (r.opening ?? 0),
        debit: acc.debit + (r.debit ?? 0),
        credit: acc.credit + (r.credit ?? 0),
        closing: acc.closing + (r.closing ?? 0),
      }),
      { opening: 0, debit: 0, credit: 0, closing: 0 }
    );
  }
  return rows.reduce(
    (acc, r) => ({
      current: acc.current + (r.current ?? 0),
      previous: acc.previous + (r.previous ?? 0),
    }),
    { current: 0, previous: 0 }
  );
}

export function flattenGroupsWithSubtotals(groups, {
  mode = 'tb',
  amountSource = 'closing',
  depth = 0,
  includeAccounts = false,
} = {}) {
  const out = [];

  for (const node of groups || []) {
    const hasChildren = (node.children || []).length > 0;
    const accounts = includeAccounts ? (node.accounts || []) : [];

    if (hasChildren) {
      out.push({ type: 'header', depth, label: node.name });
      for (const acct of accounts) {
        out.push({
          type: 'line',
          depth: depth + 1,
          label: `${acct.account_code} — ${acct.account_name}`,
          gl_account_id: acct.gl_account_id,
          account_code: acct.account_code,
          account_name: acct.account_name,
          ...nodeAmounts(acct, mode, amountSource),
        });
      }
      const childRows = flattenGroupsWithSubtotals(node.children, { mode, amountSource, depth: depth + 1, includeAccounts });
      out.push(...childRows);
      out.push({
        type: 'subtotal',
        depth,
        label: `Total ${node.name}`,
        ...nodeAmounts(node, mode, amountSource),
      });
    } else {
      out.push({
        type: 'line',
        depth,
        label: node.name,
        ...nodeAmounts(node, mode, amountSource),
      });
      for (const acct of accounts) {
        out.push({
          type: 'line',
          depth: depth + 1,
          label: `${acct.account_code} — ${acct.account_name}`,
          gl_account_id: acct.gl_account_id,
          account_code: acct.account_code,
          account_name: acct.account_name,
          ...nodeAmounts(acct, mode, amountSource),
        });
      }
      if (accounts.length > 0) {
        out.push({
          type: 'subtotal',
          depth,
          label: `Total ${node.name}`,
          ...nodeAmounts(node, mode, amountSource),
        });
      }
    }
  }

  return out;
}

export function flattenUnmappedWithSubtotal(unmapped, { mode = 'tb', amountSource = 'closing' } = {}) {
  if (!unmapped?.length) return [];
  const rows = unmapped.map((row) => ({
    type: 'line',
    depth: 1,
    label: `${row.account_code} — ${row.account_name}`,
    gl_account_id: row.gl_account_id,
    account_code: row.account_code,
    account_name: row.account_name,
    ...nodeAmounts(row, mode, amountSource),
  }));
  rows.unshift({ type: 'header', depth: 0, label: 'Unmapped ledgers' });
  rows.push({
    type: 'subtotal',
    depth: 0,
    label: 'Total Unmapped',
    ...sumRows(rows.filter((r) => r.type === 'line'), mode),
  });
  return rows;
}

export { nodeAmounts, sumRows };
