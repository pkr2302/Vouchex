/** Horizontal chip nav within a mobile hub (Sales / Buy / Stock / Parties). */
export default function MobileSectionPills({ tabs, activeId, onSelect }) {
  if (!tabs?.length) return null;

  return (
    <div className="mobile-section-pills mobile-only" role="tablist" aria-label="Section">
      {tabs.map((tab) => {
        const active = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`mobile-section-pills__chip${active ? ' mobile-section-pills__chip--active' : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
