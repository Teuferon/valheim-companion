import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

process.env.TSX_TSCONFIG_PATH = fileURLToPath(new URL('../apps/damage-calculator/tsconfig.json', import.meta.url));
const require = createRequire(new URL('../apps/damage-calculator/package.json', import.meta.url));
const { require: load } = require('tsx/cjs/api');
const events = new Map();
globalThis.window = {
  location: { origin: 'https://example.test', pathname: '/damage-calculator/', search: '?biome=swamp&target=bonemass' },
  addEventListener: (name, callback) => events.set(name, callback),
  removeEventListener: name => events.delete(name),
  history: { replaceState(_state, _title, url) { window.location.search = new URL(url, window.location.origin).search; } },
};
const { playerControls } = load('../apps/damage-calculator/src/lib/player-profile.ts', import.meta.url);
const { skillOfClass, WEAPON_CLASS_ORDER } = load('../apps/damage-calculator/src/data/weapon-class.ts', import.meta.url);
const { sanitizePlayer, DEFAULT_PLAYER } = load('../shared/player/core.ts', import.meta.url);
const { buildGuideStep } = load('../apps/damage-calculator/src/lib/guide.ts', import.meta.url);
const { calculate } = load('../apps/damage-calculator/src/lib/damage.ts', import.meta.url);
const { weapons, targets } = load('../apps/damage-calculator/src/lib/data.ts', import.meta.url);
const url = load('../apps/damage-calculator/src/lib/view-url.ts', import.meta.url);
const { playerSnapshot, subscribePlayer } = load('../apps/damage-calculator/src/hooks/use-player.ts', import.meta.url);

const player = sanitizePlayer({ skills: { bows: 18, fists: 20, axes: 31, clubs: 77 },
  sets: ['root', 'lox', 'fenris'], quality: 2, sneak: true, staggered: true });

test('every calculator weapon class maps to the correct Bestiary skill', () => {
  assert.deepEqual(Object.fromEntries(WEAPON_CLASS_ORDER.map(cls => [cls, skillOfClass(cls)])), {
    fists: 'fists', knife: 'knives', sword: 'swords', axe: 'axes', 'dual-axe': 'axes',
    club: 'clubs', spear: 'spears', atgeir: 'polearms', greatsword: 'swords',
    battleaxe: 'axes', sledge: 'clubs', pickaxe: 'pickaxes', bow: 'bows', crossbow: 'crossbows',
    staff: 'elemental-magic', 'blood-staff': 'blood-magic', bomb: null, missile: null, siege: null,
  });
});

test('profile defaults use each weapon skill, set bonuses, quality and enemy flags', () => {
  assert.deepEqual(playerControls(player, 'bow', {}), { quality: 2, skillLevel: 48, backstab: true, staggered: true });
  assert.equal(playerControls(player, 'fists', {}).skillLevel, 35);
  assert.equal(playerControls(player, 'sledge', {}).skillLevel, 77);
  assert.equal(playerControls(player, 'battleaxe', {}).skillLevel, 31);
  assert.equal(playerControls(player, 'missile', {}).skillLevel, 0);
  assert.equal(playerControls(DEFAULT_PLAYER, 'bow', {}).quality, 4);
  assert.deepEqual(playerControls(null, 'bow', {}), { quality: 4, skillLevel: 100, backstab: false, staggered: false });
});

test('URL overrides win even for zero skill, max quality and false enemy flags', () => {
  const overrides = url.parseViewQuery('?skill=0&level=4&state=alerted');
  assert.deepEqual(playerControls(player, 'bow', overrides), { quality: 4, skillLevel: 0, backstab: false, staggered: false });
  assert.deepEqual(playerControls(player, 'bow', url.parseViewQuery('?skill=bad&level=0&state=bad')),
    { quality: 2, skillLevel: 48, backstab: true, staggered: true });
  assert.equal(playerControls(player, 'bow', { skill: 63 }).skillLevel, 63);
});

