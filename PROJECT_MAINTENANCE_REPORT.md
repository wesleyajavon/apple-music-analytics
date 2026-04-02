# Rapport de maintenance projet — état au 1er avril 2026

Ce document synthétise un passage en revue du dépôt **apple-music-analytics-backup** : documentation, cohérence des scripts, tests, i18n et CI. Chaque section indique **ce qui manque ou diverge** et propose un **prompt** réutilisable (copier-coller dans Cursor ou autre assistant) pour traiter l’item étape par étape.

> **Note exécution locale :** les commandes `npm run test:run` / Vitest ont montré un démarrage anormalement long dans cet environnement. Lancez `npm run test:run`, `npm run lint` et `npx tsc --noEmit` sur votre machine pour confirmer l’état réel.

---

## Synthèse priorisée

| Priorité | Domaine | Résumé |
|----------|---------|--------|
| **Haute** | CHANGELOG / historique | Le `CHANGELOG.md` décrit des fichiers et scripts npm **absents** du dépôt actuel — risque de confusion majeure. |
| **Haute** | i18n (`messages/*.json`) | Références à `scripts/fetch-track-genres.js` **inexistant** ; instructions à aligner sur les scripts réels (`genres:*`, `spotify:*`, etc.). |
| **Moyenne** | `docs/API.md` | Plusieurs routes présentes dans `app/api/` **ne sont pas documentées** (`date-range`, `replay`, `replay/import`, `test-sentry-error`). |
| **Moyenne** | `messages/README.md` | Lien vers `docs/I18N_IMPLEMENTATION.md` **fichier manquant**. |
| **Moyenne** | `__tests__/README.md` | Liste des tests API **incomplète** (ex. `date-range.test.ts` présent mais non listé). |
| **Moyenne** | Tests d’intégration API | Aucun test Vitest sous `__tests__/api/` pour **export**, **lastfm**, **replay**, route **GET `/api/analytics/taste-evolution`** (la logique métier a des tests unitaires ailleurs). |
| **Basse** | README principal | Table « scripts principaux » **très partielle** vs `package.json` (genres, Apple Music CSV, etc.). |
| **Basse** | CI | Le workflow `.github/workflows/ci.yml` **n’exécute pas** Playwright (`test:e2e`) — à documenter ou à ajouter si souhaité. |
| **Basse** | `AUDIT_REPORT.md` (fév. 2026) | Plusieurs actions listées sont **déjà traitées** (fichiers supprimés) ; le fichier est partiellement obsolète. |
| **Basse** | TypeDoc | `typedoc.json` sort dans `docs/` — à garder à l’esprit avec les `.md` maintenus à la main (`docs:clean` avant `docs:generate`). |

---

## 1. CHANGELOG.md vs réalité du dépôt

**Constat :** `CHANGELOG.md` mentionne :

- Des commandes npm : `user:create`, `lastfm:import`, `db:reseed:lastfm` — **aucune** de ces clés n’apparaît dans le `package.json` actuel.
- Des chemins de doc : `docs/DATA_SOURCES.md`, `docs/guides/GUIDE_IMPORT_LASTFM.md`, `docs/quick-start/QUICK_START_LASTFM.md` — **absents** du dossier `docs/` (seuls quelques `.md` sont présents, ex. `API.md`, `APPLE_MUSIC_*.md`, `GENRE_PICK_MENU.md`).
- Des scripts : `scripts/create-user.js`, `scripts/import-lastfm.js`, `scripts/reseed-from-lastfm.js` — **absents** de `scripts/` (la liste actuelle est surtout genres + Last.fm update + import CSV Apple Music, etc.).

**Action recommandée :** soit **réécrire** le changelog pour refléter uniquement l’état actuel du backup, soit **restaurer** les scripts/docs si cette copie du projet est une branche incomplète.

**Prompt :**

```
Analyse CHANGELOG.md, package.json et le dossier scripts/ à la racine du projet.
Mets CHANGELOG.md en cohérence avec le dépôt actuel : supprime ou corrige toute référence à des fichiers ou commandes npm qui n'existent pas.
Si des fonctionnalités décrites dans le changelog ont été retirées volontairement, ajoute une courte note en tête du fichier expliquant la portée du dépôt (backup / sous-ensemble).
Ne crée pas de nouveaux fichiers de doc sauf si indispensable ; privilégie la correction du changelog.
```

---

## 2. Messages i18n — script de genres inexistant

