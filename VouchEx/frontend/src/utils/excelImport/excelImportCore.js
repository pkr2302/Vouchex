import * as XLSX from 'xlsx';
import { toAmount, dateOnly } from '../formatMoney';

/** Normalize header labels for flexible column matching. */
export function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[₹$€£]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizePartyKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function findPartyByName(list, name, extraKeys = []) {
  const key = normalizePartyKey(name);
  if (!key) return null;
  const match = list.find((row) => {
    if (normalizePartyKey(row.name) === key) return true;
    return extraKeys.some((k) => normalizePartyKey(row[k]) === key);
  });
  return match || null;
}

/** Parse Excel / CSV date cells into YYYY-MM-DD. */
export function parseImportDate(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${m}-${d}`;
    }
  }
  const raw = String(value).trim();
  const iso = dateOnly(raw);
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;

  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let y = parseInt(dmy[3], 10);
    if (y < 100) y += 2000;
    const m = String(parseInt(dmy[2], 10)).padStart(2, '0');
    const d = String(parseInt(dmy[1], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

export function cellStr(row, aliases, fallback = '') {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (row[key] != null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return fallback;
}

export function cellAmount(row, aliases, fallback = 0) {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (row[key] != null && String(row[key]).trim() !== '') {
      return toAmount(row[key]);
    }
  }
  return fallback;
}

export function cellDate(row, aliases, fallback = '') {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (row[key] != null && String(row[key]).trim() !== '') {
      const parsed = parseImportDate(row[key]);
      if (parsed) return parsed;
    }
  }
  return fallback;
}

export function cellBool(row, aliases, fallback = false) {
  const raw = cellStr(row, aliases, '');
  if (!raw) return fallback;
  const v = raw.toLowerCase();
  if (['1', 'y', 'yes', 'true', 'eligible', 'paid'].includes(v)) return true;
  if (['0', 'n', 'no', 'false', 'unpaid', 'ineligible'].includes(v)) return false;
  return fallback;
}

/**
 * Read first sheet of an xlsx/xls/csv file into normalized objects.
 * Keys are normalizeHeader(header).
 */
export async function readSpreadsheetRows(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Workbook has no sheets.');
  const sheet = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  if (!aoa.length) throw new Error('Sheet is empty.');

  let headerIdx = aoa.findIndex((row) =>
    (row || []).some((cell) => String(cell || '').trim() !== '')
  );
  if (headerIdx < 0) throw new Error('Could not find a header row.');

  const headers = (aoa[headerIdx] || []).map((h) => normalizeHeader(h));
  if (!headers.some(Boolean)) throw new Error('Header row is empty.');

  const rows = [];
  for (let r = headerIdx + 1; r < aoa.length; r += 1) {
    const line = aoa[r] || [];
    const blank = line.every((cell) => cell == null || String(cell).trim() === '');
    if (blank) continue;
    const obj = {};
    headers.forEach((h, c) => {
      if (!h) return;
      obj[h] = line[c];
    });
    rows.push({ __row: r + 1, ...obj });
  }
  return { sheetName, rows, headers };
}

export function downloadWorkbook(filename, sheetName, aoa) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

export async function runSequentialImport(items, worker, { onProgress } = {}) {
  const results = { ok: 0, failed: 0, skipped: 0, errors: [] };
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    onProgress?.({ index: i + 1, total: items.length, label: item.label || `#${i + 1}` });
    try {
      const outcome = await worker(item, i);
      if (outcome === 'skipped') results.skipped += 1;
      else results.ok += 1;
    } catch (err) {
      results.failed += 1;
      const validation = err?.data?.errors;
      let message = err?.data?.message || err?.message || String(err);
      if (validation && typeof validation === 'object') {
        const first = Object.values(validation).flat().find(Boolean);
        if (first) message = String(first);
      }
      results.errors.push({
        label: item.label || `Row ${item.row || i + 1}`,
        message,
      });
    }
  }
  return results;
}
