import type { SignSettings } from './rich-text.ts';

export type SignEditorState = {
  text: string;
  settings: SignSettings;
  raw: string | null;
  mode: 'visual' | 'code';
  compact: boolean;
  limit: '50' | '999';
  advanced: boolean;
  day: boolean;
};

const MAX_TEXT_LENGTH = 10000;
const MAX_PAYLOAD_LENGTH = 200000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inRange(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function readState(value: unknown): SignEditorState | null {
  if (!isRecord(value) || !isRecord(value.settings)) return null;
  const s = value.settings;
  if (
    typeof value.text !== 'string' ||
    value.text.length > MAX_TEXT_LENGTH ||
    !(
      value.raw === null ||
      (typeof value.raw === 'string' && value.raw.length <= MAX_TEXT_LENGTH)
    ) ||
    (value.mode !== 'visual' && value.mode !== 'code') ||
    !(value.mode === 'visual'
      ? value.raw === null
      : value.mode === 'code' && typeof value.raw === 'string') ||
    typeof value.compact !== 'boolean' ||
    typeof value.advanced !== 'boolean' ||
    typeof value.day !== 'boolean' ||
    !['50', '999'].includes(String(value.limit)) ||
    typeof value.limit !== 'string' ||
    typeof s.color !== 'string' ||
    !(s.color === '' || /^#[\da-f]{6}$/i.test(s.color)) ||
    !inRange(s.size, 25, 250) ||
    !inRange(s.offset, -30, 30) ||
    !inRange(s.spacing, -5, 10) ||
    !inRange(s.opacity, 0, 100) ||
    !['left', 'center', 'right'].includes(String(s.align)) ||
    typeof s.align !== 'string' ||
    typeof s.bold !== 'boolean' ||
    typeof s.italic !== 'boolean' ||
    typeof s.underline !== 'boolean' ||
    typeof s.strike !== 'boolean'
  )
    return null;
  // Copy only supported fields from untrusted URLs.
  return {
    text: value.text,
    raw: value.raw,
    mode: value.mode,
    compact: value.compact,
    limit: value.limit as SignEditorState['limit'],
    advanced: value.advanced,
    day: value.day,
    settings: {
      color: s.color,
      size: s.size,
      bold: s.bold,
      italic: s.italic,
      underline: s.underline,
      strike: s.strike,
      align: s.align,
      offset: s.offset,
      spacing: s.spacing,
      opacity: s.opacity,
    },
  };
}

export function encodeSignHash(state: SignEditorState): string {
  const normalized = readState(state);
  if (!normalized) throw new Error('Invalid sign editor state');
  const bytes = new TextEncoder().encode(
    JSON.stringify({ v: 1, ...normalized }),
  );
  const base64 = btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''),
  );
  return (
    '#sign=' + base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  );
}

export function decodeSignHash(hash: string): SignEditorState | null {
  if (!hash.startsWith('#sign=')) return null;
  const encoded = hash.slice(6);
  if (
    !encoded ||
    encoded.length > MAX_PAYLOAD_LENGTH ||
    !/^[\w-]+$/.test(encoded)
  )
    return null;
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const value: unknown = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    );
    if (!isRecord(value) || value.v !== 1) return null;
    return readState(value);
  } catch {
    return null;
  }
}

export function createSignUrl(url: string, state: SignEditorState): string {
  const result = new URL(url);
  result.hash = encodeSignHash(state);
  return result.href;
}
