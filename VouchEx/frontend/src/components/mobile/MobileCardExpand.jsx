import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Level-2 card details — hidden until user expands. */
export default function MobileCardExpand({ label = 'More details', children }) {
  const [open, setOpen] = useState(false);
  if (!children) return null;

  return (
    <div className={`mobile-card-expand${open ? ' mobile-card-expand--open' : ''}`}>
      <button
        type="button"
        className="mobile-card-expand__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? 'Show less' : label}
        <ChevronDown size={16} className="mobile-card-expand__chev" />
      </button>
      {open && <div className="mobile-card-expand__body">{children}</div>}
    </div>
  );
}
