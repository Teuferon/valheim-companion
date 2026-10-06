/**
 * Attack timing profiles.
 *
 * SOURCES AND CONFIDENCE
 * --------------------------------------------------------------------------
 * Unlike the weapon/boss data (scraped from the wiki into JSON), attack
 * timing lives here as curated data because every source states it
 * differently. Three kinds of values are mixed, and each attack says which
 * one it uses:
 *
 *  - "wiki"     — an attack-speed table on the current Valheim wiki class
 *                 pages (Axes, Swords, Clubs, Knives, Fists, Spears,
 *                 Polearms, Pickaxes, Bows, Crossbows, Dundr), retrieved
 *                 2026-10-05. These are animation-based times; the club
 *                 table's own stage breakdown contradicts its total and is
 *                 recorded as a conflict instead of being used.
 *  - "model"    — MaxDPS's game-derived timing model (Valheim 1.0.16, build
 *                 25527674), which includes landed-hit pauses and publishes
 *                 per-hit schedules for some weapons. It is a continuous-time
 *                 calculation from the game's animations and code, not frame
 *                 measurements; projectile travel and interruptions are out
 *                 of scope.
 *  - "estimate" — no published value exists (bombs, catapult, most staves).
 *                 These stay labelled as estimates and are never presented as
 *                 verified.
 *
 * Where the wiki and the model disagree meaningfully, the profile keeps the
 * other value as an `alternate` so the Methodology dialog can show both. The
 * timing *meaning* is always the repeat cycle: time from the start of one
 * attack until the same attack can begin again — not time-to-first-hit, and
 * not a single swing.
 *
 * Bow and crossbow timings scale with the relevant skill:
 *   bow draw     2.5 - 0.02 × level seconds, but never faster than the
 *                wiki's 0.8 s minimum firing interval (reached at level 85).
 *   crossbow     reload 3.5 × (1 - level / 200) seconds, plus the model's
 *                1.15 s readying and 0.7 s firing/recovery per cycle.
 * The wiki also states crossbows only fire every 6 s overall; the model's
 * cycle is recorded as an alternate because the two disagree.
 */

import type { WeaponClass } from "./weapon-class";

export type AttackKind = "primary" | "secondary";

/** Where a timing value comes from, and how much weight it deserves. */
export type TimingConfidence = "wiki" | "model" | "estimate";

export type TimingSource = {
  /** Short label for tooltips and the Methodology dialog. */
  label: string;
  url: string;
};

export const CONFIDENCE_LABEL: Record<TimingConfidence, string> = {
  wiki: "Wiki timing",
  model: "Game-derived model",
  estimate: "Estimate",
};

export const TIMING_RETRIEVED = "5 October 2026";
export const MAXDPS_BUILD = "Valheim 1.0.16 · build 25527674";

/** Attack repeat timing. Fixed seconds, or a skill-scaled formula. */
export type AttackTiming =
  | { kind: "fixed"; seconds: number }
  | { kind: "bow" }
  | { kind: "crossbow" };

export type AttackProfile = {
  timing: AttackTiming;
  /**
   * Flat multiplier applied to every hit of this attack. Primaries are 1;
   * secondary attacks use the multiplier the wiki lists (0.5–3×).
   */
  damageMult: number;
  /**
   * Damage weights of each hit in one full repeat cycle. A 3-hit combo is
   * [1, 1, 2] (the finisher deals double); the dual axes are
   * [1, 1, 1, 1, 2, 2] because their last two swings each hit twice.
   */
  comboMults: number[];
  /** Hit times within the cycle, when a source publishes a schedule. */
  hitTimes?: number[];
  /** Warm-up before a launcher's first shot, when published separately. */
  warmupSeconds?: number;
  confidence: TimingConfidence;
  source: TimingSource;
  /** Other published values for the same attack, kept for review. */
  alternates?: { seconds: number; source: TimingSource; note?: string }[];
  note?: string;
};

export type WeaponTiming = {
  primary: AttackProfile;
  secondary: AttackProfile | null;
};

const wiki = (page: string): TimingSource => ({
  label: `Valheim Wiki — ${page}`,
  url: `https://valheim.weirdgloop.org/w/${page}`,
});

const maxdps = (weapon: string): TimingSource => ({
  label: `MaxDPS — ${weapon}`,
  url: `https://valheim.maxdps.com/weapons/${weapon}`,
});

