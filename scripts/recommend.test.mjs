import test from 'node:test';
import assert from 'node:assert/strict';

import {
  effectiveModifiers,
  score,
  rangedScore,
  recommendFor,
} from './recommend.mjs';

test('score: weapon with fire 10 against veryweak fire (mult 2) scores 20', () => {
  const damage = { fire: 10 };
  const mods = { fire: 2 };
  assert.equal(score(damage, mods), 20);
});

test('effectiveModifiers: spirit defaults to 0 when not specified', () => {
  const creature = { modifiers: {} };
  const mods = effectiveModifiers(creature);
  assert.equal(mods.spirit, 0);
});

test('effectiveModifiers: blunt, slash, pierce default to 1', () => {
  const creature = { modifiers: {} };
  const mods = effectiveModifiers(creature);
  assert.equal(mods.blunt, 1);
  assert.equal(mods.slash, 1);
  assert.equal(mods.pierce, 1);
});

test('effectiveModifiers: chop and pickaxe default to 0', () => {
  const creature = { modifiers: {} };
  const mods = effectiveModifiers(creature);
  assert.equal(mods.chop, 0);
  assert.equal(mods.pickaxe, 0);
});

test('effectiveModifiers: applies ModTier strings correctly', () => {
  const creature = {
    modifiers: {
      fire: 'veryweak',
      frost: 'weak',
      lightning: 'neutral',
      poison: 'resistant',
      blunt: 'veryresistant',
      spirit: 'immune',
    },
  };
  const mods = effectiveModifiers(creature);
  assert.equal(mods.fire, 2);
  assert.equal(mods.frost, 1.5);
  assert.equal(mods.lightning, 1);
  assert.equal(mods.poison, 0.5);
  assert.equal(mods.blunt, 0.25);
  assert.equal(mods.spirit, 0);
});

test('tier filter: recommendFor does not recommend weapons of higher tier than biome.gearTier', () => {
  const creature = { id: 'test-creature', modifiers: {} };
  const biome = { id: 'meadows', gearTier: 1 };
  const weapons = [
    {
      id: 'club',
      name: 'Club',
      category: 'club',
      tier: 1,
      damageMax: { blunt: 12 },
    },
    {
      id: 'bronze-mace',
      name: 'Bronze Mace',
      category: 'club',
      tier: 2,
      damageMax: { blunt: 35 },
    },
    {
      id: 'iron-mace',
      name: 'Iron Mace',
      category: 'club',
      tier: 3,
      damageMax: { blunt: 55 },
    },
  ];

  const rec = recommendFor(creature, biome, weapons);
  assert.equal(rec.melee.length, 1);
  assert.equal(rec.melee[0].weapon, 'club');
});

test('melee diversity: top 3 melee weapons come from distinct categories', () => {
  const creature = { id: 'test-creature', modifiers: {} };
  const biome = { id: 'black-forest', gearTier: 2 };
  const weapons = [
    { id: 'sword-1', name: 'Sword A', category: 'sword', tier: 2, damageMax: { slash: 50 } },
    { id: 'sword-2', name: 'Sword B', category: 'sword', tier: 2, damageMax: { slash: 45 } },
    { id: 'club-1', name: 'Club A', category: 'club', tier: 2, damageMax: { blunt: 40 } },
    { id: 'spear-1', name: 'Spear A', category: 'spear', tier: 2, damageMax: { pierce: 35 } },
    { id: 'axe-1', name: 'Axe A', category: 'axe', tier: 2, damageMax: { slash: 30 } },
  ];

  const rec = recommendFor(creature, biome, weapons);
  assert.equal(rec.melee.length, 3);
  const categories = rec.melee.map((m) => weapons.find((w) => w.id === m.weapon).category);
  const uniqueCats = new Set(categories);
  assert.equal(uniqueCats.size, 3);
  assert.deepEqual(categories, ['sword', 'club', 'spear']);
});

test('pickaxe candidacy: pickaxes are excluded when creature pickaxe multiplier is 0', () => {
  const creature = { id: 'boar', modifiers: {} };
  const biome = { id: 'meadows', gearTier: 1 };
  const weapons = [
    { id: 'antler-pickaxe', name: 'Antler Pickaxe', category: 'pickaxe', tier: 1, damageMax: { pickaxe: 20 } },
    { id: 'club', name: 'Club', category: 'club', tier: 1, damageMax: { blunt: 12 } },
  ];

  const rec = recommendFor(creature, biome, weapons);
  const ids = rec.melee.map((m) => m.weapon);
  assert.ok(!ids.includes('antler-pickaxe'));
  assert.ok(ids.includes('club'));
});

