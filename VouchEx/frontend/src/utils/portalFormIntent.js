/** Queues a one-shot "open add form" intent for a portal tab (consumed on mount). */
const pending = new Map();

export function queuePortalFormIntent(tabId, action = 'add') {
  if (!tabId) return;
  pending.set(tabId, action);
}

export function consumePortalFormIntent(tabId) {
  const action = pending.get(tabId);
  if (action) pending.delete(tabId);
  return action || null;
}

export function peekPortalFormIntent(tabId) {
  return pending.get(tabId) || null;
}
