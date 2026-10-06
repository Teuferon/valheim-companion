import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

process.env.TSX_TSCONFIG_PATH = fileURLToPath(new URL('../apps/damage-calculator/tsconfig.json', import.meta.url));
const require = createRequire(new URL('../apps/damage-calculator/package.json', import.meta.url));
const { require: load } = require('tsx/cjs/api');
const { readTrackedBiome } = load('../apps/damage-calculator/src/lib/tracked-progress.ts', import.meta.url);
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
