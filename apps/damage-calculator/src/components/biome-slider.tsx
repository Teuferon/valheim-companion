import { formatGameText } from '@/lib/game-text';
import { useLanguage } from '@/hooks/use-language';

import { useState, useSyncExternalStore } from "react";
import { Mountain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { BIOMES, type BiomeId } from "@/data/biomes";
import {
  BIOME_STORAGE_KEY,
  DEFAULT_BIOME,
  biomeIndex,
} from "@/lib/progression";
import { readTrackedBiome, subscribeTrackedProgress } from "@/lib/tracked-progress";
import { cn } from "@/lib/utils";

/**
 * The tracked progression default; URL and session choices override it.
 *
 * Hydration safety is why this goes through `useSyncExternalStore` rather than
 * reading localStorage while rendering: the server snapshot is always null, so
 * the prerendered HTML and the first client render agree on the default, and
 * the stored value is applied right after hydration. Reading storage during
 * render would render one thing on the server and another in the browser — the
 * mismatch class this app already had to fix once.
 */
const readStoredBiome = (): BiomeId => {
  try { return readTrackedBiome(window.localStorage); } catch { return BIOMES[0].id; }
};

const serverBiome = () => DEFAULT_BIOME;

export function useBiomeProgression(): [BiomeId, (next: BiomeId) => void] {
  const stored = useSyncExternalStore(subscribeTrackedProgress, readStoredBiome, serverBiome);
  // Once touched, the session selection takes precedence over tracked updates.
  const [current, setCurrent] = useState<BiomeId | null>(null);
  const biome = current ?? stored;

  const setBiome = (next: BiomeId) => {
    setCurrent(next);
    try { window.localStorage.setItem(BIOME_STORAGE_KEY, next); } catch { /* Keep the session selection. */ }
  };

  return [biome, setBiome];
}

export function BiomeSlider({
  value,
  onChange,
  bossName,
  visibleWeapons,
  totalWeapons,
  visibleTargets,
  totalTargets,
}: {
  value: BiomeId;
  onChange: (next: BiomeId) => void;
  /** Display name of the biome's Forsaken, when it has one. */
  bossName?: string;
  visibleWeapons: number;
  totalWeapons: number;
  visibleTargets: number;
  totalTargets: number;
}) {
  const { t, tn, formatCount } = useLanguage();
  const index = biomeIndex(value);
  const biome = BIOMES[index];

  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Label className="flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
            <Mountain className="size-3" />
            {t("Progression — up to which biome")}
            </Label>
          <span className="text-sm">
            <span className="font-heading font-semibold tracking-wide">
              {biome.name}
            </span>
            {bossName ? (
              <span className="text-muted-foreground"> {t(" · boss: {boss}", { boss: bossName })}
            </span>
            ) : (
              <span className="text-muted-foreground"> {t("· no Forsaken")}
            </span>
            )}
          </span>
        </div>

        {/* The thumb travels between the track *edges* (edge alignment), while
            the labels below sit in equal flex columns, so an uninset track
            drifts out of step with them. The track is inset by half a label
            column — (100% - 32px) / 18, where 32px is the row's eight gap-1
            gaps — minus half the size-3 thumb, which is where an edge-aligned
            thumb centre sits relative to the track edge. */}
        <div style={{ paddingInline: "calc((100% - 32px) / 18 - 6px)" }}>
          <Slider
            value={[index]}
            min={0}
            max={BIOMES.length - 1}
            step={1}
            onValueChange={(next) => {
              const raw = Array.isArray(next) ? next[0] : next;
              const picked = typeof raw === "number" ? BIOMES[raw] : undefined;
              if (picked) onChange(picked.id);
            }}
            aria-label={t("Progression biome")}
          />
        </div>

        <div className="flex justify-between gap-1">
          {BIOMES.map((entry, position) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onChange(entry.id)}
              title={entry.note ? formatGameText(entry.note, t) : entry.name}
              className={cn(
                "flex-1 truncate text-[10px] transition-colors",
                position === index
                  ? "font-semibold text-primary"
                  : position < index
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-muted-foreground/50 hover:text-muted-foreground",
              )}
            >
              {entry.name}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {tn("{count} weapons reachable in {biome} (total: {total})", visibleWeapons, { count: formatCount(visibleWeapons), total: formatCount(totalWeapons), biome: biome.name })}{" · "}{tn("{count} targets reachable in {biome} (total: {total})", visibleTargets, { count: formatCount(visibleTargets), total: formatCount(totalTargets), biome: biome.name })} {biome.note ? formatGameText(biome.note, t) : ''}
        </p>
        <a href="../progress/" className="text-xs text-muted-foreground hover:text-foreground">
          {t("Track your progress →")}
        </a>
      </CardContent>
    </Card>
  );
}
