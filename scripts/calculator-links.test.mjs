import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { buildDataBundle } from './build-data.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('calculator links cover exactly the Bestiary creatures supported by the calculator', () => {
  const slugs = new Set(['bosses', 'enemies'].flatMap(file =>
    JSON.parse(read(`apps/damage-calculator/src/data/${file}.json`)).map(target => target.slug)
  ));
  const bundle = buildDataBundle();
  const generated = { window: {} };
  vm.runInNewContext(read('apps/bestiary/data/data.js'), generated);
  const creatures = Object.values(bundle.creatures);
  assert.equal(creatures.length, 106);
  assert.equal(creatures.filter(creature => creature.calculatorSlug).length, 78);
  for (const creature of creatures) {
    if (slugs.has(creature.id)) {
      assert.equal(creature.calculatorSlug, creature.id);
      assert.ok(slugs.has(creature.calculatorSlug));
    } else {
      assert.equal(Object.hasOwn(creature, 'calculatorSlug'), false, creature.id);
    }
    assert.equal(generated.window.VC_DATA.creatures[creature.id].calculatorSlug, creature.calculatorSlug);
  }
  for (const id of ['tuna', 'captive-fuling', 'frysling', 'imprisoned-dvergr', 'mistile', 'moose-calf']) {
    assert.equal(Object.hasOwn(bundle.creatures[id], 'calculatorSlug'), false, id);
  }
});
