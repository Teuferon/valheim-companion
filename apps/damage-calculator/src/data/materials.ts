/**
 * Recipe → biome mapping.
 *
 * Item availability is not published by the wiki as a field, so it is derived
 * from recipes: an item becomes reachable at the first biome by which its
 * crafting station, *every* material in its recipe, and (for the Ashlands and
 * Deep North upgrade chains) every ingredient *item* in that recipe can be
 * obtained. See `deriveBiome` in `scripts/scrape.ts`.
 *
 * The tables below are the curated half of that derivation — curated because
 * the wiki's material pages describe sources in prose rather than in a field,
 * and because a few materials are not gated by a biome at all (Ymir flesh is
 * bought from Haldor, who lives in the Black Forest).
 *
 * Discipline: a material that is missing from this table is a *hard error* at
 * scrape time, never a silent default. `npm run scrape` prints every unmapped
 * name and refuses to guess, so the table cannot rot silently as the game
 * updates.
 */

import type { BiomeId } from "./biomes";

/** Where each crafting material is first obtainable. */
export const MATERIAL_BIOME: Record<string, BiomeId> = {
  /* Meadows */
  wood: "meadows",
  stone: "meadows",
  resin: "meadows",
  "leather scraps": "meadows",
  "deer hide": "meadows",
  "bone fragments": "meadows",
  flint: "meadows",
  feathers: "meadows",
  "hard antler": "meadows",
  /* The "early axes" are assembled from two heads found in Meadows
   * Abandoned Houses; https://valheim.weirdgloop.org/wiki/Abandoned_House */
  "curious axe head": "meadows",
  "mysterious axe head": "meadows",
  "deer trophy": "meadows",
  coal: "meadows",
  "queen bee": "meadows",
  honey: "meadows",

  /* Black Forest */
  copper: "black-forest",
  tin: "black-forest",
  bronze: "black-forest",
  finewood: "black-forest",
  corewood: "black-forest",
  "greydwarf eye": "black-forest",
  "troll hide": "black-forest",
  "ancient seed": "black-forest",
  "surtling core": "black-forest",
  "blueberries": "black-forest",
  thistle: "black-forest",
  "red mushroom": "black-forest",
  "yellow mushroom": "black-forest",
  "thistle flower": "black-forest",
  /* Bought from Haldor, who is found in the Black Forest. */
  "ymir flesh": "black-forest",
  "fishing bait": "black-forest",
  "dverger circlet": "black-forest",
  "megingjord": "black-forest",
  /* Bears roam the Black Forest; the Vile that also drops hides is a Plains
   * creature, but the earliest source — and so the tier of Paws of the Bear —
   * is the Bear. */
  "bear hide": "black-forest",
  "bear paw": "black-forest",

  /* Ocean — reachable once you can sail (finewood + bronze nails). */
  chitin: "ocean",

  /* Swamp */
  iron: "swamp",
  "ancient bark": "swamp",
  ooze: "swamp",
  "root (item)": "swamp",
  "draugr elite trophy": "swamp",
  guck: "swamp",
  chain: "swamp",
  "withered bone": "swamp",
  entrails: "swamp",
  bilebag: "swamp",
  "oozer hide": "swamp",
  "blob trophy": "swamp",
  "wraith trophy": "swamp",
  "draugr trophy": "swamp",
  "leech trophy": "swamp",
  "elder trophy": "swamp",

  /* Mountain */
  silver: "mountain",
  obsidian: "mountain",
  crystal: "mountain",
  "wolf fang": "mountain",
  "wolf pelt": "mountain",
  "freeze gland": "mountain",
  "dragon tear": "mountain",
  "drake trophy": "mountain",
  "wolf trophy": "mountain",
  "stone golem trophy": "mountain",
  "cultist trophy": "mountain",
  "ulv trophy": "mountain",
  /* Found in the Frost Caves of the Mountain: hair on the Fenring, claws on
   * the pedestals. */
  "fenris hair": "mountain",
  "fenris claw": "mountain",

  /* Plains */
  "black metal": "plains",
  linen: "plains",
  "black metal scrap": "plains",
  "linen thread": "plains",
  flax: "plains",
  barley: "plains",
  needle: "plains",
  "lox pelt": "plains",
  "lox meat": "plains",
  "deathsquito needle": "plains",
  "fuling trophy": "plains",
  "growth trophy": "plains",
  "vile ribcage": "plains",

  /* Mistlands */
  carapace: "mistlands",
  eitr: "mistlands",
  "refined eitr": "mistlands",
  "black marble": "mistlands",
  "black core": "mistlands",
  mandible: "mistlands",
  wisp: "mistlands",
  "yggdrasil wood": "mistlands",
  sap: "mistlands",
  "soft tissue": "mistlands",
  "royal jelly": "mistlands",
  "seekershell": "mistlands",
  "seeker trophy": "mistlands",
  "gjall trophy": "mistlands",
  "hare trophy": "mistlands",
  "scale hide": "mistlands",
  "magecap": "mistlands",
  "jotun puffs": "mistlands",

  /* Ashlands */
  flametal: "ashlands",
  "flametal ore": "ashlands",
  "charred bone": "ashlands",
  ashwood: "ashlands",
  "asksvin hide": "ashlands",
  sulfur: "ashlands",
  "proustite powder": "ashlands",
  "molten core": "ashlands",
  "volcanic rock": "ashlands",
  "grausten": "ashlands",
  jade: "ashlands",
  iolite: "ashlands",
  bloodstone: "ashlands",
  "asksvin bladder": "ashlands",
  "bonemaw tooth": "ashlands",
  "celestial feather": "ashlands",
  "morgen sinew": "ashlands",
  "fiddlehead": "ashlands",
  "smoke puff": "ashlands",
  "charred cog": "ashlands",
  "bone of a fallen warrior": "ashlands",
  "fader trophy": "ashlands",

  /* Deep North */
  bloodgold: "deep-north",
  frostcore: "deep-north",
  timberwood: "deep-north",
  "petrified tissue": "deep-north",
  "liquid frost": "deep-north",
  "frostfire essence": "deep-north",
  nornathread: "deep-north",
  ice: "deep-north",
  snowball: "deep-north",
  "seal blubber": "deep-north",
  "luminous larva": "deep-north",
  "winter berries": "deep-north",
  kale: "deep-north",
  embers: "deep-north",
  "frozen branch": "deep-north",
  "seal pelt": "deep-north",
  "thunderblood essence": "deep-north",
  "memorial coal": "deep-north",
  "cast lightning strike": "deep-north",
  "cast northern vengeance": "deep-north",
  "cast nord greataxe": "deep-north",
  "cast thunderblood": "deep-north",
  /** Casts are the Deep North's half-finished weapons (Nord, Echo Spike). */
  "cast nord sword": "deep-north",
  "cast nord axe": "deep-north",
  "cast nord mace": "deep-north",
  "cast nord spear": "deep-north",
  "cast nord dagger": "deep-north",
  "cast nord atgeir": "deep-north",
  "cast nord bow": "deep-north",
  "cast nord crossbow": "deep-north",
  "cast nord greatsword": "deep-north",
  "cast nord battleaxe": "deep-north",
  "cast nord sledge": "deep-north",
  "cast echo spike": "deep-north",
  "cast nord knucklechains": "deep-north",
  "nord shield": "deep-north",
  "bloodgold battle idol": "deep-north",
};

