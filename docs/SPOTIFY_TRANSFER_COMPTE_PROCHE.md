# Transférer l’app Spotify Developer vers le compte Premium d’un proche

Guide pas à pas pour **Soundprint** (`apple-music-analytics-clean`) lorsque **ton** abonnement Spotify Premium (compte propriétaire de l’app sur [developer.spotify.com](https://developer.spotify.com)) n’est plus actif.

**Dernière mise à jour** : juin 2026 — règles Spotify « Development Mode » (Premium obligatoire pour le **propriétaire** de l’app, max **5 utilisateurs** OAuth par Client ID).

---

## Ce que ce guide fait (et ne fait pas)

| Objectif | Couvert par ce guide |
|----------|----------------------|
| Débloquer la **Web API** pour l’app (OAuth, refresh tokens, playground, images artistes) | Oui |
| Garder **tes** analytics historiques (imports ZIP déjà en base) | Oui — rien à migrer côté données |
| Remplacer **ton** compte Spotify **utilisateur** par celui de ton proche dans Soundprint | **Non** — ce serait incohérent (tu verrais *ses* tops / récents, pas les tiens) |
| Éviter de payer Premium **pour écouter** de la musique | Hors scope — c’est une question d’abonnement Spotify perso / Famille |

**Principe clé** : on transfère la **propriété de l’application développeur** (Client ID / Secret), pas l’identité Spotify avec laquelle **tu** te connectes à Soundprint.

---

## Architecture rappel (où vont les credentials)

```
Navigateur utilisateur
    → Supabase Auth (provider Spotify)     ← Client ID / Secret (Dashboard Supabase)
        → Spotify OAuth
    → /auth/callback (Next.js)
        → persiste SpotifyConnection en DB

Serveur Next.js (routes API Spotify)
    → SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET (.env + Vercel)  ← même paire que Supabase
    → SPOTIFY_TOKEN_ENCRYPTION_KEY (inchangé — ne pas régénérer sauf si tu veux invalider tous les tokens)
```

Les variables **doivent correspondre** entre Supabase Auth et ton `.env` / Vercel. Voir `env.example` (section `SPOTIFY WEB API SYNC`).

Scopes utilisés par l’app (définis dans `lib/services/spotify/spotify-web-api-scopes.ts`) :

```text
user-read-email user-read-private user-read-recently-played user-top-read
```

---

## Prérequis

Cocher avant de commencer :

- [ ] Ton proche a un **Spotify Premium actif** (et prévoit de le garder tant que l’app en a besoin).
- [ ] Il accepte d’être **propriétaire** de l’app sur le Dashboard Developer (dépendance technique, pas besoin qu’il utilise Soundprint).
- [ ] Il peut se connecter sur [developer.spotify.com](https://developer.spotify.com) avec **son** compte Spotify.
- [ ] Tu as accès au **Dashboard Supabase** du projet (Auth → Providers).
- [ ] Tu as accès aux **variables d’environnement Vercel** (si prod : `apple-music-analytics.vercel.app`).
- [ ] Tu connais ton **project ref Supabase** (dans l’URL : `https://<PROJECT_REF>.supabase.co`).

**Limite Spotify Development Mode** : max **5 comptes Spotify utilisateurs** pourront autoriser l’app via OAuth. Suffisant pour un projet perso / petite beta.

---

## Vue d’ensemble des étapes

| # | Qui | Où | Durée estimée |
|---|-----|-----|----------------|
| 1 | Proche | developer.spotify.com | 15–20 min |
| 2 | Toi | Dashboard Supabase | 5 min |
| 3 | Toi | `.env.local` + Vercel | 10 min |
| 4 | Toi | Redéploiement + tests | 15–30 min (+ délai propagation Spotify éventuel) |
| 5 | Toi (+ utilisateurs) | Reconnexion OAuth | 5 min / utilisateur |

**Aucune modification de code** n’est nécessaire si tu suis ce guide.

---

## Étape 1 — Ton proche crée (ou réutilise) l’app Spotify

**Qui** : ton proche, sur **son** navigateur.  
**Où** : [https://developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)

### 1.1 Connexion

1. Se connecter avec **le compte Spotify Premium de ton proche** (pas le tien).
2. Accepter les conditions développeur si demandé.
3. Vérifier qu’**aucun message rouge** du type *« blocked from accessing the Web API »* n’apparaît en haut du dashboard.

### 1.2 Créer l’application

> **Note** : depuis février 2026, Spotify limite souvent à **1 Client ID par compte développeur**. Si ton proche a déjà une app inutilisée, il peut la **réutiliser** au lieu d’en créer une nouvelle (étape **Settings** ci-dessous).

1. Cliquer **Create app** (ou ouvrir une app existante).
2. Renseigner :
   - **App name** : ex. `Soundprint` ou `Soundprint AI`
   - **App description** : ex. `Personal listening analytics dashboard`
   - **Website** : `https://apple-music-analytics.vercel.app` (ou ton domaine custom)
   - **Redirect URI** : voir § 1.3 — **à ajouter maintenant** si le formulaire le demande
3. Cocher les cases légales / usage non commercial si applicable.
4. Créer l’app.

### 1.3 Redirect URIs (critique)

Dans l’app → **Settings** → **Redirect URIs**, ajouter **exactement** :

```text
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

Remplacer `<PROJECT_REF>` par la vraie valeur Supabase (ex. `abcdefghijklmnop`).

**Développement local** (optionnel, si tu testes OAuth en local avec Supabase cloud) : la même URI Supabase suffit en général — le flux passe par Supabase, pas par `localhost` côté Spotify.

Cliquer **Save**.

### 1.4 Récupérer Client ID et Client Secret

Toujours dans **Settings** :

1. Copier le **Client ID**.
2. Cliquer **View client secret** → copier le **Client secret**.

**Ne pas** envoyer ces valeurs par SMS / email non chiffré. Utiliser un gestionnaire de mots de passe partagé ou un canal sécurisé.

Transmettre les deux valeurs **à toi seulement** (maintainer du projet).

### 1.5 (Optionnel) Désactiver ton ancienne app

Sur **ton** compte developer.spotify.com (sans Premium) :

- Tu peux laisser l’ancienne app inactive ou la supprimer pour éviter la confusion.
- Ce n’est **pas** obligatoire pour que la nouvelle marche.

---

## Étape 2 — Mettre à jour Supabase Auth

**Qui** : toi.  
**Où** : [https://supabase.com/dashboard](https://supabase.com/dashboard) → ton projet → **Authentication**

### 2.1 Provider Spotify

1. **Authentication** → **Providers** → **Spotify**.
2. Activer le provider si ce n’est pas déjà fait.
3. Coller le **nouveau** Client ID et Client Secret (ceux du compte de ton proche).
4. **Save**.

### 2.2 URL Configuration

1. **Authentication** → **URL Configuration**.
2. Vérifier que **Site URL** pointe vers la prod, ex. :
   ```text
   https://apple-music-analytics.vercel.app
   ```
3. Dans **Redirect URLs**, s’assurer que ces entrées existent (ajouter si manquant) :
   ```text
   https://apple-music-analytics.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```
4. **Save**.

---

## Étape 3 — Variables d’environnement applicatives

Le serveur Next.js utilise les mêmes credentials pour **rafraîchir les tokens** (`lib/services/spotify/refresh-access-token.ts`) et pour l’**enrichissement images** (`client_credentials`).

### 3.1 Local — `.env.local`

Ouvrir `.env.local` et mettre à jour **uniquement** :

```bash
SPOTIFY_CLIENT_ID="<nouveau_client_id>"
SPOTIFY_CLIENT_SECRET="<nouveau_client_secret>"
```

**Ne pas changer** (sauf intention de tout révoquer) :

```bash
SPOTIFY_TOKEN_ENCRYPTION_KEY="..."  # garder la valeur actuelle
```

Redémarrer le serveur de dev après modification :

```bash
npm run dev
```

### 3.2 Production — Vercel

**Qui** : toi.  
**Où** : Vercel → projet → **Settings** → **Environment Variables**

1. Modifier `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET` avec les nouvelles valeurs.
2. Appliquer à **Production** (et **Preview** si tu testes des PR avec OAuth).
3. **Save**.
4. Lancer un **Redeploy** du dernier déploiement production (Deployments → … → Redeploy).

---

## Étape 4 — Invalider les anciennes connexions Spotify en base

Les tokens enregistrés sous l’**ancien** Client ID ne pourront plus être rafraîchis. Chaque utilisateur Soundprint qui avait lié Spotify doit **se reconnecter** une fois.

### Option A — SQL via Supabase (recommandé, rapide)

**Où** : Supabase → **SQL Editor**

```sql
-- Marque toutes les connexions comme révoquées (les tokens chiffrés restent mais seront ignorés au refresh)
UPDATE "SpotifyConnection"
SET "revokedAt" = NOW(), "updatedAt" = NOW()
WHERE "revokedAt" IS NULL;
```

Alternative plus agressive (suppression complète) :

```sql
DELETE FROM "SpotifyConnection";
```

### Option B — Prisma Studio (local)

```bash
npx dotenv -e .env.local -- npx prisma studio
```

Table `SpotifyConnection` → supprimer les lignes ou noter qu’il faudra reconnecter manuellement.

### Option C — Prompt Cursor (si tu préfères un script documenté)

Copier-coller dans Cursor :

```text
Crée un script npm one-shot `scripts/revoke-all-spotify-connections.ts` qui :
1) charge DATABASE_URL via dotenv (.env.local),
2) met revokedAt = now() sur toutes les SpotifyConnection où revokedAt IS NULL,
3) log le nombre de lignes mises à jour,
4) appelle prisma.$disconnect().
Ajoute `"spotify:revoke-all-connections": "dotenv -e .env.local -- tsx scripts/revoke-all-spotify-connections.ts"` dans package.json.
Ne touche à rien d'autre.
```

Puis exécuter **hors Cursor** :

```bash
npm run spotify:revoke-all-connections
```

---

## Étape 5 — Reconnexion utilisateur (toi et beta testeurs)

**Qui** : chaque utilisateur Soundprint qui utilisait Spotify OAuth / playground.  
**Où** : navigateur — **pas** dans Cursor.

### 5.1 Si tu es connecté à Soundprint avec email / Google

1. Aller sur `/fr/sign-in` (ou `/en/sign-in`).
2. Cliquer **Continuer avec Spotify** (ou refaire le flux depuis l’onboarding).
3. Sur l’écran Spotify, vérifier que c’est **ton** compte Spotify **utilisateur** (pas celui de ton proche, sauf si tu veux explicitement ses données live).
4. Autoriser les permissions demandées.
5. Tu dois revenir sur `/auth/callback` puis le dashboard sans erreur.

### 5.2 Si ton compte Soundprint **est** ton ancien login Spotify uniquement

Pas de changement côté login Soundprint — seule la **liaison API** (`SpotifyConnection`) doit être rafraîchie via un nouveau OAuth Spotify (étape 5.1) **tant que tu restes connecté à la même session Soundprint**.

Si Supabase te demande de te reconnecter avec l’ancien provider et que ça échoue, ouvre une session support / vérifie les identités liées dans Supabase **Authentication → Users**.

### 5.3 Forcer le choix de compte Spotify

L’app envoie déjà `show_dialog: true` au login Spotify (`sign-in/page.tsx`). Si le mauvais compte s’ouvre :

1. Se déconnecter de [accounts.spotify.com](https://accounts.spotify.com) dans le navigateur.
2. Relancer **Continuer avec Spotify**.

---

## Étape 6 — Vérifications (checklist)

Exécuter dans l’ordre après redéploiement (+ attendre **jusqu’à quelques heures** si Spotify affiche encore une erreur Premium sur le **nouveau** compte — rare si Premium déjà actif).

### 6.1 Dashboard Spotify (compte du proche)

- [ ] Pas de bannière *« application is blocked »*.
- [ ] App en **Development Mode** avec Client ID actif.

### 6.2 Test OAuth

- [ ] Sign-in Spotify → retour app OK.
- [ ] En base : nouvelle ligne `SpotifyConnection` pour ton `userId`, `revokedAt` null.

### 6.3 Test API applicative

En étant connecté à Soundprint :

```bash
# Remplace le cookie de session — plus simple via le navigateur :
```

| Action UI | Route | Résultat attendu |
|-----------|-------|------------------|
| Onboarding → « Ouvrir l’aperçu Spotify live » | `POST /api/spotify/connection-verify` | `{ "ok": true }` |
| `/dashboard/spotify-playground` | `GET /api/spotify/playground` | JSON avec `me`, `topTracks`, etc. |
| Carte artiste sans image | `POST /api/artists/{id}/image` | `imageUrl` renseigné (si credentials OK) |

### 6.4 Ce qui doit toujours marcher sans API

- [ ] Import ZIP Spotify (`spotify_export`) depuis `/dashboard/onboarding`.
- [ ] Dashboards sur données déjà importées.

---

## Dépannage

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| `redirect_uri mismatch` | URI Supabase mal copiée dans Spotify Dashboard | Vérifier `https://<PROJECT_REF>.supabase.co/auth/v1/callback` caractère par caractère |
| `403` — *Premium required for the owner of the app* | Compte **propriétaire** de l’app sans Premium, ou délai de propagation | Vérifier Premium sur le compte **du proche** ; attendre quelques heures |
| `401` sur playground après migration | Anciens tokens | Reconnecter Spotify (étape 5) + SQL étape 4 |
| OAuth OK mais refresh échoue | `SPOTIFY_CLIENT_ID/SECRET` différents entre Supabase et Vercel | Aligner les 4 valeurs (Supabase + local + Vercel) |
| « Too many users » / quota dev | Plus de 5 utilisateurs OAuth sur l’app | Retirer des testeurs ou demander Extended Quota (hors scope perso) |
| Images artistes toujours vides | Rate limit ou search limit (max 10) | Réessayer ; voir logs serveur |

---

## Maintenance continue

- Si ton proche **annule Premium** → même blocage qu’aujourd’hui, pour **toute** l’app.
- Prévoir un **plan B** : imports ZIP uniquement, ou un autre compte Premium propriétaire.
- **Ne partage pas** le Client Secret publiquement (GitHub, screenshots).
- Rotation du secret : régénérer dans Spotify Dashboard → mettre à jour Supabase + Vercel → reconnecter les utilisateurs.

---

## Récap des secrets à mettre à jour

| Emplacement | Variables |
|-------------|-----------|
| Spotify Dashboard (compte proche) | Client ID, Client Secret (source de vérité) |
| Supabase → Auth → Spotify | Client ID, Client Secret |
| `.env.local` | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` |
| Vercel | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` |
| Inchangé | `SPOTIFY_TOKEN_ENCRYPTION_KEY`, `NEXT_PUBLIC_SUPABASE_*`, `DATABASE_URL` |

---

## Prompts Cursor utiles (optionnels)

### Vérifier qu’aucun ancien Client ID ne traîne dans le repo

```text
Recherche dans le dépôt toute occurrence de l'ancien SPOTIFY_CLIENT_ID (je te le donne) hors .env* et confirme qu'il n'est commité nulle part.
```

### Ajouter une note dans env.example

```text
Dans env.example section SPOTIFY, ajoute un renvoi vers docs/SPOTIFY_TRANSFER_COMPTE_PROCHE.md pour le transfert de propriété Developer vers un compte Premium tiers. Une phrase, pas plus.
```

### Script de smoke test API (dev seulement)

```text
Ajoute scripts/spotify-smoke-test.ts qui charge .env.local, obtient un token client_credentials, appelle GET /v1/search?type=artist&q=adele&limit=1, et affiche ok ou l'erreur HTTP. Script npm "spotify:smoke" avec dotenv + tsx.
```

---

## Références projet

- `docs/SPOTIFY_OAUTH_WEB_API_PLAYBOOK.md` — architecture OAuth / sync
- `env.example` — variables Spotify
- `lib/services/spotify/spotify-web-api-scopes.ts` — scopes OAuth
- [Spotify — February 2026 Dev Mode migration](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- [Spotify — Developer access update (fév. 2026)](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security)
