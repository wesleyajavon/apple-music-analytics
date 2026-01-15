# Revue de Code - Apple Music Analytics

## 📋 Résumé Exécutif

Cette revue de code identifie les problèmes architecturaux, de couplage, de performance et de structure dans le codebase. Les recommandations sont classées par priorité et incluent des propositions de refactorisation concrètes.

---

## 🔴 Problèmes Critiques

### 1. Duplication de Code - Mapping des Genres

**Localisation**: 
- `lib/services/listening.ts` (lignes 382-400)
- `lib/services/artist-network.ts` (lignes 20-38)

**Problème**:
Le mapping `ARTIST_TO_GENRE_MAP` et la fonction `getGenreForArtist` sont dupliqués dans deux services différents. Cela viole le principe DRY et crée un risque de divergence.

**Impact**:
- Maintenance difficile (changements à faire en deux endroits)
- Risque d'incohérence des données
- Violation du principe DRY

**Refactorisation proposée**:
```typescript
// lib/services/genre-service.ts
export const ARTIST_TO_GENRE_MAP: Record<string, string> = {
  // ... mapping centralisé
};

export function getGenreForArtist(artistName: string): string {
  return ARTIST_TO_GENRE_MAP[artistName] || "Unknown";
}

// Utilisation dans les autres services
import { getGenreForArtist } from "./genre-service";
```

---

### 2. Requêtes SQL Brutes Non Typées et Dupliquées

**Localisation**: 
- `lib/services/listening.ts` (lignes 102-143, 175-216, 267-308)

**Problème**:
1. Duplication massive de requêtes SQL brutes avec seulement la différence `userId` conditionnelle
2. Types génériques `bigint` qui nécessitent des conversions manuelles
3. Pas de réutilisation de la logique de requête
4. Risque d'injection SQL si les paramètres ne sont pas correctement échappés (bien que Prisma le fasse)

**Impact**:
- Code difficile à maintenir
- Risque d'erreurs lors de modifications
- Performance sous-optimale (requêtes non optimisées)

**Refactorisation proposée**:
```typescript
// lib/services/listening-aggregation.ts
interface AggregationResult {
  date: string;
  listens: number;
  unique_tracks: number;
  unique_artists: number;
}

async function executeDateAggregation(
  startDate: Date,
  endDate: Date,
  period: 'day' | 'week' | 'month',
  userId?: string
): Promise<AggregationResult[]> {
  const dateExpr = period === 'day' 
    ? 'DATE("playedAt")'
    : period === 'week'
    ? 'DATE_TRUNC(\'week\', "playedAt")::date'
    : 'TO_CHAR("playedAt", \'YYYY-MM\')';
  
  const userIdFilter = userId ? 'AND l."userId" = ${userId}' : '';
  
  const query = prisma.$queryRaw<AggregationResult[]>`
    SELECT 
      ${Prisma.raw(dateExpr)} as date,
      COUNT(*)::int as listens,
      COUNT(DISTINCT "trackId")::int as unique_tracks,
      COUNT(DISTINCT t."artistId")::int as unique_artists
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    WHERE l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      ${Prisma.raw(userIdFilter)}
    GROUP BY ${Prisma.raw(dateExpr)}
    ORDER BY date ASC
  `;
  
  return query;
}
```

---

### 3. Problème de Performance N+1 dans les Agrégations

**Localisation**: 
- `lib/services/listening.ts` (lignes 221-242, 313-333)

**Problème**:
Dans `getWeeklyAggregatedListens` et `getMonthlyAggregatedListens`, pour chaque période, on fait un appel à `getDailyAggregatedListens`. Si on a 12 mois, cela fait 12 requêtes supplémentaires.

**Impact**:
- Performance dégradée avec de grandes plages de dates
- Charge inutile sur la base de données
- Temps de réponse élevé

**Refactorisation proposée**:
```typescript
// Récupérer toutes les données quotidiennes une seule fois
const allDailyData = await getDailyAggregatedListens(startDate, endDate, userId);
const dailyMap = new Map(allDailyData.map(d => [d.date, d]));

// Grouper en semaines/mois en mémoire
const weeklyData = groupDailyIntoWeekly(allDailyData);
const monthlyData = groupDailyIntoMonthly(allDailyData);
```

---

