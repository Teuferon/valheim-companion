import { gameText, type GameText } from '../lib/game-text';

/**
 * The progression ladder.
 *
 * This is the single axis the biome slider moves along: biome *reach*, in the
 * order the game expects you to encounter them, which is also the order the
 * wiki uses on https://valheim.weirdgloop.org/wiki/Biomes.
 *
 * Source of truth: the wiki's biome list plus each boss page's `location`
 * field. Ocean sits between Black Forest and Swamp exactly as the wiki orders
 * it — it is the first biome that needs a boat (finewood hull, bronze nails),
 * and it is where chitin/leviathan gear becomes reachable. It has no Forsaken,
 * which is why `boss` is optional.
 *
 * Item availability is *derived* at scrape time (see the material table in
 * `./materials.ts` and `scripts/scrape.ts`); this file only declares the
 * ladder. Creatures (minibosses, regular enemies) plug into the same field
 * later: anything that can be encountered from a biome onwards declares it.
 */

export type BiomeId =
  | "meadows"
  | "black-forest"
  | "ocean"
  | "swamp"
  | "mountain"
  | "plains"
  | "mistlands"
  | "ashlands"
  | "deep-north";

export type Biome = {
  id: BiomeId;
  /** Display name, matching the wiki's. */
  name: string;
  /** Boss slug for the Forsaken of this biome, when it has one. */
  boss?: string;
  /** Shown in the slider tooltip / assumptions panel. */
  note?: GameText;
};

export const BIOMES: Biome[] = [
  {
    id: "meadows",
    name: "Meadows",
    boss: "eikthyr",
    note: gameText("Resources: {items}. Station: {station}.", { items: "Wood, Flint, Deer Hide", station: "Workbench" }),
  },
  {
    id: "black-forest",
    name: "Black Forest",
    boss: "the-elder",
    note: gameText("{items} unlock {station}; {material} unlocks the first boats.", { items: "Copper, Tin", station: "Forge", material: "Finewood" }),
  },
  {
    id: "ocean",
    name: "Ocean",
    note: gameText("Reachable once you can sail; {creature} drops {item}.", { creature: "Leviathan", item: "Chitin" }),
  },
  {
    id: "swamp",
    name: "Swamp",
    boss: "bonemass",
    note: gameText("Resources: {items}.", { items: "Iron, Ancient Bark, Wishbone" }),
  },
  {
    id: "mountain",
    name: "Mountain",
    boss: "moder",
    note: gameText("Resources: {items}.", { items: "Silver, Obsidian, Wolf, Drake" }),
  },
  {
    id: "plains",
    name: "Plains",
    boss: "yagluth",
    note: gameText("Resources: {items}. Station: {station}.", { items: "Black Metal, Linen Thread", station: "Artisan Table" }),
  },
  {
    id: "mistlands",
    name: "Mistlands",
    boss: "the-queen",
    note: gameText("Resources: {items}. Station: {station}.", { items: "Carapace, Refined Eitr", station: "Galdr Table" }),
  },
  {
    id: "ashlands",
    name: "Ashlands",
    boss: "fader",
    note: gameText("Resources: {items}. Station: {station}.", { items: "Flametal, Charred Bone", station: "Black Forge" }),
  },
  {
    id: "deep-north",
    name: "Deep North",
    boss: "kall-fimbulbringer",
    note: gameText("Resources: {items}. Station: {station}.", { items: "Bloodgold, Frostcore", station: "Frost Foundry" }),
  },
];

/** Ladder position by id — the comparison every availability check uses. */
export const BIOME_ORDER: Record<BiomeId, number> = BIOMES.reduce(
  (acc, biome, index) => {
    acc[biome.id] = index;
    return acc;
  },
  {} as Record<BiomeId, number>,
);

export const BIOME_NAME: Record<BiomeId, string> = BIOMES.reduce(
  (acc, biome) => {
    acc[biome.id] = biome.name;
    return acc;
  },
  {} as Record<BiomeId, string>,
);

export const BOSS_BIOME: Record<string, BiomeId> = BIOMES.reduce(
  (acc, biome) => {
    if (biome.boss) acc[biome.boss] = biome.id;
    return acc;
  },
  {} as Record<string, BiomeId>,
);

/** True when `biome` is reached at or before `step` on the ladder. */
export const isReached = (biome: BiomeId, step: BiomeId) =>
  BIOME_ORDER[biome] <= BIOME_ORDER[step];
