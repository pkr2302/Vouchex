import { Clock, ChevronRight } from 'lucide-react';
import { useRecentRecords } from '../../hooks/useRecentRecords';
import { SEARCH_TYPE_LABELS } from '../../utils/buildGlobalSearchIndex';

export default function MobileRecentStrip({ onNavigate }) {
  const { items } = useRecentRecords();
  const recent = items.filter((r) => r.type !== 'tab').slice(0, 6);

  if (!recent.length) return null;

  return (
    <section className="mobile-recent-strip mobile-only">
      <h4><Clock size={16} /> Recently viewed</h4>
      <div className="mobile-recent-strip__scroll">
        {recent.map((r) => (
          <button
            key={`${r.type}-${r.id}`}
            type="button"
            className="mobile-recent-chip"
            onClick={() => r.tab && onNavigate(r.tab)}
          >
            <span className="mobile-recent-chip__type">{SEARCH_TYPE_LABELS[r.type] || r.type}</span>
            <span className="mobile-recent-chip__label">{r.label}</span>
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
    </section>
  );
}
