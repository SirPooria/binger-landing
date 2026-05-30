/**
 * Seed the database with realistic-looking fake Persian users and activity so
 * the social / leaderboard / feed features have data to render.
 *
 * Usage (from apps/api):
 *   npm run seed            # add seed users (skips if they already exist)
 *   npm run seed:reset      # wipe previous seed users, then re-seed
 *
 * Inside Docker:
 *   docker compose -f infra/docker-compose.yml --env-file .env exec api \
 *     node dist/scripts/seed.js --reset
 *
 * All seeded users share the email domain `@seed.binger.test`, which is how
 * `--reset` finds and removes them (cascades to profiles + all content).
 */
import { fakerFA, fakerEN } from '@faker-js/faker';
import { pool, query } from '../db.js';
import { createUser } from '../auth/service.js';

const SEED_DOMAIN = 'seed.binger.test';
const USER_COUNT = 25;

// Real TMDB TV show IDs (popular + Iranian) so posters resolve correctly.
const SHOW_IDS = [
  1396, // Breaking Bad
  1399, // Game of Thrones
  66732, // Stranger Things
  1668, // Friends
  60625, // Rick and Morty
  94605, // Arcane
  82856, // The Mandalorian
  71712, // The Good Doctor
  1429, // Attack on Titan
  85271, // WandaVision
  60735, // The Flash
  1402, // The Walking Dead
  46648, // True Detective
  63174, // Lucifer
  84958, // Loki
  87108, // Chernobyl
  1100, // How I Met Your Mother
  456, // The Simpsons
  62286, // Fear the Walking Dead
  69050, // Riverdale
  44217, // Vikings
  61889, // Daredevil
  2316, // The Office
  4614, // NCIS
  1622, // Supernatural
];

// Persian badge labels (stored as badge_id; UI renders the raw string).
const BADGES = [
  'تازه‌وارد',
  'منتقد سرسخت',
  'تماشاگر حرفه‌ای',
  'پرکارِ هفته',
  'کاشفِ سریال',
  'شب‌بیدارِ بینجر',
  'اسپویل‌گریز',
];

