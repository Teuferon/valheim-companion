
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
import { RESISTANCE_MULTIPLIER, type ModifierTier } from "@/lib/types";
import type { WeaponClass } from "@/data/weapon-class";

const TIERS: ModifierTier[] = [
  "very-weak",
  "weak",
  "neutral",
  "resistant",
  "very-resistant",
  "immune",
];

/** Fixed format, so the date does not depend on the visitor's locale (a
 *  locale-formatted date here rendered as the confusing "5. jñna 2026"). */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "an unknown date";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const WEAPON_NAME = new Map(weapons.map((weapon) => [weapon.slug, weapon.name]));

/** How one attack repeats, as a compact string for the class table. */
function timingLabel(profile: AttackProfile): string {
  switch (profile.timing.kind) {
    case "bow":
      return "max(0.8 s, 2.5 − 0.02 × skill)";
    case "crossbow":
      return "3.5 × (1 − skill/200) + 1.85 s";
    case "fixed":
      return `${profile.timing.seconds.toFixed(2)} s`;
  }
}

/** Combo shape: hits per cycle and their damage weights. */
function comboLabel(profile: AttackProfile): string {
  if (profile.comboMults.length === 1) {
    return profile.damageMult === 1 ? "" : ` · ×${profile.damageMult}`;
  }
  return ` · ${profile.comboMults.length} hits (${profile.comboMults.join("+")}×)`;
}

/** One line per class paired with its attack profile, for the timing list. */
type TimingRow = { key: string; label: string; profile: AttackProfile };

