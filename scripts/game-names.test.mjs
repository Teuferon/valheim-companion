import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import * as playerCore from '../shared/player/core.js';

const read = path => readFileSync(path, 'utf8');
const languages = JSON.parse(read('shared/i18n/languages.json'));
const calculatorRequire = createRequire(resolve('apps/damage-calculator/package.json'));
const ts = calculatorRequire('typescript');
const React = calculatorRequire('react');
const { renderToStaticMarkup } = calculatorRequire('react-dom/server');

// Execute the real TypeScript components in Node with a selected language hook.
// UI primitives and the damage/recipe data are loaded without replacement.
function calculator(locale) {
  const cache = new Map();
  const load = filename => {
    const path = resolve(filename);
    if (cache.has(path)) return cache.get(path).exports;
    if (path.endsWith('.json')) return JSON.parse(read(path));
    const module = { exports: {} };
    cache.set(path, module);
    let source = read(path).replaceAll('import.meta.env.BASE_URL', '"/damage-calculator/"');
    if (path.endsWith('/progression-guide.tsx')) source += '\nexport { GuidePickRow };';
    if (path.endsWith('/assumptions.tsx')) source += '\nexport { MethodologySections };';
    const output = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    const require = specifier => {
      if (specifier === '@/hooks/use-language') return { useLanguage: () => ({
        locale, t: (source, values) => core.translate(locale, source, catalog, values),
        nameOf: entity => names.localizedName(entity, locale), ...formats.formatters(locale),
      }) };
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return calculatorRequire(specifier);
      const base = specifier.startsWith('@/')
        ? resolve('apps/damage-calculator/src', specifier.slice(2))
        : resolve(dirname(path), specifier);
      const target = [base, base + '.ts', base + '.tsx', base + '.json'].find(candidate => existsSync(candidate));
      assert.ok(target, `Missing module ${specifier} in ${path}`);
      return load(target);
    };
    new Function('require', 'module', 'exports', output)(require, module, module.exports);
    return module.exports;
  };
  const core = load('shared/i18n/core.ts');
  const names = load('apps/damage-calculator/src/lib/entity-names.ts');
  const formats = load('apps/damage-calculator/src/lib/format.ts');
  const catalog = JSON.parse(read('apps/damage-calculator/src/locales/messages.json'));
  return { load, core, names, render: (Component, props) => renderToStaticMarkup(React.createElement(Component, props)) };
}

// Minimal DOM for the static renderers; event callbacks are stored but not fired.
class Element {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.dataset = {}; this.style = {}; this.className = ''; this.value = ''; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  get options() { return this.children; }
  get classList() { return { add: (...names) => { this.className += ' ' + names.join(' '); }, remove: () => {}, toggle: () => {}, contains: name => this.className.split(' ').includes(name) }; }
  appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  hasAttribute(key) { return key in this.attributes; }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener() {}
  removeEventListener() {}
  showModal() { this.open = true; }
  querySelectorAll(selector) {
    const result = [];
    const matches = element => selector.startsWith('.')
      ? element.className.split(' ').includes(selector.slice(1))
      : selector.startsWith('[') ? element.hasAttribute(selector.slice(1, -1)) : element.tagName.toLowerCase() === selector;
    const visit = element => { for (const child of element.children) { if (matches(child)) result.push(child); visit(child); } };
    visit(this); return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}
function staticApp(app, locale) {
  const nodes = new Map();
  const stored = new Map([['vc.language', locale], ['vc.openBiomes', '[]'], ['va.cart', JSON.stringify([{ pieceId: 'troll-leather-helmet', have: 0, want: 1 }])]]);
  const document = {
    readyState: 'loading', documentElement: new Element('html'), addEventListener() {},
    createElement: tag => new Element(tag), createTextNode: text => Object.assign(new Element('text'), { textContent: text }),
    getElementById(id) {
      if (!nodes.has(id)) {
        const node = new Element('div');
        if (id === 'toggle-spoilers-label') node.appendChild(Object.assign(new Element('span'), { className: 'toggle-text' }));
        nodes.set(id, node);
      }
      return nodes.get(id);
    },
    querySelector: selector => document.getElementById(selector.slice(1)), querySelectorAll: () => [],
  };
  const context = vm.createContext({ console, document, URLSearchParams,
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) } });
  context.window = context;
  // Supply the module imports to the synchronous VM rendering harness.
  Object.assign(context, playerCore);
  context.addEventListener = () => {};
  context.location = { hash: '', href: 'https://example.test/' };
  vm.runInContext(read('shared/i18n/core.js'), context);
  vm.runInContext(read('shared/progress/core.js'), context);
  vm.runInContext(read('shared/shopping/core.js'), context);
  vm.runInContext(read(`apps/${app}/assets/messages.js`), context);
  vm.runInContext(read(`apps/${app}/data/data.js`), context);
  const prohibitLocalizedNames = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'names') Object.defineProperty(value, key, { get() { throw new Error('UI read localized names'); } });
      else prohibitLocalizedNames(child);
    }
  };
  prohibitLocalizedNames(context.VC_DATA ?? context.VA_DATA);
  let source = read(`apps/${app}/assets/app.js`).replace(/^import .*;$/gm, '');
  if (app === 'bestiary') {
    vm.runInContext(read('apps/bestiary/assets/extras.js'), context);
    source = source.replace("  if (document.readyState === 'loading')", '  globalThis.renderers = { createCreatureCard, createWeaponRowBtn, openWeaponModal, biomeName, normalizeSearch };\n  if (document.readyState === \'loading\')');
  } else {
    source = source.replace("    const picker = VCI18n.mountPicker('#language-picker');", '    globalThis.renderers = { renderSetCard, renderSetDetail, renderWeaponCard, renderCatalog, renderCart, setCart: value => { cart = value; } };\n    return;\n    const picker = VCI18n.mountPicker(\'#language-picker\');');
    source = source.replace('    calculateCartMaterials,\n    calculateSmelting,', '    initArmourer,\n    calculateCartMaterials,\n    calculateSmelting,');
  }
  vm.runInContext(source, context);
  if (app === 'smithy') context.VACart.initArmourer();
  return { context, document, nodes, data: context.VC_DATA ?? context.VA_DATA };
}

