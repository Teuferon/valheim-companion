import { useLanguage } from '@/hooks/use-language';

import type { ReactNode } from "react";
import { ArrowRight, Info, Swords, TriangleAlert } from "lucide-react";
import { ItemImage, WikiLink } from "@/components/item-image";
import {
  ResistanceBadge,
  type Tier,
} from "@/components/resistance-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Separator } from "@/components/ui/separator";
import type { AttackKind } from "@/data/attack-profiles";
import { CONFIDENCE_LABEL } from "@/data/attack-profiles";
import type { WeaponClass } from "@/data/weapon-class";
import { MAX_QUALITY, type CalculationResult } from "@/lib/damage";
import { DAMAGE_COLOR, DAMAGE_LABEL, RESISTANCE_MULTIPLIER, type Ammo, type Weapon } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WeaponDetail({
  weapon,
  ammo,
  quality,
  qualityNote,
  onQualityChange,
  attack,
  onAttackChange,
  canUseSecondary,
  onToggleClass,
  classActive,
  result,
  bestResult,
}: {
  weapon: Weapon;
  ammo: Ammo | null;
  quality: number;
  /** Set when the requested upgrade level is not reachable at the current
   *  progression step, explaining what is shown instead. */
  qualityNote?: string;
  onQualityChange: (q: number) => void;
  attack: AttackKind;
  onAttackChange: (a: AttackKind) => void;
  canUseSecondary: boolean;
  /** Clicking the class label toggles the ranking filter onto that class. */
  onToggleClass: (cls: WeaponClass) => void;
  /** True when the ranking is already filtered to this weapon's class. */
  classActive: boolean;
  result: CalculationResult;
  bestResult: { weapon: Weapon; perHit: number; dps: number } | null;
}) {
  const { t, formatCount, formatDamage, formatSeconds, number, nameOf } = useLanguage();
  const isBest = bestResult?.weapon.slug === weapon.slug;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="gap-3 border-b bg-muted/25 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-background/60 p-2 ring-1 ring-border">
            <ItemImage src={weapon.image} alt={nameOf(weapon)} size={44} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <CardTitle className="truncate text-lg">{nameOf(weapon)}</CardTitle>
              <WikiLink href={weapon.wikiUrl} name={nameOf(weapon)} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {/* Same one-click class filter as the ranking rows. */}
              <Badge
                variant="secondary"
                className="cursor-pointer font-normal hover:bg-secondary/70"
                render={<button type="button" />}
                aria-pressed={classActive}
                onClick={() => onToggleClass(weapon.cls)}
                title={
                  classActive
                    ? t("Clear the {type} filter", { type: weapon.clsLabel })
                    : t("Filter the ranking to {type}", { type: weapon.clsLabel })
                }
              >
                {weapon.clsLabel}
              </Badge>
              {weapon.ammo && ammo ? (
                <Badge variant="outline" className="gap-1 font-normal">
                  <ArrowRight className="size-3" />
                  {nameOf(ammo)}
                </Badge>
              ) : null}
              {isBest ? (
                <Badge className="gap-1">
                  <Swords className="size-3" />
                  {t("Top pick")}
            </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("Upgrade level")}
            </div>
            {weapon.consumable ? (
              /* Bombs, ballista missiles and catapult ammo are consumables:
               * one damage value, crafted in batches, no upgrade levels. */
              <p className="text-xs text-muted-foreground">
                {t("Not upgradable — this is a consumable with a single damage value.")}
            </p>
            ) : (
              <div className="space-y-1.5">
                <Segmented
                  value={String(quality)}
                  onChange={(v) => onQualityChange(Number(v))}
                  ariaLabel={t("Upgrade level")}
                  className="w-full"
                  itemClassName="flex-1"
                  options={Array.from({ length: MAX_QUALITY }, (_, i) => i + 1).map(
                    (q) => ({ value: String(q), label: "★".repeat(q) }),
                  )}
                />
                {qualityNote ? (
                  <p className="text-[10px] leading-snug text-amber-400">
                    {qualityNote}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("Attack")}
            </div>
            <Segmented
              value={attack}
              onChange={onAttackChange}
              ariaLabel={t("Attack type")}
              className="w-full"
              itemClassName="flex-1"
              options={[
                { value: "primary", label: t("Primary") },
                {
                  value: "secondary",
                  label: t("Secondary"),
                  disabled: !canUseSecondary,
                },
              ]}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label={t(result.backstabApplied ? "Backstab hit" : "Per hit")}
            value={formatDamage(result.perHit)}
            accent
          />
          <Stat label={t("Cycle DPS")} value={formatDamage(result.dps)} />
          <Stat label={t("Time to kill")} value={formatSeconds(result.ttk)} />
        </div>

        {/* Scrolls horizontally on narrow screens instead of stretching the
            whole page. */}
        <div className="scrollbar-thin overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[22rem] text-sm">
            <thead className="bg-muted/40 text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-2.5 py-1.5 text-left font-medium">{t("Type")}
            </th>
                <th className="px-2.5 py-1.5 text-right font-medium">{t("Base")}
            </th>
                <th className="px-2.5 py-1.5 text-left font-medium">
                  {t("After resistance")}
            </th>
                <th className="px-2.5 py-1.5 text-right font-medium">
                  {t("Effective")}
            </th>
              </tr>
            </thead>
            <tbody>
              {result.lines.map((line) => (
                <tr key={line.type} className="border-t">
                  <td
                    className={cn(
                      "px-2.5 py-1.5 font-medium",
                      DAMAGE_COLOR[line.type],
                    )}
                  >
                    {DAMAGE_LABEL[line.type]}
                  </td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums">
                    {formatDamage(line.base)}
                  </td>
                  <td className="px-2.5 py-1.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <ResistanceBadge
                        type={line.type}
                        tier={line.tier as Tier}
                        className="px-1 py-0"
                      />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        ×{number(RESISTANCE_MULTIPLIER[line.tier as Tier])} → {formatDamage(line.base * line.multiplier)}
                      </span>
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-semibold tabular-nums">
                    {formatDamage(line.effective)}
                  </td>
                </tr>
              ))}
              {result.lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-2.5 py-3 text-center text-muted-foreground"
                  >
                    {t("This item deals no damage to creatures.")}
            </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/40">
                <td className="px-2.5 py-2 font-semibold" colSpan={3}>
                  {t(result.backstabApplied ? "Backstab first hit" : "Total per hit")}
                </td>
                <td className="px-2.5 py-2 text-right font-bold text-primary tabular-nums">
                  {formatDamage(result.perHit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <Separator />

        <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
          <Row label={t("Listed damage")} value={formatDamage(result.perHitRaw)} />
          <Row label={t("Skill factor")} value={`×${number(result.skillFactor, 3)}`} />
          <Row
            label={t("Backstab bonus")}
            value={`×${number(result.backstabMultiplier)}${
              result.backstabApplied ? t(" · first hit") : ""
            }`}
          />
          <Row label={t("Cycle time")} value={formatSeconds(result.cycleSeconds)} />
          <Row
            label={t("Damage events per cycle")}
            value={formatCount(result.eventCount)}
          />
          <Row
            label={t("Cycles to kill")}
            value={
              result.perHit > 0
                ? formatCount(Math.ceil(result.ttk / result.cycleSeconds))
                : "—"
            }
          />
          <Row
            label={t("Timing source")}
            value={
              <a
                href={result.timingSource.url}
                target="_blank"
                rel="noopener noreferrer"
                title={result.timingSource.label}
                className="text-primary underline decoration-dotted underline-offset-2"
              >
                {t(CONFIDENCE_LABEL[result.timingConfidence])}
              </a>
            }
          />
          {bestResult ? (
            <Row
              label={t("Vs best pick")}
              value={t("{percent}% of {weapon}", { percent: number((result.perHit / bestResult.perHit) * 100, 0), weapon: nameOf(bestResult.weapon) })}
            />
          ) : null}
        </dl>

        <p className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" />
          {t("Per-hit damage is exact wiki data. Cycle DPS is one full combo over its timing cycle, and time-to-kill uses a published hit schedule where one exists — otherwise it averages the cycle. Both depend on the attack timing documented under Methodology above.")}
            </p>

        {result.backstabApplied ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {t("The first hit takes a ×{bonus} backstab bonus. The target is then immune to backstab for five minutes; later hits are normal.", { bonus: number(result.backstabMultiplier) })}
            </p>
        ) : null}

        {result.timingNote ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {t(result.timingNote)}
          </p>
        ) : null}

        {result.lines.length === 0 ? (
          <p className="flex gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug">
            <TriangleAlert className="mt-0.5 size-3 shrink-0 text-amber-400" />
            {t("Terrain damage ({types}) is excluded from creature damage.", { types: "Chop, Pickaxe, Pure" })}
            </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/25 px-2.5 py-2">
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div
        className={cn(
          "font-semibold tabular-nums",
          accent ? "text-xl text-primary" : "text-lg",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
