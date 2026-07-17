import { useMemo, useState, useCallback } from 'react';

/**
 * Excel-style column sort + checkbox filters for registry tables.
 *
 * @param {Array} rows — base filtered rows (date/search already applied)
 * @param {Record<string, (row) => string|number|null|undefined>} getters — column value getters (sort uses number when possible; filter stringifies)
 * @param {Record<string, (row) => string|number>} [filterGetters] — optional display values for filter lists
 */
export function useExcelTableState(rows, getters, filterGetters = {}) {
  const [excelSort, setExcelSort] = useState(null);
  const [excelFilters, setExcelFilters] = useState({});

  const setExcelFilterFor = useCallback((key, nextSet) => {
    setExcelFilters((prev) => {
      const copy = { ...prev };
      if (nextSet == null) delete copy[key];
      else copy[key] = nextSet;
      return copy;
    });
  }, []);

  const columnValues = useMemo(() => {
    const out = {};
    Object.keys(getters).forEach((key) => {
      const fg = filterGetters[key] || getters[key];
      out[key] = rows.map((row) => {
        const v = fg(row);
        return v == null || v === '' ? '' : String(v);
      });
    });
    return out;
  }, [rows, getters, filterGetters]);

  const displayedRows = useMemo(() => {
    let next = rows;

    Object.entries(excelFilters).forEach(([key, selected]) => {
      if (!(selected instanceof Set)) return;
      const fg = filterGetters[key] || getters[key];
      if (!fg) return;
      next = next.filter((row) => {
        const raw = fg(row);
        const token = raw == null || raw === '' ? '(Blank)' : String(raw);
        return selected.has(token);
      });
    });

    if (excelSort?.key && getters[excelSort.key]) {
      const dir = excelSort.dir === 'desc' ? -1 : 1;
      const get = getters[excelSort.key];
      next = [...next].sort((a, b) => {
        const va = get(a);
        const vb = get(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * dir;
      });
    }

    return next;
  }, [rows, excelSort, excelFilters, getters, filterGetters]);

  return {
    excelSort,
    setExcelSort,
    excelFilters,
    setExcelFilterFor,
    columnValues,
    displayedRows,
  };
}
