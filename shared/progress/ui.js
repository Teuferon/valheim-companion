// Shared checklist renderer for the full tracker and the companion drawer.
(function () {
  'use strict';
  const mounts = new WeakMap();
  const languages = ['en', 'cs', 'de', 'es', 'fr', 'pt', 'zh', 'hi', 'ar', 'bn', 'ru', 'ja', 'id'];
  function locale() {
    if (globalThis.VCI18n) return globalThis.VCI18n.locale();
    let preference = 'auto';
    try { preference = localStorage.getItem('vc.language') || localStorage.getItem('runopis.language') || 'auto'; } catch { /* Browser fallback. */ }
    if (languages.includes(preference)) return preference;
    const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
    return candidates.map(value => String(value || '').toLowerCase().replace('_', '-').split('-')[0]).find(code => languages.includes(code)) || 'en';
  }
  function translate(key, values = {}) {
    const messages = api.messages || globalThis.VC_MESSAGES || {};
    if (globalThis.VCI18n) return globalThis.VCI18n.t(messages, key, values);
    return (messages[key]?.[locale()] || messages[key]?.en || key).replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
  }
  function render(container, data, { compact = false } = {}) {
    if (mounts.has(container)) { const mounted = mounts.get(container); mounted.update(); return mounted; }
    const P = globalThis.VCProgress;
    const biomes = data.biomes;
    const t = translate;
    const temporaryReveals = new Set();
    container.classList.add('vc-progress-ui');
    if (compact) container.classList.add('vc-progress-compact');
    let summaryText = container.querySelector('#summary-text');
    let meter = container.querySelector('#progress-meter');
    let biomeContainer = container.querySelector('#biomes');
    if (!summaryText) {
      const summary = element('section', 'summary');
      summary.setAttribute('aria-label', t('Progress summary'));
      summaryText = element('p', 'summary-text'); summaryText.setAttribute('aria-live', 'polite');
      meter = element('progress');
      meter.setAttribute('aria-label', t('Biomes revealed'));
      summary.append(summaryText, meter);
      biomeContainer = element('div', 'biomes');
      container.append(summary, biomeContainer);
    }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function checkbox(field, id, text, checked) {
    const label = element('label', 'check');
    const input = element('input');
    input.type = 'checkbox'; input.checked = checked;
    input.dataset.key = field + ':' + id;
    input.addEventListener('change', () => P[field](id, input.checked));
    label.append(input, element('span', '', text));
    return label;
  }
  function image(value) {
    if (!value.image) return null;
    const img = element('img');
    img.src = compact ? '/progress/' + value.image : value.image; img.alt = ''; img.loading = 'lazy';
    return img;
  }
  function creatureCard(value, biome, kind, state) {
    const card = element('article', 'creature');
    card.append(image(value) ?? element('span'));
    const content = element('div', 'creature-content');
    content.append(element('p', 'tag', t(kind)), element('h3', '', value.name));
    if (value.summon) content.append(element('p', 'summon', t('Summon: {items}', { items: value.summon })));
    const links = element('div', 'links');
    const bestiary = element('a', '', 'Bestiary');
    bestiary.href = '/bestiary/#c=' + encodeURIComponent(value.id);
    const calculator = element('a', '', 'Damage Calculator');
    calculator.href = '/damage-calculator/?' + new URLSearchParams({ biome: biome.id, target: value.id });
    links.append(bestiary, calculator); content.append(links);
    const defeated = checkbox('defeat', value.id, t('Defeated'), state.defeated[value.id] === true);
    defeated.querySelector('input').setAttribute('aria-label', value.name + ' · ' + t('Defeated'));
    card.append(content, defeated);
    return card;
  }
  function reveal(id) {
    let opened = [];
    try {
      const raw = JSON.parse(localStorage.getItem('vc.openBiomes'));
      if (Array.isArray(raw)) opened = raw.filter(value => typeof value === 'string');
    } catch { /* Continue with an empty legacy state. */ }
    try {
      localStorage.setItem('vc.openBiomes', JSON.stringify([...new Set([...opened, ...temporaryReveals, id])]));
      temporaryReveals.clear();
    } catch { temporaryReveals.add(id); }
    P.set({});
  }
  function update() {
    const focusKey = document.activeElement?.dataset.key;
    const state = P.get();
    const revealed = new Set([...P.revealedBiomes(biomes), ...temporaryReveals]);
    const defeated = biomes.flatMap(b => b.bosses).filter(boss => state.defeated[boss.id]).length;
    summaryText.textContent = t('{revealed} / {total} biomes revealed · {bosses} bosses defeated', { revealed: revealed.size, total: biomes.length, bosses: defeated });
    meter.max = biomes.length;
    meter.value = revealed.size;
    biomeContainer.replaceChildren();
    for (const biome of biomes) {
      const section = element('section', 'biome' + (revealed.has(biome.id) ? '' : ' locked'));
      const header = element('div', 'biome-header');
      if (!revealed.has(biome.id)) {
        header.append(element('h2', '', '🔒 ' + t('Biome {number}', { number: biome.order })));
        const button = element('button', '', t('Reveal'));
        button.type = 'button'; button.dataset.key = 'reveal:' + biome.id;
        button.addEventListener('click', () => reveal(biome.id));
        header.append(button); section.append(header); biomeContainer.append(section);
        continue;
      }
      header.append(element('h2', '', biome.order + ' · ' + biome.name), checkbox('visit', biome.id, t('Visited'), state.visited.includes(biome.id)));
      section.append(header);
      for (const boss of biome.bosses) section.append(creatureCard(boss, biome, 'Boss', state));
      for (const boss of biome.minibosses) section.append(creatureCard(boss, biome, 'Miniboss', state));
      if (biome.milestones.length) {
        const group = element('div', 'milestones');
        group.append(element('h3', '', t('Key drops')));
        const list = element('div', 'milestone-list');
        for (const value of biome.milestones) {
          const label = checkbox('milestone', value.id, value.name, state.milestones[value.id] === true);
          label.classList.add('milestone');
          const img = image(value);
          if (img) label.insertBefore(img, label.lastChild);
          list.append(label);
        }
        group.append(list); section.append(group);
      }
      biomeContainer.append(section);
    }
    if (focusKey) {
      const targetKey = focusKey.startsWith('reveal:') ? focusKey.replace('reveal:', 'visit:') : focusKey;
      [...biomeContainer.querySelectorAll('[data-key]')].find(node => node.dataset.key === targetKey)?.focus({ preventScroll: true });
    }
  }

    const off = P.onChange(update);
    const offLanguage = globalThis.VCI18n?.onChange(update);
    const mounted = { update, clearReveals() { temporaryReveals.clear(); }, destroy() { off(); offLanguage?.(); mounts.delete(container); } };
    mounts.set(container, mounted);
    update();
    return mounted;
  }
  const api = { render, locale, t: translate, messages: null };
  globalThis.VCProgressUI = api;
})();
