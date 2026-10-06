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

// Render real cards without starting the page or fetching assets.
class Element {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.className = '';
    this._text = '';
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener() {}
  querySelector(selector) {
    for (const child of this.children) {
      if (child.className.split(' ').includes(selector.slice(1))) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
}

test('rendered cards link to their displayed biome and target in the same window', () => {
  const context = vm.createContext({ console, URLSearchParams, addEventListener() {},
    localStorage: { getItem: () => null },
    document: {
      readyState: 'loading', addEventListener() {},
      createElement: tag => new Element(tag),
      createTextNode: text => Object.assign(new Element('text'), { textContent: text }),
    },
  });
  context.window = context;
  vm.runInContext(read('shared/i18n/core.js'), context);
  vm.runInContext(read('apps/bestiary/assets/messages.js'), context);
  vm.runInContext(read('apps/bestiary/data/data.js'), context);
  vm.runInContext(read('apps/bestiary/assets/extras.js'), context);
  const source = read('apps/bestiary/assets/app.js').replace(
    "  if (document.readyState === 'loading')",
    "  globalThis.createCreatureCard = createCreatureCard;\n  if (document.readyState === 'loading')"
  );
  vm.runInContext(source, context);
  const data = context.VC_DATA;
  for (const creature of Object.values(data.creatures)) {
    for (const biomeId of creature.biomes) {
      const biome = data.biomes.find(biome => biome.id === biomeId);
      const card = context.createCreatureCard(creature, biome, data);
      const link = card.querySelector('.card-calc-link');
      if (!creature.calculatorSlug) {
        assert.equal(link, null, creature.id);
        continue;
      }
      assert.ok(link, `${biome.id}: ${creature.id}`);
      assert.equal(link.href, `../damage-calculator/?biome=${biome.id}&target=${creature.id}`);
      assert.ok(!link.target);
      assert.equal(link.textContent, 'Compare all weapons in the Damage Calculator →');
      const paragraph = card.querySelector('.card-calculator-link');
      assert.equal(paragraph.tagName, 'p');
      assert.ok(card.children.indexOf(paragraph) < card.children.indexOf(card.querySelector('.creature-details')));
    }
  }
});

test('the card link has translations in all 13 languages and keeps the tool name', () => {
  const languages = JSON.parse(read('shared/i18n/languages.json')).map(language => language.code);
  const catalog = JSON.parse(read('apps/bestiary/locales/messages.json'));
  const key = 'Compare all weapons in the Damage Calculator →';
  assert.deepEqual(Object.keys(catalog[key]).sort(), languages.sort());
  for (const text of Object.values(catalog[key])) assert.ok(text.includes('Damage Calculator'));
});