### 4. Requêtes Inefficaces dans `getOverviewStats`

**Localisation**: 
- `lib/services/listening.ts` (lignes 455-521)

**Problème**:
1. `findMany` avec `distinct` pour obtenir les tracks uniques (lignes 480-486) - inefficace
2. Requête supplémentaire pour obtenir les artistes (lignes 489-497)
3. Requête pour obtenir toutes les écoutes avec leurs tracks juste pour sommer les durées (lignes 500-513)

**Impact**:
- 3-4 requêtes au lieu d'une seule
- Chargement inutile de données en mémoire
- Performance dégradée

**Refactorisation proposée**:
```typescript
export async function getOverviewStats(
  startDate?: Date,
  endDate?: Date,
  userId?: string
): Promise<OverviewStatsDto> {
  const where: any = {};
  // ... construction du where

  // Une seule requête SQL avec agrégations
  const result = await prisma.$queryRaw<[{
    total_listens: bigint;
    unique_tracks: bigint;
    unique_artists: bigint;
    total_play_time: bigint;
  }]>`
    SELECT 
      COUNT(*)::int as total_listens,
      COUNT(DISTINCT l."trackId")::int as unique_tracks,
      COUNT(DISTINCT t."artistId")::int as unique_artists,
      COALESCE(SUM(t.duration), 0)::int as total_play_time
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    WHERE ${Prisma.raw(buildWhereClause(where))}
  `;

  return {
    totalListens: Number(result[0].total_listens),
    uniqueTracks: Number(result[0].unique_tracks),
    uniqueArtists: Number(result[0].unique_artists),
    totalPlayTime: Number(result[0].total_play_time),
  };
}
```

---

### 5. Algorithme O(n²) dans `createProximityEdges`

**Localisation**: 
- `lib/services/artist-network.ts` (lignes 168-270)

**Problème**:
L'algorithme utilise une boucle imbriquée qui compare chaque écoute avec toutes les suivantes dans une fenêtre temporelle. Pour N écoutes, cela peut être O(n²) dans le pire cas.

**Impact**:
- Performance très dégradée avec de grandes quantités de données
- Temps de réponse inacceptable pour les utilisateurs avec beaucoup d'écoutes

**Refactorisation proposée**:
```typescript
// Utiliser une fenêtre glissante (sliding window) pour O(n)
async function createProximityEdges(
  nodes: ArtistNode[],
  params: ArtistNetworkQueryParams
): Promise<ArtistEdge[]> {
  // ... récupération des listens
  
  const proximityMap = new Map<string, number>();
  const windowMs = proximityWindowMinutes * 60 * 1000;
  
  // Fenêtre glissante avec deux pointeurs
  let left = 0;
  for (let right = 0; right < listens.length; right++) {
    const rightTime = listens[right].playedAt.getTime();
    
    // Avancer le pointeur gauche jusqu'à ce qu'il soit dans la fenêtre
    while (left < right && (rightTime - listens[left].playedAt.getTime()) > windowMs) {
      left++;
    }
    
    // Comparer avec toutes les écoutes dans la fenêtre
    const rightArtistId = listens[right].track.artistId;
    for (let i = left; i < right; i++) {
      const leftArtistId = listens[i].track.artistId;
      if (rightArtistId !== leftArtistId && 
          relevantArtistIds.has(rightArtistId) && 
          relevantArtistIds.has(leftArtistId)) {
        const edgeKey = createEdgeKey(leftArtistId, rightArtistId);
        proximityMap.set(edgeKey, (proximityMap.get(edgeKey) || 0) + 1);
      }
    }
  }
  
  // ... conversion en edges
}
```

---

## 🟡 Problèmes Majeurs

### 6. Gestion d'Erreurs Incohérente

**Localisation**: 
- Toutes les routes API (`app/api/**/route.ts`)

**Problème**:
1. Erreurs génériques avec seulement `console.error` et message générique
2. Pas de logging structuré
3. Pas de distinction entre erreurs client (400) et serveur (500)
4. Pas de tracking des erreurs

**Impact**:
- Debugging difficile en production
- Pas de visibilité sur les erreurs réelles
- Expérience utilisateur dégradée

