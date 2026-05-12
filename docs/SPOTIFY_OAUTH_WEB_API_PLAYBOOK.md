# Spotify OAuth + Web API Playbook

**Statut** : plan d'implementation - alternative partielle a l'onboarding par export fichier.

**But** : permettre a un utilisateur de connecter son compte Spotify, puis d'importer ses ecoutes via la Spotify Web API dans les tables analytics existantes (`Artist`, `Track`, `Listen`).

**Important** : les docs Spotify et Supabase Auth evoluent. Ce playbook s'appuie sur les docs officielles consultees le 2026-05-11. Avant implementation, verifier les pages officielles Spotify Web API et Supabase Auth Spotify, surtout les scopes, le refresh token et les limites de rate limit.

---

## Decision produit

Spotify OAuth doit etre traite comme une nouvelle voie d'onboarding :

1. L'utilisateur peut continuer avec email/password Supabase + import export Spotify/Apple.
2. L'utilisateur peut choisir "Continue with Spotify" et connecter son compte Spotify.
3. L'app peut ensuite importer les ecoutes recentes et synchroniser les nouvelles ecoutes.

Limite majeure : `GET /v1/me/player/recently-played` ne donne pas l'historique complet du compte. Il retourne seulement des pages d'ecoutes recentes, avec `limit <= 50`. Cette voie est donc excellente pour un onboarding rapide et une sync continue, mais elle ne remplace pas l'export Spotify "Extended streaming history" si on veut plusieurs annees d'historique.

Recommandation MVP :

- Utiliser Spotify OAuth comme onboarding rapide.
- Continuer a proposer l'upload d'export Spotify pour l'historique complet.
- Marquer les ecoutes Web API avec une source distincte, par exemple `spotify_web_api`, pour pouvoir auditer les volumes et eviter de melanger export complet et sync incremental.

---

## Situation actuelle

Le projet a deja les briques utiles :

- Auth app via Supabase SSR :
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
  - `app/auth/callback/route.ts`
- User app aligne sur Supabase :
  - `User.id = auth.users.id`
  - `lib/auth/ensure-app-user-from-session.ts`
- Onboarding par export fichier :
  - `app/[locale]/dashboard/onboarding/page.tsx`
  - `lib/components/data-export-onboarding.tsx`
  - `app/api/user/onboarding/import/route.ts`
- Pipeline d'import reutilisable :
  - `lib/services/listening/import-onboarding-listens.ts`
  - input normalise `{ artistName, trackName, playedAt }`
- Sources actuelles :
  - `lastfm`
  - `apple_music_replay`
  - `spotify_export`
  - `apple_music_export`

Le nouveau flux doit reutiliser `importOnboardingListens` au lieu de recreer une logique d'upsert `Artist` / `Track` / `Listen`.

---

## Architecture recommandee

### Option A - Supabase Spotify Provider

C'est l'option la plus coherente avec l'auth actuelle si Spotify devient aussi un moyen de login.

Flux :

1. Le client appelle `supabase.auth.signInWithOAuth({ provider: "spotify" })`.
2. Supabase gere la redirection OAuth.
3. `app/auth/callback/route.ts` fait `exchangeCodeForSession`.
4. L'app cree ou met a jour `User`.
5. L'app persiste les tokens provider Spotify cote serveur.
6. Une route serveur appelle la Spotify Web API, normalise les ecoutes, puis appelle `importOnboardingListens`.

Avantages :

- S'integre avec la session Supabase existante.
- Spotify peut devenir un vrai login app.
- Moins de surface OAuth maison.

Points d'attention :

- Supabase expose des `provider_token` / `provider_refresh_token`, mais l'app doit gerer le refresh du token provider.
- Verifier en implementation que le refresh token Spotify est bien disponible avec les scopes demandes.
- Ne jamais compter sur `user_metadata` pour autoriser l'acces aux donnees.

### Option B - OAuth Spotify gere par l'app

A utiliser seulement si Supabase Provider ne donne pas assez de controle sur les tokens Spotify.

Flux :

1. L'utilisateur est deja connecte a l'app via Supabase.
2. L'app lance un OAuth Spotify Authorization Code Flow depuis `/api/spotify/oauth/start`.
3. L'app valide `state` dans `/api/spotify/oauth/callback`.
4. L'app echange le code contre tokens, chiffre les tokens, puis stocke la connexion Spotify.
5. L'app importe les ecoutes via `/api/spotify/sync`.

