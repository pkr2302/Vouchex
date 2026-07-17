import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, Filter } from 'lucide-react';

/**
 * Excel-style column header: Sort Asc/Desc + value checkbox filter.
 *
 * @param {string} label
 * @param {string} columnKey
 * @param {Array<string|number>} values — unique-capable list from all rows (pre-column-filter)
 * @param {{ key: string, dir: 'asc'|'desc' }|null} sort
 * @param {(next: { key: string, dir: 'asc'|'desc' }|null) => void} onSort
 * @param {Set<string>|null} selected — null = all selected
 * @param {(next: Set<string>|null) => void} onFilter
 * @param {string} [className]
 * @param {string} [title]
 * @param {'text'|'number'} [valueType]
 */
export function ExcelColumnFilter({
  label,
  columnKey,
  values = [],
  sort,
  onSort,
  selected,
  onFilter,
  className = '',
  title,
  valueType = 'text',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(null);
  const rootRef = useRef(null);

  const uniqueSorted = useMemo(() => {
    const set = new Set(values.map((v) => (v == null || v === '' ? '(Blank)' : String(v))));
    const list = [...set];
    list.sort((a, b) => {
      if (a === '(Blank)') return 1;
      if (b === '(Blank)') return -1;
      if (valueType === 'number') {
        const na = Number(String(a).replace(/[^\d.-]/g, ''));
        const nb = Number(String(b).replace(/[^\d.-]/g, ''));
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      }
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    return list;
  }, [values, valueType]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return uniqueSorted;
    return uniqueSorted.filter((v) => v.toLowerCase().includes(q));
  }, [uniqueSorted, search]);

  const isFiltered = selected instanceof Set;
  const isSorted = sort?.key === columnKey;
  const active = isFiltered || isSorted;

  useEffect(() => {
    if (!open) return undefined;
    setSearch('');
    setDraft(selected instanceof Set ? new Set(selected) : new Set(uniqueSorted));
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, selected, uniqueSorted]);

  const allVisibleSelected =
    draft instanceof Set && filteredOptions.length > 0 && filteredOptions.every((v) => draft.has(v));

  const toggleAllVisible = () => {
    setDraft((prev) => {
      const next = new Set(prev || []);
      if (allVisibleSelected) {
        filteredOptions.forEach((v) => next.delete(v));
      } else {
        filteredOptions.forEach((v) => next.add(v));
      }
      return next;
    });
  };

  const toggleOne = (v) => {
    setDraft((prev) => {
      const next = new Set(prev || []);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const applyFilter = () => {
    if (!(draft instanceof Set) || draft.size === 0) {
      onFilter(new Set());
    } else if (draft.size >= uniqueSorted.length && uniqueSorted.every((v) => draft.has(v))) {
      onFilter(null);
    } else {
      onFilter(new Set(draft));
    }
    setOpen(false);
  };

  const clearFilter = () => {
    onFilter(null);
    setDraft(new Set(uniqueSorted));
    setOpen(false);
  };

  return (
    <th className={`excel-col-filter ${className}`.trim()} title={title || label}>
      <div className="excel-col-filter__head" ref={rootRef}>
        <button
          type="button"
          className={`excel-col-filter__btn${active ? ' is-active' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="excel-col-filter__label">{label}</span>
          {isSorted && (
            <span className="excel-col-filter__sort-hint">
              {sort.dir === 'asc' ? <ArrowDownAZ size={11} /> : <ArrowUpAZ size={11} />}
            </span>
          )}
          {isFiltered ? <Filter size={11} /> : <ChevronDown size={12} />}
        </button>

        {open && (
          <div className="excel-col-filter__menu" role="dialog" aria-label={`${label} filter`}>
            <button
              type="button"
              className="excel-col-filter__menu-item"
              onClick={() => {
                onSort({ key: columnKey, dir: 'asc' });
                setOpen(false);
              }}
            >
              <ArrowDownAZ size={14} /> Sort Ascending
            </button>
            <button
              type="button"
              className="excel-col-filter__menu-item"
              onClick={() => {
                onSort({ key: columnKey, dir: 'desc' });
                setOpen(false);
              }}
            >
              <ArrowUpAZ size={14} /> Sort Descending
            </button>

            <div className="excel-col-filter__divider" />

            <input
              type="search"
              className="excel-col-filter__search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />

            <label className="excel-col-filter__check excel-col-filter__check--all">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
              (Select All)
            </label>

            <div className="excel-col-filter__list">
              {filteredOptions.length === 0 ? (
                <div className="excel-col-filter__empty">No matches</div>
              ) : (
                filteredOptions.map((v) => (
                  <label key={v} className="excel-col-filter__check">
                    <input
                      type="checkbox"
                      checked={draft instanceof Set ? draft.has(v) : true}
                      onChange={() => toggleOne(v)}
                    />
                    <span title={v}>{v}</span>
                  </label>
                ))
              )}
            </div>

            <div className="excel-col-filter__footer">
              <button type="button" className="excel-col-filter__link" onClick={clearFilter}>
                Clear
              </button>
              <button type="button" className="btn-primary excel-col-filter__ok" onClick={applyFilter}>
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </th>
  );
}

/** Apply Excel-style column filters + sort to enriched rows. */
export function applyExcelColumnState(rows, { sort, filters, getValue }) {
  let next = rows;
  if (filters && typeof filters === 'object') {
    Object.entries(filters).forEach(([key, selected]) => {
      if (!(selected instanceof Set)) return;
      next = next.filter((row) => {
        const raw = getValue(row, key);
        const token = raw == null || raw === '' ? '(Blank)' : String(raw);
        return selected.has(token);
      });
    });
  }
  if (sort?.key) {
    const dir = sort.dir === 'desc' ? -1 : 1;
    next = [...next].sort((a, b) => {
      const va = getValue(a, sort.key);
      const vb = getValue(b, sort.key);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
  }
  return next;
}
