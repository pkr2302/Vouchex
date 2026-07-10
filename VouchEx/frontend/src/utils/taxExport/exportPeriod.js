/** Filter records to a date range (inclusive) on the given date field. */
export function filterRecordsByDateRange(records, startDate, endDate, dateField = 'issue_date') {
  if (!startDate && !endDate) return records || [];
  return (records || []).filter((r) => {
    const raw = r[dateField];
    if (!raw) return false;
    const d = String(raw).includes('T') ? String(raw).split('T')[0] : String(raw).slice(0, 10);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });
}

/** MMYYYY from explicit start date. */
export function filingPeriodFromDate(startDate) {
  if (startDate) {
    const d = new Date(startDate);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
    }
  }
  return null;
}

/** MMYYYY or MMYYYY-MMYYYY range label from invoice/credit note dates. */
export function deriveExportPeriodLabel(invoices = [], creditNotes = []) {
  const months = new Set();
  const add = (dateStr) => {
    if (!dateStr) return;
    const dt = new Date(dateStr);
    if (Number.isNaN(dt.getTime())) return;
    months.add(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  };
  invoices.forEach((i) => add(i.issue_date));
  creditNotes.forEach((c) => add(c.issue_date));

  if (months.size === 0) {
    const n = new Date();
    return `${String(n.getMonth() + 1).padStart(2, '0')}${n.getFullYear()}`;
  }

  const sorted = [...months].sort();
  const fmt = (key) => {
    const [y, m] = key.split('-');
    return `${m}${y}`;
  };
  if (sorted.length === 1) return fmt(sorted[0]);
  return `${fmt(sorted[0])}-${fmt(sorted[sorted.length - 1])}`;
}

export function vouchexGstr1Filename(period) {
  return `GSTR1_Offline_${period}.xlsx`;
}

export function vouchexGstr1JsonFilename(period, gstin = '') {
  const safeGstin = String(gstin || 'GSTIN').replace(/[^\w]/g, '');
  return `GSTR1_${period}_${safeGstin}.json`;
}

/** GST portal offline upload filename pattern. */
export function gstr1PortalJsonFilename(period, gstin = '') {
  const safeGstin = String(gstin || 'GSTIN').replace(/[^\w]/g, '');
  return `returns_${period}_Returns_${safeGstin}_offline.json`;
}

/** Single MMYYYY period for GST portal JSON (one return period per file). */
export function deriveSingleFilingPeriod(invoices = [], creditNotes = [], startDate = null) {
  const fromFilter = filingPeriodFromDate(startDate);
  if (fromFilter) return fromFilter;
  const label = deriveExportPeriodLabel(invoices, creditNotes);
  if (!label.includes('-')) return label;
  return label.split('-')[0];
}

export function vouchexTallyXlsxFilename(period) {
  return `vouchex_tallyreport_(${period}).xlsx`;
}

export function vouchexTallyXmlFilename(period) {
  return `vouchex_tallyreport_(${period}).xml`;
}
