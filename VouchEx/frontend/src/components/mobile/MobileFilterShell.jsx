import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

/** Wraps a registry filter bar — on mobile, filters open in a slide-over sheet (single DOM, no duplicate). */
export default function MobileFilterShell({ children, activeCount = 0, title = 'Filters' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`mobile-filter-shell${open ? ' mobile-filter-shell--open' : ''}`}>
      <button
        type="button"
        className="mobile-only mobile-filter-shell__toggle"
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <SlidersHorizontal size={18} />
        <span>{title}</span>
        {activeCount > 0 && <span className="mobile-filter-shell__badge">{activeCount}</span>}
      </button>
      <button
        type="button"
        className="mobile-only mobile-filter-shell__backdrop"
        aria-label="Close filters"
        onClick={() => setOpen(false)}
      />
      <div className="mobile-filter-shell__sheet-header mobile-only">
        <h4>{title}</h4>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Done</button>
      </div>
      {children}
    </div>
  );
}

export function countActiveFilters(values = []) {
  return values.filter((v) => v != null && String(v).trim() !== '').length;
}
