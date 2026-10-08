// Pure loadout calculations; shared shopping calculations remain in VCShopping.
(function () {
  'use strict';
  function score(food, focus) {
    const values = [food.health || 0, food.stamina || 0, food.eitr || 0];
    const total = values.reduce((sum, value) => sum + value, 0) || 1;
    if (focus === 'Balanced') return Math.min(values[0], values[1]) / Math.max(values[0], values[1], 1);
    return ({ Health: food.health, Stamina: food.stamina, Eitr: food.eitr }[focus] || 0) / total;
  }
  const clamp = (value, low, high, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : fallback;
  function itemTarget(id, data, revealedBiomes) {
    const item = [...data.food, ...data.meads].find(item => item.id === id);
    if (!item) return { kind: 'none', id: null };
    const biome = globalThis.VPAdvisor.availableBiome(item);
    if (biome && !new Set(revealedBiomes).has(biome)) return { kind: 'locked-biome', id: biome };
    return { kind: 'card', id: item.id };
  }
  function sanitize(value, data) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const foodIds = new Set(data.food.map(item => item.id));
    const meadIds = new Set(data.meads.map(item => item.id));
    const foods = Array.isArray(source.foods) ? [...new Set(source.foods.filter(id => foodIds.has(id)))].slice(0, 3) : [];
    const seen = new Set();
    const meads = (Array.isArray(source.meads) ? source.meads : []).filter(line => {
      if (!line || !meadIds.has(line.id) || seen.has(line.id)) return false;
      seen.add(line.id);
      return true;
    }).slice(0, 4).map(line => ({ id: line.id, mode: line.mode === 'continuous' ? 'continuous' : 'demand', quantity: Math.floor(clamp(line.quantity, 0, 999, 3)) }));
    return { version: 1, foods, meads, hours: Math.round(clamp(source.hours, .25, 10, 2) * 4) / 4,
      breakdown: source.breakdown === true, cauldronLevel: Math.floor(clamp(source.cauldronLevel, 0, 7, 1)) };
  }
  function calculate(value, data) {
    const state = sanitize(value, data);
    const foods = state.foods.map(id => data.food.find(item => item.id === id));
    const seconds = state.hours * 3600;
    const foodLines = foods.map(food => {
      const quantity = Math.ceil(seconds / Math.max(food.duration || 1, 1));
      const batches = Math.ceil(quantity / ((food.yields || 1) * (food.isFeast ? food.servings || 1 : 1)));
      return { id: food.id, item: food.id, quantity, batches, produced: batches * (food.yields || 1), definition: food };
    });
    const meadLines = state.meads.map(line => {
      const mead = data.meads.find(item => item.id === line.id);
      const quantity = line.mode === 'continuous' ? Math.ceil(seconds / Math.max(mead.cooldown || 0, mead.duration || 0, 1)) : line.quantity;
      const yields = mead.base ? mead.yields || 1 : 1;
      const batches = Math.ceil(quantity / yields);
      return { ...line, item: line.id, quantity, batches, produced: batches * yields, definition: mead };
    });
    const stats = foods.reduce((result, food) => ({ health: result.health + (food.health || 0),
      stamina: result.stamina + (food.stamina || 0), eitr: result.eitr + (food.eitr || 0),
      healing: result.healing + (food.healing?.amount || 0) }), { health: 25, stamina: 50, eitr: 0, healing: 0 });
    stats.duration = foods.length ? Math.min(...foods.map(food => food.duration)) : 0;
    return { state, foods: foodLines, meads: meadLines, stats };
  }
  function definitions(data) {
    const items = { ...data.items };
    const stationName = id => data.stations.find(station => station.id === id)?.name || id;
    for (const food of data.food) {
      items[food.id] = { ...items[food.id], ...food, recipe: food.materials.length ? {
        materials: food.materials, yields: food.yields || 1, station: stationName(food.station), stationLevel: food.stationLevel || 1,
      } : null };
    }
    for (const mead of data.meads) {
      if (!mead.base) { items[mead.id] = { ...mead, recipe: null }; continue; }
      items[mead.id] = { ...mead, recipe: { station: stationName('fermenter'), stationLevel: 1,
        yields: mead.yields || 1, materials: [{ item: mead.base.item, amount: 1 }] } };
      items[mead.base.item] = { ...items[mead.base.item], id: mead.base.item, name: mead.base.name,
        recipe: { station: stationName(mead.base.station), stationLevel: mead.base.stationLevel || 1, yields: 1, materials: mead.base.materials } };
    }
    return items;
  }
  function shopping(value, data) {
    const plan = calculate(value, data);
    const items = definitions(data);
    const products = [...plan.foods, ...plan.meads].filter(line => line.produced > 0)
      .map(line => ({ item: line.id, quantity: line.produced }));
    const direct = VCShopping.sumMaterials(products, items);
    const expanded = VCShopping.breakdown(direct, items, 20);
    const all = VCShopping.breakdown(products.map(line => ({ item: line.item, amount: line.quantity })), items, 21);
    // Order shared steps by their dependencies, including ingredients used by
    // multiple selected dishes. Reversing traversal order is insufficient.
    const stepsByProduct = new Map(all.steps.map(step => [step.product, step]));
    const visited = new Set();
    const steps = [];
    function visit(step) {
      if (visited.has(step.product)) return;
      visited.add(step.product);
      for (const material of items[step.product]?.recipe?.materials || []) {
        const dependency = stepsByProduct.get(material.item);
        if (dependency) visit(dependency);
      }
      steps.push(step);
    }
    for (const step of all.steps) visit(step);
    const stations = new Map();
    for (const step of all.steps) {
      const station = data.stations.find(item => item.name === step.station || item.id === step.station);
      const key = station?.id || step.station;
      const level = items[step.product]?.recipe?.stationLevel || 1;
      const current = stations.get(key);
      stations.set(key, { id: key, name: station?.name || step.station, level: Math.max(current?.level || 0, level), definition: station });
    }
    const needed = stations.get('cauldron')?.level || 0;
    const missing = data.stations.filter(station => station.upgrades === 'cauldron' && station.progressionLevel > plan.state.cauldronLevel && station.progressionLevel <= needed);
    if (needed && plan.state.cauldronLevel === 0) missing.unshift(data.stations.find(station => station.id === 'cauldron'));
    return { ...plan, items, materials: plan.state.breakdown ? expanded.materials : direct,
      steps, stations: [...stations.values()], missing,
      upgradeMaterials: VCShopping.sumMaterials(missing.map(station => ({ materials: station.materials, quantity: 1 })), items) };
  }
  function encode(value, data) {
    const bytes = new TextEncoder().encode(JSON.stringify(sanitize(value, data)));
    return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }
  function decode(hash, data) {
    try {
      const encoded = new URLSearchParams(String(hash).replace(/^#/, '')).get('l');
      if (!encoded || encoded.length > 10000 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
      const raw = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
      const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(raw, char => char.charCodeAt(0))));
      if (!value || value.version !== 1 || !Array.isArray(value.foods) || !Array.isArray(value.meads)) return null;
      return sanitize(value, data);
    } catch { return null; }
  }
  globalThis.VPPlanner = { itemTarget, score, sanitize, calculate, definitions, shopping, encode, decode };
})();
