# Spotify post-import unknown genres (12-15%)

Cette doc décrit le flux recommandé pour mapper les artistes sans genre après import Spotify JSON (`Streaming_History_Audio_*.json`) jusqu'à un seuil cible.

**Backfill dans l’app** : le worker (`import-genre-backfill-queue.ts`) utilise **Groq** (`GROQ_API_KEY`), pas l’API Spotify. Les sections 2–7 ci-dessous restent une référence pour un **script externe** optionnel basé sur la Spotify Web API (client credentials), non requis par ce dépôt.

## 1) Pré-requis

- Variables env:
  - `DATABASE_URL`
  - `GROQ_API_KEY` (pour le backfill de genres intégré à l’app ; voir §8–9)
- L'utilisateur existe déjà en base et a des `Listen` importés.
- Node 18+ (fetch natif).

## 2) API Spotify utilisée (version actuelle Web API)

Le script utilise:

1. `GET /v1/search` avec `type=artist` pour retrouver l'artiste Spotify.
2. `GET /v1/artists/{id}` pour récupérer `genres`.

Référence officielle:
- [Spotify Web API - Get an Artist](https://developer.spotify.com/documentation/web-api/reference/get-an-artist)

Note importante: Spotify indique des évolutions récentes (dev mode/changelog) et le champ `genres` est marqué deprecated dans la doc, donc il peut être vide pour de nombreux artistes. Vérifier les release notes Spotify avant ajustements majeurs.

## 3) Nouvelle stratégie implémentée

Dans `scripts/backfill-track-genres-spotify.js`, quand `--user-id` est fourni:

1. Calcule le taux unknown de l'utilisateur (`tracks distincts écoutés` avec `Track.genre IS NULL`).
2. Récupère les artistes unknown triés par nombre d'écoutes (du plus impactant au moins impactant).
3. Pour chaque artiste:
   - recherche Spotify `type=artist`,
   - lit `GET /v1/artists/{id}`,
   - si genre trouvé, applique à tous les tracks de cet artiste qui sont encore sans genre.
4. Recalcule le taux unknown utilisateur après chaque mapping.
5. Arrête automatiquement quand le seuil cible est atteint (`--target-unknown-pct`, défaut 15).

## 4) Commandes prêtes à l'emploi

### Dry run (recommandé en premier)

```bash
node scripts/backfill-track-genres-spotify.js \
  --user-id=<USER_ID> \
  --target-unknown-pct=15 \
  --max-artists=200 \
  --max-api-requests=250 \
  --dry-run
```

### Exécution réelle

```bash
node scripts/backfill-track-genres-spotify.js \
  --user-id=<USER_ID> \
  --target-unknown-pct=15 \
  --max-artists=200 \
  --max-api-requests=250 \
  --delay-ms=300
```

### Variante plus agressive (vise 12%)

```bash
node scripts/backfill-track-genres-spotify.js \
  --user-id=<USER_ID> \
  --target-unknown-pct=12 \
  --max-artists=400 \
  --max-api-requests=600 \
  --delay-ms=300
```

## 5) Respect des rate limits

- Le script attend `--delay-ms` entre requêtes Spotify.
- Gère les `429` avec `Retry-After` et retry.
- Gère les `401` en rafraîchissant le token.
- S'arrête proprement quand `--max-api-requests` est atteint.

## 6) Prompts associes (pour l'agent)

### Prompt A - Lancer un dry run

```text
Run the Spotify genre backfill in dry-run for this user.
Use:
- user id: <USER_ID>
- target unknown pct: 15
- max artists: 200
- max api requests: 250
Then report:
1) initial unknown ratio
2) estimated mapped artists
3) whether the target seems reachable in one run.
```

### Prompt B - Lancer la passe réelle

```text
Execute the Spotify artist-priority genre mapping for user <USER_ID>
with target unknown pct 15, respecting API limits.
Use delay 300ms and max-api-requests 250.
Return the final unknown ratio and a short run summary.
```

### Prompt C - Itérer jusqu'au seuil

```text
Run iterative Spotify genre mapping passes for user <USER_ID>
until unknown ratio <= 12-15% or API cap reached.
For each pass, summarize:
- requests used
- artists mapped
- unknown ratio delta.
Stop safely on 429 pressure and keep limits conservative.
```

## 7) Intégration post-import (recommandée)

Après `POST /api/user/onboarding/import`:

1. déclencher un job asynchrone (queue) avec `userId`,
2. lancer ce script/logique en mode user-priority,
3. stopper au seuil cible (12-15%),
4. proposer Palette pour le reliquat (<10% optionnel).

Cela évite de bloquer l'UI d'import et garde un contrôle strict sur le budget API.

## 8) Implémentation actuelle dans l'app

### Flux backend

1. `POST /api/user/onboarding/import`
   - si provider `spotify` et `imported > 0`, l'API crée (ou réutilise) un job de backfill.
   - la réponse inclut `genreBackfillJob`.
2. worker applicatif
   - traitement FIFO des jobs `pending`.
   - mapping artiste-prioritaire jusqu'au seuil cible.
3. `GET /api/user/onboarding/import/genre-backfill/status`
   - renvoie le dernier job de l'utilisateur.
   - relance le worker en best-effort (self-heal léger).

### Champs de suivi retournés par le status

- `status`: `pending | running | completed | failed`
- `targetUnknownPct`
- `initialUnknownPct`, `currentUnknownPct`
- `apiRequestsUsed`
- `artistsProcessed`, `artistsMapped`, `tracksUpdated`
- `errorMessage` (si `failed`)
- `startedAt`, `finishedAt`, `updatedAt`

## 9) Variables d'environnement (optionnelles, worker Groq)

Alignées sur `lib/services/listening/import-genre-backfill-queue.ts` :

- `GROQ_IMPORT_TARGET_UNKNOWN_PCT` (défaut: `15`)
- `GROQ_IMPORT_DELAY_MS` (défaut: `1000`)
- `GROQ_IMPORT_MAX_LLM_CALLS` (défaut: `800`)
- `GROQ_IMPORT_MAX_TRACKS` (défaut: `800`)
- `GROQ_IMPORT_DAILY_CALL_BUDGET` (défaut: désactivé — budget journalier agrégé si la valeur est un entier strictement positif)
- `GROQ_IMPORT_PROGRESS_DB_EVERY`, `GROQ_IMPORT_RUN_ONCE_MAX_TRACKS`, `GROQ_IMPORT_DEBUG_RATE_LIMIT` (affinage progression / debug)

## 10) Prompt UI poll status

```text
After a successful Spotify import, poll:
GET /api/user/onboarding/import/genre-backfill/status
every 3-5 seconds while status is pending/running.

Display:
- progress based on artistsProcessed / maxArtists
- unknown ratio: initialUnknownPct -> currentUnknownPct
- final state badge completed/failed.
```

## 11) Palette suggestions v1 (safe mode)

L'application expose `GET /api/palette/suggestions` pour proposer des genres dans Palette sans auto-application.

- Le backend génère des suggestions internes (genres déjà vus pour l'utilisateur + catalogue artiste/track).
- Chaque suggestion est stockée (`PaletteSuggestion`).
- Chaque action utilisateur est journalisée (`PaletteSuggestionDecision`) lors de:
  - mapping (`accepted` / `edited`)
  - skip (`rejected`) si une suggestion était sélectionnée.
- L'UI Palette affiche ces suggestions comme aides ("suggestions only").

Feature flag:

- `PALETTE_EXTERNAL_SUGGESTIONS_ENABLED=false` par défaut.
- En v1, même activée, l'intégration externe reste un point d'extension et ne fait aucune auto-écriture.
