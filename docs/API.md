# Documentation API

Référence des routes HTTP sous `/api/*` de l’application d’analytics d’écoute (historiques Apple Music / Spotify / Last.fm, Replay, etc.). Ce fichier est copié vers `public/docs/API.md` lors du build (`npm run docs:api:copy`).

---

## Vue d’ensemble

- **Cadre** : routes Next.js App Router (`app/api/**/route.ts`).
- **Réponses d’erreur** : en général JSON `{ error, code?, details? }` ; certaines routes renvoient aussi les en-têtes de **rate limiting** décrits ci‑dessous.
- **`GROQ_API_KEY`** : requis côté serveur pour les fonctionnalités IA hors cache (insights, profil de goûts, commentaires de tendances, explications d’habitudes, etc.).

---

## Authentification et portée des données

### Lectures analytics (`resolveAuthorizedDataUserId`)

Utilisée par la plupart des **GET** sur les statistiques et listes (overview, timeline, genres, artistes, titres, écoutes, Replay, etc.).

| Situation | Comportement |
|-----------|----------------|
| Utilisateur **connecté** | Données **toujours** celles de la session. Le paramètre `userId` en query ne permet **pas** de lire un autre utilisateur. |
| Connecté + `userId` = UUID du **profil public démo** | Bascule explicitement vers ce profil (si configuré côté env). |
| `userId` fourni mais **mal formé** (non UUID) | Comportement défensif : 403 si non connecté ; si connecté, données de la session. |
| **Non connecté** | Accès uniquement si un profil public est configuré **et** que `userId` en query correspond exactement à cet UUID. Sinon **401**. |

La plupart des endpoints documentés comme « **`userId` optionnel** » suivent cette logique : ce n’est **pas** une impostation arbitraire d’identité.

### Imports (`resolveImportUserId`)

Routes **POST** : `/api/lastfm/import`, `/api/replay/import`.

| Mode | Condition |
|------|-----------|
| **Session** | Utilisateur connecté → `userId` du body est ignoré au profit de la session. |
| **Admin** | En-tête **`x-import-admin-key`** égal à `IMPORT_ADMIN_KEY` → `userId` **obligatoire** dans le body (scripts / migrations). |

Si la clé admin n’est pas configurée, seule la session est acceptée.

### Authentification « récente »

Certaines routes (exports CSV/stats/PDF, import onboarding, suppression des données) exigent une session **récente** (`requireRecentAuthenticatedUser`) — reconnexion récente selon les règles du module d’auth.

### Rate limiting HTTP

Les routes concernées peuvent renvoyer : `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` (voir `lib/api-client.ts` côté client).

---

## Paramètres de requête fréquents

| Paramètre | Description |
|-----------|-------------|
| `startDate`, `endDate` | `YYYY-MM-DD` ; interprétation selon la route (optionnel ou requis). |
| `userId` | UUID ; sémantique selon la section ci‑dessus (analytics vs import admin). |
| `locale` | Où documenté (IA, exports PDF, etc.). |

---

## Utilisateur

### GET `/api/user/me`

Profil léger (**nom**, **email**). Sans session : `{ "user": null }`.

### PATCH `/api/user/me`

Body JSON : `{ "name": string }` (nom d’affichage, trimming ; chaîne vide → `null`). Met à jour Prisma **et** les métadonnées Supabase Auth. **401** si non connecté.

### GET `/api/user/clear-analytics`

Session récente. Retourne `{ "phrase": string }` — phrase attendue pour confirmer l’effacement (dérivée du profil). **409** si aucune phrase ne peut être construite.

### POST `/api/user/clear-analytics`

Session récente. Body : `{ "confirm": true, "phrase": string }`. Supprime les données analytics de l’utilisateur. Réponse : `{ ok, listensDeleted, replayYearsDeleted }`.

---

## Onboarding et imports utilisateur

### POST `/api/user/onboarding/complete`

Marque l’onboarding comme terminé (`onboardingCompletedAt`). **401** sans session.

### POST `/api/user/onboarding/import`

Session récente. Import des écoutes depuis :

1. **`application/json`** — lots découpés (contournement taille corps) : corps parsé via `parseOnboardingImportJsonBody` (`provider` spotify \| apple, `rows`, métadonnées de batch optionnelles).

2. **`multipart/form-data`** — `provider` + `file` (ZIP Spotify ou CSV Apple selon les limites définies dans la route).

