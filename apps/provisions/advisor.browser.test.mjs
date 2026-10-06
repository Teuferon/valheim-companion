// Run against the built preview: node apps/provisions/advisor.browser.test.mjs 8094
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launchClean, attachPage, enable, collectErrors, goto, evaluate } from '../../scripts/lib/cdp.mjs';
const origin = 'http://localhost:' + Number(process.argv[2] || 8094);
const browser = await launchClean({ headless: true, profileRoot: fileURLToPath(new URL('../../', import.meta.url)) });
let cdp;
try {
  cdp = await attachPage(browser.port); await enable(cdp);
  const errors = collectErrors(cdp);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    if (location.origin === ${JSON.stringify(origin)}) {
      localStorage.clear(); localStorage.setItem('vc.language', 'en');
      localStorage.setItem('vc.openBiomes', JSON.stringify(['meadows', 'black-forest', 'ocean', 'swamp']));
    }
  ` });
  await goto(cdp, origin + '/provisions/', { waitMs: 200 });
  const waitForCombos = () => evaluate(cdp, `return (async () => {
    for (let n = 0; n < 100; n++) {
      if (document.querySelector('#advisor-results').getAttribute('aria-busy') === 'false') return document.querySelectorAll('.combo-card').length;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error('Advice did not finish');
  })();`);
  assert.equal(await waitForCombos(), 3);
  const boss = await evaluate(cdp, `
    document.getElementById('activity-boss').click();
    const select = document.getElementById('advisor-context');
    select.value = 'swamp'; select.dispatchEvent(new Event('change'));
    return { stored: localStorage.getItem('vp.activity'), options: [...select.options].map(o => o.value) };
  `);
  assert.equal(boss.stored, 'boss'); assert.ok(boss.options.includes('bonemass'));
  assert.ok(!boss.options.includes('moder') && !boss.options.includes('ashlands'));
  await waitForCombos();
  assert.ok(await evaluate(cdp, `return document.querySelector('.mead-picks').textContent.includes('Poison Resistance Mead');`));
  const used = await evaluate(cdp, `
    const before = [...document.querySelector('.combo-card').querySelectorAll('h4')].map(e => e.textContent);
    document.querySelector('.combo-card button').click();
    document.querySelector('.mead-picks button').click();
    const state = JSON.parse(localStorage.getItem('vp.loadout'));
    return { before, names: state.foods.map(id => VPR_DATA.food.find(f => f.id === id).name), meads: state.meads, tips: document.getElementById('advisor-tips').textContent };
  `);
  assert.deepEqual(used.names, used.before); assert.equal(used.meads[0].id, 'poison-resistance-mead');
  assert.ok(used.tips.includes('servings for 2 hours') && used.tips.includes('Cauldron level'));
  const hours = await evaluate(cdp, `
    const input = document.getElementById('hours'); input.value = '4'; input.dispatchEvent(new Event('input'));
    return document.getElementById('advisor-tips').textContent;
  `);
  assert.ok(hours.includes('servings for 4 hours'));
  await evaluate(cdp, `
    VCProgress.visit('mountain', true);
    const select = document.getElementById('advisor-context'); select.value = 'moder'; select.dispatchEvent(new Event('change'));
  `);
  assert.ok(await evaluate(cdp, `return document.querySelector('.mead-picks').textContent.includes('Frost Resistance Mead');`));
  await evaluate(cdp, `VCProgress.visit('mountain', false);`);
  assert.equal(await evaluate(cdp, `return document.getElementById('advisor-context').value;`), '');
  await evaluate(cdp, `
    globalThis.advisorMissing = new Set();
    const original = VCI18n.t;
    VCI18n.t = (...args) => {
      const catalog = typeof args[0] === 'string' ? VC_MESSAGES : args[0];
      const key = typeof args[0] === 'string' ? args[0] : args[1];
      if (catalog === VC_MESSAGES && !catalog[key]?.[VCI18n.locale()]) advisorMissing.add(VCI18n.locale() + ': ' + key);
      return original(...args);
    };
  `);
  const languages = JSON.parse(readFileSync(new URL('../../shared/i18n/languages.json', import.meta.url)));
  let maxInteraction = 0;
  for (const { code } of languages) {
    const result = await evaluate(cdp, `
      VCI18n.setPreference(${JSON.stringify(code)});
      const start = performance.now();
      for (const id of ['boss', 'combat', 'mining', 'farming', 'exploration', 'magic', 'balanced']) document.getElementById('activity-' + id).click();
      document.getElementById('advisor-easy').click();
      VCProgress.set({ visited: VPR_DATA.biomes.map(b => b.id) });
      const select = document.getElementById('advisor-context'); select.value = 'fader'; select.dispatchEvent(new Event('change'));
      return { elapsed: performance.now() - start, missing: [...advisorMissing] };
    `);
    maxInteraction = Math.max(maxInteraction, result.elapsed);
    assert.deepEqual(result.missing, []);
    await waitForCombos();
  }
  console.log('13 languages, 0 missing translations; seven activity changes + progress update: max ' + maxInteraction.toFixed(1) + ' ms');
  assert.ok(maxInteraction < 100, `${maxInteraction} ms`);
  assert.deepEqual(errors, { consoleErrors: [], exceptions: [], failedRequests: [] });
  console.log('Advisor interactions passed: combinations, loadout, meads, hours, progress, context, easy cooking. Browser errors: 0.');
} finally { cdp?.close(); await browser.kill(); }
