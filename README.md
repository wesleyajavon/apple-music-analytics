# Apple Music Analytics Dashboard

Tableau de bord d'analyse personnel pour visualiser votre comportement d'écoute Apple Music en utilisant l'historique Last.fm et les données Apple Music Replay importées manuellement.

## Stack Technique

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **TanStack Query** (React Query)
- **Prisma** + **PostgreSQL**
- **Recharts** (graphiques)
- **D3.js** (graphiques de réseau)

## Structure du Projet

```
app/
├── api/                    # Routes API Next.js
│   ├── timeline/          # Endpoint pour les données de timeline
│   ├── lastfm/            # Endpoint pour Last.fm (placeholder)
│   └── replay/            # Endpoint pour importer Apple Music Replay
├── dashboard/             # Pages du dashboard
│   ├── overview/          # Vue d'ensemble
│   ├── timeline/          # Timeline d'écoute (avec graphique Recharts)
│   ├── genres/            # Visualisation des genres
│   ├── replay/            # Import Apple Music Replay
│   └── network/           # Graphique de réseau D3.js
├── layout.tsx             # Layout racine
├── page.tsx               # Page d'accueil
└── providers.tsx          # Providers (TanStack Query)

lib/
├── prisma.ts              # Client Prisma (singleton)
└── api-client.ts          # Client API réutilisable

prisma/
└── schema.prisma          # Schéma de base de données
```

## Décisions Architecturales

### 1. App Router de Next.js
- Utilisation du nouveau App Router pour une meilleure performance et une structure plus claire
- Routes API intégrées dans `app/api/`
- Layouts partagés pour le dashboard

### 2. TanStack Query
- Gestion centralisée de l'état serveur et du cache
- Configuration avec staleTime pour réduire les requêtes inutiles
- Provider au niveau du layout du dashboard pour partager le client

### 3. Prisma Schema
- Modèle relationnel avec User, Artist, Track, et Listen
- Index sur les champs fréquemment interrogés (userId, trackId, playedAt)
- Support pour plusieurs sources (Last.fm et Apple Music Replay)

### 4. Structure API
- Routes API Next.js pour la co-localisation avec les pages
- Client API réutilisable dans `lib/api-client.ts`
- Gestion d'erreurs centralisée

## Installation

1. Installer les dépendances:
```bash
npm install
```

2. Configurer la base de données:
```bash
# Créer un fichier .env avec votre DATABASE_URL
echo "DATABASE_URL=\"postgresql://user:password@localhost:5432/apple_music_analytics\"" > .env
```

3. Initialiser Prisma:
```bash
npx prisma generate
npx prisma db push
```

4. Lancer le serveur de développement:
```bash
npm run dev
```

## Routes Disponibles

- `/` - Page d'accueil
- `/dashboard` - Redirige vers `/dashboard/overview`
- `/dashboard/overview` - Vue d'ensemble avec statistiques
- `/dashboard/timeline` - Timeline d'écoute avec graphique Recharts
- `/dashboard/genres` - Visualisation des genres (à venir)
- `/dashboard/replay` - Import Apple Music Replay
- `/dashboard/network` - Graphique de réseau D3.js (à venir)

## API Endpoints

- `GET /api/timeline` - Récupère les données de timeline (mock pour l'instant)
- `GET /api/lastfm` - Récupère l'historique Last.fm (placeholder)
- `POST /api/replay/import` - Importe les données Apple Music Replay (placeholder)

## Prochaines Étapes

1. Intégrer l'API Last.fm avec des clés API réelles
2. Implémenter l'import Apple Music Replay avec validation
3. Ajouter les visualisations de genres
4. Implémenter le graphique de réseau avec D3.js
5. Ajouter l'authentification si nécessaire
6. Optimiser les requêtes Prisma avec des agrégations

