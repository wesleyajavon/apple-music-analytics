# Apple Music Analytics

[![CI](https://img.shields.io/github/actions/workflow/status/wesleyajavon/apple-music-analytics/ci.yml?branch=main)](https://github.com/wesleyajavon/apple-music-analytics/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Tableau de bord personnel pour visualiser votre comportement d'écoute musicale à partir de l'historique **Last.fm**.

## Pourquoi Last.fm plutôt que l'API Apple Music ?

Ce projet utilise l'**API Last.fm** plutôt que l'API officielle Apple Music pour des raisons budgétaires. L'API Apple Music nécessite un abonnement payant au programme développeur Apple et des coûts à l'usage. Last.fm propose une API gratuite pour un usage personnel.

### Qu'est-ce que Last.fm ?

[Last.fm](https://www.last.fm) est un service de découverte musicale qui enregistre vos écoutes sur différentes plateformes (Apple Music, Spotify, etc.). En connectant Last.fm à votre compte Apple Music, il **scrobble** vos écoutes — c'est-à-dire qu'il enregistre chaque morceau écouté (artiste, titre, horodatage) sur votre profil Last.fm. Ce projet récupère cet historique via l'API Last.fm et le stocke en base locale pour les analytics.

## Workflow du projet

Comprendre comment les données arrivent dans le dashboard :

1. **Écouter de la musique** — Utilisez Apple Music (ou toute app supportée) sur votre téléphone comme d'habitude.
2. **Scrobbling Last.fm** — Last.fm est lié à votre compte Apple Music et enregistre automatiquement (« scrobble ») chaque écoute.
3. **Synchroniser les scrobbles** — *(Pas encore automatisé)* Vous ouvrez manuellement l'app Last.fm sur votre téléphone et lancez la recherche de nouveaux scrobbles pour transférer les données d'Apple Music vers Last.fm.
4. **Mettre à jour la base** — Exécutez `npm run lastfm:update` (ou utilisez l'API Last.fm via script) pour récupérer les nouveaux scrobbles et mettre à jour la base locale.
5. **Dashboard à jour** — Une fois la BDD mise à jour, le dashboard affiche vos dernières statistiques.
6. **Données obsolètes ?** — Si le dashboard semble périmé, c'est généralement que la base n'a pas encore été mise à jour avec les nouveaux scrobbles Last.fm.

## Fonctionnalités

- **Vue d'ensemble** — Statistiques globales (écoutes, artistes, titres, temps total)
- **Timeline** — Évolution de vos écoutes dans le temps (jour/semaine/mois)
- **Heatmap** — Calendrier type GitHub Contributions
- **Genres** — Répartition par genre musical, tendances temporelles
- **Artistes** — Top artistes, statistiques détaillées
- **Analyse temporelle** — Habitudes par heure et jour de la semaine
- **Quand vais-je écouter ?** — Prédiction du créneau et genre les plus probables
- **Profil de goûts** — Explication IA de vos goûts musicaux (optionnel, Groq)
- **Évolution des goûts** — Changements semaine par semaine avec contexte IA (optionnel, Groq)
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
