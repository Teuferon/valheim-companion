import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './lib/progress-dom.mjs';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

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
