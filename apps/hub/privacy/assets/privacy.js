// Client logic for the Valheim Companion Privacy page.

(function () {
  function updateConsentUi() {
    const statusBadge = document.getElementById('privacy-consent-status');
    if (!statusBadge) return;

    const current = (typeof globalThis.VCConsent !== 'undefined' && typeof globalThis.VCConsent.get === 'function')
      ? globalThis.VCConsent.get()
      : null;

    statusBadge.classList.remove('status-granted', 'status-denied', 'status-unset');

    const t = (key) => {
      if (typeof globalThis.VCI18n !== 'undefined' && typeof globalThis.VCI18n.t === 'function') {
        return globalThis.VCI18n.t(key);
      }
      return key;
    };

    if (current === 'granted') {
      statusBadge.classList.add('status-granted');
      statusBadge.setAttribute('data-i18n', 'Analytics allowed');
      statusBadge.textContent = t('Analytics allowed');
    } else if (current === 'denied') {
      statusBadge.classList.add('status-denied');
      statusBadge.setAttribute('data-i18n', 'Analytics declined');
      statusBadge.textContent = t('Analytics declined');
    } else {
      statusBadge.classList.add('status-unset');
      statusBadge.setAttribute('data-i18n', 'No choice made (banner active)');
      statusBadge.textContent = t('No choice made (banner active)');
    }
  }

  function init() {
    if (typeof globalThis.VCI18n !== 'undefined') {
      const pickerContainer = document.getElementById('lang-picker-container');
      if (pickerContainer && typeof globalThis.VCI18n.mountPicker === 'function') {
        globalThis.VCI18n.mountPicker(pickerContainer);
      }

      if (typeof globalThis.VCI18n.apply === 'function') {
        globalThis.VCI18n.apply();
      }

      if (typeof globalThis.VCI18n.onChange === 'function') {
        globalThis.VCI18n.onChange(() => {
          if (typeof globalThis.VCI18n.apply === 'function') {
            globalThis.VCI18n.apply();
          }
          updateConsentUi();
        });
      }
    }

    const allowBtn = document.getElementById('privacy-btn-allow');
    if (allowBtn) {
      allowBtn.addEventListener('click', () => {
        if (globalThis.VCConsent) globalThis.VCConsent.set('granted');
        updateConsentUi();
      });
    }

    const declineBtn = document.getElementById('privacy-btn-decline');
    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        if (globalThis.VCConsent) globalThis.VCConsent.set('denied');
        updateConsentUi();
      });
    }

    const resetBtn = document.getElementById('privacy-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (globalThis.VCConsent) globalThis.VCConsent.reset();
        updateConsentUi();
      });
    }

    if (globalThis.VCConsent && typeof globalThis.VCConsent.onChange === 'function') {
      globalThis.VCConsent.onChange(() => {
        updateConsentUi();
      });
    }

    updateConsentUi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
