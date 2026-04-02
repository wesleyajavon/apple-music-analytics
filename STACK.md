# Stack technique — Apple Music Analytics

Vue d’ensemble des technologies principales du projet.

## Frontend

| Technologie | Usage |
|-------------|--------|
| **Next.js 14** | Framework React, App Router |
| **React 18** | UI |
| **TypeScript** | Langage |
| **Tailwind CSS** | Styles |
| **next-intl** | i18n (en, fr, es) |
| **TanStack Query** | Données côté client |
| **Recharts** | Graphiques |
| **D3** | Visualisations (heatmap) |

## Backend

| Technologie | Usage |
|-------------|--------|
| **Next.js API Routes** | API REST |
| **Prisma** | ORM |
| **PostgreSQL** | Base de données |
| **Redis** (ioredis) | Cache (optionnel) |
| **Zod** | Validation des schémas |

## Données & APIs

| Source | Usage |
|--------|--------|
| **Last.fm API** | Import des scrobbles |
| **Groq** | Insights IA (optionnel) |

## Tests

| Outil | Usage |
|-------|--------|
| **Vitest** | Tests unitaires et d’intégration |
| **Playwright** | Tests E2E |
| **@vitest/coverage-v8** | Couverture de code |

## DevOps & Monitoring

| Technologie | Usage |
|-------------|--------|
| **Vercel** | Hébergement |
| **GitHub Actions** | CI (lint, tests, build) |
| **Sentry** | Monitoring d’erreurs (optionnel) |

## Autres

| Technologie | Usage |
|-------------|--------|
| **@react-pdf/renderer** | Export PDF |
| **TypeDoc** | Documentation du code |
| **Sonner** | Notifications toast |

### Documentation (TypeDoc et API)

Après des changements dans `lib/services/**` ou `lib/dto/**`, lancer `npm run docs:generate` pour régénérer la doc TypeDoc dans `docs/` (`docs:clean` puis `typedoc`). `docs/API.md` est rédigé à la main ; au build, `docs:api:copy` le copie vers `public/docs/API.md`. Détails : section *Documentation* du `README.md`.