Avantages :

- Controle total sur `state`, `scope`, tokens, refresh et erreurs.
- Plus facile a isoler comme "connexion data source" plutot que login app.

Inconvenients :

- Plus de code securite a maintenir.
- Besoin de stocker le `SPOTIFY_CLIENT_SECRET` cote serveur.

Pour ce projet, commencer par l'Option A si l'objectif est "login with Spotify". Basculer vers l'Option B seulement si le refresh token provider Supabase devient bloquant.

---

## Scopes Spotify

Scopes MVP :

```text
user-read-email user-read-private user-read-recently-played
```

Raison :

- `user-read-email` : associer le compte Spotify a un email app si disponible.
- `user-read-private` : lire le profil utilisateur Spotify minimal.
- `user-read-recently-played` : appeler `GET /v1/me/player/recently-played`.

Ne pas demander de scopes player/write tant qu'ils ne sont pas necessaires. Chaque scope ajoute une friction consentement et un risque produit.

---

## Variables d'environnement

Si Supabase gere le provider, configurer Spotify dans le Dashboard Supabase :

- Spotify Client ID
- Spotify Client Secret
- Redirect URI Supabase :
  - production : `https://<project-ref>.supabase.co/auth/v1/callback`
  - local Supabase CLI : `http://localhost:54321/auth/v1/callback`

Si l'app gere OAuth directement, ajouter :

```bash
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/oauth/callback
SPOTIFY_TOKEN_ENCRYPTION_KEY=
```

`SPOTIFY_TOKEN_ENCRYPTION_KEY` doit etre une cle secrete serveur. Ne jamais prefixer par `NEXT_PUBLIC_`.

---

## Schema DB propose

Ajouter une table de connexion provider. Eviter de stocker les tokens dans `User`, car une connexion Spotify est revocable, renouvelable et specifique a une integration.

```prisma
model SpotifyConnection {
  id                    String    @id @default(cuid())
  userId                String    @unique
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  spotifyUserId         String
  spotifyDisplayName    String?
  spotifyEmail          String?
  accessTokenEncrypted  String
  refreshTokenEncrypted String?
  scope                 String
  tokenType             String    @default("Bearer")
  expiresAt             DateTime
  syncCursorMs          BigInt?
  lastSyncedAt          DateTime?
  revokedAt             DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([spotifyUserId])
  @@index([userId, revokedAt])
}
```

Mettre aussi a jour `User` :

```prisma
model User {
  // ...
  spotifyConnection SpotifyConnection?
}
```

Ajouter une source :

```ts
export const LISTEN_RECORD_SOURCES = [
  "lastfm",
  "apple_music_replay",
  "spotify_export",
  "spotify_web_api",
  "apple_music_export",
] as const;
```

Option utile mais pas obligatoire pour MVP : ajouter un modele `SpotifySyncRun` pour historiser les imports, les erreurs `429`, les erreurs token et les volumes importes.

---

## Routes a ajouter

### Supabase Provider

Si Spotify est un login Supabase, modifier la page sign-in / onboarding :

- Ajouter un bouton "Continue with Spotify".
- Appeler `signInWithOAuth` avec provider `spotify`.
- Passer un `redirectTo` vers `app/auth/callback/route.ts`.
- Passer un `next` vers `/dashboard/onboarding?spotify=connected` ou `/dashboard/overview`.

Pseudo-code client :

```ts
await supabase.auth.signInWithOAuth({
  provider: "spotify",
  options: {
    redirectTo: `${origin}/auth/callback?next=/dashboard/onboarding?spotify=connected`,
    scopes: "user-read-email user-read-private user-read-recently-played",
  },
});
```

Dans `app/auth/callback/route.ts`, apres `exchangeCodeForSession`, persister la connexion Spotify si la session contient les tokens provider.

### OAuth gere par l'app

Si l'app gere OAuth directement, ajouter :

- `GET /api/spotify/oauth/start`
  - exige session Supabase
  - genere `state`
  - stocke `state` en cookie HTTP-only ou table courte duree
  - redirige vers `https://accounts.spotify.com/authorize`