**Constat :** Dans `messages/en.json`, `messages/fr.json`, `messages/es.json`, des chaînes recommandent `node scripts/fetch-track-genres.js`. **Aucun** fichier `fetch-track-genres.js` n’existe sous `scripts/`. Les flux réels documentés dans le projet incluent notamment `spotify:backfill-genres`, `genres:normalize`, `genres:backfill-cascade`, etc. (voir `package.json`).

**Prompt :**

```
Ouvre messages/en.json, messages/fr.json, messages/es.json et repère toute mention de scripts/fetch-track-genres.js ou d'un chemin de script obsolète.
Remplace par les commandes npm ou chemins réels définis dans package.json pour l'enrichissement / normalisation des genres (garde le même ton et la structure des clés i18n).
Vérifie que les trois langues restent alignées sémantiquement.
```

---

## 3. Documentation API (`docs/API.md`)

**Constat :** Des routes existent dans `app/api/` mais ne figurent pas dans `docs/API.md` :

| Route | Usage |
|--------|--------|
| `GET /api/date-range` | Plage min/max des écoutes (filtre « tout » / IA) |
| `GET /api/replay` | Résumés Replay annuels |
| `POST /api/replay/import` | Import d’un résumé Replay |
| `GET /api/test-sentry-error` | Test erreur Sentry (dev / diagnostic) |

**Prompt :**

```
Lis app/api/date-range/route.ts, app/api/replay/route.ts, app/api/replay/import/route.ts et app/api/test-sentry-error/route.ts.
Ajoute dans docs/API.md des sections cohérentes avec le style existant (paramètres, exemples, remarques sécurité pour la route test Sentry).
Ne modifie pas le comportement du code ; documentation uniquement.
```

---

## 4. `messages/README.md` — lien mort

**Constat :** Le fichier renvoie vers `docs/I18N_IMPLEMENTATION.md`, **absent** du dépôt.

**Options :** (a) créer un `docs/I18N_IMPLEMENTATION.md` succinct (structure des clés, conventions), ou (b) retirer/remplacer le lien par une section inline dans `messages/README.md`.

**Prompt :**

```
Le fichier messages/README.md référence docs/I18N_IMPLEMENTATION.md qui n'existe pas.
Soit crée docs/I18N_IMPLEMENTATION.md avec les conventions du dossier messages/ (d'après messages/README.md et les fichiers fr/en/es),
soit mets à jour messages/README.md pour ne plus pointer vers un fichier manquant.
Choisis l'option la plus simple qui évite la duplication inutile.
```

---

## 5. `__tests__/README.md` — liste des tests API

**Constat :** `__tests__/api/date-range.test.ts` existe mais n’est pas listé dans la section « Fichiers de test ».

**Prompt :**

```
Mets à jour __tests__/README.md : ajoute date-range.test.ts dans la liste des tests d'intégration API avec une courte description alignée sur les autres lignes.
Vérifie qu'aucun autre fichier __tests__/api/*.test.ts n'est oublié.
```

---

## 6. Couverture des tests d’intégration (routes API)

**Constat :** Sous `__tests__/api/`, il n’y a pas de tests nommés pour :

- `app/api/export/*` (listens, stats, report)
- `app/api/lastfm/*` et `lastfm/import`
- `app/api/replay` et `replay/import`
- `app/api/analytics/taste-evolution` (les modules métier ont des tests dans `lib/services/taste-evolution/__tests__/` et `lib/services/ai/__tests__/`, mais pas la route HTTP)

**Ce n’est pas forcément un bug** — mais l’objectif déclaré dans `__tests__/README.md` (>80 % et « toutes les routes API ») n’est pas atteint sur ce périmètre.

**Prompt :**

```
Examine les patterns dans __tests__/api/overview.test.ts (ou un fichier similaire) pour les mocks et NextRequest.
Ajoute des tests d'intégration minimaux pour GET /api/date-range si des cas manquent encore, puis pour les routes export/listens, export/stats, export/report, lastfm, lastfm/import, replay, replay/import, et GET /api/analytics/taste-evolution — un fichier par domaine ou un fichier groupé si le projet le fait déjà.
Objectif : statuts HTTP attendus, validation des paramètres, erreurs typiques ; mocks des services comme les autres tests API.
```

*(Vous pouvez découper ce prompt en plusieurs passes : une route à la fois.)*

---

## 7. README / README_FR — scripts npm

