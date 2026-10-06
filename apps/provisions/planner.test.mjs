import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ window: {}, TextEncoder, TextDecoder, URLSearchParams, atob, btoa });
for (const file of ['data/data.js', '../../shared/shopping/core.js', 'assets/planner.js']) {
  vm.runInContext(readFileSync(new URL(file, import.meta.url), 'utf8'), context);
}
const data = context.window.VPR_DATA;
const planner = context.VPPlanner;
const plain = value => JSON.parse(JSON.stringify(value));
const trip = { foods: ['serpent-stew', 'cooked-lox-meat', 'blood-pudding'], hours: 2, breakdown: true };

test('two-hour trip has exact servings, base player stats and raw ingredients', () => {
  const plan = planner.shopping(trip, data);
  assert.deepEqual(plain(plan.foods.map(line => line.quantity)), [4, 6, 4]);
  assert.deepEqual(plain(plan.stats), { health: 180, stamina: 167, eitr: 0, healing: 10, duration: 1200 });
  assert.deepEqual(Object.fromEntries(plan.materials.map(line => [line.item, line.amount])), {
    mushroom: 4, 'serpent-meat': 4, honey: 8, 'lox-meat': 6, thistle: 8, bloodbag: 8, barley: 16,
  });
  assert.equal(plan.materials.reduce((sum, line) => sum + line.amount, 0), 54);
  assert.equal(plan.stations.find(station => station.id === 'cauldron').level, 4);
  assert.deepEqual(plain(plan.missing.map(station => station.id)), ['spice-rack', 'butcher-s-table', 'pots-and-pans']);
  assert.equal(planner.shopping({ ...trip, cauldronLevel: 4 }, data).missing.length, 0);
  assert.equal(planner.shopping({ ...trip, cauldronLevel: 0 }, data).missing.length, 4);
});

test('duplicate, unknown and excessive selections are rejected and numeric settings bounded', () => {
  const state = planner.sanitize({ foods: ['serpent-stew', 'serpent-stew', 'bad', 'blood-pudding', 'cooked-lox-meat', 'honey'],
    meads: data.meads.slice(0, 5).map(mead => ({ id: mead.id, quantity: Infinity })), hours: NaN, cauldronLevel: 99 }, data);
  assert.deepEqual(plain(state.foods), ['serpent-stew', 'blood-pudding', 'cooked-lox-meat']);
  assert.equal(state.meads.length, 4);
  assert.ok(state.meads.every(line => line.quantity === 3));
  assert.equal(state.hours, 2);
  assert.equal(state.cauldronLevel, 7);
  assert.equal(planner.sanitize({ hours: .1 }, data).hours, .5);
  assert.equal(planner.sanitize({ hours: 99 }, data).hours, 10);
});

test('shared loadout round-trips and malformed, oversized or unsupported URLs fail safely', () => {
  assert.deepEqual(plain(planner.decode('#l=' + planner.encode(trip, data), data)), plain(planner.sanitize(trip, data)));
  for (const hash of ['#l=bad', '#l=%', '#l=' + btoa('{"version":2,"foods":[],"meads":[]}'), '#l=' + 'a'.repeat(10001)]) {
    assert.equal(planner.decode(hash, data), null);
  }
});

test('mead demand, cooldowns and complete fermentation batches affect the shopping list', () => {
  const plan = planner.shopping({ meads: [{ id: 'minor-healing-mead', mode: 'demand', quantity: 3 },
    { id: 'frost-resistance-mead', mode: 'continuous' }], hours: 2, breakdown: true }, data);
  assert.deepEqual(plain(plan.meads.map(line => [line.quantity, line.batches])), [[3, 1], [12, 2]]);
  assert.ok(plan.stations.some(station => station.id === 'fermenter'));
  assert.ok(plan.stations.some(station => station.id === 'mead-ketill'));
  assert.equal(planner.shopping({ meads: [{ id: 'minor-healing-mead', quantity: 0 }] }, data).materials.length, 0);
  assert.equal(planner.shopping({ meads: [{ id: 'love-potion', quantity: 3 }] }, data).materials[0].amount, 3);
});

test('a feast supplies ten servings from one batch', () => {
  const feast = data.food.find(food => food.id === 'sailor-s-bounty');
  const plan = planner.shopping({ foods: [feast.id], hours: 2 }, data);
  assert.equal(feast.servings, 10);
  assert.ok(plan.foods[0].quantity > 1 && plan.foods[0].quantity <= 10);
  assert.equal(plan.foods[0].batches, 1);
  assert.deepEqual(plain(plan.materials), plain(context.VCShopping.sumMaterials([{ item: feast.id, quantity: 1 }], planner.definitions(data))));
});

test('all 120 food and mead plans have finite ingredients and order dependencies before dishes', () => {
  const samples = [...data.food.map(food => ({ foods: [food.id] })), ...data.meads.map(mead => ({ meads: [{ id: mead.id, mode: 'continuous' }] }))];
  // A shared ingredient also selected as food must be cooked before both consumers.
  samples.push({ foods: ['cooked-serpent-meat', 'serpent-stew', 'sailor-s-bounty'] });
  for (const selection of samples) {
    const plan = planner.shopping({ ...selection, hours: 10, breakdown: true }, data);
    assert.ok(plan.materials.every(line => Number.isFinite(line.amount) && line.amount > 0));
    const positions = new Map(plan.steps.map((step, index) => [step.product, index]));
    for (const step of plan.steps) {
      for (const material of plan.items[step.product]?.recipe?.materials || []) {
        // Scraped food tabs can use the same ID for a raw and cooked ingredient;
        // VCShopping deliberately leaves a cycle as a terminal base material.
        if (material.item !== step.product && positions.has(material.item)) assert.ok(positions.get(material.item) < positions.get(step.product));
      }
    }
  }
});

test('Provisions messages and hub card translations cover 13 locales with matching placeholders', () => {
  const languages = JSON.parse(readFileSync(new URL('../../shared/i18n/languages.json', import.meta.url), 'utf8')).map(language => language.code);
  const placeholders = text => [...text.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
  for (const file of ['locales/messages.json', '../hub/locales/messages.json']) {
    const catalog = JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
    for (const [key, entry] of Object.entries(catalog)) {
      for (const code of languages) {
        assert.ok(entry[code], `${code}: ${key}`);
        assert.deepEqual(placeholders(entry[code]), placeholders(key), `${code}: ${key}`);
      }
    }
  }
});
