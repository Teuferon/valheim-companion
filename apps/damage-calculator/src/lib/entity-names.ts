import namesJson from '@/data/names.json';
import { entityName, type Locale } from '../../../../shared/i18n/core';

export interface NamedEntity { slug: string; name: string }
const names = namesJson as Record<string, Partial<Record<Locale, string>>>;

export function localizedName(entity: NamedEntity, locale: Locale): string {
  return entityName({ name: entity.name, names: names[entity.slug] }, locale);
}

export function matchesName(entity: NamedEntity, query: string, locale: Locale): boolean {
  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase(locale);
  const needle = normalize(query.trim());
  return [entity.name, localizedName(entity, locale)].some(value => normalize(value).includes(needle));
}
