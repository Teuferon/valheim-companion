// Companion-wide progress drawer. Mounted outside application roots.
(function () {
  'use strict';
  if (globalThis.VCProgressDrawer) return;
  const P = globalThis.VCProgress;
  const UI = globalThis.VCProgressUI;
  // Minimal spoiler ladder for the trigger; the full checklist stays lazy.
  const ladder = [
    ['meadows', 'eikthyr'], ['black-forest', 'the-elder'], ['ocean'],
    ['swamp', 'bonemass'], ['mountain', 'moder'], ['plains', 'yagluth'],
    ['mistlands', 'the-queen'], ['ashlands', 'fader'], ['deep-north', 'kall-fimbulbringer'],
  ].map(([id, boss], index) => ({ id, order: index + 1, bosses: boss ? [boss] : [] }));
  let trigger, overlay, panel, closeButton, fullLink, content, title;
  let checklist = null;
  let dataPromise = null;
  let opened = false;
  let overflow = '';
  let languageSubscribed = false;
  const inertNodes = new Map();
  const t = UI.t;
  const catalog = fetch('/shared/progress/messages.json').then(response => {
    if (!response.ok) throw new Error('Progress translations unavailable');
    return response.json();
  }).then(messages => { UI.messages = messages; update(); }).catch(() => { /* English fallback; opening can still proceed. */ });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function count() { return P.revealedBiomes(globalThis.VP_DATA?.biomes || ladder).length; }
  function update() {
    if (!trigger) return;
    const label = t('⛓ Progress {revealed}/9', { revealed: count() });
    trigger.setAttribute('aria-label', label);
    trigger.querySelector('.vc-progress-trigger-label').textContent = label;
    trigger.querySelector('.vc-progress-trigger-count').textContent = count() + '/9';
    title.textContent = t('Progress');
    closeButton.setAttribute('aria-label', t('Close progress'));
    fullLink.textContent = t('Open full tracker →');
    panel.setAttribute('lang', UI.locale());
    panel.setAttribute('dir', UI.locale() === 'ar' ? 'rtl' : 'ltr');
    checklist?.update();
    const status = content.querySelector('.vc-progress-loading');
    if (status) status.textContent = t('Loading progress…');
    const error = content.querySelector('.vc-progress-error');
    if (error) error.textContent = t('Could not load progress.');
    const retry = content.querySelector('.vc-progress-retry');
    if (retry) retry.textContent = t('Retry');
  }
  function loadData() {
    if (globalThis.VP_DATA) return Promise.resolve(globalThis.VP_DATA);
    if (!dataPromise) {
      dataPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/progress/data/data.js';
        script.onload = () => {
          if (globalThis.VP_DATA?.biomes) resolve(globalThis.VP_DATA);
          else { dataPromise = null; script.remove(); reject(new Error('Invalid progress data')); }
        };
        script.onerror = () => { dataPromise = null; script.remove(); reject(new Error('Progress data unavailable')); };
        document.head.appendChild(script);
      });
    }
    return dataPromise;
  }
  async function showChecklist() {
    if (checklist) return;
    content.replaceChildren();
    content.setAttribute('aria-busy', 'true');
    const loading = element('p', 'vc-progress-loading', t('Loading progress…'));
    loading.setAttribute('role', 'status');
    content.append(loading);
    try {
      const [data] = await Promise.all([loadData(), catalog]);
      // Reopening during a download must not create multiple subscriptions.
      if (!checklist) {
        content.replaceChildren();
        checklist = UI.render(content, data, { compact: true });
      }
      update();
    } catch {
      content.replaceChildren(element('p', 'vc-progress-error', t('Could not load progress.')));
      const retry = element('button', 'vc-progress-retry', t('Retry')); retry.type = 'button';
      retry.addEventListener('click', showChecklist); content.append(retry);
    } finally { content.setAttribute('aria-busy', 'false'); }
  }
  function open() {
    if (!trigger || opened) return;
    opened = true;
    overlay.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    for (const node of document.body.children) {
      if (node !== overlay) { inertNodes.set(node, node.inert); node.inert = true; }
    }
    closeButton.focus({ preventScroll: true });
    showChecklist();
  }
  function close() {
    if (!opened) return;
    opened = false;
    overlay.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = overflow;
    for (const [node, inert] of inertNodes) node.inert = inert;
    inertNodes.clear();
    trigger.focus({ preventScroll: true });
  }
  function focusable() {
    return [...panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')]
      .filter(node => !node.hidden);
  }
  function keydown(event) {
    if (!opened) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === 'Tab') {
      const nodes = focusable();
      const first = nodes[0] || closeButton, last = nodes.at(-1) || closeButton;
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  }
  function consentOffset() {
    const banner = document.querySelector('.vc-consent-banner');
    const visible = banner && !banner.hidden && banner.style.display !== 'none';
    trigger?.style.setProperty('--vc-progress-consent-height', visible ? banner.getBoundingClientRect().height + 'px' : '0px');
  }
  function init() {
    if (/^\/progress(?:\/|$)/.test(location.pathname) || !document.body || trigger) return;
    if (!document.querySelector('link[href="/shared/progress/drawer.css"]')) {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/shared/progress/drawer.css'; document.head.appendChild(css);
    }
    trigger = element('button', 'vc-progress-trigger'); trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'dialog'); trigger.setAttribute('aria-controls', 'vc-progress-panel'); trigger.setAttribute('aria-expanded', 'false');
    trigger.append(element('span', 'vc-progress-trigger-label'), element('span', 'vc-progress-trigger-icon', '⛓'), element('span', 'vc-progress-trigger-count'));
    trigger.querySelector('.vc-progress-trigger-icon').setAttribute('aria-hidden', 'true');
    trigger.querySelector('.vc-progress-trigger-count').setAttribute('aria-hidden', 'true');
    overlay = element('div', 'vc-progress-overlay'); overlay.hidden = true;
    panel = element('section', 'vc-progress-panel'); panel.id = 'vc-progress-panel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'vc-progress-title');
    const header = element('header', 'vc-progress-panel-header');
    title = element('h2', ''); title.id = 'vc-progress-title';
    closeButton = element('button', 'vc-progress-close', '×'); closeButton.type = 'button';
    closeButton.addEventListener('click', close); header.append(title, closeButton);
    fullLink = element('a', 'vc-progress-full-link'); fullLink.href = '/progress/';
    content = element('div', 'vc-progress-panel-content');
    panel.append(header, fullLink, content); overlay.append(panel); document.body.append(trigger, overlay);
    trigger.addEventListener('click', open);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', keydown);
    document.addEventListener('focusin', event => { if (opened && !panel.contains(event.target)) closeButton.focus(); });
    P.onChange(update);
    function subscribeLanguage() {
      if (!languageSubscribed && globalThis.VCI18n) { globalThis.VCI18n.onChange(update); languageSubscribed = true; }
      update();
    }
    // React language pickers update <html lang>; classic pages use VCI18n.
    new MutationObserver(subscribeLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
    window.addEventListener('storage', event => { if (['vc.language', 'runopis.language', null].includes(event.key)) update(); });
    window.addEventListener('languagechange', update);
    window.addEventListener('resize', consentOffset);
    let watchedBanner = null;
    const resizeObserver = new ResizeObserver(consentOffset);
    const bannerObserver = new MutationObserver(consentOffset);
    function watchBanner() {
      const banner = document.querySelector('.vc-consent-banner');
      if (banner && banner !== watchedBanner) {
        watchedBanner = banner;
        resizeObserver.observe(banner);
        bannerObserver.observe(banner, { attributes: true, attributeFilter: ['hidden', 'style'] });
      }
      consentOffset();
    }
    new MutationObserver(watchBanner).observe(document.body, { childList: true });
    globalThis.VCConsent?.onChange(consentOffset);
    watchBanner(); subscribeLanguage();
  }
  globalThis.VCProgressDrawer = { open, close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
