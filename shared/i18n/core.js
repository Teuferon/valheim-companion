// Shared i18n core for static sections of Valheim Companion.
// Runs as a classic script without module imports, exposing globalThis.VCI18n.

(function () {
  const STORAGE_KEY = 'vc.language';
  const LEGACY_KEY = 'runopis.language';

  const defaultLanguages = [
    { code: 'en', name: 'English' },
    { code: 'cs', name: 'Čeština' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'pt', name: 'Português' },
    { code: 'zh', name: '中文' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ar', name: 'العربية', rtl: true },
    { code: 'bn', name: 'বাংলা' },
    { code: 'ru', name: 'Русский' },
    { code: 'ja', name: '日本語' },
    { code: 'id', name: 'Bahasa Indonesia' },
  ];

  const languages = (typeof globalThis !== 'undefined' && globalThis.VC_LANGUAGES)
    ? globalThis.VC_LANGUAGES
    : defaultLanguages;

  const listeners = new Set();
  let inMemoryPreference = undefined;

  function isValidCode(code) {
    return languages.some((lang) => lang.code === code);
  }

  function getPreference() {
    if (inMemoryPreference !== undefined) {
      return inMemoryPreference;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          return isValidCode(stored) ? stored : 'auto';
        }
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy !== null) {
          const choice = isValidCode(legacy) ? legacy : 'auto';
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

  function updateDocumentAttributes(loc) {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = loc;
      const isRtl = languages.find((lang) => lang.code === loc)?.rtl === true;
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    }
  }

  function matchLocale(value) {
    if (!value || typeof value !== 'string') return undefined;
    const base = value.trim().toLowerCase().replaceAll('_', '-').split('-')[0];
    return languages.find((lang) => lang.code === base)?.code;
  }

  function detectLocale(preferred) {
    const list = preferred || (typeof navigator !== 'undefined'
      ? (navigator.languages?.length
          ? navigator.languages
          : (navigator.language ? [navigator.language] : []))
      : []);
    for (const val of list) {
      const matched = matchLocale(val);
      if (matched) return matched;
    }
    return 'en';
  }

  function locale() {
    const pref = getPreference();
    if (pref !== 'auto' && isValidCode(pref)) {
      return pref;
    }
    return detectLocale();
  }

  function notify(loc, pref) {
    for (const cb of listeners) {
      try {
        cb(loc, pref);
      } catch (err) {
        console.error('Error in VCI18n change listener:', err);
      }
    }
  }

  function setPreference(v) {
    const choice = isValidCode(v) ? v : 'auto';
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, choice);
        inMemoryPreference = undefined;
      } else {
        inMemoryPreference = choice;
      }
    } catch {
      inMemoryPreference = choice;
    }
    const currentLoc = locale();
    updateDocumentAttributes(currentLoc);
    notify(currentLoc, choice);
  }

  function t(catalog, source, values) {
    let cat = catalog;
    let src = source;
    let vals = values;

    if (typeof cat === 'string') {
      vals = src;
      src = cat;
      cat = (typeof globalThis !== 'undefined' ? globalThis.VC_MESSAGES : null) || {};
    } else if (!cat) {
      cat = (typeof globalThis !== 'undefined' ? globalThis.VC_MESSAGES : null) || {};
    }

    if (!src || typeof src !== 'string') {
      return '';
    }

    const currentLocale = locale();
    const entry = cat[src];
    const template = entry?.[currentLocale] ?? entry?.en ?? src;

    if (!vals || typeof vals !== 'object') {
      return template;
    }

    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return vals[key] !== undefined ? String(vals[key]) : match;
    });
  }

  function name(entity) {
    if (!entity || typeof entity !== 'object') return '';
    const currentLocale = locale();
    return entity.names?.[currentLocale] ?? entity.name ?? '';
  }

  function apply(root) {
    const rootEl = root || (typeof document !== 'undefined' ? document : null);
    if (!rootEl) return;

    const currentLoc = locale();
    updateDocumentAttributes(currentLoc);

    const catalog = (typeof globalThis !== 'undefined' ? globalThis.VC_MESSAGES : null) || {};

    const textElements = [];
    if (rootEl.hasAttribute && rootEl.hasAttribute('data-i18n')) {
      textElements.push(rootEl);
    }
    if (rootEl.querySelectorAll) {
      textElements.push(...rootEl.querySelectorAll('[data-i18n]'));
    }

    for (const el of textElements) {
      let key = el.getAttribute('data-i18n');
      if (!key) {
        key = el.textContent ? el.textContent.trim() : '';
        el.setAttribute('data-i18n', key);
      }
      if (key) {
        const translated = t(catalog, key);
        el.textContent = translated;
        if (el.tagName === 'TITLE' && typeof document !== 'undefined') {
          document.title = translated;
        }
      }
    }

    const attrElements = [];
    if (rootEl.hasAttribute && rootEl.hasAttribute('data-i18n-attr')) {
      attrElements.push(rootEl);
    }
    if (rootEl.querySelectorAll) {
      attrElements.push(...rootEl.querySelectorAll('[data-i18n-attr]'));
    }

    for (const el of attrElements) {
      const spec = el.getAttribute('data-i18n-attr');
      if (!spec) continue;
      const parts = spec.split(';');
      for (const part of parts) {
        const colonIdx = part.indexOf(':');
        if (colonIdx === -1) continue;
        const attrName = part.slice(0, colonIdx).trim();
        const key = part.slice(colonIdx + 1).trim();
        if (attrName && key) {
          el.setAttribute(attrName, t(catalog, key));
        }
      }
    }
  }

  function onChange(cb) {
    if (typeof cb !== 'function') return () => {};
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY || event.key === LEGACY_KEY || event.key === null) {
        const curLoc = locale();
        const curPref = getPreference();
        updateDocumentAttributes(curLoc);
        notify(curLoc, curPref);
      }
    });

    window.addEventListener('languagechange', () => {
      if (getPreference() === 'auto') {
        const curLoc = locale();
        updateDocumentAttributes(curLoc);
        notify(curLoc, 'auto');
      }
    });
  }

  function mountPicker(container) {
    const parent = typeof container === 'string'
      ? (typeof document !== 'undefined' ? document.querySelector(container) : null)
      : container;
    if (!parent || typeof document === 'undefined') return null;

    const select = document.createElement('select');
    select.className = 'vc-language-picker';
    select.setAttribute('aria-label', 'Language');

    const autoOption = document.createElement('option');
    autoOption.value = 'auto';
    autoOption.textContent = 'Auto (browser)';
    select.appendChild(autoOption);

    for (const lang of languages) {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = lang.name;
      select.appendChild(opt);
    }

    select.value = getPreference();

    select.addEventListener('change', (e) => {
      setPreference(e.target.value);
    });

    onChange((_loc, pref) => {
      if (select.value !== pref) {
        select.value = pref;
      }
    });

    parent.appendChild(select);
    return select;
  }

  const api = {
    languages,
    STORAGE_KEY,
    LEGACY_KEY,
    getPreference,
    setPreference,
    locale,
    t,
    name,
    apply,
    onChange,
    mountPicker,
    matchLocale,
    detectLocale,
  };

  globalThis.VCI18n = api;
})();
