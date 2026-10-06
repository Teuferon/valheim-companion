import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  detectLocale,
  readPreference,
  resolveLocale,
  translate,
  translateNumber,
  languages,
  messages,
} from '../lib/i18n.ts';
import { parseRichText, tagGroups } from '../lib/rich-text.ts';

void test('browser preferences match region variants in order and fall back to English', () => {
  assert.equal(detectLocale(['pl-PL', 'de-AT', 'en-US']), 'de');
  assert.equal(detectLocale(['pt-BR']), 'pt');
  assert.equal(detectLocale(['zh-Hant-TW']), 'zh');
  assert.equal(detectLocale(['CS_cz']), 'cs');
  assert.equal(detectLocale(['ar-EG', 'en']), 'ar');
  assert.equal(detectLocale(['xx', 'pl-PL']), 'en');
  assert.equal(detectLocale(), 'en');
  assert.equal(detectLocale(['']), 'en');
});
void test('saved selection wins and invalid storage returns to automatic detection', () => {
  assert.equal(resolveLocale(readPreference('ja'), ['de-DE']), 'ja');
  assert.equal(resolveLocale(readPreference('auto'), ['de-DE']), 'de');
  assert.equal(resolveLocale(readPreference('invalid'), ['es-MX']), 'es');
  assert.equal(resolveLocale(readPreference(null), []), 'en');
});
void test('all languages have complete messages with matching interpolation fields', () => {
  for (const [key, entry] of Object.entries(messages)) {
    const fields = [...key.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    for (const { code } of languages) {
      const value = entry[code];
      assert.ok(value, `${code}: ${key}`);
      for (const text of typeof value === 'string' ? [value] : Object.values(value)) {
        assert.ok(text?.trim(), `${code}: ${key}`);
        assert.deepEqual([...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort(), fields, `${code}: ${key}`);
      }
    }
  }
});
void test('editor messages, templates and guide labels are included in the catalog', () => {
  const page = readFileSync(
    new URL('../app/page.tsx', import.meta.url),
    'utf8',
  );
  const gallery = readFileSync(
    new URL('../components/template-gallery.tsx', import.meta.url),
    'utf8',
  );
  const share = readFileSync(
    new URL('../components/share-sign.tsx', import.meta.url),
    'utf8',
  );
  const keys = [...(page + gallery + share).matchAll(/\btn?\(\s*'([^']+)'/g)].map(
    (match) => match[1],
  );
  for (const group of tagGroups)
    keys.push(group.name, group.note, ...group.tags.map((tag) => tag[1]));
  for (const key of keys)
    assert.ok(messages[key]?.en, `Missing catalog key: ${key}`);
});
void test('warning translation preserves authored text and styles', () => {
  const source = '<color=red>MY SIGN\\n♥</color><font=Missing>';
  const english = parseRichText(source, (key, values) =>
    translate('en', key, values),
  );
  const german = parseRichText(source, (key, values) =>
    translate('de', key, values),
  );
  assert.deepEqual(english.runs, german.runs);
  assert.match(english.warnings[0], /Tag <font>/);
  assert.match(german.warnings[0], /Tag <font>/);
  assert.notEqual(english.warnings[0], german.warnings[0]);
  assert.equal(
    translate('en', 'Vložit {value}', { value: '<br>' }),
    'Insert <br>',
  );
});

void test('counted editor and gallery messages render in all 13 languages at plural boundaries', () => {
  for (const { code } of languages) {
    for (const count of [0, 1, 2, 5, 21]) {
      for (const [key, entry] of Object.entries(messages)) {
        if (typeof entry.en === 'string') continue;
        const result = translateNumber(code, key, count, { limit: 50 });
        assert.ok(result.length > 0, `${code}/${count}: ${key}`);
        assert.notEqual(result, key);
        assert.doesNotMatch(result, /undefined|\[object Object\]|\{\w+\}/);
      }
    }
  }
  assert.equal(translateNumber('en', '{count}/50 characters', 1), '1/50 character');
  assert.equal(translateNumber('cs', '{count} UTF-8 bytes', 1), '1 UTF-8 bajt');
  assert.equal(translateNumber('cs', '{count} UTF-8 bytes', 2), '2 UTF-8 bajty');
  assert.equal(translateNumber('cs', '{count} UTF-8 bytes', 5), '5 UTF-8 bajtů');
});
