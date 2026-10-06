import test from 'node:test';
import assert from 'node:assert/strict';
import {
  signTemplates,
  templateCategories,
  templateText,
} from '../lib/templates.ts';
import {
  countText,
  compileSign,
  defaults,
  parseRichText,
} from '../lib/rich-text.ts';
import { languages, messages, translate } from '../lib/i18n.ts';

void test('every localized template fits Vanilla including rich-text tags and UTF-8 bytes', () => {
  assert.equal(
    new Set(signTemplates.map((template) => template.id)).size,
    signTemplates.length,
  );
  assert.ok(signTemplates.length >= 20);
  for (const category of templateCategories) {
    assert.ok(signTemplates.some((template) => template.category === category));
  }
  for (const template of signTemplates) {
    for (const { code: locale } of languages) {
      const t = (key: string) => translate(locale, key);
      const source = templateText(template, t);
      for (const compact of [true, false]) {
        const compiled = compileSign(source, defaults, compact);
        const count = countText(compiled);
        assert.ok(
          count.units <= 50,
          `${template.id}/${locale}: ${count.units} units`,
        );
        assert.ok(
          count.bytes <= 50,
          `${template.id}/${locale}: ${count.bytes} bytes`,
        );
        const preview = parseRichText(compiled);
        assert.equal(preview.warnings.length, 0, `${template.id}/${locale}`);
        assert.ok(preview.runs.some((run) => run.text.trim()));
      }
      if (!template.translateText) {
        assert.equal(
          source,
          templateText(template, (key) => translate('en', key)),
        );
      }
    }
  }
});

void test('template names, categories and free text are translated in all 13 languages', () => {
  const keys = [
    ...templateCategories,
    ...signTemplates.flatMap((template) => [
      template.name,
      ...(template.translateText ? [template.text] : []),
    ]),
  ];
  for (const key of keys) {
    for (const { code } of languages)
      assert.ok(typeof messages[key]?.[code] === 'string' && String(messages[key][code]).trim(), `${key}/${code}`);
  }
});
