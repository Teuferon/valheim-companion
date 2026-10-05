'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  LANGUAGE_STORAGE_KEY,
  readPreference,
  resolveLocale,
  translate,
  type LanguagePreference,
  type Locale,
  type Translate,
} from '@/lib/i18n';

const changeEvent = 'runopis:language';
let sessionPreference: LanguagePreference | undefined;
function browserLanguages(): readonly string[] {
  return navigator.languages?.length
    ? navigator.languages
    : navigator.language
      ? [navigator.language]
      : [];
}
function snapshot() {
  let preference = sessionPreference ?? 'auto';
  try {
    if (sessionPreference === undefined)
      preference = readPreference(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    /* Use session choice if browser privacy settings block storage. */
  }
  return `${preference}:${resolveLocale(preference, browserLanguages())}`;
}
function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) notify();
  };
  window.addEventListener('languagechange', notify);
  window.addEventListener(changeEvent, notify);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('languagechange', notify);
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener('storage', onStorage);
  };
}
export function useLanguage() {
  // Stable server snapshot prevents hydration mismatches; browser state is an external store.
  const current = useSyncExternalStore(subscribe, snapshot, () => 'auto:en');
  const [preference, locale] = current.split(':') as [
    LanguagePreference,
    Locale,
  ];
  const setPreference = useCallback((value: string) => {
    const choice = readPreference(value);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, choice);
      sessionPreference = undefined;
    } catch {
      sessionPreference = choice;
    }
    window.dispatchEvent(new Event(changeEvent));
  }, []);
  const t: Translate = useMemo(
    () => (source, values) => translate(locale, source, values),
    [locale],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.title = `${t('Runopis – editor cedulí')} · Valheim`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        t(
          'Rich text pro Valheim. Základní značky i úplný přehled možností TextMesh Pro.',
        ),
      );
  }, [locale, t]);
  return { locale, preference, setPreference, t };
}
