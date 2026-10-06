import rawLanguages from './languages.json' with { type: 'json' };

export type Locale =
  | 'en'
  | 'cs'
  | 'de'
  | 'es'
  | 'fr'
  | 'pt'
  | 'zh'
  | 'hi'
  | 'ar'
  | 'bn'
  | 'ru'
  | 'ja'
  | 'id';

export interface LanguageInfo {
  code: Locale;
  name: string;
  rtl?: boolean;
}

export const languages = rawLanguages as readonly LanguageInfo[];

export type LanguagePreference = Locale | 'auto';

export type Translate = (
  source: string,
  values?: Record<string, string | number>,
) => string;

export const STORAGE_KEY = 'vc.language';
export const LEGACY_KEY = 'runopis.language';
export const LANGUAGE_STORAGE_KEY = STORAGE_KEY;

export function matchLocale(value: string): Locale | undefined {
  const base = value.trim().toLowerCase().replaceAll('_', '-').split('-')[0];
  return languages.find((language) => language.code === base)?.code as
    | Locale
    | undefined;
}

export function detectLocale(preferred: readonly string[] = []): Locale {
  for (const value of preferred) {
    const locale = matchLocale(value);
    if (locale) return locale;
  }
  return 'en';
}

export function readPreference(value: string | null): LanguagePreference {
  return languages.some((language) => language.code === value)
    ? (value as Locale)
    : 'auto';
}

export function getStoredPreference(): LanguagePreference {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return readPreference(stored);
      }
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy !== null) {
        const choice = readPreference(legacy);
        try {
          localStorage.setItem(STORAGE_KEY, choice);
        } catch {
          /* ignore storage write failures */
        }
        return choice;
      }
    }
  } catch {
    /* ignore storage access failures */
  }
  return 'auto';
}

export function setStoredPreference(preference: LanguagePreference): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch {
    /* ignore storage write failures */
  }
}

export function resolveLocale(
  preference: LanguagePreference,
  preferred: readonly string[],
): Locale {
  return preference === 'auto' ? detectLocale(preferred) : preference;
}

export function translate(
  locale: Locale,
  source: string,
  catalog?: Record<string, Partial<Record<Locale, string>>>,
  values?: Record<string, string | number>,
): string {
  const template =
    catalog?.[source]?.[locale] ?? catalog?.[source]?.en ?? source;
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    values[key] !== undefined ? String(values[key]) : match,
  );
}

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>;
export type Catalog = Record<string, Partial<Record<Locale, string | PluralForms>>>;
export type TranslateNumber = (
  source: string,
  count: number,
  values?: Record<string, string | number>,
) => string;

const pluralRules = new Map<Locale, Intl.PluralRules>();

export function tn(
  catalog: Catalog,
  key: string,
  count: number,
  values: Record<string, string | number> = {},
  locale: Locale = resolveLocale(getStoredPreference(),
    typeof navigator === 'undefined' ? [] : navigator.languages),
): string {
  if (!pluralRules.has(locale)) {
    pluralRules.set(locale, new Intl.PluralRules(locale));
  }
  const entry = catalog[key];
  const category = pluralRules.get(locale)!.select(count);
  const localized = entry?.[locale];
  const english = entry?.en;
  const template = (typeof localized === 'string' ? localized : localized?.[category] ?? localized?.other)
    ?? (typeof english === 'string' ? english : english?.[new Intl.PluralRules('en').select(count)] ?? english?.other)
    ?? key;
  const replacements: Record<string, string | number> = { count, ...values };
  return template.replace(/\{(\w+)\}/g, (match, token: string) =>
    replacements[token] !== undefined ? String(replacements[token]) : match);
}

export function entityName(
  entity:
    | { name: string; names?: Partial<Record<Locale, string>> }
    | null
    | undefined,
  _locale: Locale,
): string {
  if (!entity) return '';
  // Keep the locale argument for compatibility; game names always stay English (VC-29).
  return entity.name;
}