- `GET /api/spotify/oauth/callback`
  - exige session Supabase
  - valide `state`
  - echange `code` contre tokens
  - appelle `GET /v1/me`
  - chiffre et stocke `SpotifyConnection`
  - redirige vers onboarding sync
- `POST /api/spotify/sync`
  - exige session Supabase
  - refresh token si expire
  - appelle `GET /v1/me/player/recently-played`
  - normalise les ecoutes
  - appelle `importOnboardingListens(userId, "spotify_web_api", rows)`
  - met a jour `syncCursorMs`
- `DELETE /api/spotify/connection`
  - exige session Supabase recente
  - marque `revokedAt`
  - supprime ou invalide les tokens chiffres

---

## Sync Web API

### Endpoint Spotify

Endpoint :

```text
GET https://api.spotify.com/v1/me/player/recently-played?limit=50
```

Parametres utiles :

- `limit=50` : maximum autorise.
- `after=<timestamp_ms>` : retourne les ecoutes apres un curseur.
- `before=<timestamp_ms>` : pagination historique recente, sans `after`.

Ne pas envoyer `after` et `before` ensemble.

### Normalisation

Mapping vers `NormalizedListenInput` :

```ts
{
  artistName: item.track.artists[0]?.name,
  trackName: item.track.name,
  playedAt: new Date(item.played_at),
}
```

Regles :

- Ignorer les episodes podcast : l'endpoint ne les supporte pas actuellement, mais garder le parser tolerant.
- Ignorer les tracks sans `played_at`, sans artiste ou sans titre.
- Preferer l'artiste principal (`artists[0]`) pour rester coherent avec le modele `Track.artistId`.
- Si `item.track.is_local === true`, importer seulement si `name` et `artists[0].name` sont disponibles.
- Mettre `syncCursorMs` au max de `played_at.getTime()` importe avec succes.

### Idempotence

Le pipeline `importOnboardingListens` dedupe deja par :

- `userId`
- `source`
- `trackId`
- `playedAt`

Pour eviter les trous, relancer chaque sync avec une petite marge :

```text
after = max(0, syncCursorMs - 5 minutes)
```

Le dedupe absorbera les doublons.

### Rate limit et erreurs

Gerer explicitement :

- `401` : access token expire ou revoke, tenter refresh une fois.
- `403` : scope manquant ou consentement insuffisant, demander reconnexion Spotify.
- `429` : respecter `Retry-After`, ne pas boucler.
- reseau/5xx : retry limite avec backoff, puis enregistrer l'erreur.

Ne jamais logger :

- access token
- refresh token
- header `Authorization`
- payload complet contenant des donnees personnelles inutiles

---

## Etapes d'implementation

### Phase 1 - Configuration OAuth

1. Creer l'app dans Spotify Developer Dashboard.
2. Ajouter les Redirect URIs.
3. Configurer Spotify dans Supabase Auth si Option A.
4. Ajouter les variables d'environnement necessaires si Option B.
5. Documenter local/prod dans `env.example`.

Critere d'acceptation :

- Un utilisateur peut demarrer le flow Spotify et revenir dans l'app sans erreur OAuth.

### Phase 2 - Bouton "Continue with Spotify"

1. Ajouter le bouton sur `app/[locale]/(auth)/sign-in/page.tsx`.
2. Ajouter une entree "Connect Spotify" dans `DataExportOnboarding`.
3. Conserver le chemin upload export Spotify/Apple.
4. Rediriger apres callback vers onboarding ou overview selon `onboardingCompletedAt`.

Critere d'acceptation :

- Un nouvel utilisateur peut creer une session app via Spotify.
- Un utilisateur existant peut connecter Spotify sans perdre ses donnees.

### Phase 3 - Persistence de connexion

1. Ajouter `SpotifyConnection` au schema Prisma.
2. Generer migration.
3. Ajouter helpers de chiffrement/dechiffrement token serveur.
4. Ajouter service `upsertSpotifyConnectionFromSession` ou equivalent.
5. Verifier que les tokens ne sortent jamais vers le client.

Critere d'acceptation :

- Apres OAuth, la DB contient une connexion Spotify pour le `userId` courant.
- Les tokens sont chiffres au repos.

### Phase 4 - Import initial recent

