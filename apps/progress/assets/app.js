/* Full Saga tracker: sharing, imports and reset. */
(function () {
  'use strict';
  const P = globalThis.VCProgress;
  const I = globalThis.VCI18n;
  const t = (key, values) => I.t(globalThis.VC_MESSAGES, key, values);
  const find = id => document.getElementById(id);
  let pendingAction = null;
  let pendingHash = null;
  let statusKey = '';
  const dialog = find('action-dialog');
  const checklist = globalThis.VCProgressUI.render(find('saga'), globalThis.VP_DATA, { compact: false });
  function render() {
    I.apply();
    const picker = document.querySelector('.vc-language-picker');
    picker.setAttribute('aria-label', t('Language'));
    picker.options[0].textContent = t('Auto (browser)');
    find('status').textContent = statusKey ? t(statusKey) : '';
    checklist.update();
    if (dialog.open) renderDialog();
  }
  function renderDialog() {
    const reset = pendingAction === 'reset';
    const share = pendingAction === 'share';
    find('dialog-title').textContent = t(share ? 'Share / transfer progress' : reset ? 'Reset progress?' : 'Import progress?');
    find('dialog-description').textContent = t(share ? 'Copy this URL to transfer your progress to another device.' : reset ? 'This clears your checklist and manually revealed biomes.' : 'This replaces your current checklist with the progress from this URL.');
    find('dialog-accept').textContent = t(share ? 'Done' : reset ? 'Reset progress' : 'Import');
    find('share-url-label').hidden = !share;
  }
  function showDialog(action) {
    pendingAction = action;
    renderDialog();
    dialog.returnValue = '';
    dialog.showModal();
  }
  function clearImportHash() {
    history.replaceState(null, '', location.pathname + location.search);
    pendingHash = null;
  }
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'accept') {
      if (pendingAction === 'reset') {
        P.reset(); statusKey = 'Progress reset.';
      } else if (pendingAction === 'import') {
        const success = P.importFromUrl(pendingHash);
        statusKey = success ? 'Progress imported.' : 'Invalid progress URL.';
      }
    }
    if (pendingAction === 'import') clearImportHash();
    pendingAction = null;
    render();
  });
  find('reset').addEventListener('click', () => showDialog('reset'));
  find('share').addEventListener('click', async () => {
    const url = P.exportToUrl();
    try {
      await navigator.clipboard.writeText(url);
      statusKey = 'Progress URL copied.';
      render();
    } catch {
      find('share-url').value = url;
      showDialog('share');
      find('share-url').focus(); find('share-url').select();
    }
  });
  function offerImport() {
    if (!new URLSearchParams(location.hash.slice(1)).has('p')) return;
    pendingHash = location.hash;
    if (dialog.open) { pendingAction = 'import'; renderDialog(); }
    else showDialog('import');
  }
  I.mountPicker('#language-picker');
  I.onChange(render);
  P.onChange(render);
  window.addEventListener('hashchange', offerImport);
  render();
  offerImport();
})();
