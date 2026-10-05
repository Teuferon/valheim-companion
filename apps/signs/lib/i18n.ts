import catalog from './locales/messages.json' with { type: 'json' };

export const languages = [
  { code: 'en', name: 'English' },
  { code: 'cs', name: 'Čeština' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'id', name: 'Bahasa Indonesia' },
] as const;
export type Locale = (typeof languages)[number]['code'];
export type LanguagePreference = Locale | 'auto';
export type Translate = (
  source: string,
  values?: Record<string, string | number>,
) => string;
export const LANGUAGE_STORAGE_KEY = 'runopis.language';
export const messages: Record<
  string,
  Partial<Record<Locale, string>>
> = catalog;

export function matchLocale(value: string): Locale | undefined {
  const base = value.trim().toLowerCase().replaceAll('_', '-').split('-')[0];
  return languages.find((language) => language.code === base)?.code;
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
export function resolveLocale(
  preference: LanguagePreference,
  preferred: readonly string[],
): Locale {
  return preference === 'auto' ? detectLocale(preferred) : preference;
}
export function translate(
  locale: Locale,
  source: string,
  values: Record<string, string | number> = {},
): string {
  const template = messages[source]?.[locale] ?? messages[source]?.en ?? source;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    String(values[key] ?? match),
  );
}
