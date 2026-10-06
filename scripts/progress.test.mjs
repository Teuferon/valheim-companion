import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../shared/progress/core.js', import.meta.url), 'utf8');
const biomes = JSON.parse(readFileSync(new URL('../data/biomes.json', import.meta.url), 'utf8'));
function setup(initial = {}, blocked = false) {
  const values = new Map(Object.entries(initial));
  const events = {};
  const localStorage = {
    getItem(key) { if (blocked) throw Error('Blocked'); return values.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw Error('Blocked'); values.set(key, value); },
    removeItem(key) { if (blocked) throw Error('Blocked'); values.delete(key); },
  };
  const context = vm.createContext({ localStorage, TextEncoder, TextDecoder, URLSearchParams, atob, btoa, console,
    location: { href: 'https://example.test/progress/' }, window: { addEventListener: (key, cb) => { events[key] = cb; } } });
  vm.runInContext(source, context);
  return { core: context.VCProgress, localStorage, events };
}
const plain = value => JSON.parse(JSON.stringify(value));
test('Boss progression includes intervening biomes without bosses', () => {
  const { core } = setup();
  assert.deepEqual(plain(core.revealedBiomes(biomes)), ['meadows']);
  core.defeat('eikthyr', true);
  assert.deepEqual(plain(core.revealedBiomes(biomes)), ['meadows', 'black-forest']);
  core.defeat('the-elder', true);
  assert.deepEqual(plain(core.revealedBiomes(biomes)), ['meadows', 'black-forest', 'ocean', 'swamp']);
  core.defeat('bonemass', true);
  assert.ok(core.revealedBiomes(biomes).includes('mountain'));
  assert.ok(!core.revealedBiomes(biomes).includes('plains'));
  core.defeat('bonemass', false);
  assert.ok(!core.revealedBiomes(biomes).includes('mountain'));
  core.defeat('brenna', true);
  assert.ok(!core.revealedBiomes(biomes).includes('mountain'));
});
test('Visits and manual reveals are additive and ordered', () => {
  const { core, localStorage } = setup({ 'vc.openBiomes': '["swamp","unknown"]' });
  core.visit('mountain', true);
  assert.deepEqual(plain(core.revealedBiomes(biomes)), ['meadows', 'swamp', 'mountain']);
  core.visit('mountain', false);
  assert.deepEqual(plain(core.get().visited), []);
  localStorage.setItem('vc.openBiomes', '["ocean"]');
  assert.deepEqual(plain(core.revealedBiomes(biomes)), ['meadows', 'ocean']);
});
test('State is sanitized, copied, versioned and stored', () => {
  const { core, localStorage } = setup();
  core.set({ unknown: true, defeated: { eikthyr: true, invalid: 'true', '__proto__': true }, visited: ['swamp', 'swamp', null], milestones: { 'hard-antler': true } });
  assert.deepEqual(plain(core.get()), { version: 1, defeated: { eikthyr: true }, visited: ['swamp'], milestones: { 'hard-antler': true } });
  const copy = core.get(); copy.visited.push('plains');
  assert.deepEqual(plain(core.get().visited), ['swamp']);
  assert.deepEqual(JSON.parse(localStorage.getItem('vc.progress')), plain(core.get()));
  core.milestone('hard-antler', false);
  assert.deepEqual(plain(core.get().milestones), {});
  core.defeat('__proto__', true);
  assert.deepEqual(plain(core.get().defeated), { eikthyr: true });
});
test('URL export/import round trip, invalid imports preserve progress', () => {
  const { core } = setup();
  core.defeat('eikthyr', true); core.visit('ocean', true); core.milestone('hard-antler', true);
  const url = core.exportToUrl();
  assert.match(url, /^https:\/\/example.test\/progress\/#p=[A-Za-z0-9_-]+$/);
  const target = setup().core;
  assert.equal(target.importFromUrl(url), true);
  assert.deepEqual(plain(target.get()), plain(core.get()));
  assert.equal(target.importFromUrl('#p=broken'), false);
  assert.deepEqual(plain(target.get()), plain(core.get()));
  assert.equal(target.importFromUrl('#p=' + btoa('{"version":99}')), false);
});
test('Corrupt and unsupported stored states fall back to defaults', () => {
  assert.deepEqual(plain(setup({ 'vc.progress': '{broken' }).core.get()), plain(setup().core.get()));
  assert.deepEqual(plain(setup({ 'vc.progress': '{"version":99,"visited":["swamp"]}' }).core.get()), plain(setup().core.get()));
});
test('Storage events, unsubscribe and reset', () => {
  const { core, localStorage, events } = setup();
  let count = 0;
  const unsubscribe = core.onChange(() => count++);
  core.defeat('eikthyr', true);
  assert.equal(count, 1);
  localStorage.setItem('vc.progress', '{"version":1,"visited":["plains"]}');
  events.storage({ key: 'vc.progress' });
  assert.deepEqual(plain(core.get().visited), ['plains']);
  assert.equal(count, 2);
  localStorage.setItem('vc.openBiomes', '["mountain"]');
  events.storage({ key: 'vc.openBiomes' });
  assert.equal(count, 3);
  unsubscribe(); core.reset();
  assert.equal(count, 3);
  assert.equal(localStorage.getItem('vc.openBiomes'), null);
  assert.deepEqual(plain(core.revealedBiomes(biomes)), ['meadows']);
});
test('Progress works when localStorage throws', () => {
  const { core } = setup({}, true);
  core.defeat('the-elder', true);
  assert.ok(core.get().defeated['the-elder']);
  assert.ok(core.revealedBiomes(biomes).includes('ocean'));
  core.reset();
  assert.deepEqual(plain(core.get().defeated), {});
});
test('Generated checklist preserves bosses, minibosses and every non-trophy drop', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(new URL('../apps/progress/data/data.js', import.meta.url), 'utf8'), context);
  const data = plain(context.window.VP_DATA);
  const creatures = JSON.parse(readFileSync(new URL('../data/creatures.json', import.meta.url), 'utf8'));
  assert.equal(data.biomes.length, 9);
  assert.deepEqual(data.biomes.map(value => value.id), biomes.map(value => value.id));
  for (const biome of data.biomes) {
    const original = biomes.find(value => value.id === biome.id);
    assert.deepEqual(biome.bosses.map(value => value.id).sort(), [...original.creatures.boss].sort());
    assert.deepEqual(biome.minibosses.map(value => value.id).sort(), [...original.creatures.miniboss].sort());
    const expected = creatures.filter(value => original.creatures.boss.includes(value.id)).flatMap(value => value.drops.filter(drop => !/trophy/i.test(drop)));
    assert.deepEqual(biome.milestones.map(value => value.drop).sort(), expected.sort());
    for (const value of [...biome.bosses, ...biome.minibosses, ...biome.milestones]) {
      if (value.image) assert.ok(readFileSync(new URL('../apps/progress/' + value.image, import.meta.url)).length);
    }
  }
});
test('All progress messages cover 13 locales and preserve placeholders', () => {
  const catalog = JSON.parse(readFileSync(new URL('../apps/progress/locales/messages.json', import.meta.url), 'utf8'));
  const languages = JSON.parse(readFileSync(new URL('../shared/i18n/languages.json', import.meta.url), 'utf8'));
  const tokens = value => [...value.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
  for (const [key, translations] of Object.entries(catalog)) {
    for (const { code } of languages) {
    assert.ok(translations[code], `${key}: missing ${code}`);
    for (const text of typeof translations[code] === 'string' ? [translations[code]] : Object.values(translations[code])) {
      assert.ok(text.trim(), `${key}: empty ${code}`);
      assert.deepEqual(tokens(text), tokens(key), `${key}: placeholders in ${code}`);
    }
    }
  }
  const html = readFileSync(new URL('../apps/progress/index.html', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../apps/progress/assets/app.js', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]);
  keys.push(...[...app.matchAll(/\bt\('([^']+)'/g)].map(match => match[1]));
  for (const key of keys) assert.ok(catalog[key], `Missing message: ${key}`);
});
