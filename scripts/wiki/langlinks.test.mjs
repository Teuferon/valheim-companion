import test from 'node:test';
import assert from 'node:assert/strict';
import { MwApi, cleanLocalizedName } from './api.mjs';

test('language links batch, continue, resolve aliases and prefer supported variants', async () => {
  const api = new MwApi();
  const calls = [];
  api.request = async params => {
    calls.push(params);
    if (params.llcontinue) return { query: { pages: [{ title: 'Canonical', langlinks: [{ lang: 'zh-cn', title: '简体' }, { lang: 'pt-br', title: 'Brasil' }] }] } };
    if (calls.length === 3) return { query: { pages: [] } };
    return { continue: { llcontinue: 'next', continue: '||' }, query: {
      normalized: [{ from: 'alias', to: 'Alias' }], redirects: [{ from: 'Alias', to: 'Canonical' }],
      pages: [{ title: 'Canonical', langlinks: [
        { lang: 'cs', title: 'Jméno (tvor)' }, { lang: 'zh-tw', title: '繁體' },
        { lang: 'zh', title: '中文' }, { lang: 'pt', title: 'Portugal' }, { lang: 'pl', title: 'Ignored' },
      ] }],
    } };
  };
  const names = await api.getLangLinks(['alias', ...Array.from({ length: 50 }, (_, i) => `Page ${i}`)]);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].titles.split('|').length, 50);
  assert.equal(calls[2].titles, 'Page 49');
  assert.equal(calls[0].lllimit, 'max');
  assert.deepEqual(names.alias, { cs: 'Jméno', zh: '简体', pt: 'Brasil' });
  assert.deepEqual(names['Page 49'], {});
});

test('localized names remove page disambiguation but preserve qualified game names', () => {
  assert.equal(cleanLocalizedName('Kostlivec (tvor)', 'Skeleton'), 'Kostlivec');
  assert.equal(cleanLocalizedName('Šedotrpaslík (Hluboký sever)', 'Greydwarf (Deep North)'), 'Šedotrpaslík (Hluboký sever)');
});
