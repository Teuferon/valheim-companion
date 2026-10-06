/* Per-biome progress checklist. Game names always use the shared naming API. */
(function () {
  'use strict';
  const P = globalThis.VCProgress;
  const I = globalThis.VCI18n;
  const biomes = globalThis.VP_DATA.biomes;
  const t = (key, values) => I.t(globalThis.VC_MESSAGES, key, values);
  const find = id => document.getElementById(id);
  const temporaryReveals = new Set();
  let pendingAction = null;
  let pendingHash = null;
  let statusKey = '';
  const dialog = find('action-dialog');
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
    img.src = value.image; img.alt = ''; img.loading = 'lazy';
    return img;
  }
  function creatureCard(value, biome, kind, state) {
    const card = element('article', 'creature');
    card.append(image(value) ?? element('span'));
    const content = element('div', 'creature-content');
    content.append(element('p', 'tag', t(kind)), element('h3', '', I.name(value)));
    if (value.summon) content.append(element('p', 'summon', t('Summon: {items}', { items: value.summon })));
    const links = element('div', 'links');
    const bestiary = element('a', '', 'Bestiary');
    bestiary.href = '../bestiary/#c=' + encodeURIComponent(value.id);
    const calculator = element('a', '', 'Damage Calculator');
    calculator.href = '../damage-calculator/?' + new URLSearchParams({ biome: biome.id, target: value.id });
    links.append(bestiary, calculator); content.append(links);
    const defeated = checkbox('defeat', value.id, t('Defeated'), state.defeated[value.id] === true);
    defeated.querySelector('input').setAttribute('aria-label', I.name(value) + ' · ' + t('Defeated'));
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
    render();
  }
  function render() {
    const focusKey = document.activeElement?.dataset.key;
    I.apply();
    const picker = document.querySelector('.vc-language-picker');
    picker.setAttribute('aria-label', t('Language'));
    picker.options[0].textContent = t('Auto (browser)');
    const state = P.get();
    const revealed = new Set([...P.revealedBiomes(biomes), ...temporaryReveals]);
    const defeated = biomes.flatMap(b => b.bosses).filter(boss => state.defeated[boss.id]).length;
    find('summary-text').textContent = t('{revealed} / {total} biomes revealed · {bosses} bosses defeated', { revealed: revealed.size, total: biomes.length, bosses: defeated });
    find('progress-meter').max = biomes.length;
    find('progress-meter').value = revealed.size;
    find('status').textContent = statusKey ? t(statusKey) : '';
    const container = find('biomes');
    container.replaceChildren();
    for (const biome of biomes) {
      const section = element('section', 'biome' + (revealed.has(biome.id) ? '' : ' locked'));
      const header = element('div', 'biome-header');
      if (!revealed.has(biome.id)) {
        header.append(element('h2', '', '🔒 ' + t('Biome {number}', { number: biome.order })));
        const button = element('button', '', t('Reveal'));
        button.type = 'button'; button.dataset.key = 'reveal:' + biome.id;
        button.addEventListener('click', () => reveal(biome.id));
        header.append(button); section.append(header); container.append(section);
        continue;
      }
      header.append(element('h2', '', biome.order + ' · ' + I.name(biome)), checkbox('visit', biome.id, t('Visited'), state.visited.includes(biome.id)));
      section.append(header);
      for (const boss of biome.bosses) section.append(creatureCard(boss, biome, 'Boss', state));
      for (const boss of biome.minibosses) section.append(creatureCard(boss, biome, 'Miniboss', state));
      if (biome.milestones.length) {
        const group = element('div', 'milestones');
        group.append(element('h3', '', t('Key drops')));
        const list = element('div', 'milestone-list');
        for (const value of biome.milestones) {
          const label = checkbox('milestone', value.id, I.name(value), state.milestones[value.id] === true);
          label.classList.add('milestone');
          const img = image(value);
          if (img) label.insertBefore(img, label.lastChild);
          list.append(label);
        }
        group.append(list); section.append(group);
      }
      container.append(section);
    }
    if (focusKey) {
      const targetKey = focusKey.startsWith('reveal:') ? focusKey.replace('reveal:', 'visit:') : focusKey;
      [...container.querySelectorAll('[data-key]')].find(node => node.dataset.key === targetKey)?.focus({ preventScroll: true });
    }
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
        temporaryReveals.clear(); P.reset(); statusKey = 'Progress reset.';
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