**Refactorisation proposée**:
```typescript
// lib/utils/error-handler.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.statusCode }
    );
  }
  
  // Logging structuré
  logger.error('Unexpected error', { error, stack: error instanceof Error ? error.stack : undefined });
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

### 7. Validation des Paramètres Dupliquée

**Localisation**: 
- Toutes les routes API

**Problème**:
La validation des dates, userId, etc. est répétée dans chaque route API.

**Refactorisation proposée**:
```typescript
// lib/validators/api-validators.ts
export function validateDateRange(
  startDate: string | null,
  endDate: string | null
): { start?: Date; end?: Date } | { error: string } {
  // Validation centralisée
}

// lib/middleware/validation.ts
export function withValidation<T>(
  validator: (params: unknown) => T | { error: string },
  handler: (params: T) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const params = extractParams(request);
    const validation = validator(params);
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    return handler(validation);
  };
}
```

---

### 8. Client API Basique Sans Gestion d'Erreurs Avancée

**Localisation**: 
- `lib/api-client.ts`

**Problème**:
1. Pas de retry automatique
2. Pas de gestion des erreurs HTTP détaillées
3. Pas de timeout
4. Pas de gestion des erreurs réseau

**Refactorisation proposée**:
```typescript
export class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(response.status, errorData.error || response.statusText);
      }
      
      return response.json();
    } catch (error) {
      if (retries > 0 && this.isRetryable(error)) {
        await this.delay(1000 * (4 - retries)); // Exponential backoff
        return this.request(endpoint, options, retries - 1);
      }
      throw error;
    }
  }
}
```

---

### 9. Absence de Cache pour les Requêtes Coûteuses

**Localisation**: 
- `lib/services/artist-network.ts` (fonction `buildArtistNetworkGraph`)

**Problème**:
Le calcul du réseau d'artistes est très coûteux mais n'est pas mis en cache. Chaque requête recalcule tout.

**Refactorisation proposée**:
```typescript
// Utiliser un cache Redis ou en mémoire avec TTL
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function buildArtistNetworkGraph(
  params: ArtistNetworkQueryParams
): Promise<ArtistNetworkGraph> {
  const cacheKey = `network:${JSON.stringify(params)}`;
  
  // Vérifier le cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Calculer
  const graph = await computeGraph(params);
  
  // Mettre en cache (TTL: 1 heure)
  await redis.setex(cacheKey, 3600, JSON.stringify(graph));
  
  return graph;
}
```

---

### 10. Type `any` Utilisé pour les Filtres Prisma

**Localisation**: 
- `lib/services/listening.ts` (lignes 32, 90, 163, 255, 410, 460)
- `lib/services/artist-network.ts` (lignes 55, 174)

**Problème**:
Utilisation de `any` pour les objets `where` de Prisma, perdant les avantages du typage.

**Refactorisation proposée**:
```typescript
import { Prisma } from '@prisma/client';

type ListenWhereInput = Prisma.ListenWhereInput;

