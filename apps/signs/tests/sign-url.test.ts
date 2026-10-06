import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, compileSign } from '../lib/rich-text.ts';
import {
  createSignUrl,
  decodeSignHash,
  encodeSignHash,
  type SignEditorState,
} from '../lib/sign-url.ts';

const visual: SignEditorState = {
  text: '<b>Welcome</b> 🌲\nVítej · مرحباً · 家',
  settings: {
    ...defaults,
    color: '#90C9E3',
    size: 175,
    bold: true,
    italic: true,
    underline: true,
    strike: true,
    align: 'right',
    offset: -12,
    spacing: 3,
    opacity: 64,
  },
  raw: null,
  mode: 'visual',
  compact: false,
  limit: '999',
  advanced: true,
  day: true,
};

void test('versioned base64url links round-trip all visual settings and Unicode', () => {
  const hash = encodeSignHash(visual);
  assert.match(hash, /^#sign=[A-Za-z0-9_-]+$/);
  const restored = decodeSignHash(hash);
  assert.deepEqual(restored, visual);
  assert.equal(
    compileSign(restored!.text, restored!.settings, restored!.compact),
    compileSign(visual.text, visual.settings, visual.compact),
  );
  const payload = JSON.parse(
    atob(hash.slice(6).replace(/-/g, '+').replace(/_/g, '/')),
  );
  assert.equal(payload.v, 1);
});

void test('raw code and inactive visual text survive sharing without being compiled again', () => {
  const state: SignEditorState = {
    ...visual,
    mode: 'code',
    raw: '<#FFF><size=125%>Iron\n→',
    compact: true,
    limit: '50',
    day: false,
  };
  assert.deepEqual(decodeSignHash(encodeSignHash(state)), state);
});

void test('URLs preserve origin, deployment path and query while replacing an old fragment', () => {
  const url = new URL(
    createSignUrl('https://example.com/signs/?lang=cs#old', visual),
  );
  assert.equal(url.origin, 'https://example.com');
  assert.equal(url.pathname, '/signs/');
  assert.equal(url.search, '?lang=cs');
  assert.deepEqual(decodeSignHash(url.hash), visual);
});

void test('empty signs and maximum Unicode input round-trip', () => {
  for (const text of ['', '家'.repeat(10000), '🌲'.repeat(5000)]) {
    const state = { ...visual, text };
    assert.deepEqual(decodeSignHash(encodeSignHash(state)), state);
  }
});

function untrustedHash(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return (
    '#sign=' +
    btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  );
}

void test('invalid, oversized and unsupported payloads are rejected without throwing', () => {
  for (const hash of [
    '',
    '#other=abc',
    '#sign=',
    '#sign=%%%',
    '#sign=a',
    '#sign=abcd=',
    '#sign=' + 'A'.repeat(200001),
    '#sign=_w',
    '#sign=e30',
  ]) {
    assert.equal(decodeSignHash(hash), null, hash.slice(0, 40));
  }
  const valid = { v: 1, ...visual };
  for (const value of [
    null,
    [],
    { ...valid, v: 2 },
    { ...valid, settings: null },
    { ...valid, text: 'x'.repeat(10001) },
    { ...valid, raw: 'x' },
    { ...valid, mode: 'code', raw: null },
    { ...valid, mode: 'unknown' },
    { ...valid, limit: '100' },
    { ...valid, compact: 'false' },
    { ...valid, settings: { ...visual.settings, color: 'url(evil)' } },
    { ...valid, settings: { ...visual.settings, size: 251 } },
    { ...valid, settings: { ...visual.settings, opacity: -1 } },
    { ...valid, settings: { ...visual.settings, offset: 1.5 } },
    { ...valid, settings: { ...visual.settings, align: 'justify' } },
    { ...valid, settings: { ...visual.settings, bold: 1 } },
  ])
    assert.equal(decodeSignHash(untrustedHash(value)), null);
  assert.throws(() => encodeSignHash({ ...visual, text: 'x'.repeat(10001) }));
});

void test('unknown properties are discarded and all boundary settings remain valid', () => {
  for (const settings of [
    {
      ...defaults,
      size: 25,
      offset: -30,
      spacing: -5,
      opacity: 0,
      align: 'left',
    },
    {
      ...defaults,
      size: 250,
      offset: 30,
      spacing: 10,
      opacity: 100,
      align: 'center',
    },
  ]) {
    const state = { ...visual, settings };
    assert.deepEqual(
      decodeSignHash(
        untrustedHash({
          v: 1,
          ...state,
          extra: 'ignored',
          settings: { ...settings, extra: 'ignored' },
        }),
      ),
      state,
    );
  }
});
