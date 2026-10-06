/**
 * Shareable view state, encoded in the query string.
 *
 * The whole app is one statically prerendered page whose state lives in the
 * client, so every selection that changes the numbers on screen — biome,
 * target, weapon, class filter, upgrade level, skill level and roll, attack,
 * enemy state and chosen ammo — is mirrored into the URL. A copied link
 * therefore reproduces the selected calculation, and the address bar stays bookmarkable as the user adjusts anything.
 *
 * Defaults are omitted in plain views; shared links include calculation
 * controls explicitly so a recipient profile cannot change the numbers.
 * A plain view stays `?biome=…&target=…`.
 *
 * Everything read out of a URL is validated against the committed datasets and
 * dropped when it does not match, so a stale or hand-edited link degrades to
 * the default view instead of pointing at something that no longer exists.
 *
 * Reading `window.location` is deliberately left to the caller (an effect in
 * page.tsx, plus buildViewUrl at click time): the page is prerendered without a
 * URL, and touching window during render would produce the server/client
 * mismatch this app already fixed once — see the note in biome-slider.tsx.
 */

import type { AttackKind } from "@/data/attack-profiles";
import { BIOMES, type BiomeId } from "@/data/biomes";
import { WEAPON_CLASS_ORDER, type WeaponClass } from "@/data/weapon-class";
import { arrows, bolts, targets, weapons } from "@/lib/data";
import { MAX_QUALITY, type SkillMode } from "@/lib/damage";

export interface ViewState {
  biome: BiomeId;
  /** Target slug. */
  target: string;
  /** Weapon slug, or null for "best pick at this biome". */
  weapon: string | null;
  cls: "all" | WeaponClass;
  /** Upgrade level (1 to MAX_QUALITY). */
  level: number;
  /** Weapon skill level, 0 to 100. */
  skill: number;
  /** Which end of the skill-factor roll the numbers use. */
  roll: SkillMode;
  attack: AttackKind;
  /** True when the enemy is unaware, so the first hit backstabs. */
  backstab: boolean;
  /** Apply the stagger damage bonus. Optional for older callers. */
  staggered?: boolean;
  /** Chosen arrow slug, or null for the best reachable one. */
  arrow: string | null;
  /** Chosen bolt slug, or null for the best reachable one. */
  bolt: string | null;
}

export type ParsedView = Partial<ViewState>;

/** The values a link leaves out, because they are what the page opens on. */
export const VIEW_DEFAULTS = {
  level: MAX_QUALITY,
  skill: 100,
  roll: "avg" as SkillMode,
  attack: "primary" as AttackKind,
  backstab: false,
  staggered: false,
} as const;

/** Query parameter names. Short and stable — these end up in shared links. */
export const VIEW_PARAMS = {
  biome: "biome",
  target: "target",
  weapon: "weapon",
  cls: "class",
  level: "level",
  skill: "skill",
  roll: "roll",
  attack: "attack",
  enemy: "state",
  arrow: "arrow",
  bolt: "bolt",
} as const;

const BIOME_IDS = new Set<string>(BIOMES.map((b) => b.id));
const TARGET_SLUGS = new Set(targets.map((t) => t.slug));
const WEAPON_SLUGS = new Set(weapons.map((w) => w.slug));
const CLASS_IDS = new Set<string>(WEAPON_CLASS_ORDER);
const ARROW_SLUGS = new Set(arrows.map((a) => a.slug));
const BOLT_SLUGS = new Set(bolts.map((b) => b.slug));
const SKILL_MODES = new Set<SkillMode>(["min", "avg", "max"]);
const ATTACK_KINDS = new Set<AttackKind>(["primary", "secondary"]);

/** A whole number inside an inclusive range, or undefined for anything else. */
function parseBoundedInt(
  raw: string | null,
  min: number,
  max: number,
): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded < min || rounded > max) return undefined;
  return rounded;
}

/** Read view state out of a query string, keeping only known values. */
export function parseViewQuery(search: string): ParsedView {
  const params = new URLSearchParams(search);
  const out: ParsedView = {};

  const biome = params.get(VIEW_PARAMS.biome);
  if (biome && BIOME_IDS.has(biome)) out.biome = biome as BiomeId;

  const target = params.get(VIEW_PARAMS.target);
  if (target && TARGET_SLUGS.has(target)) out.target = target;

  const weapon = params.get(VIEW_PARAMS.weapon);
  if (weapon && WEAPON_SLUGS.has(weapon)) out.weapon = weapon;

  const cls = params.get(VIEW_PARAMS.cls);
  if (cls === "all") out.cls = "all";
  else if (cls && CLASS_IDS.has(cls)) out.cls = cls as WeaponClass;

  const level = parseBoundedInt(params.get(VIEW_PARAMS.level), 1, MAX_QUALITY);
  if (level !== undefined) out.level = level;

  const skill = parseBoundedInt(params.get(VIEW_PARAMS.skill), 0, 100);
  if (skill !== undefined) out.skill = skill;

  const roll = params.get(VIEW_PARAMS.roll);
  if (roll && SKILL_MODES.has(roll as SkillMode)) out.roll = roll as SkillMode;

  const attack = params.get(VIEW_PARAMS.attack);
  if (attack && ATTACK_KINDS.has(attack as AttackKind)) {
    out.attack = attack as AttackKind;
  }

  const enemy = params.get(VIEW_PARAMS.enemy);
  if (["alerted", "unalerted", "staggered", "unalerted-staggered"].includes(enemy ?? "")) {
    out.backstab = enemy === "unalerted" || enemy === "unalerted-staggered";
    out.staggered = enemy === "staggered" || enemy === "unalerted-staggered";
  }

  const arrow = params.get(VIEW_PARAMS.arrow);
  if (arrow && ARROW_SLUGS.has(arrow)) out.arrow = arrow;

  const bolt = params.get(VIEW_PARAMS.bolt);
  if (bolt && BOLT_SLUGS.has(bolt)) out.bolt = bolt;

  return out;
}