function buildListenWhere(params: ListensQueryParams): ListenWhereInput {
  const where: ListenWhereInput = {};
  
  if (params.startDate || params.endDate) {
    where.playedAt = {};
    if (params.startDate) {
      where.playedAt.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      where.playedAt.lte = new Date(params.endDate);
    }
  }
  
  // ... reste de la construction
  
  return where;
}
```

---

## 🟢 Problèmes Mineurs / Améliorations

### 11. Absence de Pagination pour `getGenreDistribution`

**Localisation**: 
- `lib/services/listening.ts` (lignes 405-450)

**Problème**:
La fonction charge toutes les écoutes en mémoire pour calculer la distribution des genres. Avec de grandes quantités de données, cela peut causer des problèmes de mémoire.

**Refactorisation proposée**:
```typescript
// Utiliser une requête SQL agrégée directement
export async function getGenreDistribution(
  startDate?: Date,
  endDate?: Date,
  userId?: string
): Promise<Array<{ genre: string; count: number }>> {
  // Requête SQL avec GROUP BY au lieu de charger toutes les écoutes
  const result = await prisma.$queryRaw<Array<{ genre: string; count: bigint }>>`
    SELECT 
      COALESCE(genre_map.genre, 'Unknown') as genre,
      COUNT(*)::int as count
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    LEFT JOIN (
      VALUES ${Prisma.join(
        Object.entries(ARTIST_TO_GENRE_MAP).map(([artist, genre]) =>
          Prisma.sql`(${artist}, ${genre})`
        )
      )}
    ) AS genre_map(artist_name, genre) ON a.name = genre_map.artist_name
    WHERE ${buildWhereClause({ startDate, endDate, userId })}
    GROUP BY genre
    ORDER BY count DESC
  `;
  
  return result.map(row => ({
    genre: row.genre,
    count: Number(row.count),
  }));
}
```

---

### 12. Magic Numbers et Valeurs Hardcodées

**Localisation**: 
- `lib/services/artist-network.ts` (ligne 172: `proximityWindowMinutes = 30`)
- `lib/hooks/use-listening.ts` (lignes 145, 203, 243: `staleTime` en millisecondes)

**Refactorisation proposée**:
```typescript
// lib/constants/config.ts
export const DEFAULT_PROXIMITY_WINDOW_MINUTES = 30;
export const CACHE_STALE_TIME = {
  TIMELINE: 2 * 60 * 1000, // 2 minutes
  GENRES: 5 * 60 * 1000,   // 5 minutes
  OVERVIEW: 5 * 60 * 1000, // 5 minutes
} as const;
```

---

### 13. Absence de Tests

**Problème**:
Aucun test unitaire, d'intégration ou E2E n'est présent dans le codebase.

**Refactorisation proposée**:
- Ajouter Jest/Vitest pour les tests unitaires
- Tests pour les services critiques (listening, artist-network)
- Tests d'intégration pour les routes API
- Tests E2E avec Playwright

---

### 14. Documentation Manquante

**Problème**:
- Pas de JSDoc pour les fonctions complexes
- Pas de documentation des DTOs
- Pas de schéma OpenAPI/Swagger pour les APIs

**Refactorisation proposée**:
```typescript
/**
 * Calcule le réseau d'artistes basé sur les habitudes d'écoute.
 * 
 * @param params - Paramètres de requête pour filtrer les données
 * @param params.userId - ID de l'utilisateur (optionnel)
 * @param params.startDate - Date de début au format ISO 8601 (optionnel)
 * @param params.endDate - Date de fin au format ISO 8601 (optionnel)
 * @param params.minPlayCount - Nombre minimum d'écoutes pour inclure un artiste (défaut: 1)
 * @param params.maxArtists - Nombre maximum d'artistes à inclure (optionnel)
 * @param params.proximityWindowMinutes - Fenêtre temporelle pour les connexions de proximité (défaut: 30)
 * @param params.minEdgeWeight - Poids minimum des arêtes à inclure (défaut: 1)
 * 
 * @returns Graphe d'artistes avec nœuds et arêtes
 * 
 * @example
 * ```typescript
 * const graph = await buildArtistNetworkGraph({
 *   userId: 'user123',
 *   startDate: '2024-01-01',
 *   endDate: '2024-12-31',
 *   minPlayCount: 5
 * });
 * ```
 */
export async function buildArtistNetworkGraph(
  params: ArtistNetworkQueryParams = {}
): Promise<ArtistNetworkGraph> {
  // ...
}
```

---

## 📊 Problèmes de Structure

### 15. Organisation des Services

**Problème**:
Les services mélangent différentes responsabilités :
- `listening.ts` : requêtes DB, agrégations, calculs de genres
- `artist-network.ts` : requêtes DB, calculs de graphes, logique métier

**Refactorisation proposée**:
```
lib/
  services/
    listening/
      listening-service.ts      # CRUD de base
      listening-aggregation.ts   # Agrégations temporelles
      listening-stats.ts         # Statistiques
    genre/
      genre-service.ts           # Mapping et logique de genres
    artist-network/
      network-builder.ts         # Construction du graphe
      network-algorithms.ts      # Algorithmes (proximité, etc.)
    replay/
      replay-service.ts          # Service Replay (déjà bien séparé)
```

---

### 16. DTOs et Types

**Problème**:
- Types `bigint` de Prisma exposés dans les DTOs
- Pas de validation runtime des DTOs (seulement TypeScript)
- Pas de transformation centralisée

**Refactorisation proposée**:
```typescript
// lib/dto/transformers.ts
export function transformBigIntToNumber<T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T]: T[K] extends bigint ? number : T[K] } {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      typeof value === 'bigint' ? Number(value) : value,
    ])
  ) as any;
}

