import { useLanguage } from '@/hooks/use-language';
import { DAMAGE_LABEL, RESISTANCE_LABEL, type DamageType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Tier = keyof typeof RESISTANCE_LABEL;

/** Colour coding is from the attacker's point of view: green = take more
 *  damage, red = shrug it off. */
const TIER_STYLES: Record<Tier, string> = {
  "very-weak": "border-emerald-400/40 bg-emerald-400/15 text-emerald-300",
  weak: "border-lime-400/40 bg-lime-400/12 text-lime-300",
  neutral: "border-border bg-muted/50 text-muted-foreground",
  resistant: "border-amber-400/40 bg-amber-400/12 text-amber-300",
  "very-resistant": "border-orange-500/45 bg-orange-500/15 text-orange-300",
  immune: "border-rose-500/50 bg-rose-500/18 text-rose-300",
};

export function ResistanceBadge({
  type,
  tier,
  className,
}: {
  type: DamageType;
  tier: Tier;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        TIER_STYLES[tier],
        className,
      )}
    >
      <span>{t(DAMAGE_LABEL[type])}
            </span>
      <span className="opacity-70">{t(RESISTANCE_LABEL[tier])}
            </span>
    </span>
  );
}

export function tierStyle(tier: Tier): string {
  return TIER_STYLES[tier];
}

export const TIER_SHORT: Record<Tier, string> = {
  "very-weak": "×2",
  weak: "×1.5",
  neutral: "×1",
  resistant: "×0.5",
  "very-resistant": "×0.25",
  immune: "×0",
};