for (const { code } of languages) {
  test(`VC-29: English names rendered in Bestiary, Armourer and calculator (${code})`, () => {
    const bestiary = staticApp('bestiary', code);
    const { data, context: b } = bestiary;
    const creature = data.creatures.greydwarf;
    const biome = data.biomes.find(biome => biome.id === 'black-forest');
    const card = b.renderers.createCreatureCard(creature, biome, data);
    assert.equal(card.querySelector('.card-name').textContent, 'Greydwarf');
    assert.equal(card.dataset.creatureName, 'greydwarf');
    for (const entity of Object.values(data.creatures)) {
      assert.equal(b.VCI18n.name(entity), entity.name);
      const biome = data.biomes.find(biome => entity.biomes.includes(biome.id));
      assert.equal(b.renderers.createCreatureCard(entity, biome, data).querySelector('.card-name').textContent, entity.name);
    }
    for (const weapon of Object.values(data.weapons)) {
      const row = b.renderers.createWeaponRowBtn(weapon.id, null, [], null, data);
      assert.equal(row.querySelector('.weapon-btn-name').textContent, weapon.name);
    }
    for (const biome of data.biomes) assert.equal(b.renderers.biomeName(biome), biome.name);
    const weapon = Object.values(data.weapons).find(weapon => weapon.materials?.length && data.biomes.some(b => b.id === weapon.biome));
    b.renderers.openWeaponModal(weapon, data);
    const modal = bestiary.document.getElementById('weapon-modal-content');
    assert.equal(modal.querySelector('.modal-title').textContent, weapon.name);
    for (const material of weapon.materials) assert.ok(modal.textContent.includes(material.name), material.name);
    assert.ok(modal.textContent.includes(data.biomes.find(b => b.id === weapon.biome).name));
    assert.equal(b.renderers.normalizeSearch('  NÍDHÖGG  '.trim()), 'nidhogg');

    const armourer = staticApp('smithy', code);
    const { context: a, data: armorData } = armourer;
    a.renderers.renderCatalog();
    const headings = armourer.nodes.get('biomes-container').querySelectorAll('.biome-name').map(node => node.textContent);
    for (const biome of armorData.biomes.filter(biome => armorData.armor.some(armor => armor.biome === biome.id))) assert.ok(headings.includes(biome.name), biome.name);
    for (const armor of armorData.armor) {
      assert.equal(a.renderers.renderSetCard(armor).querySelector('.set-title').textContent, armor.name);
      const detail = new Element('div');
      a.renderers.renderSetDetail(armor, detail, armorData);
      for (const piece of armor.pieces) assert.ok(detail.textContent.includes(piece.name), piece.name);
    }
    for (const weapon of Object.values(armorData.weapons)) assert.equal(a.renderers.renderWeaponCard(weapon).querySelector('.set-title').textContent, weapon.name);
    const trollSet = armorData.armor.find(armor => armor.id === 'troll-set');
    const cart = trollSet.pieces.map(piece => ({ pieceId: piece.id, have: 0, want: 1 }));
    const calculation = a.VACart.calculateCartMaterials(cart, armorData, { openBiomes: ['black-forest'] });
    for (const material of calculation.materials) assert.equal(material.name, armorData.items[material.item].name);
    assert.ok(calculation.materials.find(m => m.item === 'bone-fragments').sources[0].text.includes('Skeleton (Black Forest)'));
    const locked = a.VACart.calculateCartMaterials(cart, armorData, {});
    assert.ok(locked.materials.find(m => m.item === 'bone-fragments').sources[0].text.includes('Black Forest'));
    assert.ok(calculation.materials.length > 0);
    const bonusDetail = new Element('div');
    const bonusArmor = Object.assign(Object.create(trollSet), { setBonus: { name: 'Game Bonus', pieces: 2, effects: ['+10% pierce damage'] } });
    a.renderers.renderSetDetail(bonusArmor, bonusDetail, armorData);
    assert.ok(bonusDetail.textContent.includes('Pierce'));
    a.renderers.setCart(cart);
    a.renderers.renderCart();
    const renderedMaterials = [...armourer.nodes.values()].flatMap(node => node.querySelectorAll('.material-name')).map(node => node.textContent);
    for (const material of calculation.materials) assert.ok(renderedMaterials.includes(material.name), material.name);

    const calc = calculator(code);
    const { targets, weapons, recipes } = calc.load('apps/damage-calculator/src/lib/data.ts');
    const { BIOMES } = calc.load('apps/damage-calculator/src/data/biomes.ts');
    const { TargetPicker } = calc.load('apps/damage-calculator/src/components/target-picker.tsx');
    const { BiomeSlider } = calc.load('apps/damage-calculator/src/components/biome-slider.tsx');
    const { GuidePickRow } = calc.load('apps/damage-calculator/src/components/progression-guide.tsx');
    const { buildGuideStep } = calc.load('apps/damage-calculator/src/lib/guide.ts');
    const markup = calc.render(TargetPicker, { targets, total: targets.length, selected: targets[0], onSelect() {} });
    assert.ok(markup.includes('Greydwarf'));
    assert.ok(!markup.includes('Šedý trpaslík'));
    for (const target of targets) assert.equal(calc.names.localizedName(target, code), target.name);
    for (const weapon of weapons) assert.equal(calc.names.localizedName(weapon, code), weapon.name);
    for (const biome of BIOMES) {
      const html = calc.render(BiomeSlider, { value: biome.id, onChange() {}, visibleWeapons: 1, totalWeapons: 1, visibleTargets: 1, totalTargets: 1 });
      assert.ok(html.includes(biome.name), biome.name);
      for (const value of Object.values(biome.note.values)) assert.ok(html.includes(value), value);
      for (const pick of buildGuideStep(biome.id).picks) {
        const html = calc.render(GuidePickRow, { pick, gateName: 'Greydwarf' });
        assert.ok(html.includes(pick.weapon.name), pick.weapon.name);
        for (const material of pick.craft) assert.ok(html.includes(material.name), material.name);
        if (pick.locked) for (const material of pick.locked.materials) assert.ok(html.includes(material.name), material.name);
      }
    }
    const { GUIDE_NOTES } = calc.load('apps/damage-calculator/src/data/guide-notes.ts');
    const { formatGameText } = calc.load('apps/damage-calculator/src/lib/game-text.ts');
    const catalog = JSON.parse(read('apps/damage-calculator/src/locales/messages.json'));
    for (const note of Object.values(GUIDE_NOTES).flat()) {
      const rendered = formatGameText(note, (source, values) => calc.core.translate(code, source, catalog, values));
      for (const value of Object.values(note.values)) assert.ok(rendered.includes(value), value);
    }
    const { MethodologySections } = calc.load('apps/damage-calculator/src/components/assumptions.tsx');
    const methodology = calc.render(MethodologySections, {});
    for (const name of ['Stone Axe', 'Barka', 'Deep North', 'Abyssal Harpoon', 'Flesh Rippers', 'Dundr']) assert.ok(methodology.includes(name), name);
    assert.ok(Object.keys(recipes).length > 0);
    assert.equal(calc.names.matchesName({ name: 'Nidhögg' }, 'NIDHOGG', code), true);
    assert.equal(calc.names.matchesName({ name: 'Greydwarf' }, 'Šedý trpaslík', code), false);
    assert.equal(calc.core.entityName({ name: 'Greydwarf', names: { [code]: 'Translated name' } }, code), 'Greydwarf');
  });
}

test('VC-29: catalogs cannot translate game names and UI cannot consume names.json', () => {
  const terms = ['Meadows', 'Black Forest', 'Ocean', 'Swamp', 'Mountain', 'Plains', 'Mistlands', 'Ashlands', 'Deep North', 'Slash', 'Pierce', 'Blunt', 'Fire', 'Frost', 'Lightning', 'Poison', 'Spirit', 'Chop', 'Pickaxe', 'Pure'];
  for (const path of ['apps/bestiary/locales/messages.json', 'apps/smithy/locales/messages.json', 'apps/damage-calculator/src/locales/messages.json']) {
    const catalog = JSON.parse(read(path));
    for (const term of terms) assert.equal(catalog[term], undefined, `${path}: ${term}`);
  }
  assert.ok(!read('apps/damage-calculator/src/lib/entity-names.ts').includes('names.json'));
});