Limite runtime **nodejs**, `maxDuration` 60s. Réponse peut inclure `paletteInvitation`, `genreLlmBackfill` sur le dernier lot.

### Genre backfill post-import (Groq)

 Toutes ces routes : **session requise** (pas de mode clef admin dans ces handlers).

| Méthode | Chemin | Rôle |
|---------|--------|------|
| POST | `/api/user/onboarding/import/genre-backfill/start` | Enfile un job de reclassement LLM (prérequis + `GROQ_API_KEY`). |
| POST | `/api/user/onboarding/import/genre-backfill/pause` | Pause. |
| POST | `/api/user/onboarding/import/genre-backfill/resume` | Reprise. |
| POST | `/api/user/onboarding/import/genre-backfill/cancel` | Annulation. |
| GET | `/api/user/onboarding/import/genre-backfill/status` | `includeTerminal`, `includeEligibility` (`=1`). Peut déclencher un passage worker si job actif. |

---

## Timeline et vue d’ensemble

### GET `/api/timeline`

Agrégations temporelles pour graphiques.

**Paramètres** : `startDate`, `endDate`, `period` (`day` \| `week` \| `month`), + portée utilisateur (voir auth lecture).

### GET `/api/overview`

Statistiques globales (totaux, artistes/titres uniques, temps d’écoute, etc.).

**Paramètres** : `startDate`, `endDate` optionnels.

### GET `/api/date-range`

Plage min/max des écoutes (`playedAt`) pour l’utilisateur autorisé. Réponse : `{ startDate, endDate }` ou `{ startDate: null, endDate: null }`. **Ne pas** compter sur un `userId` query pour cibler un autre utilisateur (voir auth).

---

## Genres

### GET `/api/genres`

Répartition des écoutes par genre (**paramètres** : plage dates optionnelle).

### GET `/api/genres/trends`

Évolution des genres dans le temps (série longue / stats selon implémentation).

---

## Artistes

### GET `/api/artists`

Top artistes ; **`limit`** optionnel.

### GET `/api/artists/trends`

Série temporelle (format long). **`startDate` et `endDate` obligatoires** ; `period` (`day` \| `week` \| `month`, défaut `day`), `topN` (défaut 5).

### GET `/api/artists/trends-chart`

Données pivot multi-lignes : `period`, `topN` (1–50, défaut 30), `artists` (répété, filtres par id), `locale`. Sans dates : souvent min/max des écoutes selon route.

### GET `/api/artists/search`

Recherche catalogue `Artist` (`q`, min. 2 caractères ; `limit` 1–50).

---

## Titres

### GET `/api/tracks`

Top titres avec pagination : `limit` (1–100), `offset`. Réponse : `overview`, `topTracks`, `pagination`.

### GET `/api/tracks/trends-chart`

Même idée que `artists/trends-chart` avec `tracks` répété, `topN` (défaut 20), etc.

### GET `/api/tracks/search`

Recherche catalogue (`q`, `limit`).

---

## Analyse temporelle

### GET `/api/temporal-analysis`

Répartition des écoutes par heure / jour de semaine (plage dates + auth lecture).

---

## Prédictions

### GET `/api/predictions/listening-habit`

Prédiction d’habitude d’écoute + cache.

**Query** : `explain=true` pour tenter une explication IA (si maître IA actif) ; `locale` (défaut `fr`).

---

## Goûts et analytics avancés

### GET `/api/analytics/taste-evolution`

Évolution du goût semaine à semaine ; commentaires IA optionnels si activés.  
Sans `startDate`/`endDate` : plage dérivée de l’historique complet.  
**Paramètre** : `locale` pour l’IA.

---

## Intelligence artificielle

### Paramètre global côté navigateur : cookie maître IA

Plusieurs routes vérifient `isAiMasterEnabledForRequest` (env `AI_MASTER_ENABLED` + cookie opt‑out).

### GET `/api/settings/ai-master`

`{ enabled, envLocked }` — si l’env désactive l’IA, `envLocked: true`.

### POST `/api/settings/ai-master`

Body `{ "enabled": boolean }` — positionne le cookie httpOnly (sauf si env verrouillée → **403**).

### POST `/api/ai/insights`