/**
 * Canonical query string for a view.
 *
 * Biome and target are always written even when they match the defaults: the
 * biome is normally remembered per browser in localStorage, so a link that
 * omitted it would open on whatever the recipient last used. Everything else
 * is normally written only when it differs from the default. explicitControls
 * includes even default values when a recipient profile could change them.
 */
export function viewSearch(view: ViewState, explicitControls = false): string {
  const params = new URLSearchParams();
  params.set(VIEW_PARAMS.biome, view.biome);
  params.set(VIEW_PARAMS.target, view.target);
  if (view.weapon) params.set(VIEW_PARAMS.weapon, view.weapon);
  if (view.cls !== "all") params.set(VIEW_PARAMS.cls, view.cls);
  if (explicitControls || view.level !== VIEW_DEFAULTS.level) {
    params.set(VIEW_PARAMS.level, String(view.level));
  }
  if (explicitControls || view.skill !== VIEW_DEFAULTS.skill) {
    params.set(VIEW_PARAMS.skill, String(view.skill));
  }
  if (view.roll !== VIEW_DEFAULTS.roll) params.set(VIEW_PARAMS.roll, view.roll);
  if (view.attack !== VIEW_DEFAULTS.attack) {
    params.set(VIEW_PARAMS.attack, view.attack);
  }
  if (explicitControls || view.backstab || view.staggered) {
    params.set(VIEW_PARAMS.enemy, view.backstab
      ? (view.staggered ? "unalerted-staggered" : "unalerted")
      : (view.staggered ? "staggered" : "alerted"));
  }
  if (view.arrow) params.set(VIEW_PARAMS.arrow, view.arrow);
  if (view.bolt) params.set(VIEW_PARAMS.bolt, view.bolt);
  return params.toString();
}

/** Copyable URL with explicit controls, including defaults. Client-only. */
export function buildViewUrl(view: ViewState): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?${viewSearch(view, true)}`;
}

/* ------------------------------------------------------------------ *
 * The query string as an external store
 *
 * page.tsx reads the incoming view through useSyncExternalStore rather than
 * copying it into state from an effect. That keeps the prerendered HTML and
 * the first client render identical (the server snapshot is always ""), and
 * it avoids the setState-in-effect pattern the lint rules reject. Mirroring
 * our own state back out is a plain external-system write.
 * ------------------------------------------------------------------ */

/** Only navigation supplies overrides. Our own mirrored defaults must not
 * become incoming overrides that pin one class's skill for every weapon. */
export function subscribeViewUrl(onChange: () => void): () => void {
  const onPopstate = () => {
    incomingSearch = window.location.search;
    onChange();
  };
  window.addEventListener("popstate", onPopstate);
  return () => window.removeEventListener("popstate", onPopstate);
}

/**
 * The query string at bundle load, captured before React renders.
 *
 * useSyncExternalStore reports the *server* snapshot during the hydration
 * pass, so on that pass the store claims the URL is empty even though the
 * browser already has one. Mirroring state out to the address bar on that pass
 * would erase the link the visitor just opened, so page.tsx compares against
 * this value to know it has not read the real URL yet.
 */
export const INITIAL_VIEW_SEARCH =
  typeof window === "undefined" ? "" : window.location.search;

/** Incoming query at load or navigation. Mirrored values remain output only. */
let incomingSearch = INITIAL_VIEW_SEARCH;
export const viewUrlSnapshot = (): string => incomingSearch;

/** Snapshot for the prerender and the hydration pass: no view yet. */
export const viewUrlServerSnapshot = (): string => "";

/** Mirror a view into the address bar. replaceState, not pushState: adjusting
 *  a filter should not fill up the back button. */
export function replaceViewUrl(view: ViewState, explicitControls = false): void {
  const next = `?${viewSearch(view, explicitControls)}`;
  if (window.location.search === next) return;
  window.history.replaceState(null, "", `${window.location.pathname}${next}`);
}
