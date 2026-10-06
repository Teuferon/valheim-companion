import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CONSENT_JS_CODE = readFileSync(path.join(REPO_ROOT, 'shared', 'analytics', 'consent.js'), 'utf8');
const MESSAGES_JSON = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'shared', 'analytics', 'messages.json'), 'utf8'),
);
const LANGUAGES = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'shared', 'i18n', 'languages.json'), 'utf8'),
);

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.textContent = '';
    this.children = [];
    this.listeners = new Map();
    this.style = {};
    this.hidden = false;
    this.href = '';
    this.type = '';
    this.src = '';
    this.async = false;
    this.rel = '';
  }

  hasAttribute(name) {
    if (name === 'href') return Boolean(this.href || this.attributes.has(name));
    if (name === 'src') return Boolean(this.src || this.attributes.has(name));
    if (name === 'hidden') return this.hidden || this.attributes.has(name);
    return this.attributes.has(name);
  }

  getAttribute(name) {
    if (name === 'href') return this.href || (this.attributes.has(name) ? this.attributes.get(name) : null);
    if (name === 'src') return this.src || (this.attributes.has(name) ? this.attributes.get(name) : null);
    if (name === 'hidden') return this.hidden ? '' : (this.attributes.has(name) ? this.attributes.get(name) : null);
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'hidden') this.hidden = true;
    if (name === 'href') this.href = String(value);
    if (name === 'src') this.src = String(value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'hidden') this.hidden = false;
    if (name === 'href') this.href = '';
    if (name === 'src') this.src = '';
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
  }

  dispatchEvent(event) {
    const list = this.listeners.get(event.type) || [];
    for (const fn of list) fn(event);
  }

  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length ? list[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];

    const matches = (el) => {
      const s = selector.trim();
      const tagMatch = s.match(/^([a-zA-Z0-9_-]+)/);
      const expectedTag = tagMatch ? tagMatch[1].toUpperCase() : null;
      if (expectedTag && el.tagName !== expectedTag) return false;

      const classMatches = s.matchAll(/\.([a-zA-Z0-9_-]+)/g);
      for (const m of classMatches) {
        const cls = m[1];
        const elCls = (el.getAttribute('class') || el.className || '').split(/\s+/);
        if (!elCls.includes(cls)) return false;
      }

      const attrMatches = s.matchAll(/\[([a-zA-Z0-9_-]+)(?:="?([^"]*)"?)?\]/g);
      for (const m of attrMatches) {
        const [, attrName, attrVal] = m;
        if (attrVal !== undefined) {
          if (el.getAttribute(attrName) !== attrVal) return false;
        } else {
          if (!el.hasAttribute(attrName)) return false;
        }
      }

      return true;
    };

    const traverse = (el) => {
      for (const child of el.children) {
        if (matches(child)) results.push(child);
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  focus() {
    this.isFocused = true;
  }
}

class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

function createSandbox({
  hostname = 'localhost',
  gaId = 'G-CXQVNCCJKE',
  siteUrl = 'https://valheim-companion.teuferon.click',
  initialStorage = {},
} = {}) {
  const localStorage = new MockStorage();
  for (const [k, v] of Object.entries(initialStorage)) {
    localStorage.setItem(k, v);
  }

  const docElement = new MockElement('html');
  const head = new MockElement('head');
  const body = new MockElement('body');
  docElement.appendChild(head);
  docElement.appendChild(body);

  if (gaId) {
    const gaMeta = new MockElement('meta');
    gaMeta.setAttribute('name', 'vc-ga');
    gaMeta.setAttribute('content', gaId);
    head.appendChild(gaMeta);
  }

  if (siteUrl) {
    const siteMeta = new MockElement('meta');
    siteMeta.setAttribute('name', 'vc-site');
    siteMeta.setAttribute('content', siteUrl);
    head.appendChild(siteMeta);
  }

  const windowListeners = new Map();
  const consoleInfos = [];

  const location = {
    hostname,
    href: `http://${hostname}/`,
    protocol: 'http:',
  };

  const document = {
    readyState: 'complete',
    documentElement: docElement,
    head,
    body,
    createElement(tag) {
      return new MockElement(tag);
    },
    querySelector(selector) {
      if (selector === 'html') return docElement;
      if (selector === 'head') return head;
      if (selector === 'body') return body;
      return docElement.querySelector(selector);
    },
    querySelectorAll(selector) {
      return docElement.querySelectorAll(selector);
    },
    addEventListener(event, fn) {
      if (!windowListeners.has(event)) windowListeners.set(event, new Set());
      windowListeners.get(event).add(fn);
    },
  };

  const window = {
    location,
    document,
    localStorage,
    dataLayer: [],
    addEventListener(event, fn) {
      if (!windowListeners.has(event)) windowListeners.set(event, new Set());
      windowListeners.get(event).add(fn);
    },
    removeEventListener(event, fn) {
      if (windowListeners.has(event)) windowListeners.get(event).delete(fn);
    },
    dispatchEvent(event) {
      const list = windowListeners.get(event.type) || [];
      for (const fn of list) fn(event);
    },
  };

  const sandbox = {
    window,
    document,
    location,
    localStorage,
    console: {
      ...console,
      info: (...args) => consoleInfos.push(args.join(' ')),
      warn: () => {},
      error: () => {},
    },
    dataLayer: window.dataLayer,
    setTimeout,
    clearTimeout,
    Date,
    JSON,
    URL,
    Set,
    Boolean,
    String,
    encodeURIComponent,
    consoleInfos,
  };
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(CONSENT_JS_CODE, sandbox);

  return sandbox;
}

test('1. Consent Mode v2: default is denied upon loading', () => {
  const sandbox = createSandbox();
  const defaultConsentCall = sandbox.window.dataLayer.find(
    (args) => args[0] === 'consent' && args[1] === 'default',
  );

  assert.ok(defaultConsentCall, 'gtag consent default was called');
  const details = JSON.parse(JSON.stringify(defaultConsentCall[2]));
  assert.deepEqual(details, {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });
});

test('2. Initial state: get() returns null and banner is opened when no choice exists', () => {
  const sandbox = createSandbox();
  const consent = sandbox.VCConsent;

  assert.equal(consent.get(), null);
  const banner = sandbox.document.querySelector('.vc-consent-banner');
  assert.ok(banner, 'Banner element exists in DOM');
  assert.equal(banner.hidden, false, 'Banner is visible');
});

test('3. Localhost: Google Tag Manager script is NOT loaded and console.info is logged', () => {
  const sandbox = createSandbox({ hostname: 'localhost' });
  const gtmScript = sandbox.document.querySelectorAll('script').find((s) =>
    (s.getAttribute('src') || '').includes('googletagmanager.com'),
  );

  assert.equal(gtmScript, undefined, 'No GTM script on localhost');
  assert.ok(
    sandbox.consoleInfos.some((msg) => msg.includes('Google Analytics disabled')),
    'Logged console.info on localhost',
  );
});

test('4. Production hostname: Google Tag Manager script IS loaded and gtag config called', () => {
  const sandbox = createSandbox({
    hostname: 'valheim-companion.teuferon.click',
  });
  const gtmScript = sandbox.document.querySelectorAll('script').find((s) =>
    (s.getAttribute('src') || '').includes('googletagmanager.com'),
  );

  assert.ok(gtmScript, 'GTM script injected on production domain');
  assert.equal(
    gtmScript.getAttribute('src'),
    'https://www.googletagmanager.com/gtag/js?id=G-CXQVNCCJKE',
  );

  const configCall = sandbox.window.dataLayer.find(
    (args) => args[0] === 'config' && args[1] === 'G-CXQVNCCJKE',
  );
  assert.ok(configCall, 'gtag config called with G-CXQVNCCJKE');
});

test('5. set("granted"): updates gtag consent to granted, writes to localStorage, closes banner', () => {
  const sandbox = createSandbox();
  const consent = sandbox.VCConsent;

  consent.set('granted');

  assert.equal(consent.get(), 'granted');
  const stored = JSON.parse(sandbox.localStorage.getItem('vc.consent'));
  assert.equal(stored.analytics, 'granted');
  assert.ok(stored.at, 'ISO timestamp recorded');

  const updateCall = sandbox.window.dataLayer.find(
    (args) => args[0] === 'consent' && args[1] === 'update' && args[2]?.analytics_storage === 'granted',
  );
  assert.ok(updateCall, 'gtag consent update called with analytics_storage: granted');

  const banner = sandbox.document.querySelector('.vc-consent-banner');
  assert.ok(banner.hidden, 'Banner is hidden after user choice');
});

test('6. set("denied"): updates gtag consent to denied, writes to localStorage, closes banner', () => {
  const sandbox = createSandbox();
  const consent = sandbox.VCConsent;

  consent.set('denied');

  assert.equal(consent.get(), 'denied');
  const stored = JSON.parse(sandbox.localStorage.getItem('vc.consent'));
  assert.equal(stored.analytics, 'denied');

  const updateCall = sandbox.window.dataLayer.find(
    (args) => args[0] === 'consent' && args[1] === 'update' && args[2]?.analytics_storage === 'denied',
  );
  assert.ok(updateCall, 'gtag consent update called with analytics_storage: denied');

  const banner = sandbox.document.querySelector('.vc-consent-banner');
  assert.ok(banner.hidden, 'Banner is hidden after decline');
});

test('7. reset(): clears localStorage and re-opens banner', () => {
  const sandbox = createSandbox({
    initialStorage: {
      'vc.consent': JSON.stringify({ analytics: 'granted', at: new Date().toISOString() }),
    },
  });
  const consent = sandbox.VCConsent;
  assert.equal(consent.get(), 'granted');

  consent.reset();

  assert.equal(sandbox.localStorage.getItem('vc.consent'), null);
  assert.equal(consent.get(), null);

  const banner = sandbox.document.querySelector('.vc-consent-banner');
  assert.ok(banner, 'Banner exists');
  assert.equal(banner.hidden, false, 'Banner reopened');
});

test('8. Invalid value in localStorage: treated as without choice', () => {
  const testCases = [
    'invalid json',
    '{}',
    JSON.stringify({ analytics: 'maybe' }),
    JSON.stringify({ somethingElse: true }),
    '123',
  ];

  for (const raw of testCases) {
    const sandbox = createSandbox({
      initialStorage: { 'vc.consent': raw },
    });
    assert.equal(
      sandbox.VCConsent.get(),
      null,
      `Invalid storage value "${raw}" should return null`,
    );
  }
});

test('9. onChange(): listener receives updates on set() and reset()', () => {
  const sandbox = createSandbox();
  const consent = sandbox.VCConsent;
  const events = [];

  const unsubscribe = consent.onChange((val) => {
    events.push(val);
  });

  consent.set('granted');
  consent.set('denied');
  consent.reset();
  unsubscribe();
  consent.set('granted');

  assert.deepEqual(events, ['granted', 'denied', null]);
});

test('10. Footer links row <nav class="vc-consent-links"> is appended to body', () => {
  const sandbox = createSandbox();
  const linksNav = sandbox.document.querySelector('nav.vc-consent-links');

  assert.ok(linksNav, 'nav.vc-consent-links exists in body');
  const settingsBtn = linksNav.querySelector('.vc-consent-link-settings');
  const privacyLink = linksNav.querySelector('.vc-consent-link-privacy');

  assert.ok(settingsBtn, 'Cookie settings button exists');
  assert.ok(privacyLink, 'Privacy link exists');
  assert.equal(privacyLink.getAttribute('href'), '/privacy/');
});

test('11. 13 languages catalog has 0 missing translations', () => {
  const requiredLocales = LANGUAGES.map((l) => l.code);
  assert.equal(requiredLocales.length, 13);

  const keys = Object.keys(MESSAGES_JSON);
  assert.ok(keys.length >= 5);

  const missing = [];
  for (const key of keys) {
    for (const loc of requiredLocales) {
      if (!MESSAGES_JSON[key]?.[loc]) {
        missing.push({ key, locale: loc });
      }
    }
  }

  assert.deepEqual(missing, [], 'All messages translated across 13 locales with 0 missing');
});