// Utilisation avec Zod pour validation runtime
import { z } from 'zod';

export const ListenDtoSchema = z.object({
  id: z.string(),
  trackTitle: z.string(),
  artistName: z.string(),
  playedAt: z.string().datetime(),
  source: z.enum(['lastfm', 'apple_music_replay']),
});
```

---

## 🔧 Recommandations de Refactorisation Prioritaires

### Priorité 1 (Critique - À faire immédiatement)
1. ✅ Extraire le mapping des genres dans un service dédié
2. ✅ Refactoriser les requêtes SQL dupliquées
3. ✅ Optimiser `getOverviewStats` avec une seule requête SQL
4. ✅ Corriger l'algorithme O(n²) dans `createProximityEdges`

### Priorité 2 (Important - À faire bientôt)
5. ✅ Implémenter une gestion d'erreurs centralisée
6. ✅ Ajouter de la validation centralisée pour les routes API
7. ✅ Améliorer le client API avec retry et timeout
8. ✅ Remplacer les `any` par des types Prisma appropriés

### Priorité 3 (Amélioration - À planifier)
9. ✅ Ajouter un cache pour les requêtes coûteuses
10. ✅ Optimiser `getGenreDistribution` avec SQL
11. ✅ Ajouter des tests unitaires et d'intégration
12. ✅ Améliorer la documentation

---

## 📝 Notes Finales

Le codebase est globalement bien structuré avec une séparation claire des couches. Les principaux problèmes sont liés à :
- La duplication de code
- Les problèmes de performance dans les requêtes et algorithmes
- L'absence de gestion d'erreurs robuste
- Le manque de tests

Les refactorisations proposées amélioreront significativement la maintenabilité, la performance et la robustesse de l'application.

---

## 🚀 Prochaines Étapes Recommandées

Tous les points de la revue de code initiale ont été traités avec succès. Voici les prochaines étapes pour continuer à améliorer le projet :

### Priorité 1 : Qualité et Fiabilité 🔴

#### 1. CI/CD avec GitHub Actions

**Objectif** : Automatiser les vérifications de qualité et les déploiements

**Actions à implémenter** :
- Workflow de tests automatiques sur chaque PR
- Linting et type checking (ESLint + TypeScript)
- Build de vérification avant merge
- Déploiement automatique sur Vercel (staging/production)
- Tests de régression automatiques

**Fichiers à créer** :
```
.github/
  workflows/
    ci.yml          # Tests, lint, type-check
    deploy.yml       # Déploiement automatique
    test-coverage.yml # Rapport de couverture
```

**Bénéfices** :
- Détection précoce des bugs
- Qualité de code garantie
- Déploiements fiables et automatisés
- Historique des builds et tests

---

#### 2. Améliorer la Couverture de Tests

**État actuel** : Tests unitaires présents pour les services critiques

**Objectif** : Atteindre >80% de couverture avec tests d'intégration et E2E

**Actions à implémenter** :
- Tests d'intégration pour les routes API (`app/api/**/route.ts`)
  - Tester les validations de paramètres
  - Tester les réponses HTTP
  - Tester la gestion d'erreurs
- Tests E2E avec Playwright
  - Parcours utilisateur complets
  - Tests de visualisation
  - Tests de performance frontend
- Tests de performance
  - Benchmarks pour les requêtes SQL
  - Tests de charge pour les endpoints critiques

**Exemple de test d'intégration** :
```typescript
// __tests__/api/timeline.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/timeline/route';
import { NextRequest } from 'next/server';