1. Ajouter `spotify_web_api` dans `LISTEN_RECORD_SOURCES`.
2. Ajouter `lib/services/spotify/spotify-client.ts`.
3. Ajouter `lib/services/spotify/import-recently-played.ts`.
4. Ajouter `POST /api/spotify/sync`.
5. Reutiliser `importOnboardingListens(userId, "spotify_web_api", rows)`.
6. Retourner un payload compact :

```ts
{
  ok: true;
  fetched: number;
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  nextCursorMs: number | null;
}
```

Critere d'acceptation :

- Une sync importe les ecoutes recentes dans `Listen`.
- Une deuxieme sync immediate n'importe pas de doublons.

### Phase 5 - UX onboarding

1. Afficher un etat "Spotify connected".
2. Lancer une sync initiale depuis l'onboarding.
3. Expliquer clairement la limite :
   - "Spotify lets us sync recent plays and future plays. Upload your extended export if you want full history."
4. Si `imported > 0`, proposer de terminer onboarding.
5. Si `imported = 0`, proposer :
   - retenter plus tard
   - uploader l'export complet
   - continuer vers dashboard vide/demo

Critere d'acceptation :

- L'utilisateur comprend pourquoi un compte Spotify connecte peut ne pas remplir plusieurs annees d'historique.

### Phase 6 - Sync continue

1. Ajouter une sync manuelle dans Settings.
2. Ajouter une sync opportuniste au chargement dashboard, avec cooldown.
3. Plus tard, ajouter une tache planifiee si l'app a une infra cron fiable.
4. Stocker `lastSyncedAt` et `syncCursorMs`.

Critere d'acceptation :

- Les nouvelles ecoutes Spotify apparaissent sans reupload.
- Les erreurs token/rate limit sont visibles mais non bloquantes pour le dashboard.

### Phase 7 - Deconnexion et suppression

1. Ajouter "Disconnect Spotify" dans Settings.
2. Marquer `revokedAt` et supprimer les tokens chiffres.
3. Ne pas supprimer les ecoutes par defaut.
4. Proposer une action separee "Delete Spotify Web API listens" si necessaire.

Critere d'acceptation :

- Un utilisateur peut retirer l'acces Spotify sans perdre son compte app.
- Les tokens ne restent pas utilisables apres deconnexion.

---

## Tests recommandes

Unitaires :

- parser Spotify recently played -> `NormalizedListenInput`
- refresh token conserve l'ancien refresh token si Spotify n'en renvoie pas un nouveau
- calcul `syncCursorMs`
- dedupe avec marge de 5 minutes

API :

- `POST /api/spotify/sync` retourne `401` sans session
- retourne `404` ou `409` si aucune connexion Spotify active
- refresh puis retry sur `401`
- respecte `429 Retry-After`
- appelle `importOnboardingListens` avec `source = "spotify_web_api"`

E2E :

- bouton "Continue with Spotify" visible
- callback OAuth retourne vers onboarding
- sync initiale affiche imported/skipped
- disconnect Spotify masque la sync

---

## Prompt agent pour implementation

```text
Implement Spotify OAuth onboarding and Web API sync in this Next.js App Router project.

Use the existing Supabase auth/session model and the existing listen import pipeline:
- User.id matches Supabase auth.users.id.
- Reuse importOnboardingListens(userId, source, rows).
- Add a distinct source "spotify_web_api".

Follow docs/SPOTIFY_OAUTH_WEB_API_PLAYBOOK.md:
1) Prefer Supabase Spotify OAuth provider for "Continue with Spotify" unless provider token refresh is blocked.
2) Add secure server-side storage for Spotify provider tokens in a SpotifyConnection Prisma model.
3) Add POST /api/spotify/sync that fetches /v1/me/player/recently-played, normalizes plays, imports them, and updates a cursor.
4) Preserve the existing file upload onboarding path because Spotify Web API does not expose full historical streaming history.
5) Do not expose Spotify tokens to the browser or logs.
6) Add focused unit/API tests for sync, token refresh, auth failures, and dedupe.
```

---

## Liens officiels a verifier avant code

- Spotify Authorization Code Flow
- Spotify Authorization Code with PKCE Flow
- Spotify Refreshing Tokens
- Spotify Get Recently Played Tracks
- Supabase Login with Spotify
- Supabase `signInWithOAuth`
