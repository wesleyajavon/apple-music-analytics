# Soundprint-AI

<p align="center">
  <img src="public/brand/soundprint-ai-logo.png" alt="Soundprint-AI" width="260">
</p>

<p align="center">
  <strong>Vos écoutes, visualisées.</strong><br>
  Analytics personnelles pour Apple Music et Spotify — tendances, identité musicale, chat IA et duels entre amis.
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_FR.md">Français</a>
</p>

<p align="center">
  <a href="https://github.com/wesleyajavon/apple-music-analytics/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/wesleyajavon/apple-music-analytics/ci.yml?branch=main&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Licence MIT"></a>
  <img src="https://img.shields.io/badge/Next.js-14-black" alt="Next.js 14">
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node.js 20+">
</p>

**Soundprint-AI** transforme votre historique d’écoute en tableau de bord privé : un import Apple Music ou Spotify, puis stats, habitudes et goûts dans le temps. L’IA Groq (optionnelle) permet de poser des questions en langage naturel. **Duet** compare les bibliothèques d’amis qui ont accepté.

Le dépôt GitHub s’appelle toujours [`apple-music-analytics`](https://github.com/wesleyajavon/apple-music-analytics) — c’était le nom d’origine du projet. Le produit s’appelle **Soundprint-AI**. Voir [Nom du dépôt](#nom-du-dépôt) si vous forkez ou liez ce repo.

Démo en ligne : **[soundprint-ai.com](https://www.soundprint-ai.com/)**. Locale par défaut : français ; l’anglais et l’espagnol sont sous `/en` et `/es`. Les visiteurs anonymes peuvent essayer une **démo publique** sur le site.

<p align="center">
  <img src="public/brand/dashboard-preview.png" alt="Soundprint-AI — chat Interroger Soundprint">
</p>

Non affilié à Apple, Spotify, Last.fm ou Groq.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Origine des données](#origine-des-données)
- [Stack technique](#stack-technique)
- [Documentation](#documentation)
- [Nom du dépôt](#nom-du-dépôt)
- [Licence](#licence)

## Fonctionnalités

### Explorer sa bibliothèque

- **Your Music** — stats globales (écoutes, artistes, titres, temps) avec tops et filtre de période (7j / 30j / YTD / tout / custom)
- **Pulse chart et heatmap** — volume dans le temps et calendrier type GitHub
- **Rhythm lab** — habitudes par heure et jour de la semaine
- **Profil musical** — persona construite à partir de vos patterns d’écoute
- **Artistes, titres, genres** — classements, deep dives et tendances (jour / semaine / mois)
- **Palette** — rattacher les genres « Unknown » aux artistes et titres qui pèsent vraiment

### Interagir

- **Interroger Soundprint** — chat sur vos données via des outils analytics allowlistés (tops, séries, deep dive artiste, ère vs ère). Pas de SQL libre
- **Insight cards et évolution des goûts** — synthèses Groq optionnelles, et changements semaine par semaine
- **Cartes de partage** — images téléchargeables pour duels et highlights

### Duet (amis)

- Invitations par e-mail, acceptation / refus, blocage
- **Niveaux de partage** explicites (`aggregates` ou `full`) — rien n’est comparé tant que les deux côtés n’ont pas consenti
- Head-to-head sur un **artiste, titre ou genre** (« qui a le plus streamé ça ? »)
- **Your Music d’un ami** — hub en lecture seule (KPI, tops, timeline) pour un ami accepté
- Pas un réseau social : pas de follow, pas de profils publics, pas de fil

### Compte et produit

- Onboarding guidé (CSV Apple Music ou ZIP confidentialité Spotify)
- Auth Supabase (connexion / inscription e-mail)
- Paramètres : export RGPD et suppression de compte, consentement IA Groq, défauts de partage Duet
- i18n : français (défaut), anglais, espagnol (`next-intl`)
- Thème clair / sombre, layouts mobile et desktop
- Pages légales : confidentialité, CGU, cookies

## Origine des données

Soundprint **n’exige pas** d’API développeur Apple Music ou Spotify payante côté utilisateur.

1. Écoutez comme d’habitude sur Apple Music ou Spotify.
2. Demandez une copie de votre historique à Apple (CSV) ou Spotify (ZIP).
3. Créez un compte et déposez le fichier dans **l’onboarding**.
4. Les écoutes sont normalisées dans PostgreSQL ; les graphiques partent de ce store.
5. Réimportez depuis les Paramètres si vous voulez un historique plus long.

La couverture des genres s’améliore avec Palette dans l’app.

## Stack technique

| Couche | Choix |
|--------|--------|
| App | [Next.js](https://nextjs.org/) 14 (App Router), React 18, TypeScript |
| UI | Tailwind CSS, Recharts / D3, Motion |
| i18n | next-intl (`fr` par défaut, `en`, `es`) |
| Auth | [Supabase Auth](https://supabase.com/auth) (cookies SSR) |
| Données | PostgreSQL + [Prisma](https://www.prisma.io/) |
| Cache / rate limits | Redis (ioredis) ou REST [Upstash](https://upstash.com/) |
| IA (optionnel) | [Groq](https://groq.com/) — insights, chat, textes de goût, backfill genres |
| Observabilité | Sentry, Vercel Analytics |
| Tests | Vitest, Playwright |
| Hébergement | [Vercel](https://vercel.com/) |

## Documentation

| Doc | Contenu |
|-----|---------|
| [`STACK.md`](STACK.md) | Libs, infra, et usage réel |
| [`docs/APP_FLOW.md`](docs/APP_FLOW.md) | Diagrammes auth, onboarding et flux de données |
| [`docs/API.md`](docs/API.md) | Référence des endpoints HTTP (copiée vers `public/docs/API.md` au build) |
| [`docs/DUET.md`](docs/DUET.md) | Graphe d’amis, compare, scopes de partage |
| [`docs/DB_ENV_WORKFLOW.md`](docs/DB_ENV_WORKFLOW.md) | Prisma migrate vs push, local vs prod |
| [`docs/SUPABASE_AUTH_IMPLEMENTATION.md`](docs/SUPABASE_AUTH_IMPLEMENTATION.md) | Auth |
| [`IDEAS_BAG.md`](IDEAS_BAG.md) | Idées produit et anciens noms de code |

Le HTML TypeDoc pour `lib/services/**` et `lib/dto/**` se génère avec `npm run docs:generate`. `docs/API.md` est rédigé à la main et **n’est pas** produit par TypeDoc.

## Nom du dépôt

| Quoi | Valeur |
|------|--------|
| Produit | **Soundprint-AI** (court : Soundprint) |
| Dépôt GitHub | [`wesleyajavon/apple-music-analytics`](https://github.com/wesleyajavon/apple-music-analytics) |
| `package.json` `name` | `apple-music-analytics` (privé ; non publié sur npm) |
| URL live | [soundprint-ai.com](https://www.soundprint-ai.com/) |

Garder le slug GitHub est tout à fait correct : beaucoup de produits vivent sous un nom de repo historique, et l’aperçu social GitHub fonctionne dès que le README mène avec le nom produit. Si vous renommez plus tard le repo en `soundprint-ai`, GitHub redirige automatiquement l’ancienne URL — il faudra alors mettre à jour les commandes `git clone`, les badges CI, et éventuellement le rattachement Git côté Vercel.

## Contribuer

Issues et pull requests bienvenues. La CI lance TypeScript, ESLint et Vitest à chaque push et PR ; les E2E Playwright tournent sur `main` (voir [`.github/workflows/README.md`](.github/workflows/README.md)).

Merci de tenir les copy utilisateur en **en / fr / es** (`messages/*.json`) quand vous touchez l’UI.

## Licence

[MIT](LICENSE)
