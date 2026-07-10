import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Mobile: summary + collapsed detail. Desktop: detail always visible. */
export default function MobileDetailGate({ summary, toggleLabel = 'View detailed table', children }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mobile-only">
        {summary}
        <button
          type="button"
          className="mobile-detail-gate__toggle btn-secondary"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'Hide detailed table' : toggleLabel}
          <ChevronDown size={16} className={open ? 'mobile-detail-gate__chev--open' : ''} />
        </button>
        <div className={`mobile-detail-gate__body${open ? ' mobile-detail-gate__body--open' : ''}`}>
          {children}
        </div>
      </div>
      <div className="desktop-only">{children}</div>
    </>
  );
}
