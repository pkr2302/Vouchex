/**
 * VouchEx in-page Install App UI.
 * Mobile Chrome often hides the address-bar install icon — this shows a clear button instead.
 */
(function () {
  if (window.__vouchexPwaInstallInit) return;
  window.__vouchexPwaInstallInit = true;

  var STORAGE_KEY = 'vouchex_pwa_install_dismissed_until';
  var deferredPrompt = null;

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.indexOf('android-app://') === 0
    );
  }

  function isDismissed() {
    try {
      var until = Number(localStorage.getItem(STORAGE_KEY) || 0);
      return until > Date.now();
    } catch (e) {
      return false;
    }
  }

  function dismissForDays(days) {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
    } catch (e) {}
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function removeUi() {
    var el = document.getElementById('vx-pwa-install');
    if (el) el.remove();
    var modal = document.getElementById('vx-pwa-install-help');
    if (modal) modal.remove();
  }

  function showHelpModal(html) {
    removeUi();
    var wrap = document.createElement('div');
    wrap.id = 'vx-pwa-install-help';
    wrap.innerHTML =
      '<div class="vx-pwa-help-backdrop" data-close="1"></div>' +
      '<div class="vx-pwa-help-card" role="dialog" aria-modal="true" aria-label="Install VouchEx">' +
      '<button type="button" class="vx-pwa-help-close" data-close="1" aria-label="Close">×</button>' +
      html +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener('click', function (e) {
      if (e.target && e.target.getAttribute('data-close')) {
        wrap.remove();
        dismissForDays(3);
      }
    });
  }

  function iosHelpHtml() {
    return (
      '<h3>Install VouchEx on iPhone</h3>' +
      '<ol>' +
      '<li>Tap the <strong>Share</strong> button in Safari (square with arrow).</li>' +
      '<li>Scroll and tap <strong>Add to Home Screen</strong>.</li>' +
      '<li>Tap <strong>Add</strong>.</li>' +
      '</ol>' +
      '<p class="vx-pwa-help-note">Please use Safari for the best install experience on iPhone.</p>'
    );
  }

  function androidMenuHelpHtml() {
    return (
      '<h3>Install VouchEx on Android</h3>' +
      '<ol>' +
      '<li>Tap the <strong>⋮</strong> (three dots) menu in Chrome.</li>' +
      '<li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>' +
      '<li>Confirm <strong>Install</strong>.</li>' +
      '</ol>' +
      '<p class="vx-pwa-help-note">If you do not see Install yet, keep this page open for a few seconds and try again.</p>'
    );
  }

  async function triggerInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        var choice = await deferredPrompt.userChoice;
        deferredPrompt = null;
        if (choice && choice.outcome === 'accepted') {
          removeUi();
          dismissForDays(365);
        }
      } catch (e) {
        deferredPrompt = null;
      }
      return;
    }

    if (isIos()) {
      showHelpModal(iosHelpHtml());
      return;
    }

    showHelpModal(androidMenuHelpHtml());
  }

  function renderBanner() {
    if (isStandalone() || isDismissed()) return;
    if (document.getElementById('vx-pwa-install')) return;

    var bar = document.createElement('div');
    bar.id = 'vx-pwa-install';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Install VouchEx app');
    bar.innerHTML =
      '<div class="vx-pwa-install-inner">' +
      '<div class="vx-pwa-install-text">' +
      '<strong>Install VouchEx app</strong>' +
      '<span>Add to your phone home screen for quick access</span>' +
      '</div>' +
      '<div class="vx-pwa-install-actions">' +
      '<button type="button" class="vx-pwa-install-btn" id="vx-pwa-install-btn">Install</button>' +
      '<button type="button" class="vx-pwa-install-dismiss" id="vx-pwa-install-dismiss" aria-label="Dismiss">×</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(bar);
    document.getElementById('vx-pwa-install-btn').addEventListener('click', triggerInstall);
    document.getElementById('vx-pwa-install-dismiss').addEventListener('click', function () {
      removeUi();
      dismissForDays(7);
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    renderBanner();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    removeUi();
    dismissForDays(365);
  });

  function boot() {
    if (isStandalone()) return;
    // Show on mobile even before beforeinstallprompt fires, with fallback instructions.
    if (isMobile()) {
      renderBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
