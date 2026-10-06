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
    return { version: 1, foods, meads, hours: Math.round(clamp(source.hours, .5, 10, 2) * 2) / 2,
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
      const batches = Math.ceil(quantity / (mead.yields || 1));
      return { ...line, item: line.id, quantity, batches, produced: batches * (mead.yields || 1), definition: mead };
    });
    const stats = foods.reduce((result, food) => ({ health: result.health + (food.health || 0),
      stamina: result.stamina + (food.stamina || 0), eitr: result.eitr + (food.eitr || 0),
      healing: result.healing + (food.healing?.amount || 0) }), { health: 25, stamina: 50, eitr: 0, healing: 0 });
    stats.duration = foods.length ? Math.min(...foods.map(food => food.duration)) : 0;
    return { state, foods: foodLines, meads: meadLines, stats };
  }
  globalThis.VPPlanner = { score, sanitize, calculate };
})();
