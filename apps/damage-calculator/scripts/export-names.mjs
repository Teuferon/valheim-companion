/** Copy wiki language-link names from VC-17, keyed by calculator slug.
 * Run from any directory: node apps/damage-calculator/scripts/export-names.mjs
 * No names are translated or inferred; missing language links stay absent.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = new URL('../../../', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

export function buildNames() {
  const creatures = new Map(read('data/creatures.json').map(entity => [entity.id, entity.names ?? {}]));
  const weapons = new Map(read('data/weapons.json').map(entity => [entity.id, entity.names ?? {}]));
  const result = {};
  for (const [files, source] of [[['bosses', 'enemies'], creatures], [['weapons', 'ammo'], weapons]]) {
    for (const file of files) {
      for (const entity of read(`apps/damage-calculator/src/data/${file}.json`)) {
        if (Object.hasOwn(result, entity.slug)) throw new Error(`Duplicate entity slug: ${entity.slug}`);
        result[entity.slug] = Object.fromEntries(Object.entries(source.get(entity.slug) ?? {}).sort(([a], [b]) => a.localeCompare(b, 'en')));
      }
    }
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b, 'en')));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const names = buildNames();
  writeFileSync(new URL('apps/damage-calculator/src/data/names.json', root), `${JSON.stringify(names, null, 2)}\n`);
  console.log(`Exported wiki names for ${Object.keys(names).length} calculator entities`);
}
