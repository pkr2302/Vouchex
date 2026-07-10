import { useEffect } from 'react';
import { consumePortalFormIntent } from '../utils/portalFormIntent';

/** Runs handler once when a queued form-open intent exists for this tab. */
export function usePortalFormIntent(tabId, handler) {
  useEffect(() => {
    const action = consumePortalFormIntent(tabId);
    if (action) handler(action);
  }, [tabId]); // eslint-disable-line react-hooks/exhaustive-deps -- one-shot on tab mount
}
