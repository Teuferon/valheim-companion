// Shared Saga renderer for the full tracker and the companion drawer.
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
  function translateNumber(key, count, values) {
    return globalThis.VCI18n.tn(api.messages || globalThis.VC_MESSAGES || {}, key, count, values);
  }
  function render(container, data, { compact = false } = {}) {
    if (mounts.has(container)) { const mounted = mounts.get(container); mounted.update(); return mounted; }
    const P = globalThis.VCProgress;
    const biomes = [...data.biomes].sort((a, b) => a.order - b.order);
    const t = translate, tn = translateNumber;
    const bosses = biomes.flatMap(b => b.bosses);
    const minibosses = biomes.flatMap(b => b.minibosses);
    let timer, celebrated = null;
    container.classList.add('vc-progress-ui');
    if (compact) container.classList.add('vc-progress-compact');
    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    function image(path, className) {
      const img = element('img', className);
      img.src = '/progress/' + path; img.alt = ''; img.loading = 'lazy';
      return img;
    }
    const summary = element('p', 'summary-text'); summary.setAttribute('aria-live', 'polite');
    const viewport = element('div', 'saga-viewport');
    const track = element('div', 'saga-track');
    const tiles = element('div', 'saga-tiles');
    const path = element('div', 'saga-path');
    const slider = element('input', 'saga-slider');
    slider.type = 'range'; slider.min = 1; slider.max = biomes.length; slider.step = 1; slider.dataset.key = 'reach';
    const stops = element('div', 'saga-stops'); stops.setAttribute('aria-hidden', 'true');
    for (const biome of biomes) stops.append(element('span', '', String(biome.order)));
    path.append(stops, slider); track.append(tiles, path); viewport.append(track);
    const caption = element('p', 'saga-caption');
    const hint = element('p', 'saga-hint'); hint.setAttribute('role', 'status');
    const details = element('div', compact ? 'saga-rows' : 'saga-next');
    container.append(summary, viewport, caption, hint, details);
    track.style.setProperty('--saga-count', biomes.length);
    function scrollTo(order) {
      const tile = [...tiles.children].find(node => Number(node.dataset.order) === order);
      if (tile && viewport.scrollTo) viewport.scrollTo({ left: tile.offsetLeft - (viewport.clientWidth - tile.offsetWidth) / 2, behavior: 'instant' });
    }
    function portrait(value, small, state) {
      const done = state.defeated[value.id] === true;
      const button = element('button', 'saga-portrait' + (small ? ' saga-miniboss' : '') + (done ? ' is-defeated' : '') + (celebrated === value.id ? ' saga-celebrate' : ''));
      button.type = 'button'; button.dataset.key = 'defeat:' + value.id;
      button.setAttribute('aria-pressed', String(done));
      button.setAttribute('aria-label', value.name + ' · ' + t(done ? 'Defeated' : 'Not defeated'));
      const frame = element('span', 'saga-portrait-frame');
      if (value.portrait) frame.append(image(value.portrait));
      if (done) { const seal = element('span', 'saga-seal', '✓'); seal.setAttribute('aria-hidden', 'true'); frame.append(seal); }
      button.append(frame, element('span', 'saga-name', value.name));
      if (small) button.append(element('span', 'saga-tag', t('Miniboss')));
      button.addEventListener('click', () => { celebrated = done ? null : value.id; P.defeat(value.id, !done); celebrated = null; });
      return button;
    }
    function portraits(biome, state) {
      const group = element('div', 'saga-portraits');
      for (const boss of biome.bosses) group.append(portrait(boss, false, state));
      for (const boss of biome.minibosses) group.append(portrait(boss, true, state));
      return group;
    }
    function preview(n) {
      const current = P.reach(biomes);
      for (const tile of tiles.children) tile.classList.toggle('is-preview', Number(tile.dataset.order) === n);
      slider.value = n;
      slider.style.setProperty('--saga-fill', ((n - 1) / (biomes.length - 1) * 100) + '%');
      const name = biomes.find(b => b.order === n)?.name;
      const safeName = n <= current ? name : tn('Biome {count}', n);
      caption.textContent = t("You've reached: {biome}", { biome: safeName });
      slider.setAttribute('aria-label', t('Your journey'));
      slider.setAttribute('aria-valuetext', n <= current
        ? tn('Biome {count} of {total}: {biome}', n, { total: biomes.length, biome: name })
        : tn('Biome {count} of {total}', n, { total: biomes.length }));
    }
    function boundedValue() {
      const value = Number(slider.value), minimum = P.minReach(biomes);
      if (value < minimum) {
        hint.textContent = t('Unmark bosses to go back');
        clearTimeout(timer); timer = setTimeout(() => { hint.textContent = ''; }, 3500);
      }
      return Math.max(minimum, value);
    }
    slider.addEventListener('input', () => preview(boundedValue()));
    slider.addEventListener('change', () => { const value = boundedValue(); P.setReach(value, biomes); scrollTo(value); });
    function update() {
      const focusKey = container.contains(document.activeElement) ? document.activeElement?.dataset.key : null;
      const previousScroll = viewport.scrollLeft;
      const state = P.get(), current = P.reach(biomes);
      const revealed = new Set(P.revealedBiomes(biomes));
      summary.textContent = tn('Biome {count} of {total}', current, { total: biomes.length })
        + ' · ' + tn('{count} of {total} bosses', bosses.filter(b => state.defeated[b.id]).length, { total: bosses.length })
        + ' · ' + tn('{count} of {total} minibosses', minibosses.filter(b => state.defeated[b.id]).length, { total: minibosses.length });
      tiles.replaceChildren(); details.replaceChildren();
      for (const biome of biomes) {
        const reached = biome.order <= current;
        const named = reached || (!compact && revealed.has(biome.id));
        const tile = element('section', 'saga-tile' + (reached ? ' is-reached' : ' is-locked') + (biome.order === current ? ' is-current' : '') + (!reached && named ? ' is-revealed' : ''));
        tile.dataset.order = biome.order;
        if (compact ? biome.thumb : biome.art) tile.append(image(compact ? biome.thumb : biome.art, 'saga-art'));
        const button = element('button', 'saga-select'); button.type = 'button'; button.dataset.key = 'biome:' + biome.order;
        button.setAttribute('aria-label', named ? tn('Biome {count} of {total}: {biome}', biome.order, { total: biomes.length, biome: biome.name }) : tn('Biome {count} of {total}', biome.order, { total: biomes.length }));
        if (biome.order === current) button.setAttribute('aria-current', 'step');
        const number = element('span', 'saga-number', String(biome.order)); number.setAttribute('aria-hidden', 'true');
        button.append(number);
        if (!compact) button.append(element('span', 'saga-biome-name', named ? biome.name : '🔒 ' + tn('Biome {count}', biome.order)));
        else if (!reached) button.append(element('span', 'saga-lock', '🔒'));
        button.addEventListener('click', () => { if (biome.order > P.reach(biomes)) P.setReach(biome.order, biomes); scrollTo(biome.order); });
        tile.append(button);
        if (reached && !compact) tile.append(portraits(biome, state));
        tiles.append(tile);
      }
      if (compact) {
        for (const biome of biomes.filter(b => b.order <= current).reverse()) {
          const row = element('section', 'saga-row' + (biome.order === current ? ' is-current' : ''));
          row.append(element('h3', '', biome.name), portraits(biome, state)); details.append(row);
        }
      } else {
        details.append(element('h2', '', t('Next up')));
        const biome = biomes.find(b => b.order <= current && b.bosses.some(boss => !state.defeated[boss.id]));
        const boss = biome?.bosses.find(b => !state.defeated[b.id]);
        if (boss) {
          const card = element('div', 'saga-next-card');
          if (boss.portrait) card.append(image(boss.portrait));
          const body = element('div'); body.append(element('h3', '', boss.name));
          if (boss.summon) body.append(element('p', 'saga-summon', t('Summon: {items}', { items: boss.summon })));
          const links = element('div', 'saga-links');
          for (const [label, url] of [['Bestiary', '/bestiary/#c=' + encodeURIComponent(boss.id)], ['Expedition', '/expedition/#boss=' + encodeURIComponent(boss.id)], ['Damage Calculator', '/damage-calculator/?' + new URLSearchParams({ biome: biome.id, target: boss.id })]]) {
            const link = element('a', '', label); link.href = url; links.append(link);
          }
          body.append(links); card.append(body); details.append(card);
        } else details.append(element('p', '', t(bosses.every(b => state.defeated[b.id]) ? 'Saga complete' : 'Travel on — move the slider when you reach the next biome.')));
      }
      preview(current);
      viewport.scrollLeft = previousScroll;
      if (focusKey) [...container.querySelectorAll('[data-key]')].find(node => node.dataset.key === focusKey)?.focus({ preventScroll: true });
    }
    const off = P.onChange(update);
    const offLanguage = globalThis.VCI18n?.onChange(update);
    const mounted = { update, destroy() { off(); offLanguage?.(); clearTimeout(timer); mounts.delete(container); } };
    mounts.set(container, mounted);
    update(); scrollTo(P.reach(biomes));
    return mounted;
  }
  const api = { render, locale, t: translate, tn: translateNumber, messages: null };
  globalThis.VCProgressUI = api;
})();