const GAMING_TOOLS_BALLISTA: TimingSource = {
  label: "valheim.gaming.tools — Ballista (piece_turret)",
  url: "https://valheim.gaming.tools/structures/piece_turret",
};

/* ------------------------------------------------------------------ *
 * Skill-scaled ranged timing
 * ------------------------------------------------------------------ */

export const BOW_DRAW_BASE = 2.5;
export const BOW_DRAW_PER_SKILL = 0.02;
export const BOW_MIN_INTERVAL = 0.8;
export const CROSSBOW_RELOAD_BASE = 3.5;
export const CROSSBOW_RELOAD_PER_SKILL = 0.5; // 3.5 × (1 − level / 200)
export const CROSSBOW_READYING = 1.15;
export const CROSSBOW_FIRING = 0.7;

const clampSkill = (level: number) => Math.max(0, Math.min(100, level));

/** Full draw time at a bow skill level: 2.5 s down to 0.5 s. */
export function bowDrawSeconds(skillLevel: number): number {
  return BOW_DRAW_BASE - BOW_DRAW_PER_SKILL * clampSkill(skillLevel);
}

/** Bow repeat interval: the draw, never faster than the wiki's 0.8 s floor. */
export function bowCycleSeconds(skillLevel: number): number {
  return Math.max(BOW_MIN_INTERVAL, bowDrawSeconds(skillLevel));
}

/** Reload phase at a crossbow skill level: 3.5 s down to 1.75 s. */
export function crossbowReloadSeconds(skillLevel: number): number {
  return CROSSBOW_RELOAD_BASE * (1 - clampSkill(skillLevel) / 200);
}

/** Full reload + readying + firing/recovery cycle of the MaxDPS model. */
export function crossbowCycleSeconds(skillLevel: number): number {
  return (
    crossbowReloadSeconds(skillLevel) + CROSSBOW_READYING + CROSSBOW_FIRING
  );
}

/** Seconds of one full repeat cycle of `profile` at `skillLevel`. */
export function cycleSecondsFor(
  profile: AttackProfile,
  skillLevel: number,
): number {
  switch (profile.timing.kind) {
    case "fixed":
      return profile.timing.seconds;
    case "bow":
      return bowCycleSeconds(skillLevel);
    case "crossbow":
      return crossbowCycleSeconds(skillLevel);
  }
}

/* ------------------------------------------------------------------ *
 * Melee primaries: wiki attack-speed totals, model values as alternates
 * ------------------------------------------------------------------ */

const melee = (
  seconds: number,
  comboMults: number[],
  source: TimingSource,
  options: Pick<AttackProfile, "alternates" | "note"> = {},
): AttackProfile => ({
  timing: { kind: "fixed", seconds },
  damageMult: 1,
  comboMults,
  confidence: "wiki",
  source,
  ...options,
});

const secondary = (
  seconds: number,
  damageMult: number,
  source: TimingSource,
  note?: string,
  confidence: TimingConfidence = "wiki",
): AttackProfile => ({
  timing: { kind: "fixed", seconds },
  damageMult,
  comboMults: [1],
  confidence,
  source,
  ...(note ? { note } : {}),
});

const single = (
  seconds: number,
  source: TimingSource,
  confidence: TimingConfidence,
  note?: string,
): AttackProfile => ({
  timing: { kind: "fixed", seconds },
  damageMult: 1,
  comboMults: [1],
  confidence,
  source,
  ...(note ? { note } : {}),
});

/* ------------------------------------------------------------------ *
 * Per-weapon overrides where a published schedule exists for that exact
 * weapon, keyed by weapon slug.
 * ------------------------------------------------------------------ */

export const WEAPON_PRIMARY_OVERRIDES: Record<string, AttackProfile> = {
  "iron-sword": {
    timing: { kind: "fixed", seconds: 2.425 },
    damageMult: 1,
    comboMults: [1, 1, 2],
    hitTimes: [0.455, 1.096, 1.875],
    confidence: "model",
    source: maxdps("iron-sword"),
    note: "Published hit schedule; the final swing of the combo deals double damage. Landed-hit pauses are included.",
    alternates: [
      {
        seconds: 2.46,
        source: wiki("Swords"),
        note: "The wiki's animation-based total for the class.",
      },
    ],
  },
  "berserkir-axes": {
    timing: { kind: "fixed", seconds: 3.521 },
    damageMult: 1,
    comboMults: [1, 1, 1, 1, 2, 2],
    hitTimes: [0.211, 0.78, 1.425, 1.793, 2.463, 2.785],
    confidence: "model",
    source: maxdps("berserkir-axes"),
    note: "Four-swing combo with six damage events: the third and fourth swings each land two hits, and the fourth swing's hits both deal double damage.",
    alternates: [
      {
        seconds: 3.62,
        source: wiki("Axes"),
        note: "The wiki's animation-based total for the class.",
      },
    ],
  },
  dundr: {
    timing: { kind: "fixed", seconds: 1.9 },
    damageMult: 1,
    comboMults: [1],
    confidence: "wiki",
    source: wiki("Dundr"),
    note: "The 1.9 s reload animation after each shot; the firing/recovery phase is not published, so the real cycle is slightly longer.",
  },
};

