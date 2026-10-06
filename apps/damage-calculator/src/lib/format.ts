import type { Locale } from '../../../../shared/i18n/core';

export function formatters(locale: Locale) {
  const number = (value: number, digits?: number) => Number.isFinite(value)
    ? new Intl.NumberFormat(locale, digits === undefined ? { maximumFractionDigits: 3 } : {
      minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(value) : '—';
  const formatCount = (value: number) => number(value, 0);
  const formatDamage = (value: number) => number(value, value >= 100 ? 0 : 1);
  const unit = (value: number, name: 'hour' | 'minute' | 'second', digits: number) =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'short',
      minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  const formatSeconds = (value: number) => {
    if (!Number.isFinite(value)) return '—';
    if (value >= 3600) return unit(value / 3600, 'hour', 1);
    if (value >= 60) {
      const rounded = Math.round(value);
      return `${unit(Math.floor(rounded / 60), 'minute', 0)} ${unit(rounded % 60, 'second', 0)}`;
    }
    return unit(value, 'second', 1);
  };
  return { number, formatCount, formatDamage, formatSeconds };
}
