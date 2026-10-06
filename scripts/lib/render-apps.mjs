// Execute production renderers with small DOM and locale fixtures.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import * as playerCore from '../../shared/player/core.js';
const read = path => readFileSync(path, 'utf8');
const calculatorRequire = createRequire(resolve('apps/damage-calculator/package.json'));
const ts = calculatorRequire('typescript');
const React = calculatorRequire('react');
const { renderToStaticMarkup } = calculatorRequire('react-dom/server');

// Execute the real TypeScript components in Node with a selected language hook.
// UI primitives and the damage/recipe data are loaded without replacement.
export function calculator(locale) {
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
        tn: (source, count, values) => core.tn(catalog, source, count, values, locale),
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
export class Element {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.dataset = {}; this.style = {}; this.className = ''; this.value = ''; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  get options() { return this.children; }
  get classList() { return { add: (...names) => { this.className += ' ' + names.join(' '); }, remove: () => {}, toggle: () => {}, contains: name => this.className.split(' ').includes(name) }; }
  append(...children) { for (const child of children) this.appendChild(child); }
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
export function staticApp(app, locale, { playerCount } = {}) {
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
  context.readPlayerState = () => playerCore.readPlayerState(context.localStorage);
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
    if (playerCount !== undefined) vm.runInContext(read('apps/bestiary/assets/rank.js').replace(/^import .*;$/gm, ''), context);
    source = source.replace("  if (document.readyState === 'loading')", '  globalThis.renderers = { createCreatureCard, createWeaponRowBtn, openWeaponModal, biomeName, normalizeSearch, buildCharacterPanel, setPlayerCount: count => { playerState.players = count; } };\n  if (document.readyState === \'loading\')');
  } else {
    source = source.replace("    const picker = VCI18n.mountPicker('#language-picker');", '    globalThis.renderers = { renderSetCard, renderSetDetail, renderWeaponCard, renderCatalog, renderCart, setCart: value => { cart = value; } };\n    return;\n    const picker = VCI18n.mountPicker(\'#language-picker\');');
    source = source.replace('    calculateCartMaterials,\n    calculateSmelting,', '    initArmourer,\n    calculateCartMaterials,\n    calculateSmelting,');
  }
  vm.runInContext(source, context);
  if (app === 'smithy') context.VACart.initArmourer();
  if (playerCount !== undefined) context.renderers.setPlayerCount(playerCount);
  return { context, document, nodes, data: context.VC_DATA ?? context.VA_DATA };
}

