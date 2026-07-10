import { useState } from 'react';

const STORAGE_KEY = 'vouchex.mobile.recent';

const MAX_ITEMS = 12;

function loadRecent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecent(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* ignore */
  }
}

export function pushRecentRecord(record) {
  if (!record?.id || !record?.type) return;
  const entry = {
    id: String(record.id),
    type: record.type,
    label: record.label || record.id,
    sublabel: record.sublabel || '',
    tab: record.tab || null,
    ts: Date.now(),
  };
  const prev = loadRecent().filter((r) => !(r.type === entry.type && r.id === entry.id));
  saveRecent([entry, ...prev]);
}

export function useRecentRecords() {
  const [items, setItems] = useState(loadRecent);

  const refresh = () => setItems(loadRecent());

  const push = (record) => {
    pushRecentRecord(record);
    refresh();
  };

  return { items, push, refresh };
}

export function trackTabVisit(tabId, label) {
  if (!tabId) return;
  pushRecentRecord({
    id: tabId,
    type: 'tab',
    label: label || tabId,
    tab: tabId,
  });
}
