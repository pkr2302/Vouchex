const STORAGE_KEY = 'vouchex_calendar_popup_ack';

/** Unique key per reminder occurrence (supports recurring reschedules). */
export function popupOccurrenceKey(reminder) {
  return `${reminder.id}:${reminder.reminder_date}:${reminder.reminder_time}`;
}

function readCompanyAcks(companyId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const list = all[String(companyId || 'default')] || [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function isPopupAcknowledged(reminder, companyId) {
  if (reminder?.popup_shown_at) return true;
  if (!reminder) return false;
  return readCompanyAcks(companyId).has(popupOccurrenceKey(reminder));
}

export function persistPopupAcknowledged(reminder, companyId) {
  if (!reminder) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const companyKey = String(companyId || 'default');
    const set = readCompanyAcks(companyId);
    set.add(popupOccurrenceKey(reminder));
    all[companyKey] = [...set];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / private mode */
  }
}
