import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixture } from './lib/progress-dom.mjs';
import { applyMetaToHtml, PAGES, readConfig } from './apply-meta.mjs';
const settle = () => new Promise(resolve => setImmediate(resolve));

test('drawer mounts outside the app, loads checklist once on demand and updates the trigger', async () => {
  const f = fixture(); const { context: c, document: d, data } = f;
  const root = d.createElement('div'); root.id = 'root'; d.body.append(root);
  const banner = d.createElement('div'); banner.className = 'vc-consent-banner'; d.body.append(banner);
  f.run('shared/progress/drawer.js');
  const trigger = d.querySelector('.vc-progress-trigger');
  const overlay = d.querySelector('.vc-progress-overlay');
  const panel = d.querySelector('.vc-progress-panel');
  assert.equal(trigger.style['--vc-progress-consent-height'], '100px');
  banner.hidden = true; f.fire('resize');
  assert.equal(trigger.style['--vc-progress-consent-height'], '0px');
  assert.equal(trigger.parentElement, d.body);
  assert.equal(overlay.parentElement, d.body);
  assert.equal(panel.getAttribute('role'), 'dialog');
  assert.equal(panel.getAttribute('aria-modal'), 'true');
  assert.equal(overlay.hidden, true);
  assert.equal(d.head.querySelectorAll('script').length, 0);
  assert.equal(trigger.getAttribute('aria-label'), '⛓ Progress 1/9');
  assert.equal(d.querySelector('.vc-progress-full-link').href, '/progress/');
  trigger.dispatch('click');
  assert.equal(overlay.hidden, false);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(root.inert, true);
  assert.equal(d.activeElement, d.querySelector('.vc-progress-close'));
  assert.ok(d.querySelector('.vc-progress-loading'));
  const script = d.head.querySelector('script');
  assert.equal(script.src, '/progress/data/data.js');
  c.VCProgressDrawer.close(); c.VCProgressDrawer.open();
  assert.equal(d.head.querySelectorAll('script').length, 1);
  c.VP_DATA = data; script.onload(); await settle();
  assert.equal(panel.querySelectorAll('.biome').length, 9);
  c.VCProgress.defeat('eikthyr', true);
  assert.equal(trigger.getAttribute('aria-label'), '⛓ Progress 2/9');
  assert.equal(panel.querySelectorAll('.locked').length, 7);
  c.VCProgressDrawer.close(); c.VCProgressDrawer.open();
  assert.equal(d.head.querySelectorAll('script').length, 1);
});

test('Escape, backdrop, focus trap and restored focus work while background remains inert', async () => {
  const f = fixture(); const { context: c, document: d, data } = f;
  c.VP_DATA = data; f.run('shared/progress/drawer.js');
  c.VCProgressDrawer.open(); await settle();
  const panel = d.querySelector('.vc-progress-panel');
  const close = d.querySelector('.vc-progress-close');
  const nodes = panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])');
  let prevented = 0;
  close.focus(); f.fire('keydown', { key: 'Tab', shiftKey: true, preventDefault() { prevented++; } });
  assert.equal(d.activeElement, nodes.at(-1));
  f.fire('keydown', { key: 'Tab', shiftKey: false, preventDefault() { prevented++; } });
  assert.equal(d.activeElement, close);
  assert.equal(prevented, 2);
  f.fire('keydown', { key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(d.querySelector('.vc-progress-overlay').hidden, true);
  assert.equal(d.activeElement, d.querySelector('.vc-progress-trigger'));
  assert.equal(d.body.style.overflow, undefined);
  c.VCProgressDrawer.open(); d.querySelector('.vc-progress-overlay').dispatch('click');
  assert.equal(d.querySelector('.vc-progress-overlay').hidden, true);
  assert.equal(d.querySelector('.vc-progress-trigger').inert, undefined);
});

test('drawer does not show a trigger on the full Progress page', async () => {
  for (const path of ['/progress/', '/progress', '/progress/index.html']) {
    const f = fixture(path); f.run('shared/progress/drawer.js'); await settle();
    assert.equal(f.document.querySelector('.vc-progress-trigger'), null);
    f.context.VCProgressDrawer.open();
    assert.equal(f.document.head.querySelector('script'), null);
  }
});

test('failed lazy loading can be retried, React language changes rerender the checklist', async () => {
  const f = fixture('/signs/'); const { document: d, context: c, values, data } = f;
  f.run('shared/progress/drawer.js'); c.VCProgressDrawer.open();
  d.head.querySelector('script').onerror(); await settle();
  assert.ok(d.querySelector('.vc-progress-error'));
  d.querySelector('.vc-progress-retry').dispatch('click');
  const script = d.head.querySelector('script'); c.VP_DATA = data; script.onload(); await settle();
  assert.ok(d.querySelector('.biome'));
  values.set('vc.language', 'ar'); f.fire('storage', { key: 'vc.language' });
  assert.equal(d.querySelector('.vc-progress-panel').getAttribute('dir'), 'rtl');
  assert.equal(d.querySelector('.vc-progress-close').getAttribute('aria-label'), 'إغلاق Progress');
  values.set('vc.language', 'cs'); f.fire('languagechange');
  assert.equal(d.querySelector('.vc-progress-panel').getAttribute('lang'), 'cs');
  assert.equal(d.querySelector('.vc-progress-full-link').textContent, 'Otevřít celý tracker →');
});

test('trigger ladder agrees with canonical biomes for every boss without fetching full data', () => {
  const canonical = JSON.parse(readFileSync('data/biomes.json', 'utf8'));
  const f = fixture(); f.run('shared/progress/drawer.js');
  for (const biome of canonical) for (const boss of biome.creatures.boss) {
    f.context.VCProgress.reset(); f.context.VCProgress.defeat(boss, true);
    const expected = f.context.VCProgress.revealedBiomes(canonical).length;
    assert.equal(f.document.querySelector('.vc-progress-trigger').getAttribute('aria-label'), `⛓ Progress ${expected}/9`);
  }
  assert.equal(f.document.head.querySelector('script'), null);
});

test('metadata injects ordered scripts once and keeps existing core execution order', () => {
  const scripts = html => [...html.matchAll(/<script[^>]*src="[^"\n]*shared\/progress\/(core|ui|drawer)\.js"/g)].map(match => match[1]);
  for (const page of PAGES) {
    let html;
    try { html = readFileSync(page.filePath, 'utf8'); } catch { continue; }
    const result = applyMetaToHtml(html, page, readConfig());
    assert.deepEqual(scripts(result).sort(), ['core', 'drawer', 'ui']);
    assert.equal(applyMetaToHtml(result, page, readConfig()), result);
  }
  const legacy = '<head>\n<meta name="viewport" content="width=device-width">\n</head><body><script src="/shared/progress/core.js"></script><script src="app.js"></script></body>';
  const html = applyMetaToHtml(legacy, PAGES[0], readConfig());
  assert.equal(scripts(html).filter(name => name === 'core').length, 1);
  assert.ok(html.indexOf('/shared/progress/core.js') < html.indexOf('src="app.js"'));
});