describe('GET /api/timeline', () => {
  it('should return timeline data with valid dates', async () => {
    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=2024-01-01&endDate=2024-01-31&period=day'
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should return 400 for invalid date format', async () => {
    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=invalid'
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
  });
});
```

---

#### 3. Monitoring et Observabilité

**Objectif** : Visibilité complète sur l'application en production

**Actions à implémenter** :
- **Sentry** pour le tracking d'erreurs
  - Capture automatique des erreurs frontend/backend
  - Stack traces détaillés
  - Alertes en temps réel
  - Performance monitoring (APM)
- **Métriques de performance**
  - Web Vitals (LCP, FID, CLS)
  - Temps de réponse des APIs
  - Utilisation de la base de données
  - Utilisation du cache Redis
- **Logging structuré**
  - Centralisation des logs (ex: Logtail, Datadog)
  - Corrélation des logs avec les erreurs
  - Alertes sur patterns d'erreurs

**Configuration Sentry** :
```typescript
// lib/utils/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
});
```

---

### Priorité 2 : Performance et Expérience Utilisateur 🟡

#### 4. Optimisations Frontend

**Objectif** : Améliorer les performances et le temps de chargement

**Actions à implémenter** :
- **Lazy loading des composants lourds**
  - Composants de visualisation (Recharts, react-force-graph-2d)
  - Pages dashboard avec `next/dynamic`
- **Code splitting**
  - Séparation des bundles par route
  - Chargement à la demande des dépendances lourdes
- **Optimisation des images** (si ajoutées)
  - Utilisation de `next/image` avec optimisation automatique
  - Formats modernes (WebP, AVIF)
- **Service Worker pour cache offline**
  - Cache des données statiques
  - Mode offline pour consultation des données déjà chargées

**Exemple de lazy loading** :
```typescript
// app/dashboard/network/page.tsx
import dynamic from 'next/dynamic';

const ArtistNetworkGraph = dynamic(
  () => import('@/lib/components/artist-network-graph'),
  { 
    loading: () => <LoadingState />,
    ssr: false // Composant client uniquement
  }
);
```

---

#### 5. Améliorations UX

**Objectif** : Améliorer l'expérience utilisateur et les feedbacks

**Actions à implémenter** :
- **Skeleton loaders** au lieu de spinners génériques
  - Skeleton adapté à chaque type de contenu
  - Meilleure perception de performance
- **Optimistic updates**
  - Mise à jour immédiate de l'UI lors des actions
  - Rollback automatique en cas d'erreur
- **Toast notifications**
  - Feedback pour les actions réussies/échouées
  - Notifications non-intrusives
- **États vides améliorés**
  - Messages contextuels selon la situation
  - Actions suggérées (ex: "Importer vos données")
  - Illustrations ou icônes

**Exemple avec react-hot-toast** :
```typescript
import toast from 'react-hot-toast';

// Dans un hook ou composant
const { mutate } = useMutation({
  mutationFn: importData,
  onSuccess: () => {
    toast.success('Données importées avec succès !');
  },
  onError: (error) => {
    toast.error(`Erreur : ${error.message}`);
  },
});
```

---

### Priorité 3 : Fonctionnalités Avancées 🟢

#### 6. Authentification Multi-Utilisateurs

**Objectif** : Support de plusieurs utilisateurs avec isolation des données

**Actions à implémenter** :
- **Système d'authentification** (NextAuth.js)
  - Support OAuth (Google, GitHub, etc.)
  - Authentification par email/mot de passe
  - Gestion de sessions sécurisées
- **Isolation des données**
  - Filtrage automatique par `userId` dans toutes les requêtes
  - Middleware de vérification d'autorisation
  - Protection des routes API
- **Gestion de profils**
  - Page de profil utilisateur
  - Préférences utilisateur
  - Historique des imports

**Architecture proposée** :
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.redirect('/login');
  }
  // Ajouter userId aux headers pour les routes API
}

// lib/services/listening/listening-service.ts
export async function getListens(userId: string, ...) {
  // userId toujours requis et vérifié
}
```

---

#### 7. Export de Données

**Objectif** : Permettre aux utilisateurs d'exporter leurs données

**Actions à implémenter** :
- **Export CSV**
  - Export des écoutes avec filtres
  - Export des statistiques agrégées
  - Export des genres
- **Export JSON**
  - Export complet des données utilisateur
  - Format structuré pour réutilisation
- **Génération de rapports PDF**
  - Rapport annuel personnalisé
  - Visualisations intégrées
  - Statistiques détaillées
- **Partage de visualisations**
  - URLs publiques temporaires pour partager des graphiques
  - Export d'images (PNG/SVG)