const PERSIAN_BIOS = [
  'عاشق سریال‌های جنایی و معمایی 🕵️',
  'هرشب یه اپیزود، قانون زندگیمه.',
  'منتقد آماتور، تماشاگر حرفه‌ای.',
  'دنبال سریال‌های ایرانی خوب می‌گردم.',
  'آنیمه و درام کره‌ای ❤️',
  'از اسپویل متنفرم، لطفاً مراقب باشید!',
  'لیست تماشام از عمرم طولانی‌تره 😅',
  'فقط سریال‌های با امتیاز بالا.',
  'طرفدار پروپاقرص فضای علمی-تخیلی.',
  'اینجام که سریال خوب پیدا کنم و معرفی کنم.',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sample<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function reset() {
  const { rowCount } = await query(
    `DELETE FROM users WHERE email LIKE $1`,
    [`%@${SEED_DOMAIN}`]
  );
  console.log(`[seed] removed ${rowCount ?? 0} existing seed users`);
}

async function alreadySeeded(): Promise<boolean> {
  const { rows } = await query<{ count: string }>(
    `SELECT count(*)::text AS count FROM users WHERE email LIKE $1`,
    [`%@${SEED_DOMAIN}`]
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function createUsers(): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < USER_COUNT; i++) {
    const fullName = fakerFA.person.fullName();
    const handle = fakerEN.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const email = `${handle || 'binger'}${i}@${SEED_DOMAIN}`;
    const avatarUrl = `https://i.pravatar.cc/200?u=${encodeURIComponent(email)}`;

    const user = await createUser({ email, full_name: fullName, avatar_url: avatarUrl });

    await query(
      `UPDATE users SET onboarding_complete = true WHERE id = $1`,
      [user.id]
    );
    await query(
      `UPDATE profiles SET bio = $2, full_name = $3, avatar_url = $4, updated_at = now() WHERE id = $1`,
      [user.id, pick(PERSIAN_BIOS), fullName, avatarUrl]
    );
    ids.push(user.id);
  }
  console.log(`[seed] created ${ids.length} users`);
  return ids;
}

async function seedContent(userIds: string[]) {
  for (const userId of userIds) {
    const watchlistShows = sample(SHOW_IDS, randInt(3, 10));
    const watchedShows = sample(SHOW_IDS, randInt(2, 8));
    const favoriteShows = sample(SHOW_IDS, randInt(1, 4));
    const ratedShows = sample(SHOW_IDS, randInt(2, 8));

    for (const showId of watchlistShows) {
      await query(
        `INSERT INTO watchlist (user_id, show_id) VALUES ($1, $2)
         ON CONFLICT (user_id, show_id) DO NOTHING`,
        [userId, showId]
      );
    }

    for (const showId of watchedShows) {
      // A few watched episodes per show.
      const episodes = randInt(1, 6);
      for (let e = 0; e < episodes; e++) {
        await query(
          `INSERT INTO watched (user_id, show_id, episode_id) VALUES ($1, $2, $3)`,
          [userId, showId, randInt(1_000_000, 9_999_999)]
        );
        await awardXp(userId, 'watch_episode');
      }
    }

    for (const showId of favoriteShows) {
      await query(
        `INSERT INTO favorites (user_id, show_id) VALUES ($1, $2)
         ON CONFLICT (user_id, show_id) DO NOTHING`,
        [userId, showId]
      );
    }

    for (const showId of ratedShows) {
      await query(
        `INSERT INTO show_ratings (user_id, show_id, rating) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, show_id) DO UPDATE SET rating = EXCLUDED.rating`,
        [userId, showId, randInt(1, 5)]
      );
      await awardXp(userId, 'rate_show');
    }

    // A couple of badges for some users.
    if (Math.random() < 0.6) {
      for (const badge of sample(BADGES, randInt(1, 3))) {
        await query(
          `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)
           ON CONFLICT (user_id, badge_id) DO NOTHING`,
          [userId, badge]
        );
        await awardXp(userId, 'badge_earned');
      }
    }
  }
  console.log('[seed] inserted watchlist / watched / favorites / ratings / badges');
}

async function seedFollows(userIds: string[]) {
  let edges = 0;
  for (const follower of userIds) {
    const targets = sample(
      userIds.filter((id) => id !== follower),
      randInt(2, 8)
    );
    for (const following of targets) {
      const { rowCount } = await query(
        `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)
         ON CONFLICT (follower_id, following_id) DO NOTHING`,
        [follower, following]
      );
      if (rowCount) {
        edges++;
        await awardXp(follower, 'follow');
        await awardXp(following, 'followed');
      }
    }
  }
  console.log(`[seed] created ${edges} follow edges`);
}

async function awardXp(userId: string, action: keyof typeof XP_REWARDS) {
  await query(`SELECT award_xp($1, $2, $3, $4)`, [userId, XP_REWARDS[action], action, null]);
}

// Mirror of packages/shared XP_REWARDS (api doesn't depend on the shared pkg).
const XP_REWARDS = {
  watch_episode: 10,
  rate_show: 20,
  comment: 15,
  follow: 10,
  followed: 25,
  badge_earned: 100,
} as const;

async function main() {
  const shouldReset = process.argv.includes('--reset');
  console.log(`[seed] connecting to ${pool.options.host}:${pool.options.port}/${pool.options.database}`);

  if (shouldReset) {
    await reset();
  } else if (await alreadySeeded()) {
    console.log('[seed] seed users already present — run with --reset to regenerate. Exiting.');
    await pool.end();
    return;
  }

  const userIds = await createUsers();
  await seedContent(userIds);
  await seedFollows(userIds);

  const { rows } = await query<{ username: string; xp: number; level: number }>(
    `SELECT p.username, p.xp, p.level FROM profiles p
     JOIN users u ON u.id = p.id
     WHERE u.email LIKE $1
     ORDER BY p.xp DESC LIMIT 5`,
    [`%@${SEED_DOMAIN}`]
  );
  console.log('[seed] top seeded users by XP:');
  for (const r of rows) console.log(`  ${r.username} — level ${r.level}, ${r.xp} XP`);

  console.log('[seed] done ✅');
  await pool.end();
}

main().catch(async (err) => {
  console.error('[seed] failed:', err);
  await pool.end();
  process.exit(1);
});
