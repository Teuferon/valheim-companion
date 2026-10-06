import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PLAYER, PLAYER_STORAGE_KEY, defaultPlayer, sanitizePlayer,
  effectiveSkill, readPlayerState,
} from '../shared/player/core.js';
import '../apps/bestiary/assets/rank.js';

test('Bestiary uses the shared defaults and effective skill implementation', () => {
  assert.equal(globalThis.VCRank.DEFAULT_PLAYER, DEFAULT_PLAYER);
  assert.equal(globalThis.VCRank.effectiveSkill, effectiveSkill);
  const player = sanitizePlayer({ skills: { bows: 80, fists: 95 }, sets: ['root', 'lox', 'fenris'] });
  assert.equal(effectiveSkill(player, 'bows'), 100);
  assert.equal(effectiveSkill(player, 'fists'), 100);
  assert.equal(effectiveSkill(player, 'swords'), 50);
  assert.equal(effectiveSkill(player, null), 0);
});

test('profile sanitation retains Bestiary coercion, bounds, flags and set rules', () => {
  const player = sanitizePlayer({
    skills: { swords: -8, bows: '82.6', fists: 150, knives: null, axes: '', clubs: 'invalid', unknown: 99 },
    difficulty: 'hard', players: '8', quality: '2.6',
    sets: ['root', 'root', 'lox', 'fenris', 'bear', 'vanguard', 'unknown', null],
    sneak: true, staggered: 'true', rankBy: 'hit', extra: 'discarded',
  });
  assert.deepEqual(player, {
    ...defaultPlayer(),
    skills: { ...DEFAULT_PLAYER.skills, swords: 0, bows: 83, fists: 100, axes: 0 },
    difficulty: 'hard', players: 5, quality: 3,
    sets: ['root', 'lox', 'fenris', 'bear', 'vanguard'],
    sneak: true, staggered: false, rankBy: 'hit',
  });
  assert.deepEqual(sanitizePlayer({ difficulty: 'toString', quality: null, players: null, skills: [] }), DEFAULT_PLAYER);
  for (const value of [null, [], 7, 'profile']) assert.deepEqual(sanitizePlayer(value), DEFAULT_PLAYER);
  const copy = defaultPlayer();
  copy.skills.bows = 0;
  copy.sets.push('root');
  assert.equal(DEFAULT_PLAYER.skills.bows, 50);
  assert.deepEqual(DEFAULT_PLAYER.sets, []);
});

test('storage keeps the original first-visit behavior and reports profile presence', () => {
  const storage = raw => ({ getItem(key) { assert.equal(key, PLAYER_STORAGE_KEY); return raw; } });
  assert.deepEqual(readPlayerState(storage(null)), { player: defaultPlayer(), firstVisit: true, hasProfile: false });
  for (const raw of ['{invalid', 'null', '[]', '{}']) {
    assert.deepEqual(readPlayerState(storage(raw)), { player: defaultPlayer(), firstVisit: false, hasProfile: true });
  }
  assert.equal(readPlayerState(storage('{"skills":{"bows":25},"sets":["root"]}')).player.skills.bows, 25);
  assert.deepEqual(readPlayerState({ getItem() { throw new Error('Blocked'); } }), {
    player: defaultPlayer(), firstVisit: false, hasProfile: false,
  });
});
