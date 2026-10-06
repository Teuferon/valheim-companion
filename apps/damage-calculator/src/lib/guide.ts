/**
 * The per-biome progression guide.
 *
 * For the slider's current step this answers three questions from the committed
 * data rather than from hand-written lists:
 *
 *   1. What is the gate? — the biome's Forsaken, or for a biome with none
 *      (Ocean) the toughest creature that step itself introduces.
 *   2. What should I craft? — the best item first craftable at this step in
 *      each weapon group, scored against the gate with resistances applied.
 *   3. How far can it be upgraded? — maxQualityAt() over the same recipe data
 *      the calculator uses, plus the material holding the next level back.
 *
 * The skill level and roll mode come from the caller — the page's own weapon
 * skill controls — so the guide's per-hit and kill-time numbers agree with the
 * calculator instead of assuming a fixed character.
 *
 * Spoiler discipline: every function here reads one step and only the items
 * reachable at it, so the panel cannot reveal a biome the slider has not
 * reached yet.
 */

import { BIOMES, isReached, type Biome, type BiomeId } from "@/data/biomes";
import { MATERIAL_BIOME, normalizeName } from "@/data/materials";
import {
  MAX_QUALITY,
  calculate,
  type CalculationResult,
  type SkillMode,
} from "@/lib/damage";
import { ammoItems, bosses, enemies, recipes, weapons } from "@/lib/data";
import { itemBiomeLookup, maxQualityAt } from "@/lib/progression";
import type {
  Ammo,
  Creature,
  Recipe,
  RecipeMaterial,
  Weapon,
  WeaponGroup,
} from "@/lib/types";

/** Fallback skill settings for callers that do not thread the page's own
 *  controls through (the engine checks use these). */
export const DEFAULT_GUIDE_OPTIONS: GuideOptions = {
  skillLevel: 50,
  skillMode: "avg",
};

export interface GuideOptions {
  /** Weapon skill level, 0–100, exactly like the calculator's. */
  skillLevel: number;
  /** Class-specific skill when the shared player profile is active. */
  skillFor?: (weapon: Weapon) => number;
  /** Which roll of the skill factor to use. */
  skillMode: SkillMode;
}

/** Groups that get one recommendation each. Consumables and siege engines are
 *  skipped: a thrown bomb or a base-defence payload is not what you craft
 *  before advancing. */
const GUIDE_GROUPS: WeaponGroup[] = ["melee", "ranged", "magic"];

const itemBiome = itemBiomeLookup([...weapons, ...ammoItems]);

export interface GuideLockedMaterial extends RecipeMaterial {
  /** Where the material comes from; null when nothing maps it. */
  biome: BiomeId | null;
}

export interface GuidePick {
  weapon: Weapon;
  /** Best reachable ammo for bow and crossbow picks. */
  ammo: Ammo | null;
  /** Highest upgrade level this step reaches (1 for consumables). */
  quality: number;
  /** False for consumables and items with no documented upgrade table. */
  upgradeable: boolean;
  /** Materials of the crafting recipe itself. */
  craft: RecipeMaterial[];
  /** Materials summed over every reachable upgrade level after the craft. */
  upgradeCost: RecipeMaterial[];
  /** The first upgrade level out of reach, and why. */
  locked?: { level: number; materials: GuideLockedMaterial[] };
  result: CalculationResult;
}

export interface GuideStep {
  biome: Biome;
  /** What the picks are scored against; null only if a step has no creatures. */
  gate: Creature | null;
  picks: GuidePick[];
}

function gateFor(step: BiomeId): Creature | null {
  const biome = BIOMES.find((b) => b.id === step);
  if (biome?.boss) return bosses.find((b) => b.slug === biome.boss) ?? null;
  /* A bossless step (Ocean) is ranked against its own toughest creature, so
   * the advice stays about what is in front of the player — not the biome
   * after it. */
  return (
    [...enemies]
      .filter((enemy) => enemy.biome === step)
      .sort((a, b) => b.health - a.health)[0] ?? null
  );
}

/** How far this step can take the item, mirroring the calculator's gating,
 *  with the two cases where there is nothing to upgrade toward: consumables,
 *  and items the wiki publishes without an upgrade table. */
export function qualityFor(
  weapon: Weapon,
  step: BiomeId,
): { quality: number; upgradeable: boolean } {
  if (weapon.consumable) return { quality: 1, upgradeable: false };
  const recipe = recipes[weapon.slug];
  if (!recipe) return { quality: 1, upgradeable: false };
  const documented = recipe.qualities
    .slice(1)
    .some((level) => level.length > 0);
  if (!documented) return { quality: 1, upgradeable: false };
  return {
    quality: Math.min(
      MAX_QUALITY,
      maxQualityAt(recipe, step, itemBiome),
    ),
    upgradeable: true,
  };
}

