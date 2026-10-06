import { matchesName } from '@/lib/entity-names';
import { useLanguage } from '@/hooks/use-language';

import { useMemo, useState } from "react";
import { Heart, MapPin, Search } from "lucide-react";
import { ItemImage, WikiLink } from "@/components/item-image";
import { ResistanceBadge } from "@/components/resistance-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { BIOME_NAME } from "@/data/biomes";

import {
  DAMAGE_LABEL,
  type Creature,
  type CreatureKind,
  type DamageType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const TIER_SORT: Record<string, number> = {
  "very-weak": 0,
  weak: 1,
  resistant: 2,
  "very-resistant": 3,
  immune: 4,
};

const KIND_LABEL: Record<CreatureKind, string> = {
  boss: "Boss",
  miniboss: "Miniboss",
  enemy: "Enemy",
};

const KIND_FILTERS: { value: "all" | CreatureKind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "boss", label: "Bosses" },
  { value: "miniboss", label: "Minibosses" },
  { value: "enemy", label: "Enemies" },
];

export function TargetPicker({
  targets,
  total,
  selected,
  onSelect,
}: {
  /** Targets reachable at the current slider step. */
  targets: Creature[];
  /** Whole-dataset count, for the "X of Y" line. */
  total: number;
  selected: Creature;
  onSelect: (target: Creature) => void;
}) {
  const { t, formatCount, nameOf, locale } = useLanguage();
  const [kind, setKind] = useState<"all" | CreatureKind>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: targets.length };
    for (const target of targets) {
      out[target.kind] = (out[target.kind] ?? 0) + 1;
    }
    return out;
  }, [targets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return targets.filter(
      (target) =>
        (kind === "all" || target.kind === kind) &&
        (!q || matchesName(target, q, locale)),
    );
  }, [targets, kind, query, locale]);

  /* The slider can move the selection while a filter is up, so the selected
   * card is always rendered even when it falls outside the current filter. */
  const shown = filtered.some((target) => target.slug === selected.slug)
    ? filtered
    : [selected, ...filtered];

  const options: SegmentedOption<"all" | CreatureKind>[] = KIND_FILTERS.map(
    (filter) => ({
      value: filter.value,
      label: (
        <span className="flex items-center gap-1">
          {t(filter.label)}
          <span className="tabular-nums text-muted-foreground">
            {formatCount(counts[filter.value] ?? 0)}
          </span>
        </span>
      ),
    }),
  );

  return (
    <section aria-label={t("Choose a target")} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-heading text-base font-semibold tracking-wide text-muted-foreground uppercase">
          {t("1 · Pick your target")}
            </h2>
        <span className="text-xs text-muted-foreground">
          {t("{shown} of {total} targets reachable", { shown: formatCount(targets.length), total: formatCount(total) })}
            </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-45 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search targets…")}
            className="h-8 pl-8"
            aria-label={t("Search targets")}
          />
        </div>
        {/* max-w-full + overflow-x-auto keep the 360 px layout free of
            horizontal page scroll; the buttons stay one scrollable row. */}
        <Segmented
          value={kind}
          onChange={setKind}
          ariaLabel={t("Filter targets by kind")}
          options={options}
          className="max-w-full overflow-x-auto"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shown.map((target) => {
          const active = target.slug === selected.slug;
          const entries = Object.entries(target.resistances) as [
            DamageType,
            never,
          ][];
          entries.sort(
            (a, b) => (TIER_SORT[a[1]] ?? 9) - (TIER_SORT[b[1]] ?? 9),
          );
          return (
            <Card
              key={target.slug}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => onSelect(target)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(target);
                }
              }}
              className={cn(
                "cursor-pointer gap-3 p-3 transition-all outline-none",
                "hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring",
                active &&
                  "border-primary/70 bg-primary/10 ring-1 ring-primary/40 hover:bg-primary/15",
              )}
            >
              <div className="flex items-center gap-3">
                <ItemImage
                  src={target.image}
                  alt={nameOf(target)}
                  size={44}
                  className="drop-shadow"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-heading truncate text-base font-semibold tracking-wide">
                      {nameOf(target)}
                    </span>
                    <WikiLink href={target.wikiUrl} name={nameOf(target)} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5">
                      <Heart className="size-3" />
                      {formatCount(target.health)} {t("HP")}
            </span>
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="size-3" />
                      {BIOME_NAME[target.biome]}
                    </span>
                    <span>{t(KIND_LABEL[target.kind])}
            </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {entries.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">
                    {t("No weaknesses — neutral to everything")}
            </span>
                ) : (
                  entries.map(([type, tier]) => (
                    <ResistanceBadge key={type} type={type} tier={tier} />
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {t("Creature stats come from the Valheim wiki. Unlisted resistances are neutral (×1). Cards show base 0-star creatures; 1★/2★ variants are not modelled.")}
            </p>
    </section>
  );
}
