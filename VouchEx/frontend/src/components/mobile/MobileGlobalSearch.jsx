import { useEffect, useMemo, useState } from 'react';
import { Search, X, Clock, ArrowRight, Compass, Zap } from 'lucide-react';
import {
  buildGlobalSearchIndex,
  filterSearchIndex,
  QUICK_CREATE_ACTIONS,
  MOBILE_QUICK_CREATE_ACTIONS,
  SEARCH_TYPE_LABELS,
} from '../../utils/buildGlobalSearchIndex';
import { useRecentRecords, pushRecentRecord } from '../../hooks/useRecentRecords';
import { portalApi } from '../../services/portalApi';

export default function MobileGlobalSearch({
  open,
  onClose,
  onNavigate,
  data,
}) {
  const [query, setQuery] = useState('');
  const [journals, setJournals] = useState([]);
  const { items: recentItems, refresh } = useRecentRecords();

  useEffect(() => {
    if (!open || data?.mobileMode) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await portalApi.glGuidedJournals('?limit=80');
        if (!cancelled) setJournals(res.journals || []);
      } catch {
        if (!cancelled) setJournals([]);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const index = useMemo(
    () => buildGlobalSearchIndex({ ...data, journals: data?.mobileMode ? [] : journals, mobileMode: !!data?.mobileMode }),
    [data, journals]
  );

  const results = useMemo(() => filterSearchIndex(index, query), [index, query]);
  const quickJump = useMemo(
    () => (query.trim() ? [] : filterSearchIndex(index, '', { destinationsOnly: false })),
    [index, query]
  );
  const quickCreate = query.trim() ? [] : (data?.mobileMode ? MOBILE_QUICK_CREATE_ACTIONS : QUICK_CREATE_ACTIONS);

  const handleSelect = (item) => {
    pushRecentRecord({
      id: item.id,
      type: item.type,
      label: item.label,
      sublabel: item.sublabel,
      tab: item.tab,
    });
    refresh();
    if (item.tab) {
      if (item.openForm) onNavigate(item.tab, { openForm: 'add' });
      else onNavigate(item.tab);
    }
    setQuery('');
    onClose();
  };

  if (!open) return null;

  const showRecent = !query.trim() && recentItems.length > 0;
  const list = query.trim() ? results : [];

  return (
    <div className="mobile-search-overlay" role="dialog" aria-modal="true" aria-label="Search">
      <div className="mobile-search-overlay__header">
        <div className="mobile-search-overlay__input-wrap">
          <Search size={20} />
          <input
            type="search"
            className="mobile-search-overlay__input"
            placeholder="Search or create…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <button type="button" className="mobile-search-overlay__close" onClick={onClose} aria-label="Close search">
          <X size={22} />
        </button>
      </div>

      <div className="mobile-search-overlay__body">
        {!query.trim() && quickCreate.length > 0 && (
          <section className="mobile-search-section">
            <h4><Zap size={16} /> Quick actions</h4>
            <ul className="mobile-search-list">
              {quickCreate.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => handleSelect(item)}>
                    <span className="mobile-search-list__type">{SEARCH_TYPE_LABELS[item.type] || item.type}</span>
                    <span className="mobile-search-list__label">{item.label}</span>
                    {item.sublabel && <span className="mobile-search-list__sub">{item.sublabel}</span>}
                    <ArrowRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!query.trim() && quickJump.length > 0 && (
          <section className="mobile-search-section">
            <h4><Compass size={16} /> Quick jump</h4>
            <ul className="mobile-search-list">
              {quickJump.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => handleSelect(item)}>
                    <span className="mobile-search-list__type">{SEARCH_TYPE_LABELS[item.type] || item.type}</span>
                    <span className="mobile-search-list__label">{item.label}</span>
                    {item.sublabel && <span className="mobile-search-list__sub">{item.sublabel}</span>}
                    <ArrowRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {showRecent && (
          <section className="mobile-search-section">
            <h4><Clock size={16} /> Recent</h4>
            <ul className="mobile-search-list">
              {recentItems.slice(0, 8).map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <button type="button" onClick={() => handleSelect(r)}>
                    <span className="mobile-search-list__type">{SEARCH_TYPE_LABELS[r.type] || r.type}</span>
                    <span className="mobile-search-list__label">{r.label}</span>
                    {r.sublabel && <span className="mobile-search-list__sub">{r.sublabel}</span>}
                    <ArrowRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {query.trim() && (
          <section className="mobile-search-section">
            <h4>Results</h4>
            {!list.length && <p className="mobile-search-empty">No matches for &ldquo;{query}&rdquo;</p>}
            <ul className="mobile-search-list">
              {list.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => handleSelect(item)}>
                    <span className="mobile-search-list__type">{SEARCH_TYPE_LABELS[item.type] || item.type}</span>
                    <span className="mobile-search-list__label">{item.label}</span>
                    {item.sublabel && <span className="mobile-search-list__sub">{item.sublabel}</span>}
                    <ArrowRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!query.trim() && !showRecent && !quickJump.length && !quickCreate.length && (
          <p className="mobile-search-hint">Search records, jump to pages, or create invoices and receipts instantly.</p>
        )}
      </div>
    </div>
  );
}
