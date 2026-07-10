import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function MobileCollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`mobile-collapsible ${className}${open ? ' mobile-collapsible--open' : ''}`}>
      <button
        type="button"
        className="mobile-collapsible__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="mobile-collapsible__titles">
          <h3 className="mobile-collapsible__title">{title}</h3>
          {subtitle && <p className="mobile-collapsible__sub">{subtitle}</p>}
        </div>
        <ChevronDown size={20} className="mobile-collapsible__chev" />
      </button>
      {open && <div className="mobile-collapsible__body">{children}</div>}
    </section>
  );
}
