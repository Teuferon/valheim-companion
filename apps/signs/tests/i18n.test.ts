import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  detectLocale,
  readPreference,
  resolveLocale,
  translate,
  languages,
  messages,
} from '../lib/i18n.ts';
import { parseRichText, templates, tagGroups } from '../lib/rich-text.ts';

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
    const fields = [...entry.en!.matchAll(/\{(\w+)\}/g)]
      .map((match) => match[1])
      .sort();
    for (const { code } of languages) {
      assert.ok(entry[code]?.trim(), `${code}: ${key}`);
      assert.deepEqual(
        [...entry[code]!.matchAll(/\{(\w+)\}/g)]
          .map((match) => match[1])
          .sort(),
        fields,
        `${code}: ${key}`,
      );
    }
  }
});
void test('editor messages, templates and guide labels are included in the catalog', () => {
  const page = readFileSync(
    new URL('../app/page.tsx', import.meta.url),
    'utf8',
  );
  const keys = [...page.matchAll(/\bt\(\s*'([^']+)'/g)].map(
    (match) => match[1],
  );
  for (const template of templates)
    keys.push(template.name, template.text, template.eyebrow);
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
