import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ console });
vm.runInContext(readFileSync('apps/smithy/assets/app.js', 'utf8'), context);
vm.runInContext(readFileSync('apps/smithy/data/data.js', 'utf8').replace('window.VA_DATA', 'globalThis.VA_DATA'), context);
const { calculateCartMaterials } = context.VACart;
const data = context.VA_DATA;
const cartFor = id => data.armor.find(a => a.id === id).pieces.map(piece => ({ pieceId: piece.id, have: 0, want: 1 }));

test('raw-material option distinguishes raw Troll materials from crafted Bronze', () => {
  assert.equal(calculateCartMaterials(cartFor('troll-set'), data, {}).canBreakDown, false);
  assert.equal(calculateCartMaterials(cartFor('bronze-armor'), data, {}).canBreakDown, true);
  const calc = calculateCartMaterials(cartFor('bronze-armor'), data, { breakdown: true });
  assert.ok(calc.materials.some(m => m.item === 'copper-ore'));
  assert.ok(calc.materials.some(m => m.item === 'tin-ore'));
  assert.ok(!calc.materials.some(m => m.item === 'bronze'));
});

test('visible material sources omit later locked creatures and locked biome names', () => {
  const calc = calculateCartMaterials(cartFor('troll-set'), data, { openBiomes: ['black-forest'] });
  const sources = calc.materials.find(m => m.item === 'bone-fragments').sources;
  assert.equal(sources.length, 2);
  assert.equal(sources[0].text, 'Skeleton (Black Forest)');
  assert.equal(sources[1].text, 'Rancid Remains (Black Forest)');
  assert.ok(sources.every(s => !s.locked));
});

test('all-locked material sources reveal only the earliest biome, without creature identity', () => {
  const calc = calculateCartMaterials(cartFor('troll-set'), data, {});
  const sources = calc.materials.find(m => m.item === 'bone-fragments').sources;
  assert.equal(sources.length, 1);
  assert.equal(sources[0].text, '🔒 a creature from the Black Forest');
  assert.equal(sources[0].biomeId, 'black-forest');
  assert.equal(sources[0].locked, true);
});

test('show-all sources follow biome order and crafted materials show only their station', () => {
  const calc = calculateCartMaterials(cartFor('troll-set'), data, { showAll: true });
  const sources = calc.materials.find(m => m.item === 'bone-fragments').sources;
  assert.equal(sources.length, 3);
  assert.match(sources[2].text, /^Skugg \(Ashlands\)$/);
  const bronze = calculateCartMaterials(cartFor('bronze-armor'), data, {});
  assert.equal(bronze.materials.find(m => m.item === 'bronze').sources[0].text, 'Crafted at Forge');
});

for (const app of ['bestiary', 'smithy']) {
  test(`${app} catalogs cover 13 languages and preserve every placeholder`, () => {
    const catalog = JSON.parse(readFileSync(`apps/${app}/locales/messages.json`, 'utf8'));
    const languages = JSON.parse(readFileSync('shared/i18n/languages.json', 'utf8')).map(l => l.code);
    for (const [source, entries] of Object.entries(catalog)) {
      const tokens = value => [...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
      for (const lang of languages) {
        assert.ok(entries[lang]?.trim(), `${app}: ${lang}: ${source}`);
        assert.deepEqual(tokens(entries[lang]), tokens(source), `${app}: ${lang}: ${source}`);
      }
    }
    const bundle = vm.createContext({});
    vm.runInContext(readFileSync(`apps/${app}/assets/messages.js`, 'utf8'), bundle);
    assert.equal(JSON.stringify(bundle.VC_MESSAGES), JSON.stringify(catalog));
  });
}
