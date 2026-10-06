import { useLanguage } from '@/hooks/use-language';

import { useMemo, useState } from "react";
import { Crown, Search, X } from "lucide-react";
import { ItemImage, WikiLink } from "@/components/item-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Segmented } from "@/components/ui/segmented";
import type { WeaponClass } from "@/data/weapon-class";
import { type CalculationResult } from "@/lib/damage";
import { CLASS_LABELS, CLASS_ORDER, GROUP_LABELS } from "@/lib/data";
import {
  DAMAGE_COLOR,
  DAMAGE_LABEL,
  type DamageType,
  type Weapon,
  type WeaponGroup,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export type SortKey = "perHit" | "dps" | "ttk";

export interface RankedRow {
  weapon: Weapon;
  result: CalculationResult;
}

/** Built from GROUP_LABELS so a new weapon group shows up in the filter
 *  automatically instead of being silently unreachable. */
const GROUP_FILTERS: { value: "all" | WeaponGroup; label: string }[] = [
  { value: "all", label: "All" },
  ...(Object.entries(GROUP_LABELS) as [WeaponGroup, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
];

const SORT_LABELS: Record<SortKey, string> = {
  perHit: "Per hit",
  dps: "Cycle DPS",
  ttk: "Fastest kill",
};

export function WeaponsTable({
  rows,
  sortKey,
  onSortChange,
  selectedSlug,
  onSelect,
  maxPerHit,
  backstab,
  cls,
  onClsChange,
}: {
  rows: RankedRow[];
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  selectedSlug: string;
  onSelect: (weapon: Weapon) => void;
  maxPerHit: number;
  /** True when per-hit shows the backstabbed first hit, not a normal hit. */
  backstab: boolean;
  /** Selected class, owned by the page so it can be mirrored into the URL. */
  cls: "all" | WeaponClass;
  onClsChange: (next: "all" | WeaponClass) => void;
}) {
  const { t, formatCount, formatDamage, formatSeconds, number } = useLanguage();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<"all" | WeaponGroup>("all");
  /* Damage type is its own axis: a sword that deals fire should survive both the
   * "sword" and the "fire" filters at once, so this one is not exclusive. */
  const [damage, setDamage] = useState<DamageType | "all">("all");

  /* Only offer classes this ranking actually contains, in the canonical
   * light-to-heavy order, so a filter that matches nothing can never be
   * selected in the first place. */
  const classOptions = useMemo(() => {
    const present = new Set(rows.map((r) => r.weapon.cls));
    return CLASS_ORDER.filter((c) => present.has(c)).map((c) => ({
      value: c,
      label: t(CLASS_LABELS[c]),
    }));
  }, [rows, t]);

  /* The group pills and the class picker slice the same column at two
   * granularities, so choosing one clears the other: "Melee" plus "Bow" would
   * otherwise show an empty table with nothing to explain why. */
  const pickGroup = (next: "all" | WeaponGroup) => {
    setGroup(next);
    onClsChange("all");
  };
  const pickClass = (next: "all" | WeaponClass) => {
    onClsChange(next);
    setGroup("all");
  };
  /* A class label toggles: it selects that class, and a second click clears the
   * filter. Going through pickClass means clearing also drops the group pills. */
  const toggleClass = (next: WeaponClass) => {
    pickClass(cls === next ? "all" : next);
  };
  /* Clicking a damage label narrows the ranking to weapons that deal that
   * damage; clicking the active one again clears it. */
  const toggleDamage = (next: DamageType) => {
    setDamage((current) => (current === next ? "all" : next));
  };

  const sorted = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (cls !== "all" && r.weapon.cls !== cls) return false;
      if (group !== "all" && r.weapon.group !== group) return false;
      /* Every line is a damage type the weapon really deals, so a match here is
       * "this weapon deals that type", not "it happens to land it here". */
      if (damage !== "all" && !r.result.lines.some((l) => l.type === damage)) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        r.weapon.name.toLowerCase().includes(q) ||
        r.weapon.clsLabel.toLowerCase().includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      if (sortKey === "ttk") {
        return a.result.ttk - b.result.ttk;
      }
      return b.result[sortKey] - a.result[sortKey];
    });
  }, [rows, cls, group, damage, query, sortKey, t]);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="gap-3 border-b bg-muted/25 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {t("Weapon ranking")}{/* Numbers stay in the body face so counts are unambiguous. */}
            <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
              {t("{shown} of {total}", { shown: formatCount(sorted.length), total: formatCount(rows.length) })}
            </span>
          </CardTitle>
          <Segmented
            value={sortKey}
            onChange={onSortChange}
            ariaLabel={t("Sort ranking by")}
            options={(Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
              value: key,
              label: t(SORT_LABELS[key]),
            }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-45 flex-1">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search weapons…")}
              className="h-8 pl-8"
              aria-label={t("Search weapons")}
            />
          </div>
          <Select
            value={cls}
            items={[{ value: "all", label: t("All classes") }, ...classOptions]}
            onValueChange={(next) => {
              if (typeof next === "string") pickClass(next as "all" | WeaponClass);
            }}
          >
            <SelectTrigger
              size="sm"
              className="w-40 shrink-0"
              aria-label={t("Filter by weapon class")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All classes")}</SelectItem>
              {classOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Segmented
            value={group}
            onChange={pickGroup}
            ariaLabel={t("Filter by weapon group")}
            options={GROUP_FILTERS.map((g) => ({
              value: g.value,
              label: t(g.label),
            }))}
          />
          {/* The damage filter has no picker of its own, so when it is on it
              gets a chip: without one an empty table would be a dead end. */}
          {damage !== "all" ? (
            <button
              type="button"
              onClick={() => setDamage("all")}
              title={t("Clear the {type} filter", { type: t(DAMAGE_LABEL[damage]) })}
              className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {t("{type} only", { type: t(DAMAGE_LABEL[damage]) })}<X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="px-0 py-0">
        <div className="scrollbar-thin max-h-[38rem] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="sticky top-0 z-10 bg-card/95 text-[11px] tracking-wide text-muted-foreground uppercase backdrop-blur">
              <tr className="border-b">
                <th className="w-10 px-3 py-2 text-left font-medium">#</th>
                <th className="px-2 py-2 text-left font-medium">{t("Weapon")}
            </th>
                <th className="px-2 py-2 text-left font-medium">{t("Damage vs target")}
            </th>
                <th
                  className="px-2 py-2 text-right font-medium"
                  title={
                    backstab
                      ? t("First hit on an unaware enemy, with the weapon's backstab bonus applied")
                      : undefined
                  }
                >
                  {t(backstab ? "Backstab" : "Per hit")}
                </th>
                <th className="px-2 py-2 text-right font-medium">{t("DPS")}
            </th>
                <th className="px-2 py-2 text-right font-medium">{t("Kill")}
            </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, index) => {
                const active = row.weapon.slug === selectedSlug;
                const classActive = cls === row.weapon.cls;
                const isTop = index === 0;
                return (
                  <tr
                    key={row.weapon.slug}
                    tabIndex={0}
                    aria-selected={active}
                    onClick={() => onSelect(row.weapon)}
                    onKeyDown={(e) => {
                      /* Only the row itself responds here, so the class button
                       * inside it keeps its own Enter/Space behaviour. */
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(row.weapon);
                      }
                    }}
                    className={cn(
                      "cursor-pointer border-b border-border/50 transition-colors outline-none",
                      "hover:bg-accent/50 focus-visible:bg-accent/60",
                      active && "bg-primary/10 hover:bg-primary/15",
                    )}
                  >
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      <span className="flex items-center gap-1">
                        {isTop ? (
                          <Crown className="size-3.5 text-primary" />
                        ) : null}
                        {formatCount(index + 1)}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <ItemImage
                          src={row.weapon.image}
                          alt={row.weapon.name}
                          size={28}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="truncate font-medium">
                              {row.weapon.name}
                            </span>
                            <WikiLink
                              href={row.weapon.wikiUrl}
                              name={row.weapon.name}
                              className="size-5"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {/* The class is a one-click route into the class
                             * filter, so it reads as a link-ish button. */}
                            <button
                              type="button"
                              aria-pressed={classActive}
                              onClick={(event) => {
                                /* Toggle the filter, and don't also select the
                                 * row under the pointer. */
                                event.stopPropagation();
                                toggleClass(row.weapon.cls);
                              }}
                              title={
                                classActive
                                  ? t("Clear the {type} filter", { type: t(row.weapon.clsLabel) })
                                  : t("Filter the ranking to {type}", { type: t(row.weapon.clsLabel) })
                              }
                              aria-label={
                                classActive
                                  ? t("Clear the {type} filter", { type: t(row.weapon.clsLabel) })
                                  : t("Filter the ranking to {type}", { type: t(row.weapon.clsLabel) })
                              }
                              className="cursor-pointer rounded-sm text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                              {t(row.weapon.clsLabel)}
                            </button>
                            {row.weapon.group !== "melee" ? (
                              <Badge
                                variant="outline"
                                className="h-4 px-1 text-[10px] font-normal"
                              >
                                {t(GROUP_LABELS[row.weapon.group])}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] tabular-nums">
                        {row.result.lines.map((line) => {
                          const typeActive = damage === line.type;
                          const typeAction = typeActive
                            ? t("Clear the {type} filter", { type: t(DAMAGE_LABEL[line.type]) })
                            : t("Show only weapons that deal {type} damage", { type: t(DAMAGE_LABEL[line.type]) });
                          return (
                            <span
                              key={line.type}
                              className={cn(
                                "whitespace-nowrap",
                                DAMAGE_COLOR[line.type],
                              )}
                              title={t("{type}: {base} base × {resistance} resistance × skill", { type: t(DAMAGE_LABEL[line.type]), base: formatDamage(line.base), resistance: number(line.multiplier) })}
                            >
                              {formatDamage(line.effective)}
                              <button
                                type="button"
                                aria-pressed={typeActive}
                                onClick={(event) => {
                                  /* Filter, and don't also select the row. */
                                  event.stopPropagation();
                                  toggleDamage(line.type);
                                }}
                                title={typeAction}
                                aria-label={typeAction}
                                className={cn(
                                  "ml-0.5 cursor-pointer rounded-sm underline-offset-2 transition-opacity",
                                  "hover:underline hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                                  typeActive
                                    ? "font-semibold opacity-100"
                                    : "opacity-60",
                                )}
                              >
                                {t(DAMAGE_LABEL[line.type])}
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                          <div
                            className="h-full rounded-full bg-primary/70"
                            style={{
                              width: `${maxPerHit > 0 ? Math.min(100, (row.result.perHit / maxPerHit) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <span className="font-semibold tabular-nums">
                          {formatDamage(row.result.perHit)}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {formatDamage(row.result.dps)}
                    </td>
                    <td className="px-2 py-2 text-right text-muted-foreground tabular-nums">
                      {formatSeconds(row.result.ttk)}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {query.trim()
                      ? t("No weapons match “{query}”.", { query })
                      : t("No weapons in this filter.")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span>{t("Click a row to inspect it. Bars are relative to the best per-hit.")}
            </span>
          <span>{t("Max per hit:")}{formatDamage(maxPerHit)}
            </span>
        </div>
      </CardContent>
    </Card>
  );
}
