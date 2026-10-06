import catalog from './locales/messages.json' with { type: 'json' };
import {
  languages,
  matchLocale,
  detectLocale,
  readPreference,
  resolveLocale,
  translate as coreTranslate,
  getStoredPreference,
  setStoredPreference,
  STORAGE_KEY,
  LEGACY_KEY,
  type Locale,
  type LanguagePreference,
  type Translate,
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
export type { Locale, LanguagePreference, Translate };

export const LANGUAGE_STORAGE_KEY = STORAGE_KEY;
export const LEGACY_STORAGE_KEY = LEGACY_KEY;

export const messages: Record<
  string,
  Partial<Record<Locale, string>>
> = catalog;

export function translate(
  locale: Locale,
  source: string,
  values: Record<string, string | number> = {},
): string {
  return coreTranslate(locale, source, messages, values);
}
