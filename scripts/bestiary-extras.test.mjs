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

test('profile links round-trip with Unicode and URL-safe base64', () => {
  const player = { skills: { axes: 37, bows: 82 }, difficulty: 'hard', quality: 'max', players: 3,
    sets: ['root'], sneak: true, staggered: false, rankBy: 'hit', note: 'Čeština العربية 日本語' };
  const encoded = globalThis.VCExtras.encodeProfile(player);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(globalThis.VCExtras.decodeProfile(encoded), player);
  const params = new URLSearchParams('player=' + encoded + '&c=troll');
  assert.deepEqual(globalThis.VCExtras.decodeProfile(params.get('player')), player);
  assert.equal(params.get('c'), 'troll');
});

test('profile import rejects malformed, oversized and unsupported payloads', () => {
  const { decodeProfile } = globalThis.VCExtras;
  for (const value of ['', '!', 'x'.repeat(8193), 'a', btoa('{}'), btoa('null'), btoa('[]'),
    btoa('{"version":2,"player":{"skills":{"axes":50}}}'),
    btoa('{"version":1,"player":{"skills":[]}}'),
    btoa('{"version":1,"player":{"skills":{"axes":"wrong"}}}'), '_w']) {
    assert.throws(() => decodeProfile(value));
  }
});

test('creature links prefer an open biome and otherwise the earliest biome', () => {
  const biomes = [{ id: 'swamp', order: 4 }, { id: 'black-forest', order: 2 }, { id: 'plains', order: 6 }];
  const creature = { biomes: ['swamp', 'black-forest'] };
  const { creatureBiome } = globalThis.VCExtras;
  assert.equal(creatureBiome(creature, biomes, new Set()).id, 'black-forest');
  assert.equal(creatureBiome(creature, biomes, new Set(['swamp'])).id, 'swamp');
  assert.equal(creatureBiome({ biomes: [] }, biomes, new Set()), null);
});
