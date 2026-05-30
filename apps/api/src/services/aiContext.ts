import { createHash } from 'node:crypto';
import { query } from '../db.js';
import { getShowDetails } from './tmdb.js';

export interface WatchContextRow {
  show_id: number;
  rating: number | null;
}

/** Stable fingerprint from watch history (no TMDB). Same input → same hash. */
export function computeContextHash(rows: WatchContextRow[]): string {
  const canonical = rows
    .slice()
    .sort((a, b) => a.show_id - b.show_id)
    .map((r) => `${r.show_id}:${r.rating ?? 'null'}`)
    .join('|');
  return createHash('sha256').update(canonical).digest('hex');
}

export async function fetchWatchContextRows(userId: string): Promise<WatchContextRow[]> {
  const { rows } = await query<WatchContextRow>(
    `SELECT w.show_id, r.rating
       FROM (SELECT DISTINCT show_id FROM watched WHERE user_id = $1 ORDER BY show_id DESC LIMIT 50) w
       LEFT JOIN show_ratings r ON r.show_id = w.show_id AND r.user_id = $1`,
    [userId]
  );
  return rows;
}

export async function getUserContextHash(userId: string): Promise<string> {
  return computeContextHash(await fetchWatchContextRows(userId));
}

export async function buildContextText(rows: WatchContextRow[]): Promise<string> {
  const shows = await Promise.all(
    rows.map(async (row) => {
      const details = await getShowDetails(String(row.show_id)).catch(() => null);
      return {
        id: row.show_id,
        name: details?.name ?? `Show ${row.show_id}`,
        genres: (details?.genres ?? []).map((g: { name: string }) => g.name),
        rating: row.rating,
      };
    })
  );
  if (shows.length === 0) {
    return 'The user has no watch history yet. Recommend 10 widely-loved, highly-rated TV shows across diverse genres.';
  }
  return (
    `User watch history (name — genres — rating/5):\n` +
    shows.map((s) => `- ${s.name} — ${s.genres.join(', ') || 'unknown'} — ${s.rating ?? 'unrated'}`).join('\n')
  );
}