const TIMING_ROWS: TimingRow[] = (
  Object.keys(ATTACK_PROFILES) as WeaponClass[]
).flatMap((cls) => {
  const timing = ATTACK_PROFILES[cls];
  const rows: TimingRow[] = [
    { key: `${cls}-primary`, label: `${CLASS_LABELS[cls]} (primary)`, profile: timing.primary },
  ];
  if (timing.secondary) {
    rows.push({
      key: `${cls}-secondary`,
      label: `${CLASS_LABELS[cls]} (secondary)`,
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

/** The whole write-up, unchanged: shown inside the dialog instead of on the page. */
function MethodologySections() {
  return (
    <>
        <div className="space-y-2">
          <h3 className="font-heading text-base font-semibold">The formula</h3>
          <p className="text-muted-foreground">
            Straight from the wiki&apos;s{" "}
            <a
              className="text-primary underline decoration-dotted underline-offset-2"
              href="https://valheim.weirdgloop.org/wiki/Damage_mechanics"
              target="_blank"
              rel="noopener noreferrer"
            >
              Damage mechanics
            </a>{" "}
            page:
          </p>
          <pre className="scrollbar-thin overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
{`damage = listed damage
       × skill factor            // 0.25–0.55 at skill 0, →1.0 by skill 75
       × backstab bonus          // first hit vs an unaware enemy, then immune
       × stagger bonus           // not modelled
       × attack bonus            // combo weights, e.g. ×2 on a finisher
       × multitarget penalty     // single target here = ×1
       × damage type modifier    // resistance tier

listed damage = weapon value + ammo value`}
          </pre>
        </div>

        <div className="space-y-2">
          <h3 className="font-heading text-base font-semibold">Resistance tiers</h3>
          <div className="flex flex-wrap gap-1.5">
            {TIERS.map((tier) => (
              <Badge key={tier} variant="outline" className="gap-1 font-normal">
                {tier.replace("-", " ")}
                <span className="text-muted-foreground tabular-nums">
                  ×{RESISTANCE_MULTIPLIER[tier]}
                </span>
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Chop, Pickaxe and Pure are terrain damage (woodcutting, mining and
            structure damage) and are excluded — the wiki lists every creature
            except Barka as immune to chop, and all except a few Deep North
            creatures as immune to pickaxe. That is why a Stone Axe&apos;s chop
            damage never shows up as creature damage, and why the siege items are
            listed with little or no creature damage at all.
          </p>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
            <TriangleAlert className="size-4 text-amber-400" />
            Attack timing: sourced, never guessed
          </h3>
          <p className="text-muted-foreground">
            Timings come from the wiki&apos;s attack-speed tables (retrieved{" "}
            {TIMING_RETRIEVED}) and MaxDPS&apos;s game-derived model (
            {MAXDPS_BUILD}). Each attack says which one it uses; where the
            sources disagree, the alternative stays on record. Timing always
            means the repeat cycle — not a single swing.
          </p>

          <div className="space-y-1.5">
            <h4 className="font-heading text-sm font-semibold">
              Caveats, disagreements and unknowns
            </h4>
            <ul className="space-y-1 text-[11px] leading-snug text-muted-foreground">
              {CONFLICTS.map(({ key, label, profile }) => (
                <li key={key}>
                  <span className="text-foreground">{label}</span> —{" "}
                  {profile.note ? `${profile.note} ` : ""}
                  {profile.alternates?.length
                    ? `Alternative: ${profile.alternates
                        .map(
                          (alt) =>
                            `${alt.seconds.toFixed(2)} s — ${alt.source.label}.${alt.note ? ` ${alt.note}` : ""}`,
                        )
                        .join(" ")}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>

          <details className="rounded-lg border bg-muted/25">
            <summary className="cursor-pointer px-2.5 py-2 text-xs font-medium">
              All class timings and sources
            </summary>
            <ul className="space-y-1 border-t px-2.5 py-2 text-[11px]">
              {TIMING_ROWS.map(({ key, label, profile }) => (
                <li key={key} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-muted-foreground">{label}</span>
                  <a
                    className="tabular-nums text-primary underline decoration-dotted underline-offset-2"
                    href={profile.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={profile.source.label}
                  >
                    {timingLabel(profile)}
                    {comboLabel(profile)}
                  </a>
                  <span className="text-muted-foreground">
                    {CONFIDENCE_LABEL[profile.confidence]}
                  </span>
                </li>
              ))}
            </ul>
          </details>

          <div className="space-y-1.5">
            <h4 className="font-heading text-sm font-semibold">
              Weapon-specific schedules
            </h4>
            <ul className="space-y-1 text-[11px] leading-snug text-muted-foreground">
              {Object.entries(WEAPON_PRIMARY_OVERRIDES).map(([slug, profile]) => (
                <li key={slug}>
                  <span className="text-foreground">
                    {WEAPON_NAME.get(slug) ?? slug}
                  </span>{" "}
                  — {timingLabel(profile)}
                  {comboLabel(profile)}
                  {profile.hitTimes
                    ? ` · hits at ${profile.hitTimes.map((t) => `${t.toFixed(3)} s`).join(", ")}`
                    : ""}{" "}
                  ({profile.source.label}).{" "}
                  {profile.alternates
                    ?.map(
                      (alt) =>
                        `Alternative: ${alt.seconds.toFixed(2)} s — ${alt.source.label}.${alt.note ? ` ${alt.note}` : ""}`,
                    )
                    .join(" ")}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Per-hit damage does not use these values at all, so it stays exact
            even where the timing is a model or an estimate. Cycle DPS excludes
            stamina, eitr and interruptions; time-to-kill uses a published hit
            schedule where one exists and averages the cycle otherwise.
          </p>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-heading text-base font-semibold">
            <BookOpen className="size-4 text-primary" />
            Sources
          </h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              Data scraped from{" "}
              <a
                className="text-primary underline decoration-dotted underline-offset-2"
                href={datasetMeta.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                valheim.weirdgloop.org
              </a>{" "}
              via the MediaWiki API on {formatDate(datasetMeta.generatedAt)}.
              The older Fandom wiki is a version behind — it has no Deep North
              content — so it is no longer used.
            </li>
            <li>
              Attack timing: the wiki&apos;s attack-speed tables (Axes, Swords,
              Clubs, Knives, Fists, Spears, Polearms, Pickaxes, Bows,
              Crossbows, Dundr), retrieved {TIMING_RETRIEVED};{" "}
              <a
                className="text-primary underline decoration-dotted underline-offset-2"
                href="https://valheim.maxdps.com/methodology"
                target="_blank"
                rel="noopener noreferrer"
              >
                MaxDPS
              </a>{" "}
              game-derived model ({MAXDPS_BUILD}); ballista structure values from{" "}
              <a
                className="text-primary underline decoration-dotted underline-offset-2"
                href="https://valheim.gaming.tools/structures/piece_turret"
                target="_blank"
                rel="noopener noreferrer"
              >
                valheim.gaming.tools
              </a>
              .
            </li>
            <li>
              {datasetMeta.counts.weapons} weapons · {datasetMeta.counts.ammo} ammo
              types · {datasetMeta.counts.bosses} bosses ·{" "}
              {datasetMeta.counts.minibosses ?? 4} minibosses ·{" "}
              {datasetMeta.counts.enemies ?? 67} enemies ·{" "}
              {datasetMeta.counts.biomes ?? 9} biomes.
            </li>
            <li>
              <span className="text-foreground">Availability is derived, not
              listed:</span>{" "}
              an item appears once its crafting station and every material in its
              crafting recipe are reachable at the selected biome, resolved
              through the same recipe data for materials that are themselves
              weapons. Upgrade levels are gated separately, and a material
              missing from the curated table fails the scrape instead of being
              guessed at.
            </li>
            <li>
              <span className="text-foreground">Creatures:</span> the eight
              Forsaken, Hildir&apos;s four minibosses and every aggressive
              creature are scraped with the wiki&apos;s base (0-star) health and
              resistances; 1★/2★ variants are not modelled. Aggressive creatures
              are grouped by the biome the wiki lists them under, and miniboss
              biomes come from the dungeon each one occupies.
            </li>
            <li>
              <span className="text-foreground">Backstab:</span> an unaware
              enemy takes the weapon&apos;s tooltip bonus on the first hit. The
              wiki names Abyssal Harpoon 1×, two-handed clubs 2×, knives and
              Flesh Rippers 6×, and every other weapon 3×; a value the item
              publishes itself (Dundr 1×, the siege payloads 4×) wins. A
              backstab grants the target five minutes of backstab immunity, so
              only the opening hit is boosted — turn it on with the Enemy state
              control.
            </li>
            <li>
              Excluded on purpose: shields (no damage), summon and support
              staves whose damage comes from minions, dev/cheat items, and gear
              whose recipe is disabled in the current build.
            </li>
            <li>
              Not modelled: armour (creatures have none), blocking, parrying,
              stagger, multi-target penalties, and multi-projectile or area
              effects (Dundr&apos;s 12-bolt grapeshot and explosion damage). All
              of those multiply the numbers shown here rather than changing the
              ranking.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Re-scrape the wiki at any time with <code>npm run scrape</code>.
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
            {TITLE}
          </DialogTitle>
          <DialogDescription>{SUMMARY}</DialogDescription>
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
  return (
    <MethodologyShell
      trigger={
        <button type="button" className={cn(HEADER_BUTTON, className)}>
          <Info className="size-3.5" />
          Methodology
        </button>
      }
    />
  );
}

/** Footer trigger, where a bordered button would be too heavy. */
export function MethodologyLink() {
  return (
    <MethodologyShell
      trigger={
        <button
          type="button"
          className="cursor-pointer rounded-sm text-primary underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {TITLE}
        </button>
      }
    />
  );
}
