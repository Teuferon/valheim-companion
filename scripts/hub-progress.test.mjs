import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
class Element {
  constructor() {
    this.children = []; this.hidden = true; this.value = ''; this.textContent = '';
    this.events = {}; this.dataset = {}; this.className = '';
  }
  appendChild(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  addEventListener(type, callback) { this.events[type] = callback; }
  setAttribute() {}
  querySelectorAll(selector) {
    return this.children.flatMap(child => [
      ...(child.className === selector.slice(1) ? [child] : []), ...child.querySelectorAll(selector),
    ]);
  }
}
function setup(initial = {}) {
  const values = new Map(Object.entries(initial));
  const events = {};
  const summary = new Element();
  const input = new Element();
  const results = new Element();
  const context = vm.createContext({ console, navigator: { languages: ['en'] },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    document: { readyState: 'complete', documentElement: {}, addEventListener() {}, querySelectorAll: () => [],
      getElementById: id => ({ 'hub-progress-summary': summary, 'hub-search-input': input, 'hub-search-results': results })[id],
      createElement: () => new Element(),
    },
  });
  context.window = context;
  context.addEventListener = (type, cb) => (events[type] ??= []).push(cb);
  for (const path of ['shared/i18n/core.js', 'apps/hub/locales/messages.js', 'apps/progress/data/data.js',
    'shared/progress/core.js', 'apps/hub/data/search.js', 'apps/hub/app.js']) vm.runInContext(read(path), context);
  return { context, values, summary, input, results, storage: key => events.storage.forEach(cb => cb({ key })) };
}

test('hub summary is hidden for absent, empty, corrupt and unsupported progress', () => {
  for (const value of [undefined, '{}', '{broken', '{"version":1,"visited":[],"defeated":{},"milestones":{}}', '{"version":99,"visited":["swamp"]}']) {
    const { summary } = setup(value ? { 'vc.progress': value } : {});
    assert.equal(summary.hidden, true);
    assert.equal(summary.textContent, '');
  }
});

test('hub summary counts known bosses, updates across tabs, and translates in all languages', () => {
  const { context, values, summary, storage } = setup();
  context.VCProgress.defeat('the-elder', true);
  assert.equal(summary.hidden, false);
  assert.equal(summary.textContent, '4 / 9 biomes · 1 bosses');
  context.VCProgress.defeat('brenna', true);
  assert.equal(summary.textContent, '4 / 9 biomes · 1 bosses');
  for (const { code } of context.VCI18n.languages) {
    context.VCI18n.setPreference(code);
    assert.equal(summary.textContent, context.VCI18n.t('{revealed} / {total} biomes · {bosses} bosses', { revealed: 4, total: 9, bosses: 1 }));
    assert.ok(!summary.textContent.includes('{'));
  }
  values.delete('vc.progress'); storage('vc.progress');
  assert.equal(summary.hidden, true);
  context.VCI18n.setPreference('en');
  values.set('vc.openBiomes', '["ashlands"]'); storage('vc.openBiomes');
  assert.equal(summary.textContent, '2 / 9 biomes · 0 bosses');
  values.clear(); storage(null);
  assert.equal(summary.hidden, true);
  context.VCProgress.milestone('forge', true);
  assert.equal(summary.textContent, '1 / 9 biomes · 0 bosses');
});

test('active hub search follows tracked reveals and reset without leaking locked names', () => {
  const { context, values, input, results, storage } = setup();
  input.value = 'troll'; input.events.input();
  const names = () => results.querySelectorAll('.hub-search-item-name').map(node => node.textContent);
  assert.deepEqual(names(), []);
  context.VCProgress.defeat('eikthyr', true);
  assert.ok(names().includes('Troll'));
  values.delete('vc.progress'); storage('vc.progress');
  assert.deepEqual(names(), []);
});

test('hub Progress card and summary link point to the existing tracker', () => {
  const html = read('apps/hub/index.html');
  assert.match(html, /id="hub-progress-summary"[^>]+href="\/progress\/"[^>]+hidden/);
  assert.match(html, /href="progress\/"[^>]+card-progress/);
  assert.match(html, /<h2 class="card-title">Progress Tracker<\/h2>/);
});