/**
 * Crafting stations by the biome in which they can be built.
 *
 * Each entry is the biome of the station's *own* build recipe, which is the
 * only honest way to place a station on the ladder — and it matters, because
 * a station's tier and its products' tiers differ. The Black Forge is the
 * sharpest example: it is built from Black Marble, Yggdrasil Wood and Black
 * Cores (all Mistlands), so it is Mistlands-tier, yet it also forges every
 * Ashlands weapon. Those items reach Ashlands through their *materials*
 * (Flametal, Charred Bone, Ashwood), not through the station.
 *
 *   Workbench      Wood x10                          -> Meadows
 *   Forge          Stone, Coal, Wood, Copper x6      -> Black Forest
 *   Artisan Table  Dragon Tear x2, Wood x10          -> Mountain (Moder's tears)
 *   Black Forge    Black Marble, Yggdrasil Wood, Black Cores -> Mistlands
 *   Galdr Table    Black Metal, Yggdrasil Wood, Black Cores, Refined Eitr -> Mistlands
 *   Frost Foundry  Iron x15, Stone x20, Frostcore x10 -> Deep North
 *
 * A station that is missing here is a hard error at scrape time. When a page
 * names a biome in the field itself ("Crafted by hand, Deep North"), that wins.
 */
export const STATION_BIOME: Record<string, BiomeId> = {
  workbench: "meadows",
  cauldron: "meadows",
  forge: "black-forest",
  "stone oven": "black-forest",
  "artisan table": "mountain",
  "forge of potential": "mountain",
  "black forge": "mistlands",
  "galdr table": "mistlands",
  "frost foundry": "deep-north",
  /* Recipes that need no station at all. */
  "crafted by hand": "meadows",
  "crafting menu": "meadows",
  "player inventory": "meadows",
  "always available": "meadows",
};

/**
 * Items that cannot be derived from a recipe because they have none — drops,
 * gifts, or hand-crafted starting gear. Keyed by item slug.
 */
export const ITEM_BIOME_OVERRIDE: Record<string, BiomeId> = {
  "bare-fists": "meadows",
};

/** Normalise a wiki link/template value into a lookup key. */
export const normalizeName = (raw: string): string =>
  raw
    .replace(/\[\[|\]\]/g, "")
    .replace(/\{\{.*?\}\}/g, (m) => m)
    .split("|")[0]
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
