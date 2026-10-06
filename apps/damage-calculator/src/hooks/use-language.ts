import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  STORAGE_KEY, LEGACY_KEY, getStoredPreference, readPreference,
  resolveLocale, setStoredPreference, translate, languages,
  type LanguagePreference, type Locale, type Translate,
} from '../../../../shared/i18n/core';

export { languages };
const changeEvent = 'calculator:language';
let sessionPreference: LanguagePreference | undefined;

function snapshot() {
  const preference = sessionPreference ?? getStoredPreference();
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  return `${preference}:${resolveLocale(preference, preferred)}`;
}

function subscribe(notify: () => void) {
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

export function useLanguage() {
  const current = useSyncExternalStore(subscribe, snapshot, () => 'auto:en');
  const [preference, locale] = current.split(':') as [LanguagePreference, Locale];
  const setPreference = useCallback((value: string) => {
    const choice = readPreference(value);
    setStoredPreference(choice);
    // Keep the choice usable even when the shared storage helper cannot write.
    sessionPreference = getStoredPreference() === choice ? undefined : choice;
    window.dispatchEvent(new Event(changeEvent));
  }, []);
  const t: Translate = useMemo(() => (source, values) => translate(locale, source, undefined, values), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);
  return { locale, preference, setPreference, t };
}