/** Primary profile for a weapon: its override, else its class profile. */
export function primaryProfileFor(weapon: {
  cls: WeaponClass;
  slug: string;
}): AttackProfile {
  return (
    WEAPON_PRIMARY_OVERRIDES[weapon.slug] ??
    ATTACK_PROFILES[weapon.cls].primary
  );
}

export function secondaryProfileFor(weapon: {
  cls: WeaponClass;
}): AttackProfile | null {
  return ATTACK_PROFILES[weapon.cls].secondary;
}

/** The profile for the chosen attack, or null when that attack does not exist. */
export function attackProfileFor(
  weapon: { cls: WeaponClass; slug: string },
  attack: AttackKind,
): AttackProfile | null {
  return attack === "secondary"
    ? secondaryProfileFor(weapon)
    : primaryProfileFor(weapon);
}

export function hasSecondaryAttack(weapon: { cls: WeaponClass }): boolean {
  return secondaryProfileFor(weapon) !== null;
}

/* ------------------------------------------------------------------ *
 * The class tables
 * ------------------------------------------------------------------ */

export const ATTACK_PROFILES: Record<WeaponClass, WeaponTiming> = {
  fists: {
    primary: melee(1.48, [1, 2], wiki("Fists"), {
      note: "Two-hit chain: the second punch (left hand) deals double damage.",
    }),
    secondary: secondary(
      1.48,
      1,
      wiki("Fists"),
      "The kick: 6× stagger and 80 knockback, but 1× damage on the wiki table.",
    ),
  },
  knife: {
    primary: melee(1.74, [1, 1, 2], wiki("Knives"), {
      alternates: [
        { seconds: 1.693, source: maxdps("black-metal-knife") },
      ],
    }),
    secondary: secondary(1.52, 3, wiki("Knives"), "The lunging stab."),
  },
  sword: {
    primary: melee(2.46, [1, 1, 2], wiki("Swords"), {
      alternates: [{ seconds: 2.425, source: maxdps("iron-sword") }],
    }),
    secondary: secondary(1.84, 3, wiki("Swords"), "The thrust."),
  },
  club: {
    primary: melee(2.46, [1, 1, 2], wiki("Clubs"), {
      alternates: [{ seconds: 2.425, source: maxdps("club") }],
      note: "The wiki's stage breakdown (0.86 + 0.80 + 0.90) sums to 2.56 s, not the 2.46 s total, so the breakdown is not used.",
    }),
    secondary: secondary(1.72, 2.5, wiki("Clubs"), "The overhead swing."),
  },
  axe: {
    primary: melee(2.58, [1, 1, 2], wiki("Axes"), {
      alternates: [
        {
          seconds: 2.879,
          source: maxdps("flint-axe"),
          note: "12% slower than the wiki total — a real disagreement, not rounding.",
        },
      ],
    }),
    secondary: secondary(2, 1.5, wiki("Axes"), "The overhead swing."),
  },
  "dual-axe": {
    primary: melee(3.62, [1, 1, 1, 1, 2, 2], wiki("Axes"), {
      alternates: [{ seconds: 3.521, source: maxdps("berserkir-axes") }],
      note: "Four swings, six hits: the third and fourth swings each land two hits, and the fourth swing's hits both deal double damage.",
    }),
    secondary: secondary(1.93, 1.5, wiki("Axes"), "The jumping double slash."),
  },
  spear: {
    primary: melee(0.68, [1], wiki("Spears"), {
      alternates: [{ seconds: 0.661, source: maxdps("flint-spear") }],
      note: "A single thrust — spears have no 3-hit combo.",
    }),
    secondary: secondary(
      1.04,
      1.5,
      wiki("Spears"),
      "The throw; the 1.04 s includes picking the spear back up, so the cycle depends on retrieval distance.",
    ),
  },
  atgeir: {
    primary: melee(2.98, [1, 1, 2], wiki("Polearms"), {
      alternates: [{ seconds: 2.965, source: maxdps("bronze-atgeir") }],
    }),
    secondary: secondary(
      1.56,
      1,
      wiki("Polearms"),
      "The wide 360° spin; 1× damage, area effect not modelled.",
    ),
  },
  greatsword: {
    primary: melee(3.44, [1, 1, 2], wiki("Swords"), {
      alternates: [{ seconds: 3.375, source: maxdps("krom") }],
    }),
    secondary: secondary(2.16, 3, wiki("Swords")),
  },
  battleaxe: {
    primary: melee(3.2, [1, 1, 2], wiki("Axes"), {
      alternates: [
        {
          seconds: 3.716,
          source: maxdps("battleaxe"),
          note: "16% slower than the wiki total — a real disagreement, not rounding.",
        },
      ],
    }),
    secondary: secondary(0.84, 0.5, wiki("Axes"), "The shove."),
  },
  sledge: {
    primary: melee(1.7, [1], wiki("Clubs"), {
      alternates: [
        {
          seconds: 2.193,
          source: maxdps("iron-sledge"),
          note: "29% slower than the wiki total — a real disagreement, not rounding.",
        },
      ],
      note: "A single slam with no 3-hit combo; the wiki notes it damages a 4 m area, which is not modelled.",
    }),
    secondary: null,
  },
  pickaxe: {
    primary: melee(1.4, [1], wiki("Pickaxes"), {
      alternates: [{ seconds: 1.384, source: maxdps("black-metal-pickaxe") }],
      note: "A single downward swing; only creature damage is counted.",
    }),
    secondary: null,
  },
  bow: {
    primary: {
      timing: { kind: "bow" },
      damageMult: 1,
      comboMults: [1],
      confidence: "wiki",
      source: wiki("Bows"),
      note: "Assumes a full draw — partial draws deal less damage and are not modelled. Repeat interval is the skill-scaled draw time, never faster than the wiki's 0.8 s minimum firing interval. Projectile travel is not modelled.",
    },
    secondary: null,
  },
  crossbow: {
    primary: {
      timing: { kind: "crossbow" },
      damageMult: 1,
      comboMults: [1],
      confidence: "model",
      source: maxdps("arbalest"),
      note: "Reload 3.5 × (1 − skill / 200) s plus 1.15 s readying and 0.7 s firing/recovery. The model starts unloaded; a loaded first shot skips the reload, and TTK here averages the cycle.",
      alternates: [
        {
          seconds: 6,
          source: wiki("Crossbows"),
          note: "The wiki says a crossbow can only be fired every 6 s once firing, loading and readying are counted — it does not publish the skill scaling.",
        },
      ],
    },
    secondary: null,
  },
  staff: {
    primary: single(
      1.1,
      wiki("Staff_of_Embers"),
      "estimate",
      "No elemental staff publishes a repeat cycle: the Staff of Frost channels 0.2 s shard bursts, and Dundr has a 1.9 s reload, so no single number fits the class. 1.1 s is this app's estimate.",
    ),
    secondary: null,
  },
  "blood-staff": {
    primary: single(
      1.6,
      wiki("Blood_magic"),
      "estimate",
      "Blood magic damage comes from shields, summons and spirits; caster animation frequency is not a minion DPS model. 1.6 s is this app's estimate.",
    ),
    secondary: null,
  },
  bomb: {
    primary: single(
      1.2,
      wiki("Bombs"),
      "estimate",
      "No repeat interval published — throw time only. Impact and timed effects are not modelled.",
    ),
    secondary: null,
  },
  missile: {
    primary: {
      timing: { kind: "fixed", seconds: 2 },
      damageMult: 1,
      comboMults: [1],
      warmupSeconds: 1,
      confidence: "model",
      source: GAMING_TOOLS_BALLISTA,
      note: "Fired by a ballista, not by hand, and scaled by no weapon skill. The 2 s attack cooldown is used as the cycle; the listed 1 s warm-up is published separately and how the two combine into a real firing cadence is not verified.",
    },
    secondary: null,
  },
  siege: {
    primary: single(
      6,
      wiki("Catapult"),
      "estimate",
      "No verified firing or reset cycle; the timing belongs to the catapult launcher, not the ammunition. 6 s is this app's estimate.",
    ),
    secondary: null,
  },
};
