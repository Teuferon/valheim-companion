// Google Analytics 4 Consent Mode v2 and banner manager for Valheim Companion.
// Classic script without module imports, exposing globalThis.VCConsent.

(function () {
  const STORAGE_KEY = 'vc.consent';

  const MESSAGES = {
    'We use Google Analytics to see which tools help players. Allow analytics?': {
      en: 'We use Google Analytics to see which tools help players. Allow analytics?',
      cs: 'Používáme Google Analytics, abychom věděli, které nástroje hráčům pomáhají. Povolit analytiku?',
      de: 'Wir nutzen Google Analytics, um zu sehen, welche Werkzeuge Spielern helfen. Analytik erlauben?',
      es: 'Usamos Google Analytics para ver qué herramientas ayudan a los jugadores. ¿Permitir análisis?',
      fr: "Nous utilisons Google Analytics pour savoir quels outils aident les joueurs. Autoriser l'analytique ?",
      pt: 'Usamos o Google Analytics para ver quais ferramentas ajudam os jogadores. Permitir métricas?',
      zh: '我们使用 Google Analytics 了解哪些工具对玩家有帮助。是否允许数据分析？',
      hi: 'हम यह जानने के लिए Google Analytics का उपयोग करते हैं कि कौन से उपकरण खिलाड़ियों की मदद करते हैं। क्या विश्लेषण की अनुमति दें?',
      ar: 'نستخدم Google Analytics لمعرفة الأدوات التي تساعد اللاعبين. هل تسمح بالتحليلات؟',
      bn: 'কোন সরঞ্জামগুলি খেলোয়াড়দের সাহায্য করে তা দেখতে আমরা Google Analytics ব্যবহার করি। অ্যানালিটিক্সের অনুমতি দেবেন?',
      ru: 'Мы используем Google Analytics, чтобы видеть, какие инструменты помогают игрокам. Разрешить сбор аналитики?',
      ja: 'プレイヤーの役に立つツールを把握するために Google Analytics を使用しています。アクセス解析を許可しますか？',
      id: 'Kami menggunakan Google Analytics untuk melihat alat mana yang membantu pemain. Izinkan analitik?',
    },
    'Allow': {
      en: 'Allow',
      cs: 'Povolit',
      de: 'Erlauben',
      es: 'Permitir',
      fr: 'Autoriser',
      pt: 'Permitir',
      zh: '允许',
      hi: 'अनुमति दें',
      ar: 'سماح',
      bn: 'অনুমতি দিন',
      ru: 'Разрешить',
      ja: '許可',
      id: 'Izinkan',
    },
    'Decline': {
      en: 'Decline',
      cs: 'Odmítnout',
      de: 'Ablehnen',
      es: 'Rechazar',
      fr: 'Refuser',
      pt: 'Recusar',
      zh: '拒绝',
      hi: 'अस्वीकार करें',
      ar: 'رفض',
      bn: 'প্রত্যাখ্যান করুন',
      ru: 'Отклонить',
      ja: '拒否',
      id: 'Tolak',
    },
    'Privacy': {
      en: 'Privacy',
      cs: 'Soukromí',
      de: 'Datenschutz',
      es: 'Privacidad',
      fr: 'Confidentialité',
      pt: 'Privacidade',
      zh: '隐私政策',
      hi: 'गोपनीयता',
      ar: 'الخصوصية',
      bn: 'গোপনীয়তা',
      ru: 'Конфиденциальность',
      ja: 'プライバシー',
      id: 'Privasi',
    },
    'Cookie settings': {
      en: 'Cookie settings',
      cs: 'Nastavení cookies',
      de: 'Cookie-Einstellungen',
      es: 'Configuración de cookies',
      fr: 'Paramètres des cookies',
      pt: 'Configurações de cookies',
      zh: 'Cookie 设置',
      hi: 'कुकी सेटिंग्स',
      ar: 'إعدادات ملفات تعريف الارتباط',
      bn: 'কুকি সেটিংস',
      ru: 'Настройки cookie',
      ja: 'Cookie設定',
      id: 'Pengaturan cookie',
    },
  };

  const listeners = new Set();
  let bannerEl = null;
  let linksEl = null;
  let vci18nSubscribed = false;

  function translate(key) {
    if (typeof globalThis !== 'undefined' && globalThis.VCI18n && typeof globalThis.VCI18n.t === 'function') {
      return globalThis.VCI18n.t(MESSAGES, key);
    }
    const entry = MESSAGES[key];
    return entry?.en ?? key;
  }

  function get() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && (parsed.analytics === 'granted' || parsed.analytics === 'denied')) {
        return parsed.analytics;
      }
    } catch {
      /* ignore storage parse errors */
    }
    return null;
  }

  function notifyListeners(val) {
    for (const cb of listeners) {
      try {
        cb(val);
      } catch (err) {
        console.error('Error in VCConsent change listener:', err);
      }
    }
  }

  function set(choice) {
    if (choice !== 'granted' && choice !== 'denied') return;

    try {
      if (typeof localStorage !== 'undefined') {
        const record = {
          analytics: choice,
          at: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      }
    } catch (err) {
      console.warn('Failed to save consent preference:', err);
    }

    if (typeof globalThis.gtag === 'function') {
      globalThis.gtag('consent', 'update', {
        analytics_storage: choice,
      });
    }

    closeBanner();
    notifyListeners(choice);
  }

  function reset() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore storage remove errors */
    }
    openBanner();
    notifyListeners(null);
  }

  function onChange(cb) {
    if (typeof cb !== 'function') return () => {};
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function updateTranslations() {
    if (bannerEl) {
      const textEl = bannerEl.querySelector('.vc-consent-text');
      const allowBtn = bannerEl.querySelector('.vc-consent-btn-allow');
      const declineBtn = bannerEl.querySelector('.vc-consent-btn-decline');
      const privLink = bannerEl.querySelector('.vc-consent-privacy');
      if (textEl) textEl.textContent = translate('We use Google Analytics to see which tools help players. Allow analytics?');
      if (allowBtn) allowBtn.textContent = translate('Allow');
      if (declineBtn) declineBtn.textContent = translate('Decline');
      if (privLink) privLink.textContent = translate('Privacy');
    }
    if (linksEl) {
      const settingsBtn = linksEl.querySelector('.vc-consent-link-settings');
      const privLink = linksEl.querySelector('.vc-consent-link-privacy');
      if (settingsBtn) settingsBtn.textContent = translate('Cookie settings');
      if (privLink) privLink.textContent = translate('Privacy');
    }
  }

  function ensureVCI18nSubscription() {
    if (!vci18nSubscribed && typeof globalThis !== 'undefined' && globalThis.VCI18n && typeof globalThis.VCI18n.onChange === 'function') {
      globalThis.VCI18n.onChange(() => {
        updateTranslations();
      });
      vci18nSubscribed = true;
    }
  }

  function injectStylesheet() {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector('link[href*="consent.css"]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/shared/analytics/consent.css';
      const target = document.head || document.documentElement || document.body;
      if (target && target.appendChild) {
        target.appendChild(link);
      }
    }
  }

  function openBanner() {
    if (typeof document === 'undefined' || !document.body) return null;
    ensureVCI18nSubscription();

    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.className = 'vc-consent-banner';
      bannerEl.setAttribute('role', 'dialog');
      bannerEl.setAttribute('aria-live', 'polite');
      bannerEl.setAttribute('aria-label', 'Cookie consent');

      const content = document.createElement('div');
      content.className = 'vc-consent-content';

      const text = document.createElement('p');
      text.className = 'vc-consent-text';
      text.textContent = translate('We use Google Analytics to see which tools help players. Allow analytics?');

      const privLink = document.createElement('a');
      privLink.className = 'vc-consent-privacy';
      privLink.href = '/privacy/';
      privLink.textContent = translate('Privacy');

      content.appendChild(text);
      content.appendChild(privLink);

      const actions = document.createElement('div');
      actions.className = 'vc-consent-actions';

      const allowBtn = document.createElement('button');
      allowBtn.type = 'button';
      allowBtn.className = 'vc-consent-btn vc-consent-btn-allow';
      allowBtn.textContent = translate('Allow');
      allowBtn.addEventListener('click', () => set('granted'));

      const declineBtn = document.createElement('button');
      declineBtn.type = 'button';
      declineBtn.className = 'vc-consent-btn vc-consent-btn-decline';
      declineBtn.textContent = translate('Decline');
      declineBtn.addEventListener('click', () => set('denied'));

      actions.appendChild(allowBtn);
      actions.appendChild(declineBtn);

      bannerEl.appendChild(content);
      bannerEl.appendChild(actions);

      document.body.appendChild(bannerEl);
    }

    bannerEl.removeAttribute('hidden');
    bannerEl.style.display = '';

    const firstBtn = bannerEl.querySelector('.vc-consent-btn-allow');
    if (firstBtn && typeof firstBtn.focus === 'function') {
      try {
        firstBtn.focus();
      } catch {
        /* ignore focus failures */
      }
    }

    return bannerEl;
  }

  function closeBanner() {
    if (bannerEl) {
      bannerEl.setAttribute('hidden', '');
      bannerEl.style.display = 'none';
    }
  }

  function renderConsentLinks() {
    if (typeof document === 'undefined' || !document.body) return null;
    ensureVCI18nSubscription();

    if (!linksEl) {
      linksEl = document.createElement('nav');
      linksEl.className = 'vc-consent-links';
      linksEl.setAttribute('aria-label', 'Consent and privacy');

      const settingsBtn = document.createElement('button');
      settingsBtn.type = 'button';
      settingsBtn.className = 'vc-consent-link-settings';
      settingsBtn.textContent = translate('Cookie settings');
      settingsBtn.addEventListener('click', (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        openBanner();
      });

      const sep = document.createElement('span');
      sep.className = 'vc-consent-sep';
      sep.textContent = '·';
      sep.setAttribute('aria-hidden', 'true');

      const privLink = document.createElement('a');
      privLink.className = 'vc-consent-link-privacy';
      privLink.href = '/privacy/';
      privLink.textContent = translate('Privacy');

      linksEl.appendChild(settingsBtn);
      linksEl.appendChild(sep);
      linksEl.appendChild(privLink);

      document.body.appendChild(linksEl);
    }
    return linksEl;
  }

  // 1. Initialize dataLayer and gtag
  const win = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  win.dataLayer = win.dataLayer || [];
  function gtag() {
    win.dataLayer.push(arguments);
  }
  win.gtag = gtag;
  globalThis.gtag = gtag;

  // 2. Set default consent mode (all denied, wait_for_update 500ms)
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });

  // 3. Update consent if previously granted
  const currentConsent = get();
  if (currentConsent === 'granted') {
    gtag('consent', 'update', {
      analytics_storage: 'granted',
    });
  }

  // 4. Check configuration from DOM and load gtag if production hostname matches
  function getMetaContent(name) {
    if (typeof document === 'undefined' || !document.querySelector) return null;
    const el = document.querySelector(`meta[name="${name}"]`);
    return el && el.getAttribute ? el.getAttribute('content') : null;
  }

  const gaMeasurementId = getMetaContent('vc-ga');
  const siteUrl = getMetaContent('vc-site');
  let siteHostname = '';
  try {
    if (siteUrl) siteHostname = new URL(siteUrl).hostname;
  } catch {
    /* ignore malformed siteUrl */
  }

  const currentHostname = (typeof location !== 'undefined' && location.hostname) ? location.hostname : '';
  const isProduction = Boolean(gaMeasurementId && siteHostname && currentHostname === siteHostname);

  if (isProduction) {
    if (typeof document !== 'undefined') {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
      const target = document.head || document.documentElement || document.body;
      if (target && target.appendChild) {
        target.appendChild(script);
      }
    }
    gtag('js', new Date());
    gtag('config', gaMeasurementId);
  } else {
    console.info(`Google Analytics disabled (hostname: "${currentHostname || 'unknown'}", expected: "${siteHostname || 'none'}")`);
  }

  // 5. Setup DOM components and listeners
  function initDom() {
    injectStylesheet();
    renderConsentLinks();
    if (get() === null) {
      openBanner();
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDom);
    } else {
      initDom();
    }
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) {
        const val = get();
        if (val === 'granted' || val === 'denied') {
          gtag('consent', 'update', {
            analytics_storage: val,
          });
          closeBanner();
        } else {
          openBanner();
        }
        notifyListeners(val);
      } else if (event.key === 'vc.language') {
        updateTranslations();
      }
    });

    window.addEventListener('languagechange', () => {
      updateTranslations();
    });
  }

  const api = {
    get,
    set,
    reset,
    openBanner,
    closeBanner,
    onChange,
    messages: MESSAGES,
  };

  globalThis.VCConsent = api;
})();
