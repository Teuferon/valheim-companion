import catalog from './locales/messages.json' with { type: 'json' };
import {
  languages,
  matchLocale,
  detectLocale,
  readPreference,
  resolveLocale,
  translate as coreTranslate,
  tn as coreTn,
  getStoredPreference,
  setStoredPreference,
  STORAGE_KEY,
  LEGACY_KEY,
  type Locale,
  type LanguagePreference,
  type Translate,
  type TranslateNumber,
  type Catalog,
} from '../../../shared/i18n/core.ts';

export {
  languages,
  matchLocale,
  detectLocale,
  readPreference,
  resolveLocale,
  getStoredPreference,
  setStoredPreference,
  STORAGE_KEY,
  LEGACY_KEY,
};
export type { Locale, LanguagePreference, Translate, TranslateNumber };

export const LANGUAGE_STORAGE_KEY = STORAGE_KEY;
export const LEGACY_STORAGE_KEY = LEGACY_KEY;

export const messages: Catalog = catalog;

export function translate(
  locale: Locale,
  source: string,
  values: Record<string, string | number> = {},
): string {
  return coreTranslate(locale, source, messages, values);
}

export function translateNumber(locale: Locale, source: string, count: number, values?: Record<string, string | number>): string {
  return coreTn(messages, source, count, values, locale);
}
