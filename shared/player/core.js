// Generated from core.ts by scripts/build-site.mjs — DO NOT EDIT MANUALLY.
// Shared Bestiary player profile. Keep storage and calculation semantics in one place.
export const PLAYER_STORAGE_KEY = 'vc.player';
export const SKILLS = [
    { id: 'swords', name: 'Swords' },
    { id: 'knives', name: 'Knives' },
    { id: 'clubs', name: 'Clubs' },
    { id: 'polearms', name: 'Polearms' },
    { id: 'spears', name: 'Spears' },
    { id: 'axes', name: 'Axes' },
    { id: 'fists', name: 'Fists' },
    { id: 'bows', name: 'Bows' },
    { id: 'crossbows', name: 'Crossbows' },
    { id: 'elemental-magic', name: 'Elemental magic' },
    { id: 'blood-magic', name: 'Blood magic' },
    { id: 'pickaxes', name: 'Pickaxes' },
];
export const DIFFICULTY = {
    veryeasy: 1.25,
    easy: 1.1,
    normal: 1,
    hard: 0.85,
    veryhard: 0.7,
};
export const SET_BONUSES = {
    root: { type: 'skill', skill: 'bows', amount: 15 },
    lox: { type: 'skill', skill: 'bows', amount: 15 },
    fenris: { type: 'skill', skill: 'fists', amount: 15 },
    bear: { type: 'damage', types: ['slash', 'chop'], amount: 0.1 },
    vanguard: { type: 'damage', types: ['pierce'], amount: 0.1 },
};
export const DEFAULT_PLAYER = {
    skills: {
        swords: 50,
        knives: 50,
        clubs: 50,
        polearms: 50,
        spears: 50,
        axes: 50,
        fists: 50,
        bows: 50,
        crossbows: 50,
        'elemental-magic': 50,
        'blood-magic': 50,
        pickaxes: 50,
    },
    difficulty: 'normal',
    players: 1,
    quality: 'max',
    sets: [],
    sneak: false,
    staggered: false,
    rankBy: 'dps',
};
// Effective skill level with armor set bonuses, capped at 100
export function effectiveSkill(player, skill) {
    if (!skill)
        return 0;
    let val = player?.skills?.[skill] ?? 50;
    const sets = Array.isArray(player?.sets) ? player.sets : [];
    if (skill === 'bows') {
        if (sets.includes('root'))
            val += 15;
        if (sets.includes('lox'))
            val += 15;
    }
    else if (skill === 'fists') {
        if (sets.includes('fenris'))
            val += 15;
    }
    return Math.min(100, Math.max(0, val));
}
function clampInt(val, min, max, fallback) {
    const n = Math.round(Number(val));
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(min, Math.min(max, n));
}
export function defaultPlayer() {
    return JSON.parse(JSON.stringify(DEFAULT_PLAYER));
}
/**
 * Replace unknown or corrupted values with DEFAULT_PLAYER values
 */
export function sanitizePlayer(value) {
    const player = defaultPlayer();
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return player;
    const raw = value;
    if (raw.skills && typeof raw.skills === 'object' && !Array.isArray(raw.skills)) {
        for (const s of SKILLS) {
            const v = raw.skills[s.id];
            if (v !== undefined && v !== null && Number.isFinite(Number(v))) {
                player.skills[s.id] = clampInt(v, 0, 100, 50);
            }
        }
    }
    if (typeof raw.difficulty === 'string' &&
        Object.prototype.hasOwnProperty.call(DIFFICULTY, raw.difficulty)) {
        player.difficulty = raw.difficulty;
    }
    if (raw.players !== undefined && raw.players !== null && Number.isFinite(Number(raw.players))) {
        player.players = clampInt(raw.players, 1, 5, 1);
    }
    if (raw.quality === 'max') {
        player.quality = 'max';
    }
    else if (raw.quality !== undefined && raw.quality !== null && Number.isFinite(Number(raw.quality))) {
        player.quality = clampInt(raw.quality, 1, 4, 4);
    }
    if (Array.isArray(raw.sets)) {
        const valid = new Set(Object.keys(SET_BONUSES));
        player.sets = [...new Set(raw.sets.filter((s) => typeof s === 'string' && valid.has(s)))];
    }
    player.sneak = raw.sneak === true;
    player.staggered = raw.staggered === true;
    player.rankBy = raw.rankBy === 'hit' ? 'hit' : 'dps';
    return player;
}
/**
 * Load player state from localStorage; firstVisit is true when the key
 * has never been written (panel starts expanded in that case)
 */
export function readPlayerState(storage) {
    let hasProfile = false;
    try {
        const raw = (storage ?? globalThis.localStorage).getItem(PLAYER_STORAGE_KEY);
        hasProfile = raw !== null;
        if (raw === null) {
            return { player: defaultPlayer(), firstVisit: true, hasProfile: false };
        }
        return { player: sanitizePlayer(JSON.parse(raw)), firstVisit: false, hasProfile };
    }
    catch {
        return { player: defaultPlayer(), firstVisit: false, hasProfile };
    }
}
