# Apple Music Analytics

[![CI](https://img.shields.io/github/actions/workflow/status/wesleyajavon/apple-music-analytics/ci.yml?branch=main)](https://github.com/wesleyajavon/apple-music-analytics/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Tableau de bord personnel pour visualiser votre comportement d'écoute à partir des **scrobbles Last.fm**, d’**exports CSV Apple Music**, ou de données mock / seed.

L’authentification repose sur **Supabase Auth** (connexion et inscription). Les visiteurs anonymes peuvent consulter une **démo publique** lorsque `NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID` est configuré (voir [`env.example`](env.example)).

Démo en ligne : **[https://apple-music-analytics.vercel.app/fr](https://apple-music-analytics.vercel.app/fr)** (locale par défaut : français ; **en** et **es** sont disponibles sous `/en` et `/es`).

Idées produit et noms de code (Breakwater, Encore, …) : **[IDEAS_BAG.md](IDEAS_BAG.md)** à la racine du dépôt. Notes d’implémentation auth : **[`docs/SUPABASE_AUTH_IMPLEMENTATION.md`](docs/SUPABASE_AUTH_IMPLEMENTATION.md)**.

## Pourquoi Last.fm plutôt que l'API Apple Music ?

Ce projet utilise l'**API Last.fm** plutôt que l'API officielle Apple Music pour des raisons budgétaires. L'API Apple Music nécessite un abonnement payant au programme développeur Apple et des coûts à l'usage. Last.fm propose une API gratuite pour un usage personnel.

### Qu'est-ce que Last.fm ?

[Last.fm](https://www.last.fm) est un service de découverte musicale qui enregistre vos écoutes sur différentes plateformes (Apple Music, Spotify, etc.). En connectant Last.fm à votre compte Apple Music, il **scrobble** vos écoutes — c'est-à-dire qu'il enregistre chaque morceau écouté (artiste, titre, horodatage) sur votre profil Last.fm. Ce projet récupère cet historique via l'API Last.fm et le stocke en base locale pour les analytics.

## Workflow du projet

Comprendre comment les données arrivent dans le dashboard :

1. **Écouter de la musique** — Utilisez Apple Music (ou toute app supportée) sur votre téléphone comme d'habitude.
2. **Scrobbling Last.fm** — Last.fm est lié à votre compte Apple Music et enregistre automatiquement (« scrobble ») chaque écoute.
3. **Synchroniser les scrobbles** — *(Pas encore automatisé)* Vous ouvrez manuellement l'app Last.fm sur votre téléphone et lancez la recherche de nouveaux scrobbles pour transférer les données d'Apple Music vers Last.fm.
4. **Mettre à jour la base** — Exécutez `npm run lastfm:update` (ou utilisez l'API Last.fm via script) pour récupérer les nouveaux scrobbles et mettre à jour la base locale. Vous pouvez aussi importer un CSV d’historique Apple Music via la section **Scripts données** ci-dessous (`apple-music:filter` / `apple-music:import`).
5. **Dashboard à jour** — Une fois la BDD mise à jour, le dashboard affiche vos dernières statistiques.
6. **Données obsolètes ?** — Si le dashboard semble périmé, c'est généralement que la base n'a pas encore été mise à jour avec les nouveaux scrobbles Last.fm.

## Fonctionnalités

- **i18n** — Interface en français (par défaut), anglais et espagnol (`next-intl`)

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
- **PostgreSQL** (local ou cloud ; avec Vercel + Postgres Supabase, préférer `POSTGRES_PRISMA_URL` pour l’app et `POSTGRES_URL_NON_POOLING` pour les migrations — voir [`env.example`](env.example))
- **Projet Supabase** avec Auth activé (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- **Redis** (optionnel, pour le cache)

## Installation locale (développement / fork)

```bash
git clone https://github.com/wesleyajavon/apple-music-analytics.git
cd apple-music-analytics
npm install
cp env.example .env.local
# Éditer .env.local : voir env.example pour la liste complète des variables
npm run db:generate
npm run db:migrate   # ou db:migrate:dev / db:push selon votre flux
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) (redirection vers la locale par défaut).

### Variables d'environnement

**Indispensables pour lancer l’app :** `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

**Last.fm** (`LASTFM_API_KEY`, `LASTFM_API_SECRET`) est **optionnel** — le code utilise des clés mock tant que vous n’avez pas défini de vraies credentials (voir `lib/services/lastfm.ts`).

Les **scripts serveur** d’import peuvent exiger `IMPORT_ADMIN_KEY` (en-tête `x-import-admin-key`). En option : `NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID` pour la démo anonyme, Redis, Sentry, `GROQ_API_KEY`, etc. Liste complète : [`env.example`](env.example).

## Scripts principaux

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run dev:turbo` | Dev avec Turbopack |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm run lint` | ESLint (Next.js) |
| `npm run lastfm:update` | Mise à jour des données Last.fm |
| `npm run db:migrate` | Appliquer les migrations (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | Créer / appliquer les migrations en développement |
| `npm run db:studio` | Prisma Studio (interface BDD) |
| `npm run test:run` | Tests unitaires (Vitest) |
| `npm run test:integration` | Tests d’intégration API |
| `npm run test:e2e` | Tests E2E Playwright |
| `npm run vercel:env:pull` | Récupérer les variables Vercel dans `.env.local` |

### Scripts données (genres, import Apple Music CSV, etc.)

Commandes utiles pour les imports et les pipelines de genres — liste non exhaustive ; voir `package.json` pour l’ensemble des scripts.

| Script | Description |
|--------|-------------|
| `npm run apple-music:filter` | Filtrer un export Apple Music avant import CSV |
| `npm run apple-music:import` | Importer un CSV d’historique Apple Music en base |
| `npm run db:check-capacity` | Vérifier la taille approximative de la BDD par rapport aux limites pratiques |
| `npm run spotify:backfill-genres` | Compléter les genres manquants via Spotify (si les identifiants API sont configurés) |
| `npm run genres:normalize` | Normaliser les libellés de genre après des backfills |
| `npm run genres:pick-menu-doc` | Régénérer `docs/GENRE_PICK_MENU.md` à partir de la carte de normalisation |
| `npm run genres:map-top-unknown` | CLI interactive pour rattacher les artistes « inconnus » aux genres (variantes : `genres:map-top-unknown:200`, `genres:map-tracks`) |

Les autres backfills de genres (`genres:backfill-llm`, `genres:backfill-cascade`, `genres:backfill-consensus`) et `spotify:test-genres` sont détaillés dans `docs/` et `package.json`.

## Documentation

- **API** : [`docs/API.md`](docs/API.md) (référence des endpoints)
- **Code** : `docs/` (généré avec `npm run docs:generate`)

Lancer `npm run docs:generate` après modification du code documenté sous `lib/services/**` ou `lib/dto/**`, ou pour régénérer la sortie TypeDoc HTML dans `docs/` ; la commande exécute `docs:clean` puis `typedoc` (voir `typedoc.json`). Le fichier `docs/API.md` est rédigé à la main et **n’est pas** produit par TypeDoc ; `npm run build` exécute `docs:api:copy`, qui copie `docs/API.md` vers `public/docs/API.md` pour la production.

## Licence

[MIT](LICENSE)
