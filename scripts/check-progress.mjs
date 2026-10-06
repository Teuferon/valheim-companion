// Usage: node scripts/check-progress.mjs 8090 (assembled preview server).
// Browser checks for same-tab drawer updates, manual/URL precedence and focus.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launchClean, attachPage, enable, collectErrors, goto, evaluate } from './lib/cdp.mjs';

const port = Number(process.argv[2] ?? 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Expected a preview server port');
const origin = `http://localhost:${port}`;
const browser = await launchClean({ headless: true, profileRoot: fileURLToPath(new URL('../', import.meta.url)) });
let cdp;
async function waitFor(expression) {
  await evaluate(cdp, `return (async () => {
    for (let attempt = 0; !(${expression}); attempt++) {
      if (attempt === 100) throw new Error('Timed out: ' + ${JSON.stringify(expression)});
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  })();`);
}
async function openDrawer() {
  await evaluate(cdp, `document.querySelector('.vc-progress-trigger').click();`);
  await waitFor(`document.querySelector('.vc-progress-panel .biome') && document.querySelector('.vc-progress-panel-content').getAttribute('aria-busy') === 'false'`);
}
const slider = `document.querySelector('#root input[type="range"][max="8"]')`;
try {
  cdp = await attachPage(browser.port); await enable(cdp);
  const errors = collectErrors(cdp);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `if (location.origin === ${JSON.stringify(origin)}) {
      localStorage.clear(); localStorage.setItem('vc.language', 'en');
      localStorage.setItem('vc.consent', '{"analytics":"denied"}');
    }`,
  });
  for (const route of ['/', '/bestiary/', '/smithy/', '/damage-calculator/']) {
    await goto(cdp, origin + route, { waitMs: 300 });
    await waitFor(`document.querySelector('.vc-progress-trigger') && (!document.querySelector('#root') || document.querySelector('#root').children.length)`);
    if (route !== '/') assert.equal(await evaluate(cdp, `return !!globalThis.VP_DATA;`), false, route + ': data stays lazy');
    await openDrawer();
    await evaluate(cdp, `const checkbox = document.querySelector('.vc-progress-panel [data-key="defeat:eikthyr"]'); checkbox.focus(); checkbox.click();`);
    await waitFor(`document.querySelector('.vc-progress-trigger').getAttribute('aria-label') === '⛓ Progress 2/9'`);
    assert.equal(await evaluate(cdp, `return document.activeElement.dataset.key;`), 'defeat:eikthyr');
    if (route === '/') await waitFor(`document.querySelector('#hub-progress-summary').textContent.includes('2 / 9')`);
    if (route === '/bestiary/') await waitFor(`document.querySelector('.biome-card[data-biome-id="black-forest"] .creature-card')`);
    if (route === '/smithy/') await waitFor(`document.querySelector('.biome-card[data-biome-id="black-forest"]') && !document.querySelector('.biome-card[data-biome-id="black-forest"] .biome-locked-banner')`);
    if (route === '/damage-calculator/') await waitFor(`${slider}?.getAttribute('aria-valuenow') === '1'`);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
    assert.equal(await evaluate(cdp, `return document.querySelector('.vc-progress-overlay').hidden && document.activeElement === document.querySelector('.vc-progress-trigger');`), true);
    console.log(`OK ${route}: boss checkbox unlocks the tool immediately; Escape restores focus`);
    if (route === '/damage-calculator/') {
      await evaluate(cdp, `const ocean = [...document.querySelectorAll('#root button')].find(button => button.textContent.trim() === 'Ocean'); if (!ocean) throw new Error('Ocean button missing'); ocean.click();`);
      await waitFor(`${slider}?.getAttribute('aria-valuenow') === '2'`);
      await openDrawer();
      await evaluate(cdp, `document.querySelector('.vc-progress-panel [data-key="defeat:the-elder"]').click();`);
      await waitFor(`document.querySelector('.vc-progress-trigger').getAttribute('aria-label') === '⛓ Progress 4/9'`);
      assert.equal(await evaluate(cdp, `return ${slider}.getAttribute('aria-valuenow');`), '2');
      console.log('OK calculator: manual session choice survives subsequent boss changes');
    }
  }
  for (const [biome, index] of [['meadows', '0'], ['ashlands', '7']]) {
    await goto(cdp, origin + '/damage-calculator/?biome=' + biome, { waitMs: 300 });
    await waitFor(`${slider}?.getAttribute('aria-valuenow') === '${index}'`);
    await openDrawer(); await evaluate(cdp, `document.querySelector('.vc-progress-panel [data-key="defeat:eikthyr"]').click();`);
    await waitFor(`document.querySelector('.vc-progress-trigger').getAttribute('aria-label') === '⛓ Progress 2/9'`);
    assert.equal(await evaluate(cdp, `return ${slider}.getAttribute('aria-valuenow');`), index);
    console.log(`OK calculator: URL biome ${biome} survives tracked updates`);
  }
  await goto(cdp, origin + '/signs/', { waitMs: 300 }); await openDrawer();
  // Change the React preference while the drawer is closed, then reopen it.
  await evaluate(cdp, `VCProgressDrawer.close(); const picker = document.querySelector('#root select'); picker.value = 'ar'; picker.dispatchEvent(new Event('change', { bubbles: true }));`);
  await waitFor(`document.documentElement.lang === 'ar'`); await openDrawer();
  assert.equal(await evaluate(cdp, `return document.querySelector('.vc-progress-panel').getAttribute('dir');`), 'rtl');
  assert.equal(await evaluate(cdp, `return document.querySelector('.vc-progress-full-link').textContent;`), 'فتح المتتبّع الكامل →');
  console.log('OK React language picker: drawer follows Arabic and RTL in the same tab');
  await goto(cdp, origin + '/progress/', { waitMs: 300 });
  assert.equal(await evaluate(cdp, `return !!document.querySelector('.vc-progress-trigger');`), false);
  await evaluate(cdp, `VCProgress.defeat('the-elder', true); document.querySelector('#reset').click(); document.querySelector('#dialog-accept').click();`);
  await waitFor(`document.querySelectorAll('.locked').length === 8`);
  assert.equal(await evaluate(cdp, `return Object.keys(VCProgress.get().defeated).length;`), 0);
  console.log('OK full tracker: no trigger; reset still clears the shared checklist');
  assert.deepEqual(errors, { consoleErrors: [], exceptions: [], failedRequests: [] });
  console.log('Browser errors: 0');
} finally { cdp?.close(); await browser.kill(); }
