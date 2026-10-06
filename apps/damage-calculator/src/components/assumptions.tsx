import { useLanguage } from '@/hooks/use-language';

import type { Translate, TranslateNumber, Locale } from "../../../../shared/i18n/core";
import type { ReactElement } from "react";
import { cn } from "cn";
import { BookOpen, FlaskConical, Info, TriangleAlert } from "lucide-react";
import {
  ATTACK_PROFILES,
  CONFIDENCE_LABEL,
  MAXDPS_BUILD,
  TIMING_RETRIEVED,
  WEAPON_PRIMARY_OVERRIDES,
  type AttackProfile,
} from "@/data/attack-profiles";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CLASS_LABELS, datasetMeta, weapons } from "@/lib/data";
import { RESISTANCE_MULTIPLIER, RESISTANCE_LABEL, type ModifierTier } from "@/lib/types";
import type { WeaponClass } from "@/data/weapon-class";

const TIERS: ModifierTier[] = [
  "very-weak",
  "weak",
  "neutral",
  "resistant",
  "very-resistant",
  "immune",
];

/** Format source dates in the selected language while keeping the UTC day. */
function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const WEAPON_BY_SLUG = new Map(weapons.map((weapon) => [weapon.slug, weapon]));

/** How one attack repeats, as a compact string for the class table. */
function timingLabel(profile: AttackProfile, t: Translate, number: (value: number, digits?: number) => string): string {
  switch (profile.timing.kind) {
    case "bow":
      return t("max({min} s, {base} − {factor} × skill)", { min: number(0.8), base: number(2.5), factor: number(0.02) });
    case "crossbow":
      return t("{reload} × (1 − skill/{limit}) + {shot} s", { reload: number(3.5), limit: number(200), shot: number(1.85) });
    case "fixed":
      return `${number(profile.timing.seconds, 2)} s`;
  }
}

/** Combo shape: hits per cycle and their damage weights. */
function comboLabel(profile: AttackProfile, tn: TranslateNumber, number: (value: number) => string): string {
  if (profile.comboMults.length === 1) {
    return profile.damageMult === 1 ? "" : ` · ×${number(profile.damageMult)}`;
  }
  return tn(" · {count} hits ({weights}×)", profile.comboMults.length, { count: number(profile.comboMults.length), weights: profile.comboMults.map(value => number(value)).join("+") });
}

/** One line per class paired with its attack profile, for the timing list. */
type TimingRow = { key: string; cls: WeaponClass; attack: string; profile: AttackProfile };

const TIMING_ROWS: TimingRow[] = (
  Object.keys(ATTACK_PROFILES) as WeaponClass[]
).flatMap((cls) => {
  const timing = ATTACK_PROFILES[cls];
  const rows: TimingRow[] = [
    { key: `${cls}-primary`, cls, attack: "Primary", profile: timing.primary },
  ];
  if (timing.secondary) {
    rows.push({
      key: `${cls}-secondary`,
      cls, attack: "Secondary",
      profile: timing.secondary,
    });
  }
  return rows;
});

/** Profiles with a caveat, a recorded disagreement or an estimated value. */
const CONFLICTS = TIMING_ROWS.filter(
  (row) =>
    Boolean(row.profile.note) ||
    row.profile.confidence === "estimate" ||
    (row.profile.alternates?.length ?? 0) > 0,
);

const TITLE = "How the numbers are calculated";

const SUMMARY =
  "Weapon, boss and recipe data are scraped from the Valheim wiki into JSON committed with the app, so it needs no network at runtime. Attack timing is documented separately below with its sources and confidence.";

/** Trigger styling copied from the Share button so the header stays one row. */
const HEADER_BUTTON =
  "flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium whitespace-nowrap transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** The translated methodology shown inside the dialog. */
