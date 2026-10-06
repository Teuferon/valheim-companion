import test from 'node:test';
import assert from 'node:assert/strict';
import '../apps/bestiary/assets/extras.js';

test('raids hide locked bosses, including multi-condition raids, and react to reveal', () => {
  const creatures = {
    moder: { name: 'Moder', kind: 'boss', biomes: ['mountain'] },
    elder: { name: 'The Elder', kind: 'boss', biomes: ['black-forest'] },
    troll: { name: 'Troll', kind: 'hostile', biomes: ['black-forest'] },
  };
  const { raidIsHidden } = globalThis.VCExtras;
  assert.equal(raidIsHidden({ enabledBy: ['Moder'] }, creatures, new Set(['plains'])), true);
  assert.equal(raidIsHidden({ enabledBy: ['Moder'] }, creatures, new Set(['mountain'])), false);
  assert.equal(raidIsHidden({ enabledBy: ['Troll', 'The Elder'] }, creatures, new Set()), true);
  assert.equal(raidIsHidden({ enabledBy: ['Troll'] }, creatures, new Set()), false);
  assert.equal(raidIsHidden({ enabledBy: [] }, creatures, new Set()), false);
});
