# Supabase Auth - Plan d'implementation progressif

Ce document sert de guide "pas a pas" pour migrer le projet vers une vraie authentification multi-utilisateur avec Supabase, sans casser les routes existantes.

## Etat de depart

- Le schema Prisma possede deja `User` et des relations via `userId`.
- Beaucoup de routes acceptent encore `?userId=` via query param.
- `api/replay` utilisait un fallback `default_user`.

## Principes de migration

- Introduire Supabase Auth en premier, sans gros refactor d'un coup.
- Garder un fallback temporaire pour la compatibilite (`query userId`) pendant la transition.
- Basculer ensuite route par route vers `session user`.

## Phase 1 - Fondations Auth (terminee)

### Objectif

Ajouter l'infrastructure Supabase SSR et supprimer le `default_user` le plus riske.

### Modifications

- Ajout de la config Supabase:
  - `lib/supabase/config.ts`
- Ajout des clients:
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
- Ajout de la gestion session middleware:
  - `lib/supabase/middleware.ts`
  - branchement dans `middleware.ts`
- Ajout d'un helper central de resolution user:
  - `lib/auth/get-current-user-id.ts`
- Premiere route migree:
  - `app/api/replay/route.ts` (plus de `default_user`, renvoie `401` si aucun user)
- Variables d'environnement ajoutees:
  - `env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)

### Note dependances

Les packages npm suivants sont requis:

- `@supabase/supabase-js`
- `@supabase/ssr`

Si l'installation auto est bloquee localement, lancer manuellement:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Phase 2 - Pages Auth UI (terminee)

### Objectif

Permettre sign-in/sign-up/sign-out et callback auth.

### A implementer

- Creer des pages localisees:
  - `app/[locale]/(auth)/sign-in/page.tsx`
  - `app/[locale]/(auth)/sign-up/page.tsx`
- Creer route callback:
  - `app/auth/callback/route.ts`
- Ajouter bouton sign-out (header ou page settings)
- Ajouter liens de navigation vers sign-in/sign-up

### Statut d'implementation

- Pages `sign-in` et `sign-up` ajoutees (email/password via client Supabase browser).
- Route `app/auth/callback/route.ts` ajoutee avec `exchangeCodeForSession`.
- Etat auth minimal ajoute dans la sidebar:
  - affiche `Sign in / Sign up` si non connecte
  - affiche email + `Sign out` si connecte

### Prompt agent (phase 2)

```text
Implement Supabase authentication UI in this Next.js App Router project with next-intl:
1) Add localized sign-in and sign-up pages under app/[locale]/(auth)/.
2) Use @supabase/ssr browser client for email/password auth.
3) Add auth callback route at app/auth/callback/route.ts.
4) Add sign-out action and a minimal auth-aware navigation state.
5) Keep styling consistent with existing Tailwind UI patterns.
6) Do not refactor unrelated business logic.
```

## Phase 3 - Protection des routes (a faire)

### Objectif

Remplacer progressivement `extractOptionalUserId` par l'utilisateur de session.

### A implementer

- Migrer d'abord routes critiques:
  - `app/api/overview/route.ts`
  - `app/api/listens/route.ts`
  - `app/api/genres/route.ts`
- Politique:
  - lire `userId` depuis session
  - ignorer `?userId=` pour les donnees privees
  - retourner `401` sans session

### Statut d'implementation (partiel)

- Guard commun ajoute:
  - `lib/auth/require-auth-user-id.ts`
- Endpoints migres vers session user + `401` sans session:
  - `app/api/overview/route.ts`
  - `app/api/listens/route.ts`
  - `app/api/genres/route.ts`
  - `app/api/date-range/route.ts`
  - `app/api/timeline/route.ts`
  - `app/api/temporal-analysis/route.ts`
  - `app/api/artists/route.ts`
  - `app/api/artists/trends/route.ts`
  - `app/api/artists/trends-chart/route.ts`
  - `app/api/genres/trends/route.ts`
  - `app/api/analytics/taste-evolution/route.ts`
  - `app/api/ai/artist-trends-commentary/route.ts`
  - `app/api/ai/genre-trends-commentary/route.ts`
  - `app/api/export/listens/route.ts`
  - `app/api/export/stats/route.ts`
  - `app/api/export/report/route.ts`

Pour la liste de reference maintenue, voir:

- `docs/SUPABASE_AUTH_ENDPOINTS_MIGRATION.md`

### Prompt agent (phase 3)

```text
Migrate API routes from optional query userId to Supabase session user:
1) Introduce a consistent guard that resolves user.id from Supabase auth.
2) Update API routes to use authenticated userId only.
3) Return 401 when no authenticated session.
4) Keep backward compatibility only where explicitly needed.
5) Update or add tests for these auth checks.
```

## Phase 4 - Alignement DB User (terminee)

### Objectif

Connecter le user Supabase (`auth.users.id`) au `User.id` Prisma.

### Option recommandee

- Faire de `User.id` un UUID compatible Supabase.
- A la premiere connexion:
  - upsert `User` avec `id = supabaseUser.id`
  - stocker `email`, `name` si disponibles.

### Statut d'implementation

- `prisma/schema.prisma`
  - `User.id` n'a plus de default `cuid()`
  - le contrat devient: `User.id = Supabase auth.users.id`
- Upsert automatique des utilisateurs auth:
  - `lib/auth/ensure-app-user-from-session.ts`
  - appele depuis `lib/auth/get-current-user-id.ts`
- Fallback query `userId` supprime de `getCurrentUserId` (plus de bypass possible)
- Script de migration legacy:
  - `scripts/migrate-user-id-to-supabase.js`
  - alias npm: `npm run auth:migrate-user-id -- --fromUserId ... --toSupabaseUserId ... --email ...`

### Migration sure (single-user legacy -> Supabase)

1. Recuperer le nouvel id Supabase (UUID) du compte connecte.
2. Dry-run:
   - `npm run auth:migrate-user-id -- --fromUserId "<legacy_id>" --toSupabaseUserId "<supabase_uuid>" --email "<email>" --dry-run`
3. Executer la migration reelle:
   - `npm run auth:migrate-user-id -- --fromUserId "<legacy_id>" --toSupabaseUserId "<supabase_uuid>" --email "<email>"`
4. Verifier les volumes (`listens`, `replayYearly`) sur le nouvel id.

### Rollback strategy

- Si la migration n'a pas ete executee: aucun impact.
- Si la migration a ete executee:
  - restaurer depuis backup DB, ou
  - relancer le script dans l'autre sens (nouvel id -> ancien id) si l'ancien id est reserve et coherent.
- Toujours faire un dump/backup DB avant migration production.

### Prompt agent (phase 4)

```text
Implement user identity alignment between Supabase Auth and Prisma:
1) Ensure Prisma User records use Supabase auth user id as primary key.
2) Add an upsert-on-login flow so authenticated users exist in app DB.
3) Keep migration safe for existing local data.
4) Document migration constraints and rollback strategy.
```

## Phase 5 - Durcissement securite et prod (a faire)

- Rate limiting minimal en place (Redis si `REDIS_URL`, fallback memoire en developpement) via `lib/security/rate-limit.ts`.
- Endpoints proteges:
  - `POST /api/lastfm/import`
  - `POST /api/replay/import`
  - `GET /api/export/listens`
  - `GET /api/export/stats`
  - `GET /api/export/report`
  - `GET /api/ai/artist-trends-commentary`
  - `GET /api/ai/genre-trends-commentary`
- Reponse limite atteinte: HTTP `429` avec payload JSON standardise (`code: RATE_LIMIT_EXCEEDED`, `details.remaining`, `details.resetAt`).
- Monitoring auth failures en place:
  - `lib/security/security-logger.ts` journalise les rejets `401/403/429` avec `route`, `statusCode`, `reason`, presence de `userId` et identifiant client anonymise (IP hashee ou fallback).
  - Aucune donnee sensible (token brut, secret) n'est loggee.
- Revoir CORS/headers.
- Ajouter tests E2E:
  - sign-up
  - sign-in
  - access denied without session
  - cross-user isolation.

## Imports scripts/admin (termine)

- Helper ajoute: `lib/auth/resolve-import-user-id.ts`
- Endpoints couverts:
  - `app/api/lastfm/import/route.ts`
  - `app/api/replay/import/route.ts`
- Regle:
  - session auth -> user session
  - admin/script -> header `x-import-admin-key` valide + `body.userId`
  - sinon -> `401`
- Variable env ajoutee:
  - `IMPORT_ADMIN_KEY`

## Checklist rapide

- [ ] Installer dependances Supabase
- [x] Ajouter infra SSR/client/middleware Supabase
- [x] Ajouter helper central `getCurrentUserId`
- [x] Migrer `api/replay` hors `default_user`
- [x] Ajouter pages sign-in/sign-up/callback
- [x] Proteger routes API principales (imports scripts restants)
- [ ] Aligner `User.id` Prisma avec Supabase Auth
- [ ] Completer tests auth + multi-user
