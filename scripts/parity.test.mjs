import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');

const fixtures = JSON.parse(readFileSync(path.join(DATA_DIR, 'parity-fixtures.json'), 'utf8'));
const weapons = JSON.parse(readFileSync(path.join(DATA_DIR, 'weapons.json'), 'utf8'));
const creatures = JSON.parse(readFileSync(path.join(DATA_DIR, 'creatures.json'), 'utf8'));
const weaponQuality = JSON.parse(readFileSync(path.join(DATA_DIR, 'weapon-quality.json'), 'utf8'));
const attackProfiles = JSON.parse(readFileSync(path.join(DATA_DIR, 'attack-profiles.json'), 'utf8'));

globalThis.VC_DATA = { weaponQuality, attackProfiles };
await import('../apps/bestiary/assets/rank.js');

const { attackStats, DEFAULT_PLAYER } = globalThis.VCRank;

const weaponById = new Map(weapons.map((w) => [w.id, w]));
const creatureById = new Map(creatures.map((c) => [c.id, c]));

test('parity: Bestiary matches Damage Calculator across all fixtures within 0.5%', () => {
  assert.ok(fixtures.length > 0, 'Fixtures must not be empty');

  const diffs = [];
  const TOLERANCE = 0.005; // 0.5%

  for (let i = 0; i < fixtures.length; i++) {
    const fix = fixtures[i];
    const w = weaponById.get(fix.inputs.weapon);
    const ammo = fix.inputs.ammo ? weaponById.get(fix.inputs.ammo) : null;
    const creature = creatureById.get(fix.inputs.target);

    assert.ok(w, `Weapon ${fix.inputs.weapon} must exist in weapons.json`);
    assert.ok(creature, `Creature ${fix.inputs.target} must exist in creatures.json`);

    const player = {
      ...DEFAULT_PLAYER,
      skills: {
        swords: fix.inputs.skillLevel,
        knives: fix.inputs.skillLevel,
        clubs: fix.inputs.skillLevel,
        polearms: fix.inputs.skillLevel,
        spears: fix.inputs.skillLevel,
        axes: fix.inputs.skillLevel,
        fists: fix.inputs.skillLevel,
        bows: fix.inputs.skillLevel,
        crossbows: fix.inputs.skillLevel,
        'elemental-magic': fix.inputs.skillLevel,
        'blood-magic': fix.inputs.skillLevel,
        pickaxes: fix.inputs.skillLevel,
      },
      quality: fix.inputs.quality,
      sneak: fix.inputs.backstab,
    };

    const stats = attackStats(w, ammo, creature, player, fix.inputs.attack);
    if (!stats) {
      diffs.push({
        index: i,
        inputs: fix.inputs,
        reason: 'attackStats returned null',
      });
      continue;
    }

    const perHitDiff = Math.abs(stats.perHit - fix.perHit) / Math.max(1, fix.perHit);
    const cycleDiff = Math.abs(stats.cycleSeconds - fix.cycleSeconds) / Math.max(1, fix.cycleSeconds);
    const dpsDiff = Math.abs(stats.dps - fix.dps) / Math.max(1, fix.dps);

    if (perHitDiff > TOLERANCE || cycleDiff > TOLERANCE || dpsDiff > TOLERANCE) {
      diffs.push({
        index: i,
        inputs: fix.inputs,
        expected: { perHit: fix.perHit, cycleSeconds: fix.cycleSeconds, dps: fix.dps },
        actual: { perHit: stats.perHit, cycleSeconds: stats.cycleSeconds, dps: stats.dps },
        relativeDiffs: { perHitDiff, cycleDiff, dpsDiff },
      });
    }
  }

  if (diffs.length > 0) {
    const first10 = diffs.slice(0, 10);
    const summary = first10.map((d, idx) => `[${idx + 1}] input: ${JSON.stringify(d.inputs)}\n    expected: ${JSON.stringify(d.expected)}\n    actual:   ${JSON.stringify(d.actual)}\n    diffs:    ${JSON.stringify(d.relativeDiffs)}`).join('\n');
    assert.fail(`Parity failed with ${diffs.length}/${fixtures.length} discrepancies. First 10:\n${summary}`);
  }

  assert.equal(diffs.length, 0);
});
