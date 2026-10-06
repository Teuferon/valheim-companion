// Valheim Companion Hub application script

(function () {
  function init() {
    if (typeof globalThis.VCI18n === 'undefined') {
      return;
    }

    const pickerContainer = document.getElementById('lang-picker-container');
    if (pickerContainer) {
      globalThis.VCI18n.mountPicker(pickerContainer);
    }

    globalThis.VCI18n.apply();

    globalThis.VCI18n.onChange(() => {
      globalThis.VCI18n.apply();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
