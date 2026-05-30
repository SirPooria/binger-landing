# Binger — بینجر

A Persian (Farsi), right-to-left TV-show tracking app with social and gamification features.
This repo contains **two generations** of the app living side by side:

- **`/app`, `/lib`** — the original **Next.js 15** web app (untouched, still runnable).
- **`/apps`, `/packages`, `/infra`** — the new **Expo (React Native)** app targeting **web + iOS + Android** from one codebase, plus a Dockerized backend (PostgreSQL + Redis + an Express API gateway + Nginx).

> Everything is in Farsi and RTL. Accent color is neon lime `#ccff00` on a `#050505` background. Font is **Vazirmatn**.

---

## Repository layout

```
binger/
├── app/                       # ORIGINAL Next.js web app (preserved)
├── lib/                       # ORIGINAL web data layer (preserved)
├── apps/
│   ├── mobile/                # Expo app (web + iOS + Android), Expo Router v4
│   └── api/                   # API gateway / BFF (Express + Redis + pg)
├── packages/
│   └── shared/                # Shared TS types & utils (XP, Persian dates)
├── infra/
│   ├── docker-compose.yml     # postgres, redis, api, expo-web, nginx
│   ├── nginx/nginx.conf
│   └── postgres/init.sql      # full schema (existing + new tables, RLS, fns)
├── .env.example
└── README.md
```

---

## Architecture

```
            ┌─────────────┐
   client → │    nginx    │  :8080
            └──────┬──────┘
        /api/* ────┤        ┌──────────────┐
                   ├──────▶ │  api gateway │ :3001  (TMDB key lives here)
        /     ────┤        └──┬────────┬──┘
                   │           │        │
            ┌──────▼─────┐  ┌──▼──┐  ┌──▼───────┐
            │  expo-web  │  │redis│  │ postgres │
            └────────────┘  └─────┘  └──────────┘
```

- The **TMDB API key never reaches the client.** The mobile app calls the gateway (`/api/v1/tmdb/*`), which proxies TMDB and caches responses in Redis.
- **AI recommendations** are generated server-side (Anthropic Claude) from the user's watch history and cached for 24h.
- **Auth & user data** use Supabase (`@supabase/supabase-js`). The gateway's Postgres is the same database Supabase points at.

---

## Quick start (full stack with Docker)

1. Copy env and fill in secrets:
   ```bash
   cp .env.example .env
   # set TMDB_API_KEY, ANTHROPIC_API_KEY, EXPO_PUBLIC_SUPABASE_URL/ANON_KEY, POSTGRES_PASSWORD
   ```
2. Bring up the stack:
   ```bash
   docker compose -f infra/docker-compose.yml --env-file .env up --build
   ```
3. Open the web app at **http://localhost:8080**. The API is at **http://localhost:8080/api/v1/health**.

`infra/postgres/init.sql` runs automatically on the first start and creates every table, index, RLS policy, and the `get_global_leaderboard` / `award_xp` functions.

---

## Develop the Expo app locally (recommended for iOS/Android)

```bash
cd apps/mobile
npm install
# point the client at your running gateway (or the dockerized nginx)
export EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
export EXPO_PUBLIC_SUPABASE_URL=...        # your Supabase project
export EXPO_PUBLIC_SUPABASE_ANON_KEY=...
npx expo start          # press i (iOS), a (Android), w (web)
```

> On a physical device, set `EXPO_PUBLIC_API_BASE_URL` to your machine's LAN IP (e.g. `http://192.168.1.20:8080`).

### Run just the API gateway locally

```bash
cd apps/api
npm install
npm run dev            # tsx watch, listens on :3001
```

---

## RTL, fonts & theme

- RTL is forced at the very top of `apps/mobile/app/_layout.tsx` via `I18nManager.forceRTL(true)`.
- Every text node uses the `AppText` component (Vazirmatn + `writingDirection: 'rtl'`).
- Vazirmatn is loaded through `@expo-google-fonts/vazirmatn` (no font files to ship).
- Color tokens live in `apps/mobile/constants/theme.ts` and `tailwind.config.js` (NativeWind).

---

## Feature map

| Feature | Where |
|---|---|
| Auth (magic link + Google) | `app/(auth)/login.tsx` |
| Onboarding (infinite show picker) | `app/(auth)/onboarding.tsx` |
| Dashboard (hero, carousels, stories) | `app/(tabs)/index.tsx` |
| **AI recommendations** (dynamic) | `components/AiRecommendationsRow.tsx` → `apps/api/src/services/ai.ts` |
| Search | `app/(tabs)/search.tsx` |
| Lists + custom Letterboxd-style lists | `app/(tabs)/lists.tsx` |
| Social feed | `app/(tabs)/social.tsx` + `lib/social.ts` |
| Profile + XP/level + leaderboard | `app/(tabs)/profile.tsx`, `components/LevelBar.tsx`, `app/leaderboard.tsx` |
| Show details (info/episodes/comments/forum) | `app/tv/[id]/index.tsx` |
| Episode (reactions, watched, comments) | `app/tv/[id]/season/[s]/episode/[e].tsx` |
| **Rich comments** (media, reactions, replies) | `components/comments/*` |
| **Stories** (create + viewer) | `app/story/create.tsx`, `app/story/[id].tsx` |
| **Forums** per show | `components/forum/*`, `app/forum/*` |
| **Groups & Channels** | `app/communities.tsx` + `lib/communities.ts` |
| Notifications center + push | `app/notifications.tsx`, `lib/notifications.ts` |

XP/level thresholds are defined once in `packages/shared/src/xp.ts` and mirrored by the SQL `level_for_xp` function.

---

## Status / what's MVP

This is a large migration delivered in phases. The infrastructure, database schema, API gateway, Expo scaffold, and all core screens are complete and wired. The new social/gamification features (stories, forums, groups, channels, rich comments, notifications) are functional **MVPs** — they read/write real tables and are ready to be hardened (Giphy integration, real-time updates, push delivery worker, moderation, pagination everywhere). See the deliverables checklist in the project prompt for the full target.

---

## Original web app

The Next.js app still runs exactly as before:

```bash
npm install
npm run dev     # http://localhost:3001
```