Corps JSON : agrégats uniquement (**pas** d’événements bruts) — schéma `AiInsightsInput` (dates, genres, histogramme horaire, top artistes, etc.), `insightStyle`, `locale`, `userId` optionnel pour quota Groq.

### POST `/api/ai/taste-profile`

Similaire : `TasteProfileInput` + `tone` (`analytical` \| `casual` \| `poetic`), cache par hash.

### GET `/api/ai/artist-trends-commentary`

Au moins un paramètre **`artists`** répété (ids, max 50).  
**Paramètres** : `startDate` / `endDate` optionnels (sinon plage complète), `period` (défaut `month`), `locale`, `mode` = `both` \| `technical` \| `light`.  
Réponses possibles avec `aiUnavailable` si IA désactivée ou pas de clé Groq.

### GET `/api/ai/genre-trends-commentary`

Au moins un **`genres`** répété ; mêmes idées de dates / `period` / `locale` / `mode` que ci‑dessus.

---

## Palette (normalisation des genres hors import)

Sessions et suggestions nécessitent une **session** valide.

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/api/palette/session` | `mode` — état de session palette. |
| GET | `/api/palette/suggestions` | `mode`, `artistId` ou `trackId` selon le mode. |
| POST | `/api/palette/map` | Associe un genre à un artiste ou un titre (`mode`, `genre`, ids…). |
| POST | `/api/palette/skip` | Ignore un artiste ou un titre dans le flux. |

---

## Last.fm

### GET `/api/lastfm`

Proxy vers l’API Last.fm (ou mock si non configuré). **Pas** d’auth utilisateur imposée par cette route.

**Paramètres** : `username`, `limit` (≤ 200), `page`, `from`, `to`, `format` (`normalized` \| `raw`).

### POST `/api/lastfm/import`

Import dans la base — **session** ou **admin** (`resolveImportUserId`). Corps : `userId` (selon mode), `username`, pagination, fenêtre Unix, `dryRun` optionnel.

---

## Écoutes

### GET `/api/listens`

- **Mode agrégé** : `aggregate` ou `period` ∈ { `day`, `week`, `month` } — exige alors **`startDate` et `endDate`** (`extractRequiredDateRange`).
- **Mode liste** : pagination `limit` (défaut 100), `offset`, filtres `startDate` / `endDate` / `source` optionnels.

---

## Export

Routes **GET** avec **session récente** :

| Chemin | Rôle |
|--------|------|
| `/api/export/listens` | CSV ; `format=csv`, `startDate`, `endDate`, `source` (`lastfm`, `apple_music_replay`, `spotify_export`, `apple_music_export`). |
| `/api/export/stats` | Export structuré des stats (JSON/metadata selon route). |
| `/api/export/report` | Rapport PDF annuel ; paramètres incluant `year`, locale, plage dates selon swagger inline dans `route.ts`. |

---

## Apple Music Replay

### GET `/api/replay`

Liste des résumés annuels pour l’utilisateur autorisé (auth lecture — plus de fallback `default_user` implicite).

### POST `/api/replay/import`

Import d’un résumé annuel — **session** ou **admin** + body `userId` + `data` (`ReplayYearlyInput`). Voir validation dans le service.

---

## Administration — rate limiting

Toutes protégées par **`x-admin-key`** ou **`x-import-admin-key`** égal à `RATE_LIMIT_ADMIN_KEY` **ou** `IMPORT_ADMIN_KEY` (si dédié absent).

| GET | Description |
|-----|-------------|
| `/api/admin/rate-limit/health` | Santé par rapport aux blocages (paramètres `routes`, seuils warn/critical). |
| `/api/admin/rate-limit/overview` | Vue agrégée (top routes, etc.). |
| `/api/admin/rate-limit/top-blocked` | **Query obligatoire** : `route` — top sujets bloqués pour cette route. |

Sans clé configurée ou clé invalide : **401**.

---

## Interne / cron

### POST `/api/internal/genre-backfill/run-once`

Traite une tranche de file d’attente de backfill genres. Autorisé si **User-Agent** `vercel-cron/…` **ou** `Authorization: Bearer <INTERNAL_CRON_SECRET>`. Sinon **401**.

---

## Diagnostic Sentry

### GET `/api/test-sentry-error`

Déclenche une erreur de test envoyée à Sentry puis **500** JSON. **Réservé au dev/staging** ou derrière contrôle d’accès — ne pas exposer en production sans garde-fous (bruit, quotas, alertes).