/** The level just past the reachable maximum, with the materials that stop it.
 *  `maxQualityAt` stops at the first level it cannot fully reach, so the
 *  blocking materials are exactly the ones listed for `quality + 1`. */
export function lockedFor(
  recipe: Recipe | undefined,
  quality: number,
  step: BiomeId,
): GuidePick["locked"] {
  if (!recipe || quality >= MAX_QUALITY) return undefined;
  const level = quality + 1;
  const materials = (recipe.qualities[level - 1] ?? [])
    .map((material) => {
      const key = normalizeName(material.name);
      return {
        ...material,
        biome: MATERIAL_BIOME[key] ?? itemBiome(key),
      };
    })
    /* Unknown materials count as out of reach, exactly like `maxQualityAt`,
     * so a blocked level always shows the material that blocks it. */
    .filter(
      (material) => material.biome === null || !isReached(material.biome, step),
    );
  return materials.length ? { level, materials } : undefined;
}

/** Every upgrade material from Q2 to `quality`, summed per material. */
function upgradeCostFor(
  recipe: (typeof recipes)[string] | undefined,
  quality: number,
): RecipeMaterial[] {
  const totals = new Map<string, number>();
  for (let level = 2; level <= quality; level++) {
    for (const material of recipe?.qualities[level - 1] ?? []) {
      totals.set(material.name, (totals.get(material.name) ?? 0) + material.quantity);
    }
  }
  return [...totals].map(([name, quantity]) => ({ name, quantity }));
}

/** The reachable ammo that actually hurts the gate most, not just the ammo
 *  with the biggest printed number (The Elder is very weak to fire). */
function bestAmmoFor(
  weapon: Weapon,
  quality: number,
  gate: Creature,
  step: BiomeId,
  options: GuideOptions,
): Ammo | null {
  if (!weapon.ammo) return null;
  let best: { ammo: Ammo; dps: number } | null = null;
  for (const ammo of ammoItems) {
    if (ammo.kind !== weapon.ammo || !isReached(ammo.biome, step)) continue;
    const result = calculate({
      weapon,
      ammo,
      quality,
      target: gate,
      skillLevel: options.skillFor?.(weapon) ?? options.skillLevel,
      skillMode: options.skillMode,
      attack: "primary",
    });
    if (!best || result.dps > best.dps) best = { ammo, dps: result.dps };
  }
  return best?.ammo ?? null;
}

/** The guide for one step of the ladder. Pure: same input, same output. */
export function buildGuideStep(
  step: BiomeId,
  options: GuideOptions = DEFAULT_GUIDE_OPTIONS,
): GuideStep {
  const biome = BIOMES.find((b) => b.id === step) ?? BIOMES[0];
  const gate = gateFor(step);
  if (!gate) return { biome, gate: null, picks: [] };

  const candidates = weapons
    .filter(
      (weapon) => weapon.biome === step && GUIDE_GROUPS.includes(weapon.group),
    )
    .map((weapon): GuidePick => {
      const { quality, upgradeable } = qualityFor(weapon, step);
      const ammo = bestAmmoFor(weapon, quality, gate, step, options);
      const recipe = recipes[weapon.slug];
      return {
        weapon,
        ammo,
        quality,
        upgradeable,
        craft: recipe?.qualities[0] ?? [],
        upgradeCost: upgradeCostFor(recipe, quality),
        locked: lockedFor(recipe, quality, step),
        result: calculate({
          weapon,
          ammo,
          quality,
          target: gate,
          skillLevel: options.skillFor?.(weapon) ?? options.skillLevel,
          skillMode: options.skillMode,
          attack: "primary",
        }),
      };
    })
    .filter((pick) => pick.result.perHit > 0);

  /* One pick per weapon group, ordered by how fast it kills the gate — so the
   * list always offers a ranged and a magic option even when the sword wins. */
  const bestPerGroup = new Map<WeaponGroup, GuidePick>();
  for (const pick of [...candidates].sort(
    (a, b) => b.result.dps - a.result.dps,
  )) {
    if (!bestPerGroup.has(pick.weapon.group)) {
      bestPerGroup.set(pick.weapon.group, pick);
    }
  }
  const picks = [...bestPerGroup.values()].sort(
    (a, b) => b.result.dps - a.result.dps,
  );
  return { biome, gate, picks };
}
