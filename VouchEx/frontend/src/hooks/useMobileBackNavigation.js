import { useEffect, useRef } from 'react';
import { tryMobileBackHandlers } from '../utils/mobileBackHandlers';

const MOBILE_MAX = 1024;

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX;
}

/**
 * Android / browser back: close overlays → previous tab → confirm before leaving site.
 */
export function useMobileBackNavigation({
  activeTab,
  onNavigateTab,
  overlays,
}) {
  const tabStackRef = useRef(['mobile-home']);
  const skipStackPushRef = useRef(false);
  const leaveArmedRef = useRef(false);
  const guardPushedRef = useRef(false);

  useEffect(() => {
    if (!isMobileViewport()) return undefined;

    if (!guardPushedRef.current) {
      guardPushedRef.current = true;
      window.history.pushState({ vouchexGuard: true }, '');
    }

    const stack = tabStackRef.current;
    if (skipStackPushRef.current) {
      skipStackPushRef.current = false;
      return undefined;
    }
    if (stack[stack.length - 1] !== activeTab) {
      stack.push(activeTab);
      if (stack.length > 40) stack.shift();
      window.history.pushState({ vouchexTab: activeTab }, '');
    }

    return undefined;
  }, [activeTab]);

  useEffect(() => {
    if (!isMobileViewport()) return undefined;

    const tryCloseOverlay = () => {
      const {
        sidebarOpen,
        setSidebarOpen,
        searchOpen,
        setSearchOpen,
        reportsOpen,
        setReportsOpen,
        mobileDrawerOpen,
        setMobileDrawerOpen,
        settingsOpen,
        setSettingsOpen,
        notificationsOpen,
        setNotificationsOpen,
      } = overlays;

      if (notificationsOpen) {
        setNotificationsOpen(false);
        return true;
      }
      if (searchOpen) {
        setSearchOpen(false);
        return true;
      }
      if (reportsOpen) {
        setReportsOpen(false);
        return true;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        return true;
      }
      if (mobileDrawerOpen) {
        setMobileDrawerOpen(false);
        return true;
      }
      if (sidebarOpen) {
        setSidebarOpen(false);
        return true;
      }
      return false;
    };

    const onPopState = () => {
      if (!isMobileViewport()) return;

      if (tryMobileBackHandlers()) {
        window.history.pushState({ vouchexGuard: true }, '');
        return;
      }

      if (tryCloseOverlay()) {
        window.history.pushState({ vouchexGuard: true }, '');
        return;
      }

      const stack = tabStackRef.current;
      if (stack.length > 1) {
        stack.pop();
        const prev = stack[stack.length - 1];
        skipStackPushRef.current = true;
        leaveArmedRef.current = false;
        onNavigateTab(prev);
        window.history.pushState({ vouchexGuard: true }, '');
        return;
      }

      if (leaveArmedRef.current) {
        leaveArmedRef.current = false;
        return;
      }

      const leave = window.confirm('Leave VouchEx? You can return anytime — your session stays active.');
      if (leave) {
        leaveArmedRef.current = true;
        window.history.back();
      } else {
        window.history.pushState({ vouchexGuard: true }, '');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [activeTab, onNavigateTab, overlays]);
}
