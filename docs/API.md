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

Profil léger (**nom**, **email**, **avatarUrl**). Sans session : `{ "user": null }`.

### PATCH `/api/user/me`

Body JSON : `{ "name": string }` (nom d’affichage, trimming ; chaîne vide → `null`). Met à jour Prisma **et** les métadonnées Supabase Auth. **401** si non connecté.

### POST `/api/user/avatar`

Upload multipart avec champ `avatar`. Formats acceptés : JPG, PNG, WebP, GIF ; taille max 2 Mo. Stocke l’image dans Supabase Storage (`avatars/{userId}/avatar.*`), met à jour `User.avatarUrl`, puis renvoie le profil léger.

### DELETE `/api/user/avatar`

Supprime l’image de profil Supabase Storage et remet `User.avatarUrl` à `null`.

### GET `/api/user/clear-analytics`

Session récente. Retourne `{ "phrase": string }` — phrase attendue pour confirmer l’effacement (dérivée du profil). **409** si aucune phrase ne peut être construite.

### POST `/api/user/clear-analytics`

Session récente. Body : `{ "confirm": true, "phrase": string }`. Supprime les données analytics de l’utilisateur. Réponse : `{ ok, listensDeleted, replayYearsDeleted }`.

### GET `/api/user/export`

Session récente. Télécharge un JSON (portabilité RGPD) : profil, écoutes, Replay, palette, métadonnées Spotify, historique de consentements. Rate limit : 5 requêtes / h.

### DELETE `/api/user/delete-account`

Session récente. Body : `{ "confirm": true, "phrase": string }`. Supprime le compte Prisma (cascade), l’avatar Storage et l’utilisateur Supabase Auth, puis déconnecte la session.

### GET `/api/user/privacy-preferences`

Session requise. Retourne `{ groqGenreConsent, publicProfile, groqJobActive }`.

### PATCH `/api/user/privacy-preferences`

Session requise. Body partiel : `{ groqGenreConsent?: boolean, publicProfile?: boolean }`. Le consentement Groq (opt-in explicite) conditionne **toutes** les fonctionnalités IA Groq.

### POST `/api/user/consent`

Enregistre un consentement (`cookie`, `terms`, `groq_genre`, `ai_master`, `public_profile`). Accepte `anonymousId` pour les visiteurs non connectés (cookies). Les CGU sont enregistrées de façon idempotente lorsqu’une session existe.

### POST `/api/user/consent/link-anonymous`

Session requise. Body : `{ "anonymousId": string }`. Rattache les lignes `UserConsent` anonymes (`userId` null) au compte connecté. Appelé automatiquement côté client après login ; aussi exécuté dans `/auth/callback` si le cookie `ama_anonymous_id` est présent.

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

### GET `/api/artists/[artistId]/insights`

Insights détaillés pour un artiste donné (`artistId` = id base). **Auth lecture** identique aux autres analytics (`resolveAuthorizedDataUserId`) ; **`startDate` / `endDate`** optionnels (`YYYY-MM-DD`). **404** si aucune donnée pour cette période / artiste.

### POST `/api/artists/[artistId]/image`

**Session requise.** Hydratation paresseuse de l’image artiste via Spotify (client credentials serveur) si possible. L’utilisateur doit avoir **au moins une écoute** pour cet artiste — sinon **403**. Sans credentials Spotify en env : renvoie l’`imageUrl` déjà en base éventuelle avec `enrichmentDisabled: true` si besoin.

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

### POST `/api/ai/music-chat`

Chat contextualisé sur l’historique d’écoute (Groq). **Auth** : même résolution utilisateur que les autres lectures analytics (`resolveAuthorizedDataUserId`) ; **`userId`** en query optionnel pour **démo publique** — dans ce cas **sans session**, seules les **`presetQuestionId`** sont autorisées (sinon **403** `PUBLIC_DEMO_PRESET_REQUIRED`). Avec session, soit historique **`messages`** (alternance user/assistant), soit **`presetQuestionId`** en complément.

**Body JSON** : `messages` (max 12 entrées, `role`: `user` \| `assistant`, `content` 1–2000 car.), `locale` optionnel ; `presetQuestionId` / `presetArgs` (`artistName`, `earlierYear`, `laterYear`, `genreYear`) pour questions préréglées ; `dateRange` optionnel (`startDate`, `endDate`, `isAll`). **Rate limiting** : max 8 requêtes / 60 s par utilisateur résolu (`maxDuration` 180 s côté route). Respect du **cookie maître IA**, du **consentement Groq** (`aiUnavailableReason` `env` \| `client` \| `consent`), du **quota utilisateur Groq**, et blocage tant qu’un job de **backfill genres LLM** post-import tourne encore.

---

## Duet (amis & comparaison)

