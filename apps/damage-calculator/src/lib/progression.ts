/**
 * Progression gating.
 *
 * The app's third dimension, next to target and weapon: *how far into the game
 * you are*. Everything here is a pure function of the selected biome and the
 * committed data, so the slider cannot disagree with the ranking table.
 *
 * Two separate questions are answered here:
 *
 *  1. Is an item *available*? — its crafting recipe's station and materials
 *     must all be reachable. That tier is derived at scrape time and committed
 *     as `biome` on each item (see scripts/scrape.ts).
 *  2. Is an *upgrade level* available? — the same test, but for the materials
 *     of that level's upgrade recipe. Levels are cumulative: you cannot build a
 *     Q3 without being able to build a Q2.
 */

import { BIOMES, BIOME_ORDER, isReached, type BiomeId } from "@/data/biomes";
import { MATERIAL_BIOME, normalizeName } from "@/data/materials";
import { MAX_QUALITY } from "./damage";
import type { Ammo, RecipeBook, Weapon } from "./types";

export const DEFAULT_BIOME: BiomeId = "meadows";

/** localStorage key for the persisted slider position. */
export const BIOME_STORAGE_KEY = "valheim-boss-damage:biome";

export const isKnownBiome = (value: string | null): value is BiomeId =>
  value !== null && BIOMES.some((biome) => biome.id === value);

/** Everything whose biome is at or before `step` on the ladder.
 *
 * Creatures carry their own `biome` (the wiki's creature tables group them by
 * biome directly); items carry the crafting tier derived at scrape time. Both
 * use the same ladder comparison, so the slider cannot disagree with either. */
export function visibleAtBiome<T extends { biome: BiomeId }>(
  all: T[],
  step: BiomeId,
): T[] {
  return all.filter((entry) => isReached(entry.biome, step));
}

/** Highest upgrade level of an item reachable at `step`.
 *
 *  `itemBiome` resolves materials that are themselves craftable items (the
 *  Ashlands and Deep North chains forge one weapon into another), so a level
 *  whose upgrade needs a later weapon is treated as out of reach. An unknown
 *  material is treated as out of reach rather than assumed available. */
export function maxQualityAt(
  recipe: RecipeBook[string] | undefined,
  step: BiomeId,
  itemBiome: (name: string) => BiomeId | null = () => null,
): number {
  if (!recipe) return MAX_QUALITY;
  let best = 1;
  for (let level = 2; level <= MAX_QUALITY; level++) {
    const materials = recipe.qualities[level - 1] ?? [];
    /* A level with no documented materials (consumables, or weapons the wiki
     * lists without an upgrade table) blocks nothing: only materials that are
     * actually listed can put a level out of reach. */
    if (materials.length === 0) {
      best = level;
      continue;
    }
    const reachable = materials.every((material) => {
      const key = normalizeName(material.name);
      const biome = MATERIAL_BIOME[key] ?? itemBiome(key);
      return biome ? isReached(biome, step) : false;
    });
    if (!reachable) break;
    best = level;
  }
  return best;
}

/** Lookup for materials that are actually items, keyed by normalised name. */
export function itemBiomeLookup(
  items: (Weapon | Ammo)[],
): (name: string) => BiomeId | null {
  const byName = new Map(
    items.map((item) => [normalizeName(item.name), item.biome] as const),
  );
  return (name) => byName.get(name) ?? null;
}

/** Ladder position of a biome, for the slider. */
export const biomeIndex = (biome: BiomeId): number => BIOME_ORDER[biome];
