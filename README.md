# Binger — بینجر

A Persian (Farsi), right-to-left TV-show tracking app with social and gamification features.

- **`apps/mobile`** — Expo app (web + iOS + Android), Expo Router
- **`apps/api`** — Express BFF (JWT auth, Postgres, Redis, TMDB proxy, AI recs)
- **`packages/shared`** — shared types & utils (XP, Persian dates)
- **`infra/`** — Docker Compose (postgres, redis, api, expo-web, nginx on **:8080**)
- **`reference/`** — archived original Next.js app (Supabase-based; not used by the new stack)

> RTL layout, accent `#ccff00` on `#050505`, font **Vazirmatn**.

---

## Architecture

```
            ┌─────────────┐
   client → │    nginx    │  :8080
            └──────┬──────┘
        /api/* ────┤        ┌──────────────┐
                   ├──────▶ │  API (BFF)   │ :3001
        /     ────┤        └──┬────────┬──┘
                   │           │        │
            ┌──────▼─────┐  ┌──▼──┐  ┌──▼───────┐
            │  expo-web  │  │redis│  │ postgres │
            └────────────┘  └─────┘  └──────────┘
```

- **TMDB key** stays server-side (`/api/v1/tmdb/*`).
- **Auth & data** go through `/api/v1` only (JWT + Postgres). No Supabase in the active app.
- **Magic link** without SMTP: the login URL is printed in API container logs.

---

## Quick start (Docker)

```bash
cp .env.example .env
# Required: TMDB_API_KEY, JWT_SECRET, POSTGRES_PASSWORD
# Optional: GOOGLE_CLIENT_*, SMTP_* for Google login / email magic links

docker compose -f infra/docker-compose.yml --env-file .env up --build
```

Open **http://localhost:8080** (web) · API health: **http://localhost:8080/api/v1/health**

Seed fake users:

```bash
npm run seed:reset
```

---

## Develop on device (Expo Go, WSL2)

From repo root (Ubuntu terminal, Node 20 recommended):

```bash
export EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:8080
EXPO_DEV_HOST=<your-lan-ip> ./scripts/expo-device.sh lan
```

If the phone cannot reach `http://<ip>:8081/status`, run **`scripts/expo-wsl-firewall.ps1`** as Administrator on Windows, then `wsl --shutdown`.

See `scripts/expo-device.sh` and `scripts/expo-wsl-firewall.ps1` for tunnel/LAN details.

---

## Tests

```bash
npm run test:db:up   # test Postgres on :5433
npm test             # unit + API integration
npm run test:e2e     # full stack smoke (Docker)
```

---

## Auth env vars

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Sign access tokens (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `SMTP_*` | Magic-link email (omit to log link in API stdout) |
| `PUBLIC_API_URL` | Base URL for magic-link verify (default `http://localhost:8080`) |
| `APP_REDIRECT_URL` | Deep link after login (default `binger://auth/callback`) |

Google Console redirect URI: `{PUBLIC_API_URL}/api/v1/auth/google/callback`

---

## Original Next.js app

Preserved under `reference/` for UI parity reference only:

```bash
cd reference && npm install && npm run dev
```
