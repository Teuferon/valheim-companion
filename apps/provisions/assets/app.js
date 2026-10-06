/* Provisions — safe DOM rendering with the shared locale and progress cores. */
(function () {
  'use strict';
  const data = VPR_DATA;
  const t = (key, values) => VCI18n.t(key, values);
  const tn = (key, count, values) => VCI18n.tn(globalThis.VC_MESSAGES, key, count, values);
  const name = entity => VCI18n.name(entity);
  const byId = (list, id) => list.find(item => item.id === id);
  const number = value => new Intl.NumberFormat(VCI18n.locale(), { maximumFractionDigits: 2 }).format(value);
  const time = seconds => tn('{minutes} min', seconds / 60, { minutes: number(seconds / 60) });
  let focus = 'All';
  function readStored() {
    try { return JSON.parse(localStorage.getItem('vp.loadout')); } catch { return null; }
  }
  let state = VPPlanner.decode(location.hash, data) || VPPlanner.sanitize(readStored(), data);
  function save() {
    try { localStorage.setItem('vp.loadout', JSON.stringify(state)); } catch { /* Keep working when storage is unavailable. */ }
  }
  const panel = document.getElementById('loadout-panel');
  const opener = document.getElementById('open-loadout');
  let noticeTimer;
  function notify(key) {
    const notice = document.getElementById('notice');
    notice.textContent = t(key);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.textContent = ''; }, 4000);
  }
  function update() { renderCatalog(); renderLoadout(); }
  function addFood(food) {
    if (state.foods.includes(food.id) || state.foods.length >= 3) return;
    state.foods.push(food.id);
    update();
  }
  function addMead(mead) {
    if (state.meads.some(line => line.id === mead.id) || state.meads.length >= 4) return;
    state.meads.push({ id: mead.id, mode: mead.duration < mead.cooldown || mead.duration <= 20 ? 'demand' : 'continuous', quantity: 3 });
    update();
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, action, className) {
    const node = el('button', className, text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }
  function removeButton(item, action) {
    const node = button('×', action, 'remove');
    node.setAttribute('aria-label', t('Remove {name}', { name: name(item) }));
    node.title = t('Remove {name}', { name: name(item) });
    return node;
  }
  function heading(item) {
    const node = el('div', 'item-heading');
    const image = el('img');
    image.src = item.image;
    image.alt = '';
    image.loading = 'lazy';
    node.append(image, el('h4', '', name(item)));
    return node;
  }
  function stationText(id, level) {
    if (id === 'none') return t('No station');
    const station = byId(data.stations, id);
    return t('{station} · level {level}', { station: name(station) || id, level: number(level || 1) });
  }
  function foodCard(food) {
    const node = el('article', 'food-card');
    node.dataset.item = food.id;
    node.append(heading(food));
    if (food.isFeast) node.append(el('span', 'badge', tn('Feast · {count} servings', food.servings, { count: number(food.servings) })));
    if (food.availability === 'console-only') node.append(el('span', 'badge', t('Console-only')));
    for (const [key, label] of [['health', 'Health'], ['stamina', 'Stamina'], ['eitr', 'Eitr']]) {
      const row = el('div', 'stat-row ' + key);
      const bar = el('progress');
      bar.max = 125;
      bar.value = food[key] || 0;
      bar.setAttribute('aria-label', t(label));
      row.append(el('span', '', t(label)), bar, el('span', '', number(food[key] || 0)));
      node.append(row);
    }
    node.append(el('p', 'details', t('Healing: {amount} HP/tick', { amount: number(food.healing?.amount || 0) })),
      el('p', 'details', t('Duration: {time}', { time: time(food.duration) })),
      el('p', 'details', stationText(food.station, food.stationLevel)));
    const selected = state.foods.includes(food.id);
    const add = button(t(selected ? 'Selected' : 'Add food'), () => addFood(food), 'add-item');
    add.disabled = selected || state.foods.length >= 3;
    node.append(add);
    return node;
  }
  // Translate effects through templates rather than rendering scraped wiki prose.
  function meadEffect(mead) {
    const recovery = mead.effect.text.match(/^\+(\d+) (HP|Stamina|Eitr) over (\d+)s$/);
    if (recovery) return t('{amount} {stat} over {seconds} s', { amount: recovery[1], stat: recovery[2] === 'HP' ? 'HP' : t(recovery[2]), seconds: recovery[3] });
    const effects = {
      'anti-sting-concoction': 'Prevents Deathsquito attacks',
      'berserkir-mead': 'Attack, block and dodge stamina cost −80%; physical damage taken ×1.5',
      'brew-of-animal-whispers': 'Taming speed ×2',
      'draught-of-vananidir': 'Swimming stamina cost −50%',
      'fire-resistance-barley-wine': 'Fire resistance',
      'frost-resistance-mead': 'Frost damage taken ×0.5',
      'lightfoot-mead': 'Jump stamina cost −30%; jump height +20%',
      'lingering-eitr-mead': 'Eitr regeneration +25%; blocks other eitr meads while active',
      'lingering-healing-mead': 'Health regeneration +25%; blocks other healing meads while active',
      'lingering-stamina-mead': 'Stamina regeneration +25%',
      'love-potion': 'More Troll spawns, more starred Trolls; all Trolls are alerted',
      'mead-of-troll-endurance': 'Carry weight +250',
      'poison-resistance-mead': 'Very resistant to Poison',
      'tasty-mead': 'Health regeneration −50%; stamina regeneration +100%',
      'tonic-of-ratatosk': 'Walking and running speed +15%; swimming speed +7.5%; Run +10',
    };
    return t(effects[mead.id]);
  }
  function meadCard(mead) {
    const node = el('article', 'mead-card');
    node.dataset.item = mead.id;
    node.append(heading(mead), el('p', 'effect', meadEffect(mead)),
      el('p', 'details', t('Duration: {time}', { time: time(mead.duration) })),
      el('p', 'details', t('Cooldown: {time}', { time: time(mead.cooldown) })));
    if (mead.base) node.append(
      el('p', 'details', name(byId(data.stations, 'fermenter')) + ' · ' + time(mead.fermenterTime)),
      el('p', 'details', name(mead.base) + ' · ' + stationText(mead.base.station, mead.base.stationLevel)));
    else node.append(el('p', 'hint', t('No crafting recipe in the data.')));
    const selected = state.meads.some(line => line.id === mead.id);
    const add = button(t(selected ? 'Selected' : 'Add mead'), () => addMead(mead), 'add-item');
    add.disabled = selected || state.meads.length >= 4;
    node.append(add);
    return node;
  }
  function renderLoadout() {
    const content = document.getElementById('loadout-content');
    const activeId = content.contains(document.activeElement) ? document.activeElement.id : '';
    save();
    const plan = VPPlanner.shopping(state, data);
    content.replaceChildren();
    const foods = el('section', 'slots');
    foods.append(el('h3', 'section-title', t('Food')), el('p', 'hint', t('Choose up to three different foods.')));
    for (let index = 0; index < 3; index++) {
      const line = plan.foods[index];
      const row = el('div', 'slot');
      row.setAttribute('aria-label', t('Food slot {number}', { number: number(index + 1) }));
      const info = el('div');
      if (line) {
        info.append(el('strong', '', name(line.definition)), el('p', 'hint', tn('{count} servings', line.quantity, { count: number(line.quantity) })));
        row.append(info, removeButton(line.definition, () => { state.foods.splice(index, 1); update(); }));
      } else row.append(el('span', 'hint', number(index + 1) + ' · ' + t('Empty')));
      foods.append(row);
    }
    const meads = el('section', 'slots');
    meads.append(el('h3', 'section-title', t('Meads') + ' · ' + number(state.meads.length) + ' / 4'));
    for (const line of plan.meads) {
      const row = el('div', 'mead-slot');
      const title = el('div', 'slot-title');
      title.append(el('strong', '', name(line.definition)), removeButton(line.definition, () => {
        state.meads = state.meads.filter(item => item.id !== line.id); update();
      }));
      const mode = el('select');
      mode.id = 'mode-' + line.id;
      mode.setAttribute('aria-label', t('Mead use') + ' · ' + name(line.definition));
      for (const [value, key] of [['demand', 'On demand'], ['continuous', 'Continuous']]) {
        const option = el('option', '', t(key)); option.value = value; mode.append(option);
      }
      mode.value = line.mode;
      mode.addEventListener('change', () => { state.meads.find(item => item.id === line.id).mode = mode.value; renderLoadout(); });
      const quantity = el('input');
      quantity.type = 'number'; quantity.min = 0; quantity.max = 999; quantity.step = 1;
      quantity.id = 'quantity-' + line.id;
      quantity.value = line.quantity;
      quantity.disabled = line.mode !== 'demand';
      quantity.setAttribute('aria-label', t('Quantity') + ' · ' + name(line.definition));
      quantity.addEventListener('change', () => {
        state.meads.find(item => item.id === line.id).quantity = Number(quantity.value);
        state = VPPlanner.sanitize(state, data); renderLoadout();
      });
      const controls = el('div', 'mead-controls'); controls.append(mode, quantity);
      row.append(title, controls, el('p', 'hint', tn('{count} servings', line.quantity, { count: number(line.quantity) })));
      meads.append(row);
    }
    const hours = el('label', 'hours-control');
    const hoursLabel = el('span', '', t('Hours of play'));
    const output = el('output', '', number(state.hours)); output.htmlFor = 'hours';
    const range = el('input'); range.type = 'range'; range.id = 'hours'; range.min = .5; range.max = 10; range.step = .5; range.value = state.hours;
    range.setAttribute('aria-label', t('Hours of play'));
    range.addEventListener('input', () => { state.hours = Number(range.value); renderLoadout(); });
    hours.append(hoursLabel, output, range);
    const stats = el('section', 'stats');
    for (const [key, label] of [['health', 'Max health'], ['stamina', 'Max stamina'], ['eitr', 'Eitr'], ['healing', 'Healing per tick'], ['duration', 'Shortest duration']]) {
      const row = el('div', 'summary-row ' + key);
      row.append(el('span', '', t(label)), el('strong', '', key === 'duration' ? (plan.stats.duration ? time(plan.stats.duration) : '—') : number(plan.stats[key])));
      stats.append(row);
    }
    stats.append(el('p', 'hint', t('Includes base player stats: 25 HP / 50 stamina.')));
    content.append(foods, meads, hours, stats);
    renderShopping(content, plan);
    document.getElementById('mobile-summary').textContent = state.foods.length + ' / 3 · ' + plan.stats.health + ' HP';
    if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
  }
  function materialName(plan, id) { return name(plan.items[id]) || id; }
  function materialList(materials, plan) {
    return VCShopping.formatList(materials.map(line => ({ ...line, name: materialName(plan, line.item) })), VCI18n.locale());
  }
  function sources(item) {
    const container = el('div', 'sources');
    const revealed = new Set(VCProgress.revealedBiomes(data.biomes));
    for (const source of item?.sources || []) {
      if (source.kind === 'creature' && source.creatureId) {
        const visible = !(source.biomes?.length) || source.biomes.some(id => revealed.has(id));
        if (!visible) {
          const row = el('div', 'source-locked');
          row.append(el('span', 'hint', t('Locked until you reach this biome.')), button(t('Reveal'), () => {
            for (const id of source.biomes) VCProgress.visit(id, true);
          }));
          container.append(row);
          continue;
        }
        const link = el('a', '', name({ name: source.text }) + (source.biomes?.length ? ' · ' + source.biomes.map(id => name(byId(data.biomes, id))).join(', ') : ''));
        link.href = '/bestiary/#c=' + encodeURIComponent(source.creatureId);
        container.append(link);
      } else container.append(el('span', 'hint', source.text.replace(/^\*\s*/, '')));
    }
    if (!item?.sources?.length && item?.wiki) {
      const link = el('a', '', 'Valheim Wiki'); link.href = item.wiki; container.append(link);
    }
    return container;
  }
  function shoppingText(plan) {
    const lines = [t('Loadout'), ...[...plan.foods, ...plan.meads].map(line => tn('{count} servings', line.quantity, { count: number(line.quantity) }) + ' · ' + name(line.definition)),
      '', t('Hours of play') + ': ' + number(state.hours), '', t('Shopping list'), materialList(plan.materials, plan), '', t('Station steps')];
    lines.push(...plan.steps.map(step => t('{amount}× {product} at {station}', { amount: number(step.amount), product: materialName(plan, step.product), station: step.station })));
    lines.push('', t('Required stations'), ...plan.stations.map(station => t('{station} · level {level}', { station: name(station), level: number(station.level) })));
    if (plan.missing.length) lines.push('', t('Missing upgrades'), ...plan.missing.map(name), materialList(plan.upgradeMaterials, plan));
    return lines.join('\n');
  }
  async function copy(text, successKey, parent) {
    parent.querySelector('.copy-fallback')?.remove();
    try {
      await navigator.clipboard.writeText(text);
      notify(successKey);
    } catch {
      const fallback = el('div', 'copy-fallback');
      const field = el('textarea'); field.value = text; field.readOnly = true;
      field.setAttribute('aria-label', t('Copy list'));
      fallback.append(el('p', 'hint', t('Copy failed. Select and copy the text below.')), field);
      parent.append(fallback); field.focus(); field.select();
    }
  }
  function renderShopping(content, plan) {
    const shopping = el('section', 'shopping');
    shopping.append(el('h3', 'section-title', t('Shopping list')));
    const breakdownLabel = el('label', 'check-control');
    const breakdown = el('input'); breakdown.type = 'checkbox'; breakdown.checked = state.breakdown;
    breakdown.addEventListener('change', () => { state.breakdown = breakdown.checked; renderLoadout(); });
    breakdownLabel.append(breakdown, el('span', '', t('Show raw materials')));
    shopping.append(breakdownLabel);
    if (!plan.materials.length) shopping.append(el('p', 'hint', t('Choose food or mead to build a shopping list.')));
    for (const material of plan.materials) {
      const row = el('div', 'material');
      const item = plan.items[material.item];
      row.append(el('strong', '', number(material.amount) + '× ' + materialName(plan, material.item)));
      const sourceDetails = el('details');
      sourceDetails.append(el('summary', '', t('Sources')), sources(item));
      row.append(sourceDetails); shopping.append(row);
    }
    shopping.append(el('p', 'hint', t('Full crafting batches; feast servings are included.')));
    if (plan.foods.length || plan.meads.length) {
      const batches = el('ul', 'batch-list');
      for (const line of [...plan.foods, ...plan.meads]) batches.append(el('li', '', name(line.definition) + ' · ' + tn('{count} batches', line.batches, { count: number(line.batches) })));
      shopping.append(batches);
    }
    if (plan.steps.length) {
      const steps = el('details', 'station-steps');
      steps.append(el('summary', '', t('Station steps')));
      const list = el('ol');
      for (const step of plan.steps) list.append(el('li', '', t('{amount}× {product} at {station}', { amount: number(step.amount), product: materialName(plan, step.product), station: step.station })));
      steps.append(list); shopping.append(steps);
    }
    if (plan.stations.length) {
      const required = el('section', 'required-stations');
      required.append(el('h3', 'section-title', t('Required stations')));
      for (const station of plan.stations) {
        const row = el('details', 'station');
        row.append(el('summary', '', t('{station} · level {level}', { station: name(station), level: number(station.level) })));
        if (station.definition?.materials) row.append(el('p', 'hint', materialList(station.definition.materials, plan)));
        required.append(row);
      }
      if (plan.stations.some(station => station.id === 'cauldron')) {
        const label = el('label', 'cauldron-control'); label.append(el('span', '', t('My Cauldron level')));
        const level = el('select'); level.id = 'cauldron-level';
        for (let value = 0; value <= 7; value++) { const option = el('option', '', number(value)); option.value = value; level.append(option); }
        level.value = state.cauldronLevel;
        level.addEventListener('change', () => { state.cauldronLevel = Number(level.value); renderLoadout(); });
        label.append(level); required.append(label);
        if (plan.missing.length) {
          required.append(el('h4', '', t('Missing upgrades')));
          const upgrades = el('ul');
          for (const upgrade of plan.missing) upgrades.append(el('li', '', name(upgrade)));
          required.append(upgrades, el('p', 'upgrade-materials', materialList(plan.upgradeMaterials, plan)), el('p', 'hint', t('Upgrade materials are separate from food ingredients.')));
        } else required.append(el('p', 'hint', t('Recipe ready')));
      }
      shopping.append(required);
    }
    const actions = el('div', 'panel-actions');
    const copyList = button(t('Copy list'), () => copy(shoppingText(plan), 'Copied!', shopping));
    copyList.disabled = !plan.materials.length;
    actions.append(copyList, button(t('Share loadout'), () => {
      const url = new URL(location.href); url.hash = 'l=' + VPPlanner.encode(state, data);
      history.replaceState(null, '', url);
      copy(url.href, 'Link copied!', shopping);
    }));
    shopping.append(actions); content.append(shopping);
  }
  function renderCatalog() {
    const catalog = document.getElementById('catalog');
    catalog.replaceChildren();
    const revealed = new Set(VCProgress.revealedBiomes(data.biomes));
    for (const biome of [...data.biomes].sort((a, b) => a.order - b.order)) {
      const section = el('section', 'biome');
      section.id = biome.id;
      const header = el('div', 'biome-heading');
      header.append(el('h2', '', name(biome)));
      section.append(header);
      if (!revealed.has(biome.id)) {
        header.append(button(t('Reveal'), () => VCProgress.visit(biome.id, true)));
        section.append(el('p', 'locked', t('Locked until you reach this biome.')));
      } else {
        const body = el('div', 'biome-body');
        for (const [label, items, renderer] of [
          ['Food', data.food.filter(item => item.biome === biome.id && !item.isFeast), foodCard],
          ['Feasts', data.food.filter(item => item.biome === biome.id && item.isFeast), foodCard],
          ['Meads', data.meads.filter(item => item.biome === biome.id), meadCard],
        ]) {
          if (!items.length) continue;
          if (label !== 'Meads') items.sort((a, b) => VPPlanner.score(b, focus) - VPPlanner.score(a, focus) || name(a).localeCompare(name(b)));
          const grid = el('div', 'item-grid');
          grid.append(...items.map(renderer));
          body.append(el('h3', 'section-title', t(label)), grid);
        }
        section.append(body);
      }
      catalog.append(section);
    }
    const consoleFoods = data.food.filter(food => food.availability === 'console-only');
    if (consoleFoods.length) {
      const extra = el('details', 'biome biome-body');
      extra.append(el('summary', '', t('Console-only')));
      const grid = el('div', 'item-grid'); grid.append(...consoleFoods.map(foodCard));
      extra.append(grid); catalog.append(extra);
    }
  }
  function render() {
    VCI18n.apply();
    const picker = document.querySelector('.vc-language-picker');
    picker.setAttribute('aria-label', t('Language'));
    picker.options[0].textContent = t('Auto (browser)');
    const select = document.getElementById('focus');
    select.replaceChildren(...['All', 'Health', 'Stamina', 'Eitr', 'Balanced'].map(key => {
      const option = el('option', '', t(key));
      option.value = key;
      return option;
    }));
    select.value = focus;
    renderCatalog();
    renderLoadout();
  }
  VCI18n.mountPicker('#language-picker');
  document.getElementById('focus').addEventListener('change', event => { focus = event.target.value; renderCatalog(); });
  VCI18n.onChange(render);
  VCProgress.onChange(update);
  window.addEventListener('hashchange', () => {
    const imported = VPPlanner.decode(location.hash, data);
    if (imported) { state = imported; update(); }
  });
  window.addEventListener('storage', event => {
    if (event.key === 'vp.loadout' || event.key === null) {
      state = VPPlanner.sanitize(readStored(), data); update();
    }
  });
  function setDrawer(open) {
    panel.classList.toggle('open', open);
    opener.setAttribute('aria-expanded', String(open));
    if (open) document.getElementById('close-loadout').focus();
    else opener.focus();
  }
  opener.addEventListener('click', () => setDrawer(!panel.classList.contains('open')));
  document.getElementById('close-loadout').addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('open')) setDrawer(false);
  });
  render();
})();