function MethodologySections() {
  const { t, tn, locale, number, formatCount, nameOf } = useLanguage();
  return (
    <>
        <div className="space-y-2">
          <h3 className="font-heading text-base font-semibold">{t("The formula")}
            </h3>
          <p className="text-muted-foreground">

            <a
              className="text-primary underline decoration-dotted underline-offset-2"
              href="https://valheim.weirdgloop.org/wiki/Damage_mechanics"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Damage mechanics")}</a>{" "}
            </p>
          <pre className="scrollbar-thin overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
{t(`damage = listed damage
       × skill factor            // 0.25–0.55 at skill 0, →1.0 by skill 75
       × backstab bonus          // first hit vs an unaware enemy, then immune
       × stagger bonus           // not modelled
       × attack bonus            // combo weights, e.g. ×2 on a finisher
       × multitarget penalty     // single target here = ×1
       × damage type modifier    // resistance tier

listed damage = weapon value + ammo value`)}
          </pre>
        </div>

        <div className="space-y-2">
          <h3 className="font-heading text-base font-semibold">{t("Resistance tiers")}
            </h3>
          <div className="flex flex-wrap gap-1.5">
            {TIERS.map((tier) => (
              <Badge key={tier} variant="outline" className="gap-1 font-normal">
                {t(RESISTANCE_LABEL[tier])}
                <span className="text-muted-foreground tabular-nums">
                  ×{number(RESISTANCE_MULTIPLIER[tier])}
                </span>
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("{types} are terrain damage (woodcutting, mining and structure damage) and are excluded — the wiki lists every creature except {creature} as immune to {chop}, and all except a few {biome} creatures as immune to {pickaxe}. That is why a {weapon}'s {chop} damage never shows up as creature damage, and why the siege items are listed with little or no creature damage at all.", { types: "Chop, Pickaxe, Pure", creature: "Barka", biome: "Deep North", weapon: "Stone Axe", chop: "Chop", pickaxe: "Pickaxe" })}
            </p>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
            <TriangleAlert className="size-4 text-amber-400" />
            {t("Attack timing: sourced, never guessed")}
            </h3>
          <p className="text-muted-foreground">
            {t("Timings use wiki attack-speed tables (retrieved {date}) and MaxDPS ({build}). Sources and disagreements are recorded below. Timing means a repeat cycle, not one swing.", { date: TIMING_RETRIEVED, build: MAXDPS_BUILD })}
            </p>

          <div className="space-y-1.5">
            <h4 className="font-heading text-sm font-semibold">
              {t("Caveats, disagreements and unknowns")}
            </h4>
            <ul className="space-y-1 text-[11px] leading-snug text-muted-foreground">
              {CONFLICTS.map(({ key, cls, attack, profile }) => (
                <li key={key}>
                  <span className="text-foreground">{t("{class} ({attack})", { class: CLASS_LABELS[cls], attack: t(attack) })}
            </span> —{" "}
                  {profile.note ? `${t(profile.note)} ` : ""}
                  {profile.alternates?.length
                    ? `${t("Alternative:")} ${profile.alternates
                        .map(
                          (alt) =>
                            `${number(alt.seconds, 2)} s — ${alt.source.label}.${alt.note ? ` ${t(alt.note)}` : ""}`,
                        )
                        .join(" ")}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>

          <details className="rounded-lg border bg-muted/25">
            <summary className="cursor-pointer px-2.5 py-2 text-xs font-medium">
              {t("All class timings and sources")}
            </summary>
            <ul className="space-y-1 border-t px-2.5 py-2 text-[11px]">
              {TIMING_ROWS.map(({ key, cls, attack, profile }) => (
                <li key={key} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-muted-foreground">{t("{class} ({attack})", { class: CLASS_LABELS[cls], attack: t(attack) })}
            </span>
                  <a
                    className="tabular-nums text-primary underline decoration-dotted underline-offset-2"
                    href={profile.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={profile.source.label}
                  >
                    {timingLabel(profile, t, number)}
                    {comboLabel(profile, tn, number)}
                  </a>
                  <span className="text-muted-foreground">
                    {t(CONFIDENCE_LABEL[profile.confidence])}
                  </span>
                </li>
              ))}
            </ul>
          </details>

          <div className="space-y-1.5">
            <h4 className="font-heading text-sm font-semibold">
              {t("Weapon-specific schedules")}
            </h4>
            <ul className="space-y-1 text-[11px] leading-snug text-muted-foreground">
              {Object.entries(WEAPON_PRIMARY_OVERRIDES).map(([slug, profile]) => (
                <li key={slug}>
                  <span className="text-foreground">
                    {WEAPON_BY_SLUG.has(slug) ? nameOf(WEAPON_BY_SLUG.get(slug)!) : slug}
                  </span>{" "}
                  — {timingLabel(profile, t, number)}
                  {comboLabel(profile, tn, number)}
                  {profile.hitTimes
                    ? t(" · hits at {times}", { times: profile.hitTimes.map(value => `${number(value, 3)} s`).join(", ") })
                    : ""}{" "}
                  ({profile.source.label}).{" "}
                  {profile.alternates
                    ?.map(
                      (alt) =>
                        `${t("Alternative:")} ${number(alt.seconds, 2)} s — ${alt.source.label}.${alt.note ? ` ${t(alt.note)}` : ""}`,
                    )
                    .join(" ")}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("Per-hit damage does not use these values at all, so it stays exact even where the timing is a model or an estimate. Cycle DPS excludes stamina, eitr and interruptions; time-to-kill uses a published hit schedule where one exists and averages the cycle otherwise.")}
            </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
            <BookOpen className="size-4 text-primary" />
            {t("Sources")}
            </h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              <a className="text-primary underline" href={datasetMeta.source} target="_blank" rel="noopener noreferrer">Valheim Wiki</a>{' · '}
              {t("Data retrieved via MediaWiki API on {date}. The outdated Fandom wiki is no longer used.", { date: formatDate(datasetMeta.generatedAt, locale) })}
            </li>
            <li>
              {t("Timing sources: wiki attack-speed tables, MaxDPS game model and ballista structure data.")}{' '}
              <a className="text-primary underline" href="https://valheim.maxdps.com/methodology" target="_blank" rel="noopener noreferrer">MaxDPS</a>{' · '}
              <a className="text-primary underline" href="https://valheim.gaming.tools/structures/piece_turret" target="_blank" rel="noopener noreferrer">valheim.gaming.tools</a>
            </li>
            <li>
              {[
                tn("{count} weapons", datasetMeta.counts.weapons, { count: formatCount(datasetMeta.counts.weapons) }),
                tn("{count} ammo types", datasetMeta.counts.ammo, { count: formatCount(datasetMeta.counts.ammo) }),
                tn("{count} bosses", datasetMeta.counts.bosses, { count: formatCount(datasetMeta.counts.bosses) }),
                tn("{count} minibosses", datasetMeta.counts.minibosses ?? 4, { count: formatCount(datasetMeta.counts.minibosses ?? 4) }),
                tn("{count} enemies", datasetMeta.counts.enemies ?? 67, { count: formatCount(datasetMeta.counts.enemies ?? 67) }),
                tn("{count} biomes", datasetMeta.counts.biomes ?? 9, { count: formatCount(datasetMeta.counts.biomes ?? 9) }),
              ].join(" · ")}
            </li>
            <li>
              <span className="text-foreground">{t("Availability is derived, not listed:")}
            </span>{" "}
              {t("an item appears once its crafting station and every material in its crafting recipe are reachable at the selected biome, resolved through the same recipe data for materials that are themselves weapons. Upgrade levels are gated separately, and a material missing from the curated table fails the scrape instead of being guessed at.")}</li>
            <li>
              <span className="text-foreground">{t("Creatures:")}
            </span> {t("the eight Forsaken, Hildir's four minibosses and every aggressive creature are scraped with the wiki's base (0-star) health and resistances; 1★/2★ variants are not modelled. Aggressive creatures are grouped by the biome the wiki lists them under, and miniboss biomes come from the dungeon each one occupies.")}</li>
            <li>
              <span className="text-foreground">{t("Backstab:")}
            </span> {t("An unaware enemy takes the weapon's backstab bonus on the first hit — 1× to 6×, shown per weapon below. The hit then gives it five minutes of backstab immunity, so later hits are normal. {examples}", { examples: "Abyssal Harpoon 1×; Two-handed Club 2×; Knife / Flesh Rippers 6×; Dundr 1×; Siege 4×; 3×." })}</li>
            <li>
              {t("Excluded on purpose: shields (no damage), summon and support staves whose damage comes from minions, dev/cheat items, and gear whose recipe is disabled in the current build.")}</li>
            <li>
              {t("Not modelled: armour (creatures have none), blocking, parrying, stagger, multi-target penalties, and multi-projectile or area effects ({weapon}'s 12-bolt grapeshot and explosion damage). All of those multiply the numbers shown here rather than changing the ranking.", { weapon: "Dundr" })}</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            {t("Refresh data with {command}.", { command: "npm run scrape" })}
          </p>
        </div>
      </>
    );
}

/**
 * The methodology write-up lives in a modal rather than at the bottom of the
 * page, so the page ends on the numbers and the footnotes are one click away.
 */
function MethodologyShell({
  trigger,
  className,
}: {
  trigger: ReactElement;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent
        className={cn(
          "grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-3xl",
          "max-h-[85vh]",
          className,
        )}
      >
        <DialogHeader className="gap-1 border-b bg-muted/25 px-4 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="size-4 text-primary" />
            {t(TITLE)}
          </DialogTitle>
          <DialogDescription>{t(SUMMARY)}</DialogDescription>
        </DialogHeader>
        {/* min-h-0 lets the grid row shrink, so a long write-up scrolls here
            instead of pushing the dialog past the viewport. */}
        <div className="scrollbar-thin min-h-0 space-y-4 overflow-y-auto px-4 py-4 text-sm">
          <MethodologySections />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Header trigger: an info button sitting beside Share. */
export function MethodologyDialog({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <MethodologyShell
      trigger={
        <button type="button" className={cn(HEADER_BUTTON, className)}>
          <Info className="size-3.5" />
          {t("Methodology")}
            </button>
      }
    />
  );
}

/** Footer trigger, where a bordered button would be too heavy. */
export function MethodologyLink() {
  const { t } = useLanguage();
  return (
    <MethodologyShell
      trigger={
        <button
          type="button"
          className="cursor-pointer rounded-sm text-primary underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t(TITLE)}
        </button>
      }
    />
  );
}
