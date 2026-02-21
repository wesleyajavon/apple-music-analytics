# Apple Music Analytics

[![CI](https://img.shields.io/github/actions/workflow/status/wesleyajavon/apple-music-analytics/ci.yml?branch=main)](https://github.com/wesleyajavon/apple-music-analytics/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Tableau de bord personnel pour visualiser votre comportement d'écoute musicale à partir de l'historique **Last.fm** et des données **Apple Music Replay** importées manuellement.

## Fonctionnalités

- **Vue d'ensemble** — Statistiques globales (écoutes, artistes, titres, temps total)
- **Timeline** — Évolution de vos écoutes dans le temps (jour/semaine/mois)
- **Heatmap** — Calendrier type GitHub Contributions
- **Genres** — Répartition par genre musical, tendances temporelles
- **Artistes** — Top artistes, statistiques détaillées
- **Analyse temporelle** — Habitudes par heure et jour de la semaine
- **Quand vais-je écouter ?** — Prédiction du créneau et genre les plus probables
- **Comparaison Replay** — Comparaison Apple Music Replay entre années
- **Réseau d'artistes** — Visualisation interactive des connexions entre artistes
- **AI Insights** — Insights en langage naturel (optionnel, Groq)

## Prérequis

- **Node.js 20+** (voir `.nvmrc`)
- **PostgreSQL** (local ou cloud)
- **Redis** (optionnel, pour le cache)

## Installation rapide

```bash
git clone https://github.com/wesleyajavon/apple-music-analytics.git
cd apple-music-analytics
npm install
cp env.example .env.local
# Éditer .env.local : voir env.example pour la liste complète des variables
npm run db:generate
npm run db:migrate   # ou db:push pour le dev
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Variables d'environnement

Les variables minimales sont `DATABASE_URL`, `LASTFM_API_KEY` et `LASTFM_API_SECRET`.  
Consultez [`env.example`](env.example) pour la liste complète (Redis, Sentry, Groq, etc.).

## Scripts principaux

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm run lastfm:update` | Mise à jour des données Last.fm |
| `npm run db:migrate` | Appliquer les migrations |
| `npm run db:studio` | Prisma Studio (interface BDD) |
| `npm run test:run` | Tests unitaires |
| `npm run test:e2e` | Tests E2E Playwright |

## Documentation

- **API** : [`docs/API.md`](docs/API.md) (référence des endpoints)
- **Code** : `docs/` (généré par `npm run docs:generate`)

## Licence

[MIT](LICENSE)