test('pickaxe candidacy: pickaxes are included when creature has pickaxe multiplier > 0', () => {
  const golem = { id: 'stone-golem', modifiers: { pickaxe: 'veryweak', blunt: 'neutral', slash: 'resistant' } };
  const biome = { id: 'mountain', gearTier: 4 };
  const weapons = [
    { id: 'bronze-pickaxe', name: 'Bronze Pickaxe', category: 'pickaxe', tier: 2, damageMax: { pickaxe: 37, pierce: 25 } },
    { id: 'iron-sword', name: 'Iron Sword', category: 'sword', tier: 3, damageMax: { slash: 55 } },
  ];

  const rec = recommendFor(golem, biome, weapons);
  assert.equal(rec.melee[0].weapon, 'bronze-pickaxe');
});

test('rangedScore: combines launcher pierce and arrow elements correctly', () => {
  const bow = { damageMax: { pierce: 32 } };
  const arrow = { damageMax: { pierce: 11, fire: 22 } };
  const mods = { pierce: 1, fire: 2 };

  // (32 + 11) * 1 + 22 * 2 = 43 + 44 = 87
  const scoreVal = rangedScore(bow, arrow, mods);
  assert.equal(scoreVal, 87);
});

test('tip formatting: weak elemental generates weakness tip and appends immunity', () => {
  const creature = {
    id: 'greydwarf',
    modifiers: { fire: 'veryweak', spirit: 'immune' },
  };
  const biome = { id: 'black-forest', gearTier: 2 };
  const weapons = [
    { id: 'bronze-sword', name: 'Bronze Sword', category: 'sword', tier: 2, damageMax: { slash: 35 } },
    { id: 'finewood-bow', name: 'Finewood Bow', category: 'bow', tier: 2, damageMax: { pierce: 32 } },
    { id: 'fire-arrow', name: 'Fire Arrow', category: 'arrow', tier: 1, damageMax: { pierce: 11, fire: 22 } },
  ];

  const rec = recommendFor(creature, biome, weapons);
  assert.match(rec.tip, /^Very weak to Fire \(×2\): Fire Arrow hits for 87 effective\./);
  assert.match(rec.tip, /Immune to Spirit\.$/);
});

test('tip formatting: no elemental weakness falls back to best raw melee', () => {
  const creature = { id: 'dummy', modifiers: {} };
  const biome = { id: 'meadows', gearTier: 1 };
  const weapons = [
    { id: 'flint-axe', name: 'Flint Axe', category: 'axe', tier: 1, damageMax: { slash: 20 } },
    { id: 'club', name: 'Club', category: 'club', tier: 1, damageMax: { blunt: 12 } },
  ];

  const rec = recommendFor(creature, biome, weapons);
  assert.equal(rec.tip, 'No elemental weakness — best raw option: Flint Axe (20).');
});

test('tie-breaking: prefers lower tier, then alphabetical name on score tie', () => {
  const creature = { id: 'dummy', modifiers: {} };
  const biome = { id: 'swamp', gearTier: 3 };
  const weapons = [
    { id: 'sword-t3', name: 'Sword HighTier', category: 'sword', tier: 3, damageMax: { slash: 30 } },
    { id: 'club-t1', name: 'Club LowTier', category: 'club', tier: 1, damageMax: { blunt: 30 } },
    { id: 'spear-t1-b', name: 'Spear B', category: 'spear', tier: 1, damageMax: { pierce: 30 } },
    { id: 'spear-t1-a', name: 'Spear A', category: 'spear', tier: 1, damageMax: { pierce: 30 } },
  ];

  const rec = recommendFor(creature, biome, weapons);
  // Tier 1 weapons win over Tier 3 on equal score 30
  assert.equal(rec.melee[0].weapon, 'club-t1');
  assert.equal(rec.melee[1].weapon, 'spear-t1-a');
  assert.equal(rec.melee[2].weapon, 'sword-t3');
});
