// XP & leveling system (Phase 5.7). Single source of truth shared by the
// mobile app and the SQL `level_for_xp` function (keep them in sync).

export const XP_REWARDS = {
  watch_episode: 10,
  rate_show: 20,
  comment: 15,
  comment_liked: 5,
  follow: 10,
  followed: 25,
  badge_earned: 100,
  create_theory: 30,
  forum_post: 20,
} as const;

export type XpAction = keyof typeof XP_REWARDS;

export interface LevelDef {
  level: number;
  title: string; // Persian
  minXp: number;
  maxXp: number; // Infinity for the top tier
}

export const LEVELS: LevelDef[] = [
  { level: 1, title: 'تازه‌کار', minXp: 0, maxXp: 500 },
  { level: 2, title: 'بینجر مبتدی', minXp: 500, maxXp: 1500 },
  { level: 3, title: 'سریال‌باز', minXp: 1500, maxXp: 3500 },
  { level: 4, title: 'منتقد', minXp: 3500, maxXp: 7000 },
  { level: 5, title: 'استاد بینجر', minXp: 7000, maxXp: 15000 },
  { level: 6, title: 'افسانه بینجر', minXp: 15000, maxXp: Infinity },
];

export function levelForXp(xp: number): LevelDef {
  return [...LEVELS].reverse().find((l) => xp >= l.minXp) ?? LEVELS[0];
}

/** Progress (0..1) within the current level. Top tier is always full. */
export function levelProgress(xp: number): number {
  const def = levelForXp(xp);
  if (def.maxXp === Infinity) return 1;
  return Math.min(1, (xp - def.minXp) / (def.maxXp - def.minXp));
}

export function xpToNextLevel(xp: number): number {
  const def = levelForXp(xp);
  if (def.maxXp === Infinity) return 0;
  return def.maxXp - xp;
}
