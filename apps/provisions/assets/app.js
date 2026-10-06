/* Provisions — safe DOM rendering with the shared locale and progress cores. */
(function () {
  'use strict';
  const data = VPR_DATA;
  const t = (key, values) => VCI18n.t(key, values);
  const name = entity => VCI18n.name(entity);
  const byId = (list, id) => list.find(item => item.id === id);
  const number = value => new Intl.NumberFormat(VCI18n.locale(), { maximumFractionDigits: 2 }).format(value);
  const time = seconds => t('{minutes} min', { minutes: number(seconds / 60) });
  let focus = 'All';
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
    if (food.isFeast) node.append(el('span', 'badge', t('Feast · {count} servings', { count: number(food.servings) })));
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
      el('p', 'details', t('Cooldown: {time}', { time: time(mead.cooldown) })),
      el('p', 'details', name(byId(data.stations, 'fermenter')) + ' · ' + time(mead.fermenterTime)),
      el('p', 'details', name(mead.base) + ' · ' + stationText(mead.base.station, mead.base.stationLevel)));
    return node;
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
  }
  VCI18n.mountPicker('#language-picker');
  document.getElementById('focus').addEventListener('change', event => { focus = event.target.value; renderCatalog(); });
  VCI18n.onChange(render);
  VCProgress.onChange(renderCatalog);
  render();
})();
