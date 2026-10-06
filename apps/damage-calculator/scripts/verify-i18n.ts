import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import ts from 'typescript';
import { languages, translate } from '../../../shared/i18n/core';
import { formatters } from '../src/lib/format';
import { languageSnapshot, setLanguagePreference, subscribeLanguage } from '../src/hooks/use-language';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const catalog = JSON.parse(readFileSync(join(root, 'locales/messages.json'), 'utf8')) as Record<string, Record<string, string>>;
const keys = new Set<string>();
const dictionaries = new Set(['TITLE', 'SUMMARY', 'SKILL_MODE_LABEL', 'SORT_LABELS', 'KIND_LABEL', 'KIND_FILTERS', 'GROUP_FILTERS', 'WEAPON_CLASS_LABELS', 'CONFIDENCE_LABEL', 'DAMAGE_LABEL', 'RESISTANCE_LABEL', 'GROUP_LABELS', 'GUIDE_NOTES', 'BIOMES']);
const brands = new Set(['← Valheim Companion', 'Valheim Companion', 'Valheim Wiki', 'valheim.weirdgloop.org', 'valheim.gaming.tools', 'MaxDPS', 'npm run scrape']);
function literal(node: ts.Node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (/[A-Za-z]/.test(node.text)) keys.add(node.text);
  } else if (ts.isConditionalExpression(node)) {
    literal(node.whenTrue);
    literal(node.whenFalse);
  }
}
function scan(file: string) {
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function dictionary(node: ts.Node) {
    if (ts.isPropertyAssignment(node) && !['id', 'boss', 'value'].includes(node.name.getText(ast))) literal(node.initializer);
    if (ts.isArrayLiteralExpression(node)) node.elements.forEach(literal);
    ts.forEachChild(node, dictionary);
  }
  function walk(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 't' && node.arguments[0]) literal(node.arguments[0]);
    if (ts.isVariableDeclaration(node) && dictionaries.has(node.name.getText(ast)) && node.initializer) {
      literal(node.initializer);
      dictionary(node.initializer);
    }
    if (file.endsWith('attack-profiles.ts') && ts.isPropertyAssignment(node) && node.name.getText(ast) === 'note') literal(node.initializer);
    if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      assert.ok(!/[A-Za-z]/.test(text) || brands.has(text), `Untranslated JSX in ${file}: ${text}`);
    }
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && ['label', 'placeholder', 'title', 'aria-label', 'ariaLabel', 'alt'].includes(node.name.getText(ast))) {
      assert.fail(`Untranslated attribute in ${file}: ${node.initializer.text}`);
    }
    ts.forEachChild(node, walk);
  }
  walk(ast);
}
function scanDirectory(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== 'locales') scanDirectory(join(dir, entry.name));
    else if (/\.tsx?$/.test(entry.name)) scan(join(dir, entry.name));
  }
}
scanDirectory(root);
for (const key of keys) assert.ok(catalog[key], `Missing UI message: ${key}`);
const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
for (const language of languages) {
  const missing = Object.keys(catalog).filter(key => !catalog[key][language.code]?.trim());
  console.log(`i18n ${language.code}: ${missing.length} missing translations`);
  assert.deepEqual(missing, []);
  for (const [key, translations] of Object.entries(catalog)) {
    assert.deepEqual(placeholders(translations[language.code]), placeholders(key), `${language.code}: ${key}`);
  }
}
assert.equal(translate('cs', 'Showing {count}', {}, { count: '12' }), 'Showing 12');
assert.equal(formatters('en').formatCount(12345), new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(12345));
assert.equal(formatters('de').formatDamage(12.5), '12,5');
assert.equal(formatters('ar').number(12.5), new Intl.NumberFormat('ar', { maximumFractionDigits: 3 }).format(12.5));
assert.equal(formatters('ja').formatDamage(Infinity), '—');
assert.equal(formatters('cs').formatSeconds(Infinity), '—');
assert.equal(formatters('en').formatSeconds(119.9), '2 min 0 sec');

// Exercise the actual external store, including privacy mode and other tabs.
const descriptors = Object.fromEntries(['window', 'navigator', 'localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const fakeWindow = new EventTarget();
const stored = new Map<string, string>([['runopis.language', 'cs']]);
let blocked = false;
const storage = {
  getItem(key: string) { if (blocked) throw new Error('Storage blocked'); return stored.get(key) ?? null; },
  setItem(key: string, value: string) { if (blocked) throw new Error('Storage blocked'); stored.set(key, value); },
};
try {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: ['fr-CA', 'en'], language: 'fr-CA' } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  assert.equal(languageSnapshot(), 'cs:cs');
  assert.equal(stored.get('vc.language'), 'cs');
  let notifications = 0;
  const unsubscribe = subscribeLanguage(() => notifications++);
  setLanguagePreference('ar');
  assert.equal(languageSnapshot(), 'ar:ar');
  assert.equal(notifications, 1);
  setLanguagePreference('auto');
  assert.equal(languageSnapshot(), 'auto:fr');
  blocked = true;
  setLanguagePreference('ja');
  assert.equal(languageSnapshot(), 'ja:ja');
  blocked = false;
  stored.set('vc.language', 'de');
  const event = new Event('storage');
  Object.defineProperty(event, 'key', { value: 'vc.language' });
  fakeWindow.dispatchEvent(event);
  assert.equal(languageSnapshot(), 'de:de');
  fakeWindow.dispatchEvent(new Event('languagechange'));
  assert.equal(notifications, 5);
  unsubscribe();
  fakeWindow.dispatchEvent(event);
  assert.equal(notifications, 5);
} finally {
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
}
console.log(`i18n: ${Object.keys(catalog).length} messages; coverage, placeholders, formatting and language store verified`);