Toutes les routes Duet exigent une **session** authentifiée (pas de `userId` démo).

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/api/duet/friends` | `{ friends, pendingIncoming, pendingOutgoing }` — profils légers (id, email, name, avatarUrl). |
| POST | `/api/duet/friends/invite` | Body `{ email }`. Lookup insensible à la casse. Réponse uniforme `{ ok, message: "Invitation processed" }` si email inconnu ou cible fermée aux demandes (anti-énumération). Succès : inclut `friendship`. Quota 10/jour. **409** doublon ; **429** quota. |
| POST | `/api/duet/friends/invite-link` | Génère un lien signé HMAC (validité **7 jours**). Réponse `{ ok, token, url, acceptPath, expiresAt }`. Compte dans le quota D9 (10/jour). Rate limit strict (8/min). |
| GET | `/api/duet/friends/invite-link/validate` | Query `token`. Auth requise. Retourne `{ requester: { id, name, avatarUrl }, expiresAt }` — **aucune** donnée analytics. **404** token invalide / expiré / consommé. |
| POST | `/api/duet/friends/invite-link/redeem` | Body `{ token, shareScope }`. Crée + accepte l’amitié, enregistre `duet_sharing`, consomme le token (usage unique). |
| PATCH | `/api/duet/friends/[id]` | `accept` + `shareScope` (`aggregates` \| `full`) enregistre `duet_sharing` ; `updateShareScope` + `shareScope` (relation `accepted`, les deux parties) ; `decline` ; `revoke`. |
| POST | `/api/duet/friends/[id]/block` | Bloque l’autre partie ; log sécurité serveur. |
| GET | `/api/duet/settings` | `{ allowFriendRequests, defaultShareScope }`. |
| PATCH | `/api/duet/settings` | Body partiel : `allowFriendRequests`, `defaultShareScope` (`none` \| `aggregates` \| `full`). |

### Your Music ami (à venir)

`GET /api/duet/friend-overview` — lecture seule du hub analytics d’un ami `accepted`, derrière `assertFriendDataAccess` et query `friendUserId`. Même famille de données que D2 (`aggregates` / `full`). **Pas encore exposé.** Ne pas utiliser `userId` sur `/api/overview` pour cibler un ami.

### Comparaison (auth + relation `accepted`)

Query **`friendUserId`** (UUID) requis sur toutes les routes ci-dessous. **404** si pas ami (anti-énumération) ; **403** si `shareScope` insuffisant. Rate limit aligné sur `/api/timeline` (20 req / 60 s).

| Méthode | Chemin | Scope | Description |
|---------|--------|-------|-------------|
| GET | `/api/duet/compare/timeline` | `aggregates` | `startDate`, `endDate`, `period` (`day` \| `week` \| `month`). Réponse `{ period, startDate, endDate, rangeClamped, self, friend, merged }`. Si la plage dépasse **2 ans** et qu’un des deux utilisateurs a **> 50k** écoutes dans la plage, `rangeClamped: true` et fenêtre réduite aux 2 dernières années. |
| GET | `/api/duet/compare/entity` | `aggregates` | `type=artist`, `type=track` ou `type=genre`, `entityId` + plage dates. Réponse `{ type, entityId, selfCount, friendCount, winner, merged, … }` avec `artistName`, `trackTitle` + `artistName`, ou `genreName`. |
| GET | `/api/duet/compare/shared-artists` | `aggregates` | Plage dates optionnelle (sinon intersection all-time). Top **50** par user → intersection par `artistId` → max **20** résultats triés par écoutes combinées. Réponse `{ startDate, endDate, rangeClamped, topPool, totalShared, artists[] }` avec rangs et gagnant par artiste. |
| GET | `/api/duet/compare/metadata` | `aggregates` | Couverture `{ self, friend }` : `minDate`, `maxDate`, `totalListens`, `sources[]`. |

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

## Spotify (Web API)

Toutes ces routes exigent une **session** utilisateur avec tokens Spotify valides sauf indication contraire. Runtime **nodejs** ; rate limiting par route utilisateur.

### POST `/api/spotify/connection-verify`

Vérifie que les tokens OAuth de l’utilisateur fonctionnent contre `GET /v1/me` Spotify. **Ne persiste aucune écoute** (flux onboarding partiel uniquement).

### POST `/api/spotify/sync`

Synchronisation **persistée** : récupère l’historique *recently played* Spotify et importe en base avec la source **`spotify_web_api`**. Réponse : compteurs `fetched`, `imported`, `skippedDuplicates`, `skippedInvalid`, `nextCursorMs`, etc.

### GET `/api/spotify/playground`

Sonde plusieurs endpoints Spotify en parallèle (`/me`, top titres / artistes à court périmètre, *recently-played*) et renvoie les réponses ou erreurs normalisées, plus les scopes OAuth enregistrés vs attendus (`SPOTIFY_WEB_API_OAUTH_SCOPES`).

### GET `/api/spotify/top-tracks`

Proxy typé vers `GET /v1/me/top/tracks`. **Query** : `time_range` (`short_term` \| `medium_term` \| `long_term`, défaut `medium_term`) ; **`limit`** 1–50 (défaut 20) ; **`offset`** 0–10000 (défaut 0). Réponse enveloppée `{ ok, time_range, limit, offset, data }` (pagination Spotify).

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
