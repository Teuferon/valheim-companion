import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './lib/progress-dom.mjs';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const textTree = node => [node.textContent, ...Object.values(node.attrs), ...node.children.map(textTree)].join(' ');
const key = (container, id) => container.querySelectorAll('[data-key]').find(node => node.dataset.key === id);
test('Saga hides spoilers, shares reach controls, preserves focus and offers the next boss', () => {
  const { context: c, document: d, data } = fixture();
  const container = d.createElement('main'); d.body.append(container);
  const mounted = c.VCProgressUI.render(container, data);
  assert.equal(container.querySelector('.summary-text').textContent, 'Biome 1 of 9 · 0 of 8 bosses · 0 of 4 minibosses');
  assert.equal(container.querySelectorAll('.saga-tile').length, 9);
  assert.equal(container.querySelectorAll('.is-reached').length, 1);
  assert.equal(container.querySelectorAll('.is-locked').length, 8);
  for (const biome of data.biomes.slice(1)) for (const boss of [...biome.bosses, ...biome.minibosses]) assert.ok(!textTree(container).includes(boss.name), boss.name);
  assert.ok(textTree(container.querySelector('.saga-next')).includes('Eikthyr'));
  assert.equal(container.querySelectorAll('input[type=checkbox]').length, 0);
  key(container, 'defeat:eikthyr').focus(); key(container, 'defeat:eikthyr').dispatch('click');
  assert.equal(c.VCProgress.get().defeated.eikthyr, true);
  assert.equal(c.VCProgress.reach(data.biomes), 2);
  assert.equal(container.querySelectorAll('.is-reached').length, 2);
  assert.equal(d.activeElement.dataset.key, 'defeat:eikthyr');
  assert.equal(d.activeElement.getAttribute('aria-pressed'), 'true');
  assert.ok(textTree(container.querySelector('.saga-next')).includes('The Elder'));
  const slider = key(container, 'reach'); slider.focus(); slider.value = 6; slider.dispatch('input');
  assert.equal(c.VCProgress.reach(data.biomes), 2, 'preview must not save');
  assert.ok(!slider.getAttribute('aria-valuetext').includes('Plains'));
  slider.dispatch('change');
  assert.equal(c.VCProgress.get().visited.length, 6);
  assert.equal(c.VCProgress.reach(data.biomes), 6);
  assert.equal(d.activeElement.dataset.key, 'reach');
  slider.value = 1; slider.dispatch('change');
  assert.equal(Number(slider.value), 2);
  assert.equal(c.VCProgress.reach(data.biomes), 2);
  assert.equal(container.querySelector('.saga-hint').textContent, 'Unmark bosses to go back');
  key(container, 'biome:7').dispatch('click');
  assert.equal(c.VCProgress.reach(data.biomes), 7);
  key(container, 'biome:1').dispatch('click');
  assert.equal(c.VCProgress.reach(data.biomes), 7, 'reached tiles do not lower reach');
  assert.equal(c.VCProgressUI.render(container, data), mounted);
  mounted.destroy();
});

test('legacy reveals never expose portraits or change reach; compact rows show current first', () => {
  const { context: c, document: d, data, values } = fixture('/signs/');
  values.set('vc.openBiomes', '["plains"]');
  const page = d.createElement('main'); c.VCProgressUI.render(page, data);
  assert.ok(textTree(page).includes('Plains'));
  assert.ok(!textTree(page).includes('Yagluth'));
  assert.equal(c.VCProgress.reach(data.biomes), 1);
  values.set('vc.language', 'cs'); c.VCProgress.defeat('eikthyr', true);
  const container = d.createElement('div'); c.VCProgressUI.render(container, data, { compact: true });
  assert.equal(container.querySelectorAll('.saga-row').length, 2);
  assert.equal(container.querySelector('h3').textContent, 'Black Forest');
  assert.ok(!textTree(container).includes('Plains'));
  assert.ok(!textTree(container).includes('Yagluth'));
  assert.ok(container.querySelector('img').src.startsWith('/progress/img/'));
  assert.equal(key(container, 'defeat:eikthyr').getAttribute('aria-label'), 'Eikthyr · Poražen');
});

test('Next up handles travel, completion and host-independent links', () => {
  const { context: c, document: d, data } = fixture();
  const container = d.createElement('div'); c.VCProgressUI.render(container, data);
  const links = container.querySelectorAll('a');
  assert.deepEqual(links.map(x => x.href), ['/bestiary/#c=eikthyr', '/expedition/#boss=eikthyr', '/damage-calculator/?biome=meadows&target=eikthyr']);
  // A visited bossless biome with no eligible boss exercises the travel message.
  const travel = d.createElement('div');
  c.VCProgressUI.render(travel, { biomes: data.biomes.map((b, i) => i === 0 ? { ...b, bosses: [] } : b) });
  assert.ok(textTree(travel).includes('Travel on'));
  for (const b of data.biomes) for (const boss of b.bosses) c.VCProgress.defeat(boss.id, true);
  assert.ok(textTree(container.querySelector('.saga-next')).includes('Saga complete'));
});

test('shared checklist catalog covers all locales and preserves placeholders', () => {
  const messages = JSON.parse(read('shared/progress/messages.json'));
  const languages = JSON.parse(read('shared/i18n/languages.json'));
  const tokens = value => [...value.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
  for (const [key, translations] of Object.entries(messages)) for (const { code } of languages) {
    assert.ok(translations[code], `${key}: missing ${code}`);
    for (const text of typeof translations[code] === 'string' ? [translations[code]] : Object.values(translations[code])) {
      assert.ok(text.trim(), `${key}: empty ${code}`);
      assert.deepEqual(tokens(text), tokens(key), `${key}: placeholders in ${code}`);
    }
  }
});
