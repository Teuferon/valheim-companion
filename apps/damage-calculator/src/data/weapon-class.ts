/** Weapon classes shared by the scraper output and the damage engine. */
export type WeaponClass =
  | "axe"
  | "battleaxe"
  | "dual-axe"
  | "club"
  | "sledge"
  | "sword"
  | "greatsword"
  | "knife"
  | "spear"
  | "atgeir"
  | "fists"
  | "bow"
  | "crossbow"
  | "staff"
  | "blood-staff"
  | "pickaxe"
  | "bomb"
  | "missile"
  | "siege";

/**
 * Canonical display labels.
 *
 * Defined statically rather than derived from the scraped weapons: a class can
 * legitimately have zero entries (blood magic staves are excluded from the
 * dataset because their damage comes from summons), and deriving the labels
 * would leak the raw class key into the UI for those.
 */
export const WEAPON_CLASS_LABELS: Record<WeaponClass, string> = {
  axe: "One-handed Axe",
  battleaxe: "Battleaxe (2H Axe)",
  "dual-axe": "Dual-wielded Axes",
  club: "One-handed Club",
  sledge: "Sledgehammer (2H Club)",
  sword: "Sword",
  greatsword: "Two-handed Sword",
  knife: "Knife",
  spear: "Spear",
  atgeir: "Polearm (Atgeir)",
  fists: "Unarmed",
  bow: "Bow",
  crossbow: "Crossbow",
  staff: "Elemental Staff",
  "blood-staff": "Blood Magic Staff",
  pickaxe: "Pickaxe",
  bomb: "Bomb",
  missile: "Ballista Missile",
  siege: "Catapult Ammo",
};

/** Order from lightest to heaviest, used for grouped display. */
export const WEAPON_CLASS_ORDER: WeaponClass[] = [
  "fists",
  "knife",
  "sword",
  "axe",
  "dual-axe",
  "club",
  "spear",
  "atgeir",
  "greatsword",
  "battleaxe",
  "sledge",
  "pickaxe",
  "bow",
  "crossbow",
  "staff",
  "blood-staff",
  "bomb",
  "missile",
  "siege",
];