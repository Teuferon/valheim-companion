import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const biomes = JSON.parse(read('data/biomes.json'));
for (const [app, dataKey] of [['bestiary', 'VC_DATA'], ['smithy', 'VA_DATA']]) {
  test(`${app}: tracked unlocks, manual reveals, reset and cross-tab changes`, () => {
    const tracked = { version: 1, defeated: { 'the-elder': true }, visited: ['mountain'], milestones: { forge: true } };
    const values = new Map([['vc.progress', JSON.stringify(tracked)], ['vc.openBiomes', '["plains"]'], ['va.showAll', 'true']]);
    const events = {};
    const context = vm.createContext({ console, localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    }, window: { [dataKey]: { biomes }, addEventListener: (type, cb) => { events[type] = cb; } } });
    vm.runInContext(read('shared/progress/core.js'), context);
    const source = read(`apps/${app}/assets/app.js`);
    const start = source.indexOf('  function getStoredOpenBiomes()');
    const end = source.indexOf('\n  function ', source.indexOf('  function clearStoredOpenBiomes()', start) + 10);
    vm.runInContext(source.slice(start, end), context);
    assert.deepEqual(plain(context.getStoredOpenBiomes()), ['meadows', 'black-forest', 'ocean', 'swamp', 'mountain', 'plains']);
    context.setStoredOpenBiomes([...context.getManualOpenBiomes(), 'mistlands']);
    assert.deepEqual(JSON.parse(values.get('vc.openBiomes')), ['plains', 'mistlands']);
    context.clearStoredOpenBiomes();
    assert.equal(values.get('vc.openBiomes'), undefined);
    assert.equal(values.get('va.showAll'), 'true');
    assert.deepEqual(JSON.parse(values.get('vc.progress')), tracked);
    assert.deepEqual(plain(context.getStoredOpenBiomes()), ['meadows', 'black-forest', 'ocean', 'swamp', 'mountain']);
    let visible;
    context.VCProgress.onChange(() => { visible = plain(context.getStoredOpenBiomes()); });
    values.set('vc.progress', '{"version":1,"visited":["ashlands"]}');
    events.storage({ key: 'vc.progress' });
    assert.deepEqual(visible, ['meadows', 'ashlands']);
    values.delete('vc.progress');
    events.storage({ key: 'vc.progress' });
    assert.deepEqual(visible, ['meadows']);
    assert.match(source, /VCProgress\.onChange\(/);
    const html = read(`apps/${app}/index.html`);
    assert.match(html, /shared\/progress\/core\.js/);
    assert.match(html + source, /\.\.\/progress\//);
  });
}