test('stagger doubles damage lines, the backstab opening and steady cycle damage', () => {
  const input = { weapon: weapons.find(weapon => weapon.slug === 'iron-sword'),
    target: targets.find(target => target.slug === 'eikthyr'), quality: 1,
    skillLevel: 50, skillMode: 'avg', attack: 'primary', backstab: true };
  const normal = calculate(input);
  const staggered = calculate({ ...input, staggered: true });
  assert.equal(staggered.perHit, normal.perHit * 2);
  assert.equal(staggered.cycleDamage, normal.cycleDamage * 2);
  assert.equal(staggered.dps, normal.dps * 2);
  assert.deepEqual(staggered.lines.map(line => line.effective), normal.lines.map(line => line.effective * 2));
  assert.equal(staggered.cycleSeconds, normal.cycleSeconds);
  assert.ok(staggered.ttk <= normal.ttk);
});

test('progression guide scores each recommendation with its own profile skill', () => {
  const skillFor = weapon => playerControls(player, weapon.cls, {}).skillLevel;
  const guide = buildGuideStep('swamp', { skillLevel: 100, skillMode: 'avg', skillFor });
  for (const pick of guide.picks) {
    const expected = calculate({ weapon: pick.weapon, ammo: pick.ammo, quality: pick.quality,
      target: guide.gate, skillLevel: skillFor(pick.weapon), skillMode: 'avg', attack: 'primary' });
    assert.equal(pick.result.perHit, expected.perHit);
    assert.equal(pick.result.dps, expected.dps);
  }
});

test('URL state round-trips both enemy flags and shares explicit defaults', () => {
  const view = { biome: 'swamp', target: 'bonemass', weapon: null, cls: 'all', level: 4,
    skill: 100, roll: 'avg', attack: 'primary', backstab: false, staggered: false, arrow: null, bolt: null };
  for (const [state, backstab, staggered] of [
    ['alerted', false, false], ['unalerted', true, false],
    ['staggered', false, true], ['unalerted-staggered', true, true],
  ]) {
    const search = url.viewSearch({ ...view, backstab, staggered }, true);
    assert.equal(new URLSearchParams(search).get('state'), state);
    assert.deepEqual(playerControls(player, 'bow', url.parseViewQuery(search)),
      { quality: 4, skillLevel: 100, backstab, staggered });
  }
  const shared = new URL(url.buildViewUrl(view));
  assert.equal(shared.searchParams.get('skill'), '100');
  assert.equal(shared.searchParams.get('level'), '4');
  assert.equal(shared.searchParams.get('state'), 'alerted');
});

test('mirroring profile defaults does not turn them into incoming URL overrides', () => {
  const incoming = url.viewUrlSnapshot();
  let notified = 0;
  const unsubscribe = url.subscribeViewUrl(() => notified++);
  url.replaceViewUrl({ biome: 'swamp', target: 'bonemass', weapon: null, cls: 'all', level: 2,
    skill: 48, roll: 'avg', attack: 'primary', backstab: true, staggered: true, arrow: null, bolt: null }, true);
  assert.equal(url.viewUrlSnapshot(), incoming);
  assert.equal(notified, 0);
  assert.equal(playerControls(player, 'sledge', url.parseViewQuery(url.viewUrlSnapshot())).skillLevel, 77);
  window.location.search = '?skill=12';
  events.get('popstate')();
  assert.equal(url.viewUrlSnapshot(), '?skill=12');
  assert.equal(notified, 1);
  unsubscribe();
});

test('player store handles blocked storage and cross-tab profile changes', () => {
  globalThis.localStorage = { getItem: () => '{"quality":2}' };
  assert.equal(playerSnapshot(), '{"quality":2}');
  globalThis.localStorage = { getItem() { throw new Error('Blocked'); } };
  assert.equal(playerSnapshot(), null);
  let notified = 0;
  const unsubscribe = subscribePlayer(() => notified++);
  events.get('storage')({ key: 'other' });
  events.get('storage')({ key: 'vc.player' });
  events.get('storage')({ key: null });
  assert.equal(notified, 2);
  unsubscribe();
});

test('the committed JavaScript player module is generated from the typed source', () => {
  const ts = require('typescript');
  const source = readFileSync(new URL('../shared/player/core.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const generated = '// Generated from core.ts by scripts/build-site.mjs — DO NOT EDIT MANUALLY.\n' + output;
  assert.equal(readFileSync(new URL('../shared/player/core.js', import.meta.url), 'utf8'), generated);
});
