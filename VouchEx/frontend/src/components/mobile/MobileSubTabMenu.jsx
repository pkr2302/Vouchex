import { ChevronRight } from 'lucide-react';

export default function MobileSubTabMenu({ tabs, activeId, onSelect, className = '' }) {
  if (!tabs?.length) return null;

  return (
    <nav className={`mobile-subtab-menu mobile-only ${className}`.trim()} aria-label="Section navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`mobile-subtab-menu__item${activeId === tab.id ? ' mobile-subtab-menu__item--active' : ''}`}
          onClick={() => onSelect(tab.id)}
        >
          <div className="mobile-subtab-menu__text">
            <span className="mobile-subtab-menu__label">{tab.label}</span>
            {tab.description && <span className="mobile-subtab-menu__desc">{tab.description}</span>}
          </div>
          <ChevronRight size={18} className="mobile-subtab-menu__chev" />
        </button>
      ))}
    </nav>
  );
}
