// Foreground browser verification with a self-contained preview server.
// Run after npm run build: node scripts/calculator-player.browser.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { launchClean, attachPage, enable, collectErrors, goto, evaluate } from './lib/cdp.mjs';

const root = resolve('dist');
const csp = readFileSync('deploy/security-headers.conf', 'utf8').match(/Content-Security-Policy\s+"([^"]+)"/)[1];
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = createServer((request, response) => {
  let file = resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  if (!existsSync(file)) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Content-Security-Policy': csp });
  response.end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, cdp;
const profile = { skills: { bows: 18, clubs: 77 }, sets: ['root', 'lox'], quality: 2, sneak: true, staggered: true };
const messages = JSON.parse(readFileSync('apps/damage-calculator/src/locales/messages.json', 'utf8'));
const languages = JSON.parse(readFileSync('shared/i18n/languages.json', 'utf8'));
const pause = () => evaluate(cdp, 'return new Promise(resolve => setTimeout(resolve, 150));');
const state = () => evaluate(cdp, `
  const params = new URLSearchParams(location.search);
  const label = [...document.querySelectorAll('label')].find(label => label.textContent.includes('Use my Bestiary profile'));
  return { skill: Number(params.get('skill') ?? 100), quality: Number(params.get('level') ?? 4),
    enemy: params.get('state') ?? 'alerted', checked: label?.querySelector('input')?.checked };
`);
try {
  browser = await launchClean({ headless: true, profileRoot: process.cwd() });
  cdp = await attachPage(browser.port);
  await enable(cdp);
  const errors = collectErrors(cdp);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  await goto(cdp, origin + '/damage-calculator/', { waitMs: 200 });
  await evaluate(cdp, `localStorage.clear(); localStorage.setItem('vc.language', 'en'); localStorage.setItem('vc.player', ${JSON.stringify(JSON.stringify(profile))});`);
  await goto(cdp, origin + '/damage-calculator/?biome=swamp&target=bonemass&weapon=crude-bow', { waitMs: 200 });
  assert.deepEqual(await state(), { skill: 48, quality: 2, enemy: 'unalerted-staggered', checked: true });
  const chooseClub = `const row = [...document.querySelectorAll('tr[aria-selected]')].find(row => [...row.querySelectorAll('span')].some(span => span.textContent === 'Club')); if (!row) throw new Error('Club row not found'); row.click();`;
  await evaluate(cdp, chooseClub);
  await pause();
  assert.deepEqual(await state(), { skill: 77, quality: 2, enemy: 'unalerted-staggered', checked: true });
  const toggle = `const label = [...document.querySelectorAll('label')].find(label => label.textContent.includes('Use my Bestiary profile')); label.querySelector('input').click();`;
  await evaluate(cdp, toggle);
  await pause();
  assert.deepEqual(await state(), { skill: 100, quality: 4, enemy: 'alerted', checked: false });
  await evaluate(cdp, toggle);
  await pause();
  assert.deepEqual(await state(), { skill: 77, quality: 2, enemy: 'unalerted-staggered', checked: true });
  await evaluate(cdp, `localStorage.setItem('vc.player', ${JSON.stringify(JSON.stringify({ ...profile, skills: { clubs: 29 } }))}); window.dispatchEvent(new StorageEvent('storage', { key: 'vc.player' }));`);
  await pause();
  assert.equal((await state()).skill, 29);
  await goto(cdp, origin + '/damage-calculator/?biome=swamp&target=bonemass&weapon=crude-bow&skill=0&level=4&state=alerted', { waitMs: 200 });
  assert.deepEqual(await state(), { skill: 0, quality: 4, enemy: 'alerted', checked: true });
  await evaluate(cdp, chooseClub);
  await pause();
  assert.equal((await state()).skill, 0);
  await evaluate(cdp, `localStorage.removeItem('vc.player');`);
  await goto(cdp, origin + '/damage-calculator/?biome=swamp&target=bonemass&weapon=crude-bow', { waitMs: 200 });
  assert.deepEqual(await state(), { skill: 100, quality: 4, enemy: 'alerted', checked: false });
  await evaluate(cdp, `localStorage.setItem('vc.player', '{invalid');`);
  await goto(cdp, origin + '/damage-calculator/?biome=swamp&target=bonemass&weapon=crude-bow', { waitMs: 200 });
  assert.deepEqual(await state(), { skill: 50, quality: 4, enemy: 'alerted', checked: true });
  await evaluate(cdp, `localStorage.setItem('vc.player', ${JSON.stringify(JSON.stringify(profile))});`);
  await goto(cdp, origin + '/damage-calculator/?biome=swamp&target=bonemass', { waitMs: 200 });
  const automaticState = await state();
  const bookmark = await evaluate(cdp, 'return location.href;');
  assert.ok(new URL(bookmark).searchParams.get('weapon'), 'Profile bookmarks must pin the calculated weapon');
  await goto(cdp, bookmark, { waitMs: 200 });
  assert.deepEqual(await state(), automaticState);
  console.log('Profile toggle, class changes, URL precedence, bookmarks, storage updates and fallback profiles: passed');

  let checked = 0;
  for (const { code } of languages) {
    await evaluate(cdp, `localStorage.setItem('vc.language', ${JSON.stringify(code)}); localStorage.setItem('vc.player', ${JSON.stringify(JSON.stringify(profile))});`);
    for (const route of ['/damage-calculator/?biome=swamp&target=bonemass&weapon=crude-bow', '/bestiary/']) {
      await goto(cdp, origin + route, { waitMs: 200 });
      if (route.startsWith('/damage-calculator/')) {
        await evaluate(cdp, `document.querySelector('[aria-controls="progression-guide-panel"]').click();`);
        await pause();
      }
      await evaluate(cdp, 'return document.fonts.ready;');
      const layout = await evaluate(cdp, `return { lang: document.documentElement.lang, width: document.documentElement.clientWidth, scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) };`);
      assert.equal(layout.lang, code);
      assert.equal(layout.width, 360);
      assert.equal(layout.scroll, 360, code + ' ' + route);
      if (route.startsWith('/damage-calculator/')) {
        const translated = await evaluate(cdp, `return [...document.querySelectorAll('label')].map(label => label.textContent.trim());`);
        for (const key of ['Use my Bestiary profile', 'Staggered target (2× damage)']) assert.ok(translated.includes(messages[key][code]), code + ': ' + key);
        const caption = messages['Bestiary profile ({roll}) · primary attack · best reachable ammo'][code].replace('{roll}', messages['average roll'][code]);
        assert.ok(await evaluate(cdp, `return document.getElementById('progression-guide-panel').textContent.includes(${JSON.stringify(caption)});`), code + ': guide profile caption');
      } else {
        const bestiary = await evaluate(cdp, `return (async () => { const shared = await import('/shared/player/core.js'); return { panel: !!document.querySelector('.character-panel'), sameDefault: shared.DEFAULT_PLAYER === VCRank.DEFAULT_PLAYER, sameSkill: shared.effectiveSkill === VCRank.effectiveSkill, skill: VCRank.effectiveSkill(shared.readPlayerState().player, 'bows') }; })();`);
        assert.deepEqual(bestiary, { panel: true, sameDefault: true, sameSkill: true, skill: 48 });
      }
      checked++;
    }
  }
  assert.deepEqual(errors, { consoleErrors: [], exceptions: [], failedRequests: [] });
  console.log(`${checked} mobile views (2 tools × 13 languages): no overflow, no browser errors`);
} finally {
  cdp?.close();
  if (browser) await browser.kill();
  await new Promise(resolve => server.close(resolve));
}
