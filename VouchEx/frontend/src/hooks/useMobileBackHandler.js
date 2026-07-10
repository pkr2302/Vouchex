import { useEffect } from 'react';
import { pushMobileBackHandler } from '../utils/mobileBackHandlers';

/** Register a one-shot back handler while `active` (mobile forms, detail views). */
export function useMobileBackHandler(active, handler) {
  useEffect(() => {
    if (!active || typeof handler !== 'function') return undefined;
    return pushMobileBackHandler(handler);
  }, [active, handler]);
}