**Exemple d'export CSV** :
```typescript
// app/api/export/csv/route.ts
export async function GET(request: NextRequest) {
  const listens = await getListens(userId, ...);
  const csv = convertToCSV(listens);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="listens-${date}.csv"`,
    },
  });
}
```

---

#### 8. Nouvelles Visualisations

**Objectif** : Enrichir les analyses disponibles

**Actions à implémenter** :
- **Heatmap d'écoute** (calendrier)
  - Visualisation des habitudes d'écoute par jour
  - Identification des patterns temporels
  - Comparaison jour/semaine/mois
- **Graphique de tendances par genre**
  - Évolution des genres dans le temps
  - Comparaison multi-genres
  - Prédictions de tendances
- **Comparaison avec d'autres utilisateurs** (si multi-user)
  - Statistiques comparatives anonymisées
  - Classements et badges
  - Découverte de nouveaux artistes

**Exemple de heatmap** :
```typescript
// Utiliser react-calendar-heatmap ou créer un composant custom
import CalendarHeatmap from 'react-calendar-heatmap';

<CalendarHeatmap
  startDate={startDate}
  endDate={endDate}
  values={listeningData}
  classForValue={(value) => {
    if (!value) return 'color-empty';
    return `color-scale-${value.count}`;
  }}
/>
```

---

### Priorité 4 : Infrastructure 🔵

#### 9. Optimisations Base de Données

**Objectif** : Garantir des performances optimales à grande échelle

**Actions à implémenter** :
- **Analyse des index existants**
  - Vérifier l'utilisation des index avec `EXPLAIN ANALYZE`
  - Identifier les index manquants
  - Supprimer les index inutilisés
- **Partitioning des tables Listen** (si volumineuses)
  - Partition par date (mensuelle/annuelle)
  - Amélioration des performances de requêtes
  - Facilite l'archivage
- **Backup automatique**
  - Sauvegardes quotidiennes
  - Rétention configurable
  - Tests de restauration réguliers
- **Connection pooling**
  - Optimisation des connexions Prisma
  - Monitoring de l'utilisation

**Exemple de partitioning** :
```sql
-- Partition par mois
CREATE TABLE "Listen_2024_01" PARTITION OF "Listen"
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

#### 10. Documentation Avancée

**Objectif** : Faciliter la contribution et la maintenance

**Actions à implémenter** :
- **Guide de contribution** (`CONTRIBUTING.md`)
  - Processus de développement
  - Standards de code
  - Guide de commit
  - Processus de PR
- **Architecture Decision Records (ADRs)** (`docs/adr/`)
  - Documenter les décisions architecturales importantes
  - Historique des choix techniques
  - Alternatives considérées
- **Guide de déploiement détaillé** (`DEPLOYMENT.md`)
  - Procédures de déploiement
  - Rollback procedures
  - Checklist pré-déploiement
  - Troubleshooting commun

**Exemple d'ADR** :
```markdown
# ADR-001: Utilisation de Prisma pour l'ORM

## Statut
Accepté

## Contexte
Besoin d'un ORM type-safe pour PostgreSQL...

## Décision
Utiliser Prisma pour...

## Conséquences
- Avantages: ...
- Inconvénients: ...
```

---

## 📊 Roadmap Résumé

### Phase 1 (1-2 semaines) - Qualité
- ✅ CI/CD avec GitHub Actions
- ✅ Amélioration de la couverture de tests
- ✅ Monitoring avec Sentry

### Phase 2 (2-3 semaines) - Performance
- ✅ Optimisations frontend
- ✅ Améliorations UX
- ✅ Tests de performance

### Phase 3 (3-4 semaines) - Fonctionnalités
- ✅ Authentification multi-utilisateurs
- ✅ Export de données
- ✅ Nouvelles visualisations

### Phase 4 (1-2 semaines) - Infrastructure
- ✅ Optimisations base de données
- ✅ Documentation avancée
- ✅ Backup automatique

---

## 🎯 Métriques de Succès

Pour mesurer l'amélioration continue :

- **Qualité** :
  - Couverture de tests >80%
  - 0 erreurs critiques en production
  - Temps de build <5 minutes

- **Performance** :
  - LCP <2.5s
  - Temps de réponse API <200ms (p95)
  - Score Lighthouse >90

- **Fiabilité** :
  - Uptime >99.9%
  - MTTR <1 heure
  - Taux d'erreur <0.1%

---

## 📝 Notes

Ces recommandations sont des suggestions basées sur les meilleures pratiques. Priorisez selon vos besoins spécifiques et la taille de votre équipe. Commencez par les items de Priorité 1 pour établir une base solide avant d'ajouter de nouvelles fonctionnalités.
