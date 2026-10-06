// Typed entry point for the shared JavaScript implementation.
import * as core from './core.js';

export type SkillId = keyof typeof core.DEFAULT_PLAYER.skills;
export type Difficulty = keyof typeof core.DIFFICULTY;
export type PlayerSet = keyof typeof core.SET_BONUSES;

export interface Player {
  skills: Record<SkillId, number>;
  difficulty: Difficulty;
  players: number;
  quality: number | 'max';
  sets: PlayerSet[];
  sneak: boolean;
  staggered: boolean;
  rankBy: 'hit' | 'dps';
}

export interface PlayerState {
  player: Player;
  firstVisit: boolean;
  hasProfile: boolean;
}

export const PLAYER_STORAGE_KEY = core.PLAYER_STORAGE_KEY;
export const SKILLS = core.SKILLS;
export const DIFFICULTY = core.DIFFICULTY;
export const SET_BONUSES = core.SET_BONUSES;
export const DEFAULT_PLAYER = core.DEFAULT_PLAYER as Player;
export const defaultPlayer = core.defaultPlayer as () => Player;
export const sanitizePlayer = core.sanitizePlayer as (raw: unknown) => Player;
export const effectiveSkill = core.effectiveSkill as (
  player: Player | null | undefined, skill: SkillId | null | undefined,
) => number;
export const readPlayerState = core.readPlayerState as (
  storage?: Pick<Storage, 'getItem'>,
) => PlayerState;
