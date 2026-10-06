import { useLanguage } from '@/hooks/use-language';

import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Lightbulb, Route, Target } from "lucide-react";
import { cn } from "cn";
import { ItemImage, WikiLink } from "@/components/item-image";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BIOME_NAME, type BiomeId } from "@/data/biomes";
import { GUIDE_NOTES } from "@/data/guide-notes";
import {
  type SkillMode,
} from "@/lib/damage";
import { buildGuideStep, type GuidePick } from "@/lib/guide";
import type { RecipeMaterial } from "@/lib/types";

const formatMaterials = (materials: RecipeMaterial[], number: (value: number) => string) =>
  materials.map((material) => `${number(material.quantity)}× ${material.name}`).join(" · ");

/** Matches the labels on the global skill-roll control. */
const SKILL_MODE_LABEL: Record<SkillMode, string> = {
  min: "min roll",
  avg: "average roll",
  max: "max roll",
};

const GUIDE_PANEL_ID = "progression-guide-panel";

/**
 * What to craft and upgrade before leaving the biome the slider is on.
 *
 * The skill level and roll are the page's controls, so the scores here match
 * the calculator above; only the selected step is read, so the panel can never
 * reveal gear from a biome further down the ladder — the same promise the
 * slider makes.
 *
 * The panel starts collapsed so the calculator stays the focus, and expands
 * from the header.
 */
export function ProgressionGuide({
  biome,
  skillLevel,
  skillMode,
}: {
  biome: BiomeId;
  /** The page's weapon skill level; the guide ranks at the same setting. */
  skillLevel: number;
  skillMode: SkillMode;
}) {
  const { t, formatCount, formatDamage, formatSeconds } = useLanguage();
  const [open, setOpen] = useState(false);
  const step = useMemo(
    () => buildGuideStep(biome, { skillLevel, skillMode }),
    [biome, skillLevel, skillMode],
  );

  const toggle = () => setOpen((value) => !value);

  return (
    <Card className={cn("gap-0 overflow-hidden", !open && "pb-0")}>
      <CardHeader
        className="cursor-pointer items-start gap-1 border-b bg-muted/25 px-4 py-4 transition-colors select-none hover:bg-muted/40"
        onClick={toggle}
      >
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="size-4 text-primary" />
          {t("Progression guide")}
            </CardTitle>
        <CardDescription>
          {t("What to craft and upgrade before you leave {biome}.", { biome: t(step.biome.name) })}
        </CardDescription>
        <CardAction>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={GUIDE_PANEL_ID}
            aria-label={
              open
                ? t("Collapse the progression guide")
                : t("Expand the progression guide")
            }
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={(event) => {
              event.stopPropagation();
              toggle();
            }}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </CardAction>
      </CardHeader>

      <div
        id={GUIDE_PANEL_ID}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <CardContent className="space-y-4 px-4 py-4">
            {step.gate ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-muted/25 px-3 py-2">
                <span className="flex items-center gap-1.5 text-sm">
                  <Target className="size-4 shrink-0 text-primary" />
                  <ItemImage
                    src={step.gate.image}
                    alt={step.gate.name}
                    size={18}
                  />
                  {step.biome.boss ? (
                    <>
                      {t("Gate: defeat {target}", { target: step.gate.name })}
                    </>
                  ) : (
                    <>
                      {t("No Forsaken here — scored against {target}", { target: step.gate.name })}
                    </>
                  )}
                </span>
                <Badge variant="outline" className="font-normal tabular-nums">
                  {formatCount(step.gate.health)} {t("HP")}
            </Badge>
                <span className="text-[11px] text-muted-foreground sm:ml-auto">
                  {t("Weapon skill {level} ({roll}) · primary attack · best reachable ammo", { level: formatCount(skillLevel), roll: t(SKILL_MODE_LABEL[skillMode]) })}
            </span>
              </div>
            ) : null}

            <ul className="space-y-2">
              {step.picks.map((pick) => (
                <GuidePickRow
                  key={pick.weapon.slug}
                  pick={pick}
                  gateName={step.gate?.name ?? ""}
                />
              ))}
            </ul>

            {step.picks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("Nothing new to craft at this step.")}
            </p>
            ) : null}

            <div className="space-y-1.5">
              <h3 className="flex items-center gap-1.5 font-heading text-sm font-semibold">
                <Lightbulb className="size-3.5 text-primary" />
                {t("Before you move on")}
            </h3>
              <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                {GUIDE_NOTES[biome].map((note) => (
                  <li key={note}>{t(note)}</li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] leading-snug text-muted-foreground">
              {t("One pick per weapon group, scored against the gate with its resistances applied. Per-hit damage is exact; time-to-kill uses each weapon's sourced timing cycle on primary attacks — see Methodology above.")}
            </p>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

function GuidePickRow({
  pick,
  gateName,
}: {
  pick: GuidePick;
  gateName: string;
}) {
  const { t, formatCount, formatDamage, formatSeconds } = useLanguage();
  const {
    weapon,
    ammo,
    quality,
    upgradeable,
    craft,
    upgradeCost,
    locked,
    result,
  } = pick;

  return (
    <li className="rounded-lg border bg-muted/10 px-3 py-3">
      <div className="flex items-start gap-3">
        <ItemImage src={weapon.image} alt={weapon.name} size={40} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-heading text-sm font-semibold">
              {weapon.name}
            </span>
            <WikiLink href={weapon.wikiUrl} name={weapon.name} />
            <Badge variant="secondary" className="font-normal">
              {t(weapon.clsLabel)}
            </Badge>
            {upgradeable && quality > 1 ? (
              <Badge variant="outline" className="font-normal">
                {t("Upgrade to Q{level}", { level: formatCount(quality) })}
              </Badge>
            ) : null}
            {ammo ? (
              <Badge variant="outline" className="gap-1 font-normal">
                <ArrowRight className="size-3" />
                {ammo.name}
              </Badge>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {formatDamage(result.perHit)}
            </span>{" "}
            {t("per hit ·")}{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {formatSeconds(result.ttk)}
            </span>{" "}
            {t("to kill {target}", { target: gateName })}
          </p>

          <div className="grid gap-x-6 gap-y-0.5 text-[11px] sm:grid-cols-2">
            <div className="flex gap-1">
              <span className="shrink-0 text-muted-foreground">{t("Craft:")}
            </span>
              <span className="text-foreground/80">
                {formatMaterials(craft, formatCount)}
              </span>
            </div>
            {upgradeable && quality > 1 ? (
              <div className="flex gap-1">
                <span className="shrink-0 text-muted-foreground">
                  {t("Upgrade materials:")}
            </span>
                <span className="text-foreground/80">
                  {formatMaterials(upgradeCost, formatCount)}
                </span>
              </div>
            ) : null}
          </div>

          {locked ? (
            <p className="text-[11px] text-amber-400">
              {t("Q{level} is out of reach at this step:", { level: formatCount(locked.level) })}{" "}
              {locked.materials
                .map(
                  (material) =>
                    `${material.name}${material.biome ? ` (${t(BIOME_NAME[material.biome])})` : ""}`,
                )
                .join(", ")}
              .
            </p>
          ) : null}

          {!upgradeable ? (
            <p className="text-[11px] text-muted-foreground">
              {t("The wiki lists no upgrade table for this one.")}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
