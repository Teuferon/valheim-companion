import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

process.env.TSX_TSCONFIG_PATH = fileURLToPath(new URL('../apps/damage-calculator/tsconfig.json', import.meta.url));
const require = createRequire(new URL('../apps/damage-calculator/package.json', import.meta.url));
const { require: load } = require('tsx/cjs/api');
const { readTrackedBiome, subscribeTrackedProgress } = load('../apps/damage-calculator/src/lib/tracked-progress.ts', import.meta.url);
const { parseViewQuery } = load('../apps/damage-calculator/src/lib/view-url.ts', import.meta.url);
const biomes = JSON.parse(readFileSync('data/biomes.json', 'utf8'));
const coreSource = readFileSync('shared/progress/core.js', 'utf8');

function fixture(progress, manual = []) {
  const values = new Map([['vc.progress', JSON.stringify(progress)], ['vc.openBiomes', JSON.stringify(manual)], ['valheim-damage-calculator:biome', 'deep-north']]);
  const storage = { getItem: key => values.get(key) ?? null };
  const context = vm.createContext({ localStorage: storage });
  vm.runInContext(coreSource, context);
  return { storage, core: context.VCProgress };
}

test('calculator default matches the shared reveal ladder for every boss and visit', () => {
  const cases = [null, {}, { version: 99, visited: ['deep-north'] }, { defeated: { 'the-elder': 'true' } }, { defeated: [] }, { visited: 'deep-north' }];
  for (const biome of biomes) {
    cases.push({ version: 1, visited: [biome.id] });
    for (const boss of biome.creatures.boss) cases.push({ version: 1, defeated: { [boss]: true } });
  }
  for (const progress of cases) {
    for (const manual of [[], ['ocean'], ['mountain', 'unknown'], 'deep-north']) {
      const { core, storage } = fixture(progress, manual);
      assert.equal(readTrackedBiome(storage), core.revealedBiomes(biomes).at(-1));
      assert.equal(readTrackedBiome(storage, core), core.revealedBiomes(biomes).at(-1));
    }
  }
});

test('calculator tolerates corrupt or blocked storage and ignores its old slider default', () => {
  assert.equal(readTrackedBiome({ getItem: () => '{bad' }), 'meadows');
  assert.equal(readTrackedBiome({ getItem: () => { throw Error('Blocked'); } }), 'meadows');
  assert.equal(readTrackedBiome(fixture(null).storage), 'meadows');
});

test('shared URL biome overrides tracked progress, including Meadows', () => {
  const { storage } = fixture({ visited: ['ashlands'] });
  for (const biome of biomes) {
    assert.equal(parseViewQuery(`?biome=${biome.id}`).biome ?? readTrackedBiome(storage), biome.id);
  }
  assert.equal(parseViewQuery('?target=bonemass').biome ?? readTrackedBiome(storage), 'ashlands');
  const page = readFileSync('apps/damage-calculator/src/app/page.tsx', 'utf8');
  assert.match(page, /pickedBiome \?\? urlView\.biome \?\? storedBiome/);
});


test('calculator reads same-tab in-memory progress when storage is unavailable', () => {
  const { core } = fixture(null);
  const blocked = { getItem() { throw new Error('Blocked'); } };
  core.defeat('the-elder', true);
  assert.equal(readTrackedBiome(blocked, core), 'swamp');
  core.reset();
  assert.equal(readTrackedBiome(blocked, core), 'meadows');
});

test('calculator subscribes to storage and a late classic core and cleans up both listeners', () => {
  const saved = Object.fromEntries(['window', 'document', 'VCProgress'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const script = new EventTarget();
  const win = new EventTarget();
  const storage = key => { const event = new Event('storage'); event.key = key; win.dispatchEvent(event); };
  try {
    globalThis.window = win;
    globalThis.document = { querySelector: () => script };
    delete globalThis.VCProgress;
    let calls = 0;
    const stop = subscribeTrackedProgress(() => calls++);
    storage('vc.language'); storage('valheim-damage-calculator:biome');
    assert.equal(calls, 0);
    storage('vc.progress'); storage('vc.openBiomes'); storage(null);
    assert.equal(calls, 3);
    const { core } = fixture(null);
    globalThis.VCProgress = core;
    script.dispatchEvent(new Event('load'));
    assert.equal(calls, 4);
    core.defeat('eikthyr', true);
    assert.equal(calls, 5);
    assert.equal(readTrackedBiome({ getItem: () => null }), 'black-forest');
    stop(); core.defeat('the-elder', true); storage('vc.progress'); script.dispatchEvent(new Event('load'));
    assert.equal(calls, 5);
    const stopAgain = subscribeTrackedProgress(() => calls++);
    core.visit('mountain', true);
    assert.equal(calls, 6);
    stopAgain(); core.visit('plains', true);
    assert.equal(calls, 6);
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
