import { entityName, type Locale } from '../../../../shared/i18n/core';

export interface NamedEntity { slug?: string; name: string }

// Retain the existing API; game names are English even when the UI is translated (VC-29).
export function localizedName(entity: NamedEntity, locale: Locale): string {
  return entityName(entity, locale);
}

export function matchesName(entity: NamedEntity, query: string, _locale?: Locale): boolean {
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  return normalize(entity.name).includes(normalize(query.trim()));
}
