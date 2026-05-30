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

If `expo-web` build fails with `esbuild` **Expected "0.28.0" but got "0.21.5"**, pull latest `Dockerfile.web` / `package.json` overrides, or locally run:

```bash
npm ci --ignore-scripts && npm run install:esbuild-fix
```

Seed fake users:

```bash
npm run seed:reset
```

---

## Develop on device (Expo Go, WSL2)

From repo root (Ubuntu terminal, Node 20 recommended):

```bash
EXPO_DEV_HOST=<your-lan-ip> ./scripts/expo-device.sh lan
./scripts/set-lan-env.sh --write   # PUBLIC_API_URL + EXPO_PUBLIC_* → :8081 for phone
```

On **WSL2**, phones usually reach **Metro on :8081** but not **Docker on :8080**. Device dev routes the API through Metro (`/api` → nginx on `127.0.0.1:8080`). Test in Safari (Metro must be running): **`http://<ip>:8081/api/v1/health`**. If Metro itself fails, run **`scripts/expo-wsl-firewall.ps1`** as Administrator, then `wsl --shutdown`.

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
| `STORAGE_DRIVER` | `local` (default) or `gcs` for Google Cloud Storage |
| `UPLOAD_DIR` | Local upload folder when `STORAGE_DRIVER=local` (API container: `/uploads`) |
| `PUBLIC_UPLOAD_BASE_URL` | Public base for uploaded files, e.g. `http://<lan-ip>:8081/uploads` (device dev via Metro) |
| `GCS_BUCKET` | GCS bucket name when `STORAGE_DRIVER=gcs` |
| `APP_REDIRECT_URL` | Deep link after login (default `binger://auth/callback`) |

**Google login on a physical phone:** Google does not allow private LAN IPs (`172.20.x`, `192.168.x`) as OAuth redirect URIs. Use **tunnel** mode (`./scripts/expo-device.sh tunnel`), set `PUBLIC_API_URL` to the tunnel HTTPS origin, and register `{PUBLIC_API_URL}/api/v1/auth/google/callback` in Google Cloud Console.

**Magic link:** Run `./scripts/set-lan-env.sh --write` so `PUBLIC_API_URL` is `http://<lan-ip>:8081` (same as Metro). Metro must be running when you open the email link. Request a **new** link after changing `.env`.

---

## Original Next.js app

Preserved under `reference/` for UI parity reference only:

```bash
cd reference && npm install && npm run dev
```
