import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import messages from '@/locales/messages.json';
import { formatters } from '@/lib/format';
import {
  STORAGE_KEY, LEGACY_KEY, getStoredPreference, readPreference,
  resolveLocale, setStoredPreference, translate, languages,
  type LanguagePreference, type Locale, type Translate,
} from '../../../../shared/i18n/core';

export { languages };
const changeEvent = 'calculator:language';
let sessionPreference: LanguagePreference | undefined;

export function languageSnapshot() {
  const preference = sessionPreference ?? getStoredPreference();
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  return `${preference}:${resolveLocale(preference, preferred)}`;
}

export function subscribeLanguage(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === LEGACY_KEY || event.key === null) {
      sessionPreference = undefined;
      notify();
    }
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('languagechange', notify);
  window.addEventListener(changeEvent, notify);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('languagechange', notify);
    window.removeEventListener(changeEvent, notify);
  };
}

export function setLanguagePreference(value: string) {
  const choice = readPreference(value);
  setStoredPreference(choice);
  // Keep the choice usable even when the shared storage helper cannot write.
  sessionPreference = getStoredPreference() === choice ? undefined : choice;
  window.dispatchEvent(new Event(changeEvent));
}

export function useLanguage() {
  const current = useSyncExternalStore(subscribeLanguage, languageSnapshot, () => 'auto:en');
  const [preference, locale] = current.split(':') as [LanguagePreference, Locale];
  const setPreference = useCallback(setLanguagePreference, []);
  const t: Translate = useMemo(() => (source, values) => translate(locale, source, messages, values), [locale]);
  const formats = useMemo(() => formatters(locale), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.title = `${t('Valheim Damage Calculator')} · Valheim Companion`;
  }, [locale, t]);
  return { locale, preference, setPreference, t, ...formats };
}
