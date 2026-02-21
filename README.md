# Apple Music Analytics

[![CI](https://img.shields.io/github/actions/workflow/status/wesleyajavon/apple-music-analytics/ci.yml?branch=main)](https://github.com/wesleyajavon/apple-music-analytics/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Personal dashboard to visualize your music listening behavior from **Last.fm** history and manually imported **Apple Music Replay** data.

> **Note:** This is a personal project — it does not support multiple users or public sign-up. To see it in action, visit the live demo: **[https://apple-music-analytics.vercel.app/fr](https://apple-music-analytics.vercel.app/fr)**

## Features

- **Overview** — Global stats (listens, artists, tracks, total time)
- **Timeline** — Evolution of your listens over time (day/week/month)
- **Heatmap** — GitHub Contributions-style calendar
- **Genres** — Breakdown by genre, temporal trends
- **Artists** — Top artists, detailed stats
- **Time analysis** — Habits by hour and day of week
- **When will I listen?** — Prediction of most likely time slot and genre
- **Replay comparison** — Apple Music Replay comparison across years
- **Artist network** — Interactive visualization of connections between artists
- **AI Insights** — Natural language insights (optional, Groq)

## Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- **PostgreSQL** (local or cloud)
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
npm run db:migrate   # or db:push for dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Minimum required: `DATABASE_URL`, `LASTFM_API_KEY`, and `LASTFM_API_SECRET`.  
See [`env.example`](env.example) for the full list (Redis, Sentry, Groq, etc.).

## Main scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lastfm:update` | Update Last.fm data |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Prisma Studio (DB UI) |
| `npm run test:run` | Unit tests |
| `npm run test:e2e` | Playwright E2E tests |

## Documentation

- **API** : [`docs/API.md`](docs/API.md) (endpoint reference)
- **Code** : `docs/` (generated with `npm run docs:generate`)

## License

[MIT](LICENSE)
