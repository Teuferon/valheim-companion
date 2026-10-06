import { effectiveSkill, type Player } from "../../../../shared/player/core";
import { skillOfClass, type WeaponClass } from "../data/weapon-class";
import { VIEW_DEFAULTS, type ParsedView } from "./view-url";

export function playerControls(
  player: Player | null,
  cls: WeaponClass | null,
  overrides: Pick<ParsedView, "level" | "skill" | "backstab" | "staggered">,
) {
  return {
    quality: overrides.level ?? (player && player.quality !== "max" ? player.quality : VIEW_DEFAULTS.level),
    skillLevel: overrides.skill ?? (player && cls ? effectiveSkill(player, skillOfClass(cls)) : VIEW_DEFAULTS.skill),
    backstab: overrides.backstab ?? player?.sneak ?? VIEW_DEFAULTS.backstab,
    staggered: overrides.staggered ?? player?.staggered ?? VIEW_DEFAULTS.staggered,
  };
}
