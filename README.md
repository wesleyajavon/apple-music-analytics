# Apple Music Analytics Dashboard

Tableau de bord d'analyse personnel pour visualiser votre comportement d'écoute musicale en utilisant l'historique Last.fm et les données Apple Music Replay importées manuellement.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Fonctionnalités](#fonctionnalités)
- [Stack Technique](#stack-technique)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [API](#api)
- [Structure du Projet](#structure-du-projet)

## 🎯 Vue d'ensemble

Cette application permet de centraliser et visualiser vos données d'écoute musicale provenant de différentes sources :

- **Last.fm** : Import automatique de votre historique d'écoute via l'API Last.fm réelle
- **Apple Music Replay** : Import manuel des résumés annuels Apple Music

Le dashboard offre des visualisations interactives pour analyser vos habitudes d'écoute : statistiques générales, timeline, heatmap calendaire, répartition par genres et artistes, tendances, analyse temporelle, et graphique de réseau d'artistes.

## ✨ Fonctionnalités

### 📊 Vue d'ensemble (`/dashboard/overview`)
- Statistiques globales de votre écoute
- Total d'écoutes, artistes uniques, titres uniques
- Temps total d'écoute
- Filtrage par période de dates

### 📈 Timeline (`/dashboard/timeline`)
- Graphique interactif de l'évolution de vos écoutes dans le temps
- Agrégation par jour, semaine ou mois
- Métriques : nombre d'écoutes, artistes uniques, titres uniques
- Visualisation avec Recharts
- Filtrage par période personnalisée

### 🔥 Heatmap (`/dashboard/heatmap`)
- Calendrier heatmap de vos écoutes par jour
- Visualisation type GitHub Contributions
- Identification des périodes d'écoute intense

### 🎵 Genres (`/dashboard/genres`)
- Répartition de vos écoutes par genre musical
- Visualisations : graphique en camembert et graphiques en barres
- Pourcentage et nombre d'écoutes par genre
- Tableau détaillé avec tri
- Filtrage par période de dates

### 📊 Tendances Genres (`/dashboard/genres/trends`)
- Évolution des genres dans le temps
- Comparaison des tendances par période

### 👤 Artistes (`/dashboard/artists`)
- Top artistes par nombre d'écoutes
- Statistiques détaillées par artiste
- Filtrage par période

### ⏱️ Analyse Temporelle (`/dashboard/temporal-analysis`)
- Analyse des habitudes d'écoute par heure et jour de la semaine
- Identification des moments préférés pour écouter de la musique

### 🕐 Quand vais-je écouter ? (`/dashboard/when-will-i-listen`)
- Prédiction du créneau horaire et du genre les plus probables pour aujourd'hui
- Basée sur des heuristiques statistiques déterministes (pas de ML)
- Score de confiance et explication IA optionnelle
- Widget intégré sur la vue d'ensemble

### 📅 Comparaison Replay (`/dashboard/replay`)
- Comparaison des statistiques Apple Music Replay entre plusieurs années
- Sélection flexible des années à comparer
- Statistiques détaillées : temps d'écoute, nombre d'écoutes
- Top artistes et top titres par année
- Statistiques comparatives avec graphiques
- Identification des artistes communs entre années

### 🕸️ Réseau d'artistes (`/dashboard/network`)
- Visualisation interactive du réseau de connexions entre artistes
- Basé sur vos habitudes d'écoute
- Graphique de force avec react-force-graph-2d
- Exploration interactive des relations

### 🤖 AI Insights (`/dashboard/ai-insights`)
- Génération d'insights en langage naturel à partir des analytics agrégés
- 3 à 5 points factuels basés sur : distribution des genres, écoute par heure, top artistes, évolution vs période précédente
- Cache par hash des données (pas de régénération si les analytics sont inchangés)
- Requiert `GROQ_API_KEY` (voir [Configuration](#configuration), tier gratuit)

### 📖 Méthodologie (`/dashboard/insights`)
- Documentation sur les patterns, calculs et limitations du système

### 📤 Export
- Export CSV des écoutes
- Rapport PDF annuel
- Export des statistiques

### 📚 Documentation API (`/api-docs`)
- Documentation Swagger interactive de tous les endpoints

### 🎚️ Filtres globaux
- Filtrage par période de dates (disponible sur toutes les pages)
- Sélection de plages personnalisées
- Filtres rapides (7, 30, 90 jours, etc.)

## 🛠️ Stack Technique

- **Framework** : Next.js 14 (App Router) avec React 18
- **Langage** : TypeScript
- **Styling** : Tailwind CSS avec support du mode sombre
- **État serveur** : TanStack Query (React Query) v5
- **Base de données** : PostgreSQL avec Prisma ORM
- **Cache** : Redis (ioredis) — optionnel, améliore les performances
- **Validation** : Zod pour les schémas et la validation des API
- **Visualisations** :
  - Recharts (graphiques linéaires, barres, camemberts)
  - react-force-graph-2d (réseau d'artistes)
  - D3.js (utilitaires)
- **Monitoring** : Sentry pour le suivi des erreurs (optionnel)
- **Documentation API** : Swagger (OpenAPI)
- **Export** : @react-pdf/renderer pour les rapports PDF
- **Tests** : Vitest (unitaires/intégration), Playwright (E2E)
- **Déploiement** : Optimisé pour Vercel

## 🏗️ Architecture

### Architecture générale

L'application suit les principes du **App Router de Next.js** avec une séparation claire entre :

1. **Couche Présentation** (`app/dashboard/`) : Pages et composants React
2. **Couche API** (`app/api/`) : Routes API Next.js (Serverless Functions)
3. **Couche Business Logic** (`lib/services/`) : Services métier réutilisables (artist, genre, listening, artist-network, replay)
4. **Couche Données** (`lib/prisma.ts`, `lib/redis.ts`, `prisma/schema.prisma`) : Accès à la base de données et au cache
5. **Couche DTO** (`lib/dto/`) : Types et transformations de données
6. **Couche Validation** (`lib/validators/`, `lib/middleware/`) : Validation des entrées API

### Décisions architecturales

#### 1. App Router de Next.js

- **Performance** : Rendu serveur et streaming pour un chargement rapide
- **Co-localisation** : Routes API à côté des pages pour une meilleure organisation
- **Layouts partagés** : Dashboard avec sidebar et filtres globaux
- **Rendu dynamique** : APIs marquées comme `force-dynamic` pour les données temps réel

#### 2. TanStack Query

- **Cache centralisé** : Évite les requêtes redondantes
- **Optimistic Updates** : Mises à jour optimistes pour une meilleure UX
- **Refetch automatique** : Rafraîchissement des données selon la configuration
- **Gestion d'erreurs** : Retry automatique et gestion d'états de chargement
- **Provider au niveau dashboard** : Partage du client Query entre toutes les pages

#### 3. Prisma Schema

**Modèles principaux** :

- `User` : Utilisateurs de l'application
- `Artist` : Artistes avec normalisation (nom unique)
- `Track` : Titres liés aux artistes avec contrainte unique (titre + artiste)
- `Listen` : Historique d'écoute avec timestamps et source
- `ReplayYearly` : Résumés annuels Apple Music Replay
- `ReplayTopArtist`, `ReplayTopTrack`, `ReplayTopAlbum` : Classements annuels

**Optimisations** :

- Index sur les champs fréquemment interrogés (`userId`, `trackId`, `playedAt`)
- Index composites pour les requêtes complexes (`userId, playedAt`)
- Cascade delete pour maintenir l'intégrité référentielle
- Support multi-sources (`lastfm`, `apple_music_replay`)

#### 4. Structure API

- **Routes API Next.js** : Co-localisées avec les pages
- **Client API réutilisable** (`lib/api-client.ts`) : Abstraction pour les appels API
- **Gestion d'erreurs centralisée** : Format d'erreur standardisé
- **Validation** : Validation des paramètres d'entrée
- **Types TypeScript** : DTOs pour la validation et la transformation

#### 5. Configuration Prisma pour Production

- **Adapter PostgreSQL** : Utilisation de `@prisma/adapter-pg` en production
- **Connection Pooling** : Utilisation de `POSTGRES_PRISMA_URL` (avec pooler) pour l'application
- **Migrations** : Utilisation de `POSTGRES_URL_NON_POOLING` (sans pooler) pour les migrations
- **Environnement-aware** : Configuration différente dev/prod via variables d'environnement

## 📦 Installation

### Prérequis

- Node.js 20+ (voir `.nvmrc`)
- PostgreSQL (local ou service cloud)
- npm ou yarn

### Étapes d'installation

1. **Cloner le projet** (si applicable) :
```bash
git clone <repository-url>
cd apple-music-analytics
```

2. **Installer les dépendances** :
```bash
npm install
```

3. **Configurer les variables d'environnement** :
```bash
# Copier le fichier d'exemple
cp env.example .env.local

# Éditer .env.local avec vos valeurs
# Voir section Configuration pour plus de détails
```

4. **Configurer la base de données** :
```bash
# Générer le client Prisma
npm run db:generate

# Appliquer le schéma (développement)
npm run db:push

# OU créer une migration (recommandé pour production)
npm run db:migrate:dev
```

5. **Lancer le serveur de développement** :
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuration

### Variables d'environnement

Copiez `env.example` vers `.env.local` et configurez les variables suivantes :

#### Base de données

**Développement local** :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/apple_music_analytics"
```

**Production (Vercel Postgres)** :
Ces variables sont créées automatiquement lors de la création d'une base Vercel Postgres :
```env
POSTGRES_PRISMA_URL="postgres://default:xxx@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
POSTGRES_URL_NON_POOLING="postgres://default:xxx@xxx.pooler.supabase.com:5432/postgres"
```

#### Last.fm API (Requis pour utiliser vos vraies données)

Pour utiliser vos vraies données Last.fm :

1. Créez un compte sur [https://www.last.fm/api/account/create](https://www.last.fm/api/account/create)
2. Créez une application API
3. Copiez votre API Key et Secret :

```env
LASTFM_API_KEY="votre_lastfm_api_key"
LASTFM_API_SECRET="votre_lastfm_api_secret"
```

**Note** : Si les clés API ne sont pas configurées, l'application utilisera des données mockées (utile uniquement pour le développement).

#### Redis (Optionnel — pour le cache)

```env
REDIS_URL="redis://localhost:6379/0"
# Ou Upstash : REDIS_URL="redis://default:xxxxx@xxxxx.upstash.io:6379"
```

#### Sentry (Optionnel — pour le monitoring d'erreurs)

```env
SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
```

#### Groq (Optionnel — pour AI Insights)

Pour activer la génération d'insights IA à partir de vos analytics (tier gratuit disponible) :

1. Créez un compte sur [https://console.groq.com](https://console.groq.com)
2. Générez une clé API
3. Ajoutez-la à `.env.local` :

```env
GROQ_API_KEY="gsk_..."
```

**Fonctionnement** : Le client envoie les analytics agrégés (genres, heures d'écoute, top artistes, évolution) à `POST /api/ai/insights`. Le serveur résume les données de façon déterministe, calcule un hash pour le cache, et appelle l'LLM (Llama 3.1 8B via Groq) uniquement en cas de cache miss. Les réponses sont mises en cache (Redis ou mémoire) pendant 24h.

#### Variables automatiques

Ces variables sont définies automatiquement par Next.js/Vercel :

- `NODE_ENV` : `development` (local) ou `production` (deploy)
- `VERCEL_ENV` : `development`, `preview`, ou `production` (Vercel uniquement)

### Scripts disponibles

```bash
# Développement
npm run dev              # Lancer le serveur de développement
npm run dev:turbo        # Lancer avec Turbopack

# Build & Production
npm run build            # Construire l'application pour la production
npm run start            # Lancer le serveur de production

# Tests
npm test                 # Tests Vitest (watch mode)
npm run test:run         # Tests Vitest (single run)
npm run test:ui          # Interface graphique Vitest
npm run test:coverage    # Couverture de code
npm run test:integration # Tests d'intégration API uniquement
npm run test:e2e         # Tests E2E Playwright
npm run test:e2e:ui      # Tests E2E avec interface
npm run test:performance # Benchmarks de performance
npm run test:all         # Tous les tests (unitaires + E2E)

# Base de données
npm run db:generate      # Générer le client Prisma
npm run db:push          # Appliquer le schéma directement (dev)
npm run db:migrate       # Appliquer les migrations (production)
npm run db:migrate:dev   # Créer une nouvelle migration (dev)
npm run db:studio        # Ouvrir Prisma Studio
npm run db:seed          # Exécuter le seed de la base de données (données de test)

# Last.fm
npm run user:create      # Créer un utilisateur dans la base
npm run lastfm:import    # Importer les données Last.fm
npm run lastfm:update    # Mettre à jour les données Last.fm
npm run db:reseed:lastfm # Nettoyer et réensemencer avec Last.fm

# Tracks (durées, genres)
npm run tracks:fetch-durations  # Récupérer les durées des pistes
npm run tracks:fetch-genres    # Récupérer les genres des pistes
npm run tracks:update-genres   # Mettre à jour les genres

# Utilitaires
npm run lint             # Linter le code
npm run vercel:env:pull  # Récupérer les variables d'environnement Vercel
npm run docs:generate    # Générer la documentation TypeDoc
```

## 🧪 Tests

Le projet inclut une suite de tests complète :

- **Tests d'intégration API** (`__tests__/api/`) : Vitest avec mocks des services
- **Tests E2E** (`__tests__/e2e/`) : Playwright pour les parcours utilisateur
- **Tests de performance** (`__tests__/performance/`) : Benchmarks des routes API
- **Tests unitaires des services** (`lib/services/__tests__/`)

Voir `__tests__/README.md` pour plus de détails.

## 🚀 Déploiement

### Déploiement sur Vercel (Recommandé)

Vercel offre une intégration native avec Next.js et PostgreSQL.

#### 1. Créer la base de données Vercel Postgres

1. Connectez-vous à [Vercel Dashboard](https://vercel.com)
2. Sélectionnez votre projet
3. Allez dans **Storage** → **Create Database** → **Postgres**
4. Vercel créera automatiquement les variables `POSTGRES_PRISMA_URL` et `POSTGRES_URL_NON_POOLING`

#### 2. Configurer les variables d'environnement

Dans **Settings** → **Environment Variables**, ajoutez :

- `LASTFM_API_KEY` (si vous utilisez Last.fm)
- `LASTFM_API_SECRET` (si vous utilisez Last.fm)
- `REDIS_URL` (optionnel, pour le cache)
- `SENTRY_DSN` et `NEXT_PUBLIC_SENTRY_DSN` (optionnel, pour le monitoring)

Les variables de base de données sont créées automatiquement.

#### 3. Appliquer le schéma Prisma

**Option A : Via db push** (simple, recommandé pour commencer) :
```bash
npm run db:generate
npm run db:push
```

**Option B : Via migrations** (recommandé pour production) :
```bash
# Récupérer les variables de production
vercel env pull .env.production

# Configurer DATABASE_URL pour les migrations
export DATABASE_URL=$(grep POSTGRES_URL_NON_POOLING .env.production | cut -d '=' -f2)

# Appliquer les migrations
npm run db:migrate
```

#### 4. Déployer

**Première fois** :
```bash
npm i -g vercel
vercel login
vercel
```

**Déploiements suivants** :
Les déploiements sont automatiques via Git :
```bash
git push
```

### Configuration de production

Le fichier `next.config.js` est configuré avec :

- ✅ **Minification SWC** : Build optimisé
- ✅ **Headers de sécurité** : Protection XSS, clickjacking, etc.
- ✅ **Optimisation des images** : Support AVIF et WebP
- ✅ **Tree-shaking** : Optimisation des imports de packages

Consultez `.github/workflows/` pour la configuration CI/CD et les options de déploiement.

## 🔌 API

La documentation Swagger interactive est disponible sur `/api-docs`.

### Endpoints disponibles

#### GET `/api/timeline`

Récupère les données de timeline d'écoute agrégées.

**Query parameters** :
- `startDate` (optionnel) : Date de début (ISO 8601, format: YYYY-MM-DD)
- `endDate` (optionnel) : Date de fin (ISO 8601, format: YYYY-MM-DD)
- `period` (optionnel) : `day` | `week` | `month` (défaut: `day`)
- `userId` (optionnel) : ID de l'utilisateur

**Exemple** :
```bash
GET /api/timeline?startDate=2024-01-01&endDate=2024-01-31&period=week
```

#### GET `/api/lastfm`

Récupère l'historique Last.fm depuis l'API réelle (ou données mockées si non configuré).

**Query parameters** :
- `username` (optionnel) : Nom d'utilisateur Last.fm
- `limit` (optionnel) : Nombre de pistes par page (défaut: 50, max: 200)
- `page` (optionnel) : Numéro de page (défaut: 1)
- `from` (optionnel) : Timestamp Unix de début
- `to` (optionnel) : Timestamp Unix de fin
- `format` (optionnel) : `normalized` | `raw` (défaut: `normalized`)

**Exemple** :
```bash
GET /api/lastfm?username=johndoe&limit=100&page=1&format=normalized
```

#### POST `/api/lastfm/import`

Importe les données Last.fm dans la base de données.

**Body** :
```json
{
  "userId": "user_123",
  "username": "lastfm_username",
  "limit": 200,
  "page": 1
}
```

**Note** : Utilisez les scripts officiels pour importer tout l'historique :
```bash
npm run lastfm:import -- --userId "USER_ID" --username "LASTFM_USERNAME"
```

#### POST `/api/replay/import`

Importe les données Apple Music Replay pour une année.

**Body** :
```json
{
  "userId": "user_123",
  "data": {
    "year": 2024,
    "totalPlayTime": 3600000,
    "totalPlays": 5000,
    "topArtists": [...],
    "topTracks": [...],
    "topAlbums": [...]
  }
}
```

#### GET `/api/overview`

Récupère les statistiques générales.

**Query parameters** :
- `startDate` (optionnel) : Date de début (ISO 8601)
- `endDate` (optionnel) : Date de fin (ISO 8601)
- `userId` (optionnel) : ID de l'utilisateur

#### GET `/api/genres`

Récupère la répartition par genres.

**Query parameters** :
- `startDate` (optionnel) : Date de début (ISO 8601)
- `endDate` (optionnel) : Date de fin (ISO 8601)
- `userId` (optionnel) : ID de l'utilisateur

#### GET `/api/network`

Récupère les données du réseau d'artistes.

**Query parameters** :
- `startDate` (optionnel) : Date de début (ISO 8601)
- `endDate` (optionnel) : Date de fin (ISO 8601)
- `userId` (optionnel) : ID de l'utilisateur

#### GET `/api/artists`

Récupère le top des artistes par nombre d'écoutes.

**Query parameters** :
- `startDate`, `endDate`, `userId` (optionnels)
- `limit` (optionnel) : Nombre d'artistes à retourner

#### GET `/api/artists/trends`

Récupère les tendances des artistes dans le temps.

#### GET `/api/genres/trends`

Récupère les tendances des genres dans le temps.

#### GET `/api/temporal-analysis`

Récupère l'analyse temporelle (écoutes par heure et jour de la semaine).

**Query parameters** :
- `startDate`, `endDate`, `userId` (optionnels)

#### GET `/api/replay`

Récupère les résumés Replay disponibles.

**Query parameters** :
- `userId` (optionnel) : ID de l'utilisateur

#### Export

- `GET /api/export/listens` : Export CSV des écoutes
- `GET /api/export/stats` : Export des statistiques
- `GET /api/export/report` : Rapport PDF annuel

#### Documentation

- `GET /api/swagger` : Spécification OpenAPI (JSON)

## 📁 Structure du Projet

```
apple-music-analytics/
├── app/
│   ├── api/                      # Routes API Next.js
│   │   ├── artists/              # Artistes et tendances
│   │   ├── export/               # Export CSV, PDF, stats
│   │   ├── genres/               # Genres et tendances
│   │   ├── lastfm/               # Last.fm et import
│   │   ├── listens/              # Écoutes
│   │   ├── network/              # Réseau d'artistes
│   │   ├── overview/             # Vue d'ensemble
│   │   ├── replay/               # Replay et import
│   │   ├── swagger/              # Spécification OpenAPI
│   │   ├── temporal-analysis/    # Analyse temporelle
│   │   └── timeline/             # Timeline
│   ├── api-docs/                 # Page documentation Swagger
│   ├── dashboard/                # Pages du dashboard
│   │   ├── artists/              # Top artistes
│   │   ├── genres/               # Genres + tendances
│   │   ├── heatmap/              # Calendrier heatmap
│   │   ├── insights/             # Insights personnalisés
│   │   ├── network/              # Réseau d'artistes
│   │   ├── overview/             # Vue d'ensemble
│   │   ├── replay/               # Comparaison Replay
│   │   ├── temporal-analysis/    # Analyse temporelle
│   │   ├── timeline/             # Timeline
│   │   └── layout.tsx            # Layout partagé
│   ├── error.tsx                 # Gestion d'erreurs
│   ├── global-error.tsx          # Erreur globale
│   └── providers.tsx             # Providers (TanStack Query)
│
├── lib/
│   ├── components/               # Composants réutilisables
│   │   ├── artist-network-graph.tsx
│   │   ├── calendar-heatmap.tsx
│   │   ├── date-range-filter.tsx
│   │   ├── pdf/                  # Génération PDF
│   │   ├── sidebar.tsx
│   │   └── ...
│   ├── constants/                # Configuration
│   ├── dto/                      # Data Transfer Objects
│   ├── hooks/                    # React Hooks (use-artists, use-listening, etc.)
│   ├── middleware/               # Validation des requêtes
│   ├── services/                 # Services métier
│   │   ├── artist/               # Service artistes
│   │   ├── artist-network/       # Réseau (algorithms, builder)
│   │   ├── genre/                # Service genres
│   │   ├── listening/            # Écoutes, agrégation, temporal
│   │   ├── lastfm.ts
│   │   └── replay/
│   ├── utils/                    # Utilitaires (logger, csv, sentry)
│   ├── validators/               # Validation API (Zod)
│   ├── api-client.ts
│   ├── prisma.ts
│   └── redis.ts                  # Client Redis (cache)
│
├── __tests__/                    # Tests
│   ├── api/                      # Tests d'intégration API
│   ├── e2e/                      # Tests Playwright
│   └── performance/              # Benchmarks
│
├── .github/workflows/            # CI/CD (ci.yml, test-coverage.yml)
├── prisma/
├── scripts/                      # Scripts (import-lastfm, update-lastfm, etc.)
├── .nvmrc                        # Node 20
├── vitest.config.ts
├── playwright.config.ts
└── typedoc.json                  # Documentation TypeDoc
```

## 🔒 Sécurité

- ✅ Variables d'environnement sécurisées (jamais commitées)
- ✅ Validation des entrées utilisateur dans les APIs
- ✅ Headers de sécurité HTTP configurés
- ✅ Protection contre les injections SQL (Prisma ORM)
- ✅ Rate limiting recommandé pour la production (via Vercel ou middleware)

## 📝 Notes de développement

### Ajout de nouvelles fonctionnalités

1. **Nouvelle page dashboard** :
   - Créer `app/dashboard/ma-page/page.tsx`
   - Ajouter le lien dans `lib/components/sidebar.tsx` (tableau `navItems`)

2. **Nouvelle route API** :
   - Créer `app/api/ma-route/route.ts`
   - Documenter dans `swagger.config.js` pour la doc Swagger
   - Valider les paramètres avec `lib/validators/api-validators.ts`

3. **Nouveau service** :
   - Créer dans `lib/services/` (ou sous-dossier dédié)
   - Utiliser `prisma` depuis `lib/prisma.ts`
   - Ajouter des tests dans `lib/services/__tests__/`

4. **Nouveau hook** :
   - Créer `lib/hooks/use-mon-hook.ts`
   - Utiliser TanStack Query avec les clés de `lib/hooks/query-keys.ts`

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :

1. Créer une branche depuis `main`
2. Faire vos modifications
3. Tester localement
4. Soumettre une pull request

## 📄 License

[À définir]

---

**Créé avec ❤️ pour analyser votre musique**
