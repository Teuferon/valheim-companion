import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
context.window = context;
for (const file of ['apps/provisions/data/data.js', 'apps/provisions/assets/advisor.js', 'apps/provisions/assets/planner.js', 'apps/smithy/data/data.js', 'apps/hub/data/search.js']) {
  vm.runInContext(readFileSync(file, 'utf8'), context);
}
const { VPPlanner: planner, VPR_DATA: data, VA_DATA: smithy } = context;
const target = (id, biomes) => JSON.parse(JSON.stringify(planner.itemTarget(id, data, biomes)));

test('Provisions item links target food, mead or their locked biome without changing progress', () => {
  const biomes = ['meadows'];
  assert.deepEqual(target('raspberries', biomes), { kind: 'card', id: 'raspberries' });
  assert.deepEqual(target('oats', biomes), { kind: 'locked-biome', id: 'deep-north' });
  assert.deepEqual(target('carrot', biomes), { kind: 'locked-biome', id: 'black-forest' });
  assert.deepEqual(target('oats', ['deep-north']), { kind: 'card', id: 'oats' });
  const mead = data.meads.find(item => item.id === 'poison-resistance-mead');
  const biome = context.VPAdvisor.availableBiome(mead);
  assert.deepEqual(target(mead.id, []), { kind: 'locked-biome', id: biome });
  assert.deepEqual(target(mead.id, [biome]), { kind: 'card', id: mead.id });
  assert.deepEqual(target('missing-item', biomes), { kind: 'none', id: null });
  assert.deepEqual(target('"[]', biomes), { kind: 'none', id: null });
  assert.deepEqual(biomes, ['meadows']);
});

test('every Smithy material search URL has a weapon, armor piece or material target', () => {
  const ids = new Set([...smithy.weapons.map(item => item.id), ...smithy.armor.flatMap(set => set.pieces.map(piece => piece.id)), ...Object.keys(smithy.items)]);
  const missing = context.VC_SEARCH_INDEX.filter(item => item.type === 'material' && item.url.startsWith('/smithy/#item=') && !ids.has(decodeURIComponent(item.url.split('=')[1])));
  assert.equal(missing.length, 0, JSON.stringify(missing));
});
