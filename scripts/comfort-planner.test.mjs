import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({ TextEncoder, TextDecoder, atob, btoa, URLSearchParams });
context.window = context;
for (const p of ['shared/shopping/core.js', 'apps/comfort/data/data.js', 'apps/comfort/assets/planner.js']) vm.runInContext(readFileSync(p, 'utf8'), context);
const { VCO_DATA: data, VCComfort: core } = context;
const plain = value => JSON.parse(JSON.stringify(value));
test('base rules, fire and Rested', () => {
  assert.equal(core.comfortLevel(['campfire'], data, { sheltered: true }).total, 3);
  assert.equal(core.restedMinutes(3), 10);
  assert.equal(core.comfortLevel(['campfire', 'dragon-bed'], data, { sheltered: false }).total, 1);
  assert.equal(core.comfortLevel(['campfire', 'hearth'], data).total, 4);
  assert.equal(core.comfortLevel(['hearth', 'hearth'], data).total, 4);
  assert.equal(core.comfortLevel(['campfire', 'maypole', 'yule-tree'], data).total, 5);
  assert.equal(core.comfortLevel([{ id: 'campfire', lit: false }], data).total, 2);
  assert.equal(core.comfortLevel([{ id: 'hot-tub', heated: false }], data).total, 2);
  assert.equal(core.comfortLevel([{ id: 'hearth', hearthRange8m: false }], data).total, 3);
  assert.equal(core.comfortLevel(['chair', 'raven-throne'], data).parts.filter(p => p.category === 'chair').length, 1);
});
test('mandatory best build maximum at every biome', () => {
  const expected = [5, 13, 13, 15, 17, 19, 20, 22, 22];
  for (const [index, biome] of data.biomes.entries()) {
    const revealed = data.biomes.slice(0, index + 1).map(b => b.id);
    const build = core.bestBuild(data, revealed, { seasonal: false });
    const level = core.comfortLevel(build, data).total;
    assert.equal(level, expected[index], biome.name);
    assert.equal(core.restedMinutes(level), expected[index] + 7);
    assert.ok(build.every(id => !data.pieces.find(p => p.id === id).seasonal));
    assert.ok(build.every(id => revealed.includes(data.pieces.find(p => p.id === id).biome)));
  }
  const all = data.biomes.map(b => b.id);
  assert.equal(core.comfortLevel(core.bestBuild(data, all, { seasonal: true }), data).total, 24);
  assert.deepEqual(plain(core.bestBuild(data, [])), []);
});
test('upgrades respect Progress and seasonal setting and prefer lower cost', () => {
  const early = core.nextUpgrades(['campfire', 'bed', 'deer-rug'], data, ['meadows']);
  assert.equal(early.length, 0);
  const upgrades = core.nextUpgrades(['campfire'], data, ['meadows', 'black-forest']);
  assert.ok(upgrades.length <= 5);
  assert.ok(upgrades.every(u => ['meadows', 'black-forest'].includes(u.piece.biome)));
  assert.ok(upgrades.every(u => u.gain > 0 && !u.piece.seasonal));
  assert.equal(upgrades[0].gain, 2);
  const sample = { ...data, pieces: [
    { id: 'costly', comfort: 2, category: 'chair', biome: 'meadows', tier: 1, materials: [{ item: 'wood', amount: 10 }] },
    { id: 'cheap', comfort: 2, category: 'chair', biome: 'meadows', tier: 1, materials: [{ item: 'wood', amount: 2 }] },
  ] };
  assert.deepEqual(plain(core.bestBuild(sample, ['meadows'])), ['cheap']);
});
test('build sharing rejects nonsense and sanitizes untrusted state', () => {
  const state = { version: 1, pieces: ['campfire', 'bed'], have: ['bed'], sheltered: false, seasonal: true, breakdown: false, conditions: { campfire: { lit: false } } };
  const encoded = core.encodeBuild(state, data);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(plain(core.decodeBuild('#b=' + encoded, data)), state);
  for (const hash of ['#b=!?', '#b=e30', '#item=campfire', '#b=' + 'a'.repeat(20001), '#b=__', '', null]) assert.equal(core.decodeBuild(hash, data), null);
  assert.deepEqual(plain(core.sanitize({ pieces: ['campfire', 'hearth', 'fake'], have: ['fake'] }, data).pieces), ['campfire']);
});
test('shopping excludes owned furniture and expands material recipes', () => {
  const build = core.bestBuild(data, ['meadows', 'black-forest']);
  const shopping = core.shopping({ pieces: build, have: ['bed'] }, data);
  assert.ok(!shopping.wanted.some(p => p.id === 'bed'));
  assert.ok(shopping.materials.length > 0);
  assert.ok(shopping.stations.some(s => s.id === 'workbench'));
  assert.ok(shopping.steps.some(s => s.product === 'bronze-nails'));
  assert.equal(core.shopping({ pieces: build, have: build }, data).materials.length, 0);
});