**Constat :** Les tableaux « Scripts principaux » listent surtout dev, build, Last.fm update, db, tests. Le `package.json` expose aussi `apple-music:*`, `genres:*`, `spotify:*`, `db:check-capacity`, etc.

**Prompt :**

```
Compare README.md et README_FR.md avec la section scripts de package.json.
Ajoute un second tableau ou une sous-section « Scripts données (genres, Apple Music CSV, etc.) » avec les commandes les plus utiles pour un contributeur, sans dupliquer toute la liste npm.
Garde le même style bilingue (README en anglais, README_FR en français).
```

---

## 8. CI — tests E2E

**Constat :** `.github/workflows/ci.yml` lance lint, `tsc`, Vitest avec couverture, et `npm run build`. **Aucun** job `npm run test:e2e`. Playwright est configuré (`playwright.config.ts`, `__tests__/e2e/dashboard.spec.ts`).

**Prompt :**

```
Analyse .github/workflows/ci.yml et playwright.config.ts.
Propose un job optionnel ou une stratégie (ex. E2E uniquement sur main, ou sur workflow_dispatch) pour npm run test:e2e avec les variables d'environnement nécessaires pour un build Next.js minimal.
Documente dans .github/workflows/README.md les prérequis (secrets, base de données) si tu ajoutes ce job.
```

---

## 9. `AUDIT_REPORT.md` (février 2026)

**Constat :** L’audit demandait entre autres la suppression de `instrumentation-client.ts.disabled` et `THEME_SWITCHER_AGENT_PROMPTS.md` — **ces fichiers ne sont plus dans le dépôt**. La mention de `docs/README.md` comme hub — **aucun** `docs/README.md` présent ici. Le rapport mérite d’être **archivé**, **mis à jour**, ou **fusionné** avec ce document.

**Prompt :**

```
Relis AUDIT_REPORT.md à la racine et compare avec l'état actuel du dépôt (recherche des fichiers mentionnés).
Mets à jour AUDIT_REPORT.md : marque les items comme résolus, supprime les références obsolètes, ou ajoute en tête une date et une note « supersedé par PROJECT_MAINTENANCE_REPORT.md ».
```

---

## 10. TypeDoc et dossier `docs/`

**Constat :** `npm run docs:generate` exécute `docs:clean` puis TypeDoc vers `out: "docs"`. Les fichiers Markdown maintenus à la main coexistent avec la sortie HTML TypeDoc ; le script de nettoyage vise surtout les anciens artefacts. Après génération, vérifier que `docs/API.md` et les guides Apple Music / genres n’ont pas été écrasés (selon la config actuelle, les `.md` devraient rester, mais une vérification manuelle après `docs:generate` est prudente).

**Prompt :**

```
Lis package.json (scripts docs:clean, docs:generate) et typedoc.json.
Documente dans README.md ou STACK.md en 2-3 phrases le workflow recommandé : quand lancer docs:generate, et comment la doc API manuelle (docs/API.md) est copiée vers public (docs:api:copy au build).
```

---

## 11. `FUTURE_ENHANCEMENTS.md`

**Constat :** Fichier court, à jour conceptuellement (durées de pistes). Rien d’urgent.

**Prompt (optionnel) :**

```
Relis FUTURE_ENHANCEMENTS.md et ajoute un lien vers les scripts ou docs pertinents pour le backfill de durées si le projet en a (sinon laisse tel quel).
```

---

## Checklist rapide « à faire sur machine »

Exécutez dans l’ordre sur votre poste :

1. `npm ci` ou `npm install`
2. `npx prisma generate`
3. `npx tsc --noEmit`
4. `npm run lint`
5. `npm run test:run`
6. `npm run test:e2e` (avec réseau / navigateurs Playwright installés)
7. `npm run build`

Si une étape échoue, utilisez les prompts des sections correspondantes en ciblant le message d’erreur exact.

---

## Fichiers de référence rapide

| Fichier | Rôle |
|---------|------|
| `package.json` | Source de vérité des scripts npm |
| `docs/API.md` | Référence HTTP (à compléter) |
| `CHANGELOG.md` | À réconcilier avec le dépôt |
| `__tests__/README.md` | Inventaire des tests |
| `.github/workflows/ci.yml` | Pipeline CI |

---

*Généré dans le cadre d’un audit manuel du dépôt ; à réviser après toute évolution majeure des scripts ou de la structure `app/api/`.*
