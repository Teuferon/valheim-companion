// Pure activity advice for browsers, workers and Node. No storage or DOM access.
(function () {
  'use strict';
  const ACTIVITIES = Object.freeze({
    boss: Object.freeze({ label: 'Boss fight', icon: '⚔', health: 1, stamina: .35, healing: 6 }),
    combat: Object.freeze({ label: 'Combat', icon: '🛡', health: 1, stamina: .6, healing: 3 }),
    mining: Object.freeze({ label: 'Mining & building', icon: '⛏', stamina: 1, health: .4 }),
    farming: Object.freeze({ label: 'Farming', icon: '🌱', stamina: 1, health: .3, duration: .4 }),
    exploration: Object.freeze({ label: 'Exploration & sailing', icon: '⛵', stamina: .8, health: .5, duration: .8 }),
    magic: Object.freeze({ label: 'Magic', icon: '✦', eitr: 1.2, health: .6, stamina: .2 }),
    balanced: Object.freeze({ label: 'Balanced', icon: '⚖', health: 1, stamina: 1, eitr: .5 }),
  });
  function preparation(food, { items = {} } = {}) {
    const raw = new Map();
    let stationLevel = Math.max(1, food.stationLevel || 1);
    function expand(id, amount, seen) {
      const recipe = items[id]?.recipe;
      if (seen.has(id) || !recipe?.materials?.length) {
        raw.set(id, (raw.get(id) || 0) + amount);
        return;
      }
      stationLevel = Math.max(stationLevel, recipe.stationLevel || 1);
      const path = new Set(seen); path.add(id);
      for (const line of recipe.materials) expand(line.item, amount * line.amount / (recipe.yields || 1), path);
    }
    const servings = (food.yields || 1) * (food.isFeast ? food.servings || 1 : 1);
    for (const line of food.materials || []) expand(line.item, line.amount / servings, new Set([food.id]));
    if (!raw.size) raw.set(food.id, 1);
    const ingredients = raw.size;
    return { ingredients, stationLevel, cost: [...raw.values()].reduce((sum, amount) => sum + amount, 0),
      easy: ingredients <= 3 && stationLevel <= 2 };
  }
  function scoreFood(food, activity, opts = {}) {
    const weights = ACTIVITIES[activity] || Object.values(ACTIVITIES).find(value => value.label === activity) || ACTIVITIES.balanced;
    const score = (food.health || 0) * (weights.health || 0) + (food.stamina || 0) * (weights.stamina || 0)
      + (food.eitr || 0) * (weights.eitr || 0) + (food.healing?.amount ?? food.healing ?? 0) * (weights.healing || 0)
      + (food.duration || 0) / 60 * (weights.duration || 0);
    if (!opts.easy) return score;
    const prep = opts.preparation || preparation(food, opts);
    return score / (1 + .15 * (prep.ingredients - 1) + .1 * (prep.stationLevel - 1));
  }
  function unlocked(item, opts) {
    return item.unlocked !== false && item.availability !== 'console-only'
      && (!opts.unlockedBiomes || opts.unlockedBiomes.includes(item.biome));
  }
  function bestCombos(foods, activity, opts = {}) {
    const limit = Math.max(0, Math.min(100, Math.floor(opts.limit ?? 3)));
    if (!limit) return [];
    const unique = new Map();
    for (const food of foods) if (unlocked(food, opts)) unique.set(food.id, food);
    const entries = [...unique.values()].sort((a, b) => a.id.localeCompare(b.id)).map(food => {
      const prep = preparation(food, opts);
      return { food, prep, score: scoreFood(food, activity, { ...opts, preparation: prep }) };
    });
    const top = [];
    const compare = (a, b) => b.score - a.score || a.cost - b.cost || a.stationLevel - b.stationLevel || a.key.localeCompare(b.key);
    // Keep only top N, avoiding allocation and sorting for every candidate.
    for (let i = 0; i < entries.length - 2; i++) for (let j = i + 1; j < entries.length - 1; j++) for (let k = j + 1; k < entries.length; k++) {
      const a = entries[i], b = entries[j], c = entries[k];
      const score = a.score + b.score + c.score;
      if (top.length === limit && score < top[top.length - 1].score) continue;
      const candidate = { foods: [a.food, b.food, c.food], score, cost: a.prep.cost + b.prep.cost + c.prep.cost,
        stationLevel: Math.max(a.prep.stationLevel, b.prep.stationLevel, c.prep.stationLevel),
        easy: a.prep.easy && b.prep.easy && c.prep.easy, key: [a.food.id, b.food.id, c.food.id].join('|') };
      if (top.length === limit && compare(candidate, top[top.length - 1]) >= 0) continue;
      top.push(candidate); top.sort(compare); if (top.length > limit) top.pop();
    }
    return top.map(combo => ({ ...combo, stats: {
      health: combo.foods.reduce((n, f) => n + (f.health || 0), 0), stamina: combo.foods.reduce((n, f) => n + (f.stamina || 0), 0),
      eitr: combo.foods.reduce((n, f) => n + (f.eitr || 0), 0), healing: combo.foods.reduce((n, f) => n + (f.healing?.amount || 0), 0),
      duration: Math.min(...combo.foods.map(f => f.duration || 0)),
    } }));
  }
  function recommendMeads(meads, activity, context = {}) {
    const selected = typeof context === 'string' ? context : context.id || context.biome || context.boss || '';
    const opts = typeof context === 'string' ? {} : context;
    const id = selected.toLowerCase().replaceAll(' ', '-');
    const resistance = ['swamp', 'bonemass'].includes(id) ? 'poison'
      : ['mountain', 'deep-north', 'moder', 'kall-fimbulbringer'].includes(id) ? 'frost'
      : ['ashlands', 'fader', 'lord-reto'].includes(id) ? 'fire' : '';
    const picks = [];
    const activityId = ACTIVITIES[activity] ? activity : Object.keys(ACTIVITIES).find(key => ACTIVITIES[key].label === activity);
    for (const mead of meads) {
      if (!unlocked(mead, opts)) continue;
      const text = mead.effect?.text || '';
      const resists = resistance && (mead.effect?.resistances?.some(r => r.type.toLowerCase() === resistance && r.multiplier < 1)
        || new RegExp(resistance + '.*resistan', 'i').test(mead.name + ' ' + text));
      let reason = '', priority = 0;
      if (resists) { reason = '{resistance} resistance for {context}'; priority = 10000; }
      else if (['boss', 'combat'].includes(activityId) && /healing/i.test(mead.name)) { reason = 'Healing for combat'; priority = 100; }
      else if (['mining', 'farming', 'exploration'].includes(activityId) && (/stamina/i.test(mead.name) || /tasty/i.test(mead.name))) {
        reason = 'Stamina for sustained activity'; priority = 100;
      } else if (activityId === 'magic' && /eitr/i.test(mead.name + ' ' + text)) { reason = 'Eitr for magic'; priority = 100; }
      if (reason) picks.push({ mead, reason, resistance, priority: priority + (Number(text.match(/\+(\d+)/)?.[1]) || 0) });
    }
    return picks.sort((a, b) => b.priority - a.priority || a.mead.id.localeCompare(b.mead.id)).slice(0, 4);
  }
  // Accept the existing VPPlanner.shopping result; return translatable templates.
  function computedTips(loadout, context = {}) {
    const tips = [];
    const foods = loadout.foods || [];
    const hours = context.hours ?? loadout.state?.hours ?? 2;
    if (foods.length) {
      const shortest = Math.min(...foods.map(line => (line.definition || line).duration || 1));
      tips.push({ key: 'Shortest food duration: {time}.', values: { time: shortest / 60 }, source: 'https://valheim.weirdgloop.org/w/Food' });
      for (const line of foods) {
        const food = line.definition || line;
        tips.push({ key: '{name}: {count} servings for {hours} hours.', values: { name: food.name, count: Math.ceil(hours * 3600 / Math.max(food.duration || 1, 1)), hours }, source: food.wiki });
      }
    }
    const needed = loadout.stations?.find(s => s.id === 'cauldron')?.level || 0;
    if (needed > (context.cauldronLevel ?? loadout.state?.cauldronLevel ?? 1)) {
      tips.push({ key: 'Cauldron level {level} required. Missing: {upgrades}.', values: { level: needed, upgrades: (loadout.missing || []).map(s => s.name).join(', ') }, source: 'https://valheim.weirdgloop.org/w/Cauldron' });
    }
    const blocked = (loadout.materials || []).filter(line => loadout.items?.[line.item]?.teleportable === false);
    if (blocked.length) tips.push({ key: 'These ingredients cannot be teleported: {ingredients}.', values: {
      ingredients: blocked.map(line => loadout.items[line.item].name || line.item).join(', '),
    }, source: 'https://valheim.weirdgloop.org/w/Portal' });
    return tips;
  }
  globalThis.VPAdvisor = Object.freeze({ ACTIVITIES, preparation, scoreFood, bestCombos, recommendMeads, computedTips });
})();
