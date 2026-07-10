/** Chart-of-accounts / ledger entries may be plain strings (legacy) or { id, name }. */
export function ledgerName(entry) {
  if (entry == null) return '';
  return typeof entry === 'string' ? entry : String(entry.name ?? '');
}

export function ledgerId(entry) {
  if (entry == null || typeof entry === 'string') return null;
  return entry.id ?? null;
}
