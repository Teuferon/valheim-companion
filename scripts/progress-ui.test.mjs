import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
export function fixture(pathname = '/bestiary/') {
  const events = new Map();
  const values = new Map();
  let document;
  class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.events = {}; this.style = { setProperty(key, value) { this[key] = value; } }; this.className = ''; this.textContent = ''; this.hidden = false; }
    get classList() { return { add: (...names) => { this.className += ' ' + names.join(' '); }, contains: name => this.className.split(' ').includes(name) }; }
    append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
    appendChild(node) { this.append(node); return node; }
    insertBefore(node, before) { node.parentElement = this; this.children.splice(this.children.indexOf(before), 0, node); }
    get lastChild() { return this.children.at(-1); }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    setAttribute(key, value) { this.attrs[key] = String(value); if (key === 'hidden') this.hidden = true; }
    getAttribute(key) { return this.attrs[key] ?? null; }
    removeAttribute(key) { delete this.attrs[key]; if (key === 'hidden') this.hidden = false; }
    addEventListener(key, cb) { (this.events[key] ??= []).push(cb); }
    dispatch(key, event = {}) { for (const cb of this.events[key] || []) cb({ target: this, ...event }); }
    focus() { document.activeElement = this; }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    getBoundingClientRect() { return { height: 100 }; }
    querySelectorAll(selector) {
      const match = node => selector.split(',').some(part => {
        part = part.trim();
        if (part === '[data-key]') return !!node.dataset.key;
        if (part.startsWith('#')) return node.id === part.slice(1);
        if (part.startsWith('.')) return node.classList.contains(part.slice(1));
        if (part.startsWith('link[')) return node.tagName === 'link';
        if (part.includes('[href]')) return node.tagName === 'a';
        if (part.includes(':not')) return ['button', 'input', 'select', 'textarea'].includes(node.tagName) && !node.disabled;
        return node.tagName === part;
      });
      return this.children.flatMap(node => [...(match(node) ? [node] : []), ...node.querySelectorAll(selector)]);
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  document = { body: new Node('body'), head: new Node('head'), activeElement: null, readyState: 'complete', createElement: tag => new Node(tag),
    querySelector(selector) { return this.body.querySelector(selector) || this.head.querySelector(selector); },
    addEventListener: (key, cb) => { (events.get(key) || events.set(key, []).get(key)).push(cb); } };
  const window = { addEventListener: document.addEventListener };
  const context = vm.createContext({ document, window, location: { pathname }, navigator: { languages: ['en'] }, localStorage: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key),
  }, console, URLSearchParams, TextEncoder, TextDecoder, atob, btoa,
    fetch: async () => ({ ok: true, json: async () => JSON.parse(read('shared/progress/messages.json')) }),
    MutationObserver: class { observe() {} }, ResizeObserver: class { observe() {} },
  });
  for (const file of ['shared/progress/core.js', 'shared/progress/ui.js']) vm.runInContext(read(file), context);
  context.VCProgressUI.messages = JSON.parse(read('shared/progress/messages.json'));
  const dataContext = vm.createContext({ window: {} });
  vm.runInContext(read('apps/progress/data/data.js'), dataContext);
  const data = dataContext.window.VP_DATA;
  return { context, document, data, values, fire(key, event) { for (const cb of events.get(key) || []) cb(event); }, run(file) { vm.runInContext(read(file), context); } };
}

test('shared checklist renders summary, locks spoilers, and reacts to checkbox changes', () => {
  const { context: c, document: d, data } = fixture();
  const container = d.createElement('main'); d.body.append(container);
  const mounted = c.VCProgressUI.render(container, data, { compact: false });
  assert.equal(container.querySelector('.summary-text').textContent, '1 / 9 biomes revealed · 0 bosses defeated');
  assert.equal(container.querySelectorAll('.biome').length, 9);
  assert.equal(container.querySelectorAll('.locked').length, 8);
  assert.ok(container.querySelectorAll('h2').some(node => node.textContent === '🔒 Biome 2'));
  assert.ok(!container.querySelectorAll('h3').some(node => node.textContent === 'The Elder'));
  const key = id => container.querySelectorAll('[data-key]').find(node => node.dataset.key === id);
  key('defeat:eikthyr').checked = true; key('defeat:eikthyr').dispatch('change');
  assert.equal(c.VCProgress.get().defeated.eikthyr, true);
  assert.equal(container.querySelectorAll('.locked').length, 7);
  assert.equal(d.activeElement, null);
  key('milestone:hard-antler').checked = true; key('milestone:hard-antler').dispatch('change');
  assert.equal(c.VCProgress.get().milestones['hard-antler'], true);
  key('visit:black-forest').checked = true; key('visit:black-forest').dispatch('change');
  assert.ok(c.VCProgress.get().visited.includes('black-forest'));
  key('reveal:swamp').focus(); key('reveal:swamp').dispatch('click');
  assert.equal(d.activeElement.dataset.key, 'visit:swamp');
  assert.ok(c.VCProgress.revealedBiomes(data.biomes).includes('swamp'));
  assert.equal(c.VCProgressUI.render(container, data), mounted);
  mounted.destroy();
});

test('compact UI uses host-independent links and images, English game names and React locale fallback', () => {
  const { context: c, document: d, data, values } = fixture('/signs/');
  values.set('vc.language', 'cs'); c.VCProgress.defeat('eikthyr', true);
  data.biomes[0].names = { cs: 'not the game name' };
  const container = d.createElement('div');
  c.VCProgressUI.render(container, data, { compact: true });
  assert.ok(container.classList.contains('vc-progress-compact'));
  assert.equal(container.querySelector('h2').textContent, '1 · Meadows');
  assert.equal(container.querySelector('a').href, '/bestiary/#c=eikthyr');
  assert.ok(container.querySelector('img').src.startsWith('/progress/'));
  assert.ok(container.querySelectorAll('span').some(node => node.textContent === 'Poražen'));
});

test('shared checklist catalog covers all locales and preserves placeholders', () => {
  const messages = JSON.parse(read('shared/progress/messages.json'));
  const languages = JSON.parse(read('shared/i18n/languages.json'));
  const tokens = value => [...value.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
  for (const [key, translations] of Object.entries(messages)) for (const { code } of languages) {
    assert.ok(translations[code]?.trim(), `${key}: missing ${code}`);
    assert.deepEqual(tokens(translations[code]), tokens(key));
  }
});
