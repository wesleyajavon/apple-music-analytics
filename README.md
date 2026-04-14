# Apple Music Analytics

[![CI](https://img.shields.io/github/actions/workflow/status/wesleyajavon/apple-music-analytics/ci.yml?branch=main)](https://github.com/wesleyajavon/apple-music-analytics/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Personal dashboard to visualize your music listening behavior from **Last.fm** scrobbles, **Apple Music CSV exports**, or seeded / mock data.

Authentication is handled with **Supabase Auth** (sign-in and sign-up). Anonymous visitors can still open a **public demo profile** when `NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID` is configured (see [`env.example`](env.example)).

Live demo: **[https://apple-music-analytics.vercel.app/fr](https://apple-music-analytics.vercel.app/fr)** (default locale is French; **en** and **es** are also available under `/en` and `/es`).

Maintainer: future product ideas and codenames (Breakwater, Encore, …) live in **[IDEAS_BAG.md](IDEAS_BAG.md)** at the repo root. Supabase auth notes: **[`docs/SUPABASE_AUTH_IMPLEMENTATION.md`](docs/SUPABASE_AUTH_IMPLEMENTATION.md)**.

## Why Last.fm instead of Apple Music API?

This project uses the **Last.fm API** rather than the official Apple Music API for budget and financial reasons. The Apple Music API requires a paid Apple Developer Program membership and has usage-based costs. Last.fm offers a free API for personal use, making it an affordable way to track listening history.

### What is Last.fm?

[Last.fm](https://www.last.fm) is a music discovery service that tracks what you listen to across various streaming platforms (Apple Music, Spotify, etc.). When you connect Last.fm to your Apple Music account, it **scrobbles** your listens — i.e., it records each track you play (artist, track name, timestamp) and stores this history on your Last.fm profile. This project fetches that scrobble history via the Last.fm API and stores it in a local database for analytics.

## Project workflow

Understanding how data flows into the dashboard:

1. **Listen to music** — Use Apple Music (or any supported app) on your phone as usual.
2. **Last.fm scrobbling** — Last.fm is linked to your Apple Music account and automatically records ("scrobbles") each listen.
3. **Sync scrobbles** — *(Not yet automated)* You manually open the Last.fm app on your phone and scan for new scrobbles to transfer data from Apple Music to Last.fm.
4. **Update the database** — Run `npm run lastfm:update` (or use the Last.fm API via scripting) to fetch new scrobbles and update your local database. Alternatively, import an Apple Music play-history CSV using the **Data scripts** section below (`apple-music:filter` / `apple-music:import`).
5. **Dashboard reflects data** — Once the DB is updated, the dashboard shows your latest listening stats.
6. **Outdated data?** — If the dashboard looks stale, it usually means the database hasn’t been updated yet with new scrobbles from Last.fm.

## Features

- **i18n** — UI in French (default), English, and Spanish (`next-intl`)

- **Overview** — Global stats (listens, artists, tracks, total time)
- **Timeline** — Evolution of your listens over time (day/week/month)
- **Heatmap** — GitHub Contributions-style calendar
- **Genres** — Breakdown by genre, temporal trends
- **Artists** — Top artists, detailed stats
- **Time analysis** — Habits by hour and day of week
- **When will I listen?** — Prediction of most likely time slot and genre
- **Taste Profile** — AI-generated explanation of your musical taste (optional, Groq)
- **Taste Evolution** — Week-to-week taste changes with AI context (optional, Groq)
- **AI Insights** — Natural language insights (optional, Groq)

## Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- **PostgreSQL** (local or cloud; on Vercel + Supabase Postgres, prefer `POSTGRES_PRISMA_URL` for the app and `POSTGRES_URL_NON_POOLING` for migrations — see [`env.example`](env.example))
- **Supabase** project with Auth enabled (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- **Redis** (optional, for caching)

## Local setup (for development / forking)

If you want to run your own instance for personal use or contribute to the project:

```bash
git clone https://github.com/wesleyajavon/apple-music-analytics.git
cd apple-music-analytics
npm install
cp env.example .env.local
# Edit .env.local: see env.example for the full list of variables
npm run db:generate
npm run db:migrate   # or db:migrate:dev / db:push depending on your workflow
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (redirects to the default locale).

### Environment variables

**Required to run the app:** `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**Last.fm** (`LASTFM_API_KEY`, `LASTFM_API_SECRET`) is optional — the codebase falls back to mock API keys until you configure real credentials (see `lib/services/lastfm.ts`).

**Server scripts** that import into the DB may need `IMPORT_ADMIN_KEY` (sent as `x-import-admin-key`). Optional: `NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID` for the anonymous demo profile, Redis, Sentry, `GROQ_API_KEY`, etc. Full list: [`env.example`](env.example).

## Main scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run dev:turbo` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint (Next.js) |
| `npm run lastfm:update` | Update Last.fm data |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | Create/apply migrations in development |
| `npm run db:studio` | Prisma Studio (DB UI) |
| `npm run test:run` | Unit tests (Vitest) |
| `npm run test:integration` | API integration tests |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run vercel:env:pull` | Pull env from Vercel into `.env.local` |

### Data scripts (genres, Apple Music CSV, etc.)

Handy commands for working with imports and genre pipelines — not an exhaustive list; see `package.json` for every script.

| Script | Description |
|--------|-------------|
| `npm run apple-music:filter` | Filter an Apple Music export before CSV import |
| `npm run apple-music:import` | Import Apple Music play history CSV into the database |
| `npm run db:check-capacity` | Check approximate DB size vs. practical limits |
| `npm run spotify:backfill-genres` | Backfill missing track genres via Spotify (when API credentials are set) |
| `npm run genres:normalize` | Normalize genre tags after backfills |
| `npm run genres:pick-menu-doc` | Regenerate `docs/GENRE_PICK_MENU.md` from the genre normalization map |
| `npm run genres:map-top-unknown` | Interactive CLI to map top “unknown” artists to genres (variants: `genres:map-top-unknown:200`, `genres:map-tracks`) |

Additional genre backfills (`genres:backfill-llm`, `genres:backfill-cascade`, `genres:backfill-consensus`) and `spotify:test-genres` are documented in `docs/` and `package.json`.

## Documentation

- **API** : [`docs/API.md`](docs/API.md) (endpoint reference)
- **DB workflow**: [`docs/DB_ENV_WORKFLOW.md`](docs/DB_ENV_WORKFLOW.md) (safe Prisma dev/prod workflow)
- **Code** : `docs/` (generated with `npm run docs:generate`)

Run `npm run docs:generate` when you change documented code under `lib/services/**` or `lib/dto/**`, or when you want to refresh the TypeDoc HTML in `docs/`; it runs `docs:clean` (removes previous TypeDoc output: modules, classes, HTML, etc.) then `typedoc` per `typedoc.json`. The endpoint reference `docs/API.md` is edited by hand and is **not** produced by TypeDoc; `npm run build` runs `docs:api:copy`, which copies `docs/API.md` to `public/docs/API.md` so the same file is served in production.

## License

[MIT](LICENSE)
