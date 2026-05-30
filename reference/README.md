# Reference: original Next.js app (archived)

This folder contains the **original Binger Next.js web app** that was provided
as the design/behavior reference for the new Expo + Docker monorepo.

It is **archived for reference only** and is not part of the active monorepo
build, tests, or Docker stack. Nothing in `apps/`, `packages/`, or `infra/`
imports from here.

It still uses Supabase and the old client-side TMDB client. Use it only to
look up original UI/UX details (landing animations, page layouts, copy, etc.)
when matching the Expo app to the source design.

Contents:

- `app/` — Next.js App Router pages (welcome, landing, login, onboarding, dashboard, ...)
- `lib/` — Supabase + TMDB client helpers
- `public/` — static assets
- `middleware.ts`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`
- `package.json`, `package-lock.json`

To run it standalone (optional), from this folder: `npm install && npm run dev`.
