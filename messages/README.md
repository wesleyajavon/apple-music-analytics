# Messages i18n — Soundprint-AI

Copy utilisateur pour **fr** (locale par défaut), **en** et **es**. Les trois JSON doivent exposer **les mêmes chemins de clés**.

Routing : [`i18n/routing.ts`](../i18n/routing.ts) (`defaultLocale: "fr"`). Chargement : [`i18n/request.ts`](../i18n/request.ts) importe `messages/${locale}.json`. Liens localisés : `Link` / `useRouter` depuis [`i18n/navigation.ts`](../i18n/navigation.ts), pas `next/link`.

Dans le code : `useTranslations("namespace")` (client) ou `getTranslations({ locale, namespace })` (serveur). Exemple : `useTranslations("duet.compare")`.

~2 870 feuilles de copy par fichier. Top-level identique sur `en` / `fr` / `es` (43 namespaces).

## Fichiers

| Fichier | Locale |
|---------|--------|
| [`fr.json`](fr.json) | Français (défaut, `/fr`) |
| [`en.json`](en.json) | English (`/en`) |
| [`es.json`](es.json) | Español (`/es`) |

## Où placer une clé

| Cas | Namespace |
|-----|-----------|
| Bouton / erreur générique | `common.*` |
| Nav sidebar, bottom nav mobile, Plus menu | `sidebar.*` |
| Empty / error / loading / filtres dates / période | `components.emptyState`, `errorState`, `loadingState`, `dateRangeFilter`, `periodSelector` |
| Page dashboard | namespace de la page (`overview`, `palette`, `askSoundprint`, …) |
| Duet (amis, compare, Your Music ami) | `duet.*` |
| Auth, onboarding, settings | `auth`, `onboarding`, `settings` |
| Landing | `home.*` |
| Légal / cookies / `<title>` | `legal`, `cookieConsent`, `metadata` |
| Copy IA partagée (toggle, consentement Groq, démo) | `aiMasterToggle`, `groqAiConsentPrompt`, `publicDemoAi` |

**Ne pas** dupliquer un libellé déjà dans `common` ou `sidebar`. **Ne pas** coller le namespace `overview` sur un écran ami : Duet a `duet.friendMusic.*`.

Les namespaces **à trait d’union** (`temporal-analysis`, `ai-insights`, `taste-evolution`, …) sont historiques. Pour une **nouvelle** zone, préférer le camelCase déjà majoritaire (`askSoundprint`, `genreTrends`, `musical-profile` est l’exception). Recopier le style du voisin le plus proche.

ICU MessageFormat est utilisé (ex. `sidebar.pendingFriendRequestsBadge` avec `{count, plural, …}`). Garder les placeholders (`{name}`, `{date}`) identiques dans les trois langues.

## Namespaces

### Chrome & partagé

| Clé | Usage |
|-----|--------|
| `common` | Retry, loading, export, close |
| `languageSwitcher` / `themeSwitcher` | Sélecteurs langue et thème |
| `sidebar` | Menu, groupes, items, badges |
| `footer` | Liens footer |
| `dashboard` | Shell dashboard (genre backfill, AI interactif) |
| `components` | Empty/error/loading, date range, period selector, notification center, user menu, charts |
| `errors` | `error.tsx` / `global-error.tsx`, quotas Groq, rate limit |
| `aiMasterToggle` | Interrupteur IA navigateur |
| `groqAiConsentPrompt` | Consentement Groq (RGPD) |
| `publicDemoAi` | Bandeaux IA en démo publique |
| `cookieConsent` | Bannière cookies |
| `metadata` | `<title>` / description Open Graph |

### Auth, onboarding, compte

| Clé | Usage |
|-----|--------|
| `auth` | Sign-in, sign-up, mot de passe, acceptation CGU |
| `onboarding` | Wizard import Apple Music CSV / Spotify ZIP |
| `partialSyncPreview` | Aperçu sync Spotify partielle |
| `settings` | Hub compte, préférences, Duet, export / suppression RGPD |

### Bibliothèque & patterns

| Clé | Usage |
|-----|--------|
| `overview` | Your Music |
| `timeline` | Pulse chart |
| `heatmap` | Calendrier d’intensité |
| `temporal-analysis` | Rhythm lab |
| `genres` / `genreTrends` / `palette` | Genres, tendances, atelier Unknown |
| `artists` / `artistTrends` | Artistes et tendances |
| `tracks` / `trackTrends` | Titres et tendances |
| `musical-profile` | Profil musical / persona |
| `annualReport` | Rapport annuel PDF |

### IA & Duet

| Clé | Usage |
|-----|--------|
| `askSoundprint` | Chat « Ask your Soundprint » |
| `ai-insights` | Insight cards |
| `taste-evolution` / `taste-profile` | Évolution et profil de goûts |
| `duet` | `friends`, `compare`, `friendMusic`, `inviteAccept`, `settings`, `metadataBanner` |

### Marketing, aide, légal

| Clé | Usage |
|-----|--------|
| `home` | Landing |
| `about` | How it works |
| `demo` | Page démo / vidéos |
| `insights` | Méthodologie |
| `api-docs` | Page doc API |
| `legal` | Privacy, terms, cookies |
| `spotifyPlayground` | Playground Web API (admin / debug) |
| `sentry-test` | Page test Sentry |

## Ajouter ou modifier du copy

1. Ajouter la clé dans **`en.json`, `fr.json` et `es.json`** (même chemin).
2. Utiliser `useTranslations("namespace")` / `getTranslations` — pas de chaînes hardcodées dans l’UI.
3. Vérifier les trois locales en local (`/en`, `/fr`, `/es`), desktop et mobile si le layout change.

Le rapport PDF (`/api/export/report`) charge aussi `messages/${locale}.json` côté serveur.
