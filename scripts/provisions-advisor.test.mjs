import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({});
context.window = context;
for (const file of ['shared/shopping/core.js', 'apps/provisions/assets/planner.js', 'apps/provisions/assets/advisor.js', 'apps/provisions/data/data.js']) {
  vm.runInContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), context);
}
const { VPAdvisor: a, VPPlanner: p, VPR_DATA: data } = context;
const food = (id, stats = {}) => ({ id, name: id, health: 10, stamina: 10, eitr: 0, duration: 1200, healing: { amount: 1 }, stationLevel: 1, materials: [], biome: 'meadows', ...stats });

test('activity weights follow § 23 and prefer HP, stamina and eitr respectively', () => {
  const hp = food('hp', { health: 90, stamina: 30 });
  const stamina = food('stamina', { health: 30, stamina: 90 });
  const magic = food('magic', { health: 20, stamina: 20, eitr: 90 });
  assert.ok(a.scoreFood(hp, 'boss') > a.scoreFood(stamina, 'boss'));
  assert.ok(a.scoreFood(stamina, 'mining') > a.scoreFood(hp, 'mining'));
  assert.ok(a.scoreFood(magic, 'magic') > a.scoreFood(hp, 'magic'));
  assert.equal(a.scoreFood(hp, 'Boss fight'), 106.5);
  assert.equal(a.scoreFood(stamina, 'farming'), 107);
  assert.equal(a.scoreFood(hp, 'exploration'), 85);
  assert.equal(a.scoreFood(hp, 'combat'), 111);
  assert.equal(a.scoreFood(magic, 'balanced'), 85);
});
test('all triples are unique, locked and console-only foods are excluded', () => {
  const foods = [food('a'), food('b'), food('c'), food('d'), food('a'), food('locked', { biome: 'ashlands', health: 999 }), food('console', { availability: 'console-only', health: 999 })];
  const combos = a.bestCombos(foods, 'boss', { limit: 10, unlockedBiomes: ['meadows'] });
  assert.equal(combos.length, 4);
  for (const combo of combos) {
    assert.equal(new Set(combo.foods.map(f => f.id)).size, 3);
    assert.ok(combo.foods.every(f => f.biome === 'meadows' && f.id !== 'console'));
  }
  assert.equal(a.bestCombos(foods.slice(0, 2), 'boss').length, 0);
  assert.equal(a.bestCombos(foods, 'boss', { limit: 0 }).length, 0);
});
test('easy cooking expands nested recipes and changes order', () => {
  const simple = food('simple', { health: 70 });
  const complex = food('complex', { health: 90, materials: [{ item: 'prepared', amount: 8 }] });
  const items = { prepared: { recipe: { stationLevel: 5, yields: 1, materials: ['a', 'b', 'c', 'd'].map(item => ({ item, amount: 1 })) } } };
  assert.ok(a.scoreFood(complex, 'boss') > a.scoreFood(simple, 'boss'));
  assert.ok(a.scoreFood(complex, 'boss', { easy: true, items }) < a.scoreFood(simple, 'boss', { easy: true, items }));
  assert.equal(a.preparation(complex, { items }).ingredients, 4);
  const foods = [food('top-a', { health: 120 }), food('top-b', { health: 120 }), simple, complex];
  assert.ok(a.bestCombos(foods, 'boss', { items })[0].foods.some(f => f.id === 'complex'));
  assert.ok(a.bestCombos(foods, 'boss', { easy: true, items })[0].foods.some(f => f.id === 'simple'));
});
test('ties prefer fewer raw ingredients, then lower station levels; feasts are one food', () => {
  const foods = [food('a'), food('b'), food('c-expensive', { materials: [{ item: 'x', amount: 10 }] }), food('d-high', { stationLevel: 5 }), food('e-feast', { isFeast: true, servings: 10, materials: [{ item: 'x', amount: 10 }] })];
  const top = a.bestCombos(foods, 'boss')[0];
  assert.ok(!top.foods.some(f => f.id === 'c-expensive' || f.id === 'd-high'));
  assert.equal(top.foods.length, 3);
  assert.equal(a.preparation(foods[4]).cost, 1);
});
test('resistance recommendations use biome and boss rules before healing', () => {
  const first = id => a.recommendMeads(data.meads, 'boss', { id })[0]?.mead.id;
  assert.equal(first('swamp'), 'poison-resistance-mead');
  assert.equal(first('bonemass'), 'poison-resistance-mead');
  assert.equal(first('ashlands'), 'fire-resistance-barley-wine');
  assert.equal(first('moder'), 'frost-resistance-mead');
  assert.equal(first('deep-north'), 'frost-resistance-mead');
  assert.equal(first('lord-reto'), 'fire-resistance-barley-wine');
  assert.ok(a.recommendMeads(data.meads, 'mining', {}).every(pick => /stamina|tasty/i.test(pick.mead.name)));
  assert.ok(a.recommendMeads(data.meads, 'magic', {}).every(pick => /eitr/i.test(pick.mead.name)));
  assert.ok(a.recommendMeads(data.meads, 'boss', { id: 'swamp', unlockedBiomes: ['meadows'] }).every(pick => pick.mead.biome === 'meadows'));
  assert.ok(a.recommendMeads(data.meads, 'boss', {}).length <= 4);
});
test('computed tips cover portions, shortest duration, missing upgrades and blocked ingredients', () => {
  const plan = { foods: [{ definition: food('a') }], state: { hours: 2, cauldronLevel: 1 }, stations: [{ id: 'cauldron', level: 3 }], missing: [{ name: 'Spice Rack' }], materials: [{ item: 'metal' }], items: { metal: { name: 'Iron', teleportable: false } } };
  const tips = a.computedTips(plan);
  assert.equal(tips.length, 4);
  assert.equal(tips[0].values.time, 20);
  assert.equal(tips[1].values.count, 6);
  assert.equal(tips[2].values.upgrades, 'Spice Rack');
  assert.equal(tips[3].values.ingredients, 'Iron');
  assert.equal(a.computedTips({}).length, 0);
});
test('100 foods are exhaustively ranked in under 300 ms', () => {
  const foods = Array.from({ length: 100 }, (_, i) => food('food-' + i, { health: (i * 19) % 100, stamina: (i * 37) % 100 }));
  const start = performance.now();
  const combos = a.bestCombos(foods, 'boss');
  const elapsed = performance.now() - start;
  console.log(`100 foods: ${elapsed.toFixed(1)} ms`);
  assert.equal(combos.length, 3);
  assert.ok(elapsed < 300, `${elapsed} ms`);
  const sorted = foods.toSorted((x, y) => a.scoreFood(y, 'boss') - a.scoreFood(x, 'boss'));
  assert.equal(combos[0].score, sorted.slice(0, 3).reduce((sum, f) => sum + a.scoreFood(f, 'boss'), 0));
});
