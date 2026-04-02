# GitHub Actions Workflows

Workflows CI/CD pour Apple Music Analytics.

## Workflows

### 1. `ci.yml` – Intégration continue

**Déclenchement** : push et Pull Request sur toutes les branches

**Jobs** :
- **Lint & Type Check** : TypeScript, ESLint
- **Run Tests** : tests unitaires (Vitest), rapport JUnit, upload Codecov
- **Build Check** : build Next.js de production
- **E2E (Playwright)** : tests bout-en-bout (voir ci-dessous) — **non exécuté sur chaque PR**

**Durée** : ~3–5 min (sans E2E) ; le job E2E ajoute ~5–15 min selon le runner.

#### Job E2E (`e2e`)

**Quand il s’exécute** (un seul de ces cas suffit) :

| Déclencheur | Comportement |
|-------------|--------------|
| `workflow_dispatch` | Toujours (Actions → workflow **CI** → **Run workflow**) |
| `push` sur la branche `main` | Oui (après merge, par exemple) |

Il **ne** s’exécute **pas** sur les PR ni sur les pushes vers des branches autres que `main`, pour limiter les minutes CI et le temps de feedback.

**Ce que fait le job** :

1. Démarre un **PostgreSQL 15** (service Docker sur le runner).
2. Définit `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/e2e` (base éphémère, pas vos secrets de prod).
3. `prisma migrate deploy` puis `npx playwright install --with-deps chromium` et `npm run test:e2e -- --project=chromium` (un seul navigateur en CI).
4. Playwright lance `npm run dev` (voir `playwright.config.ts` → `webServer`) avec les mêmes variables d’environnement que le job : `DATABASE_URL`, `NODE_ENV=development`, `CI=true`, `NEXT_TELEMETRY_DISABLED=1`.

**Variables / secrets** :

| Variable | Obligatoire pour E2E ? | Rôle |
|----------|------------------------|------|
| `DATABASE_URL` | Fournie par le workflow (service Postgres) | Prisma + API pendant `next dev` |
| `REDIS_URL` | Non | Cache optionnel ; sans elle, l’app fonctionne sans Redis (voir `lib/redis.ts`) |
| `GROQ_API_KEY`, `LASTFM_*`, etc. | Non pour les specs actuelles | Les E2E du dashboard n’appellent pas ces intégrations pour un parcours minimal |

**Base de données** : le schéma est appliqué via les migrations du dépôt ; une base vide suffit pour les tests actuels (réponses JSON vides / zéros). Pour des données réelles, vous pouvez ajouter une étape `npx prisma db seed` dans le job (plus long).

**Secrets optionnels** : si vous préférez pointer vers une base distante (ex. instance de test) au lieu du conteneur, remplacez l’étape « Apply database migrations » et définissez `DATABASE_URL` via un secret du dépôt (ex. `E2E_DATABASE_URL`) — à documenter dans votre fork selon votre infra.

**Artifact** : en cas d’échec, un rapport HTML Playwright est déposé sous l’artifact `playwright-report` (7 jours).

---

### 2. `test-coverage.yml` – Rapport de couverture

**Déclenchement** : Pull Request

**Fait** :
- Génère un rapport de couverture (lcov)
- Commente la PR avec les résultats
- Upload des artifacts (7 jours)

**Durée** : ~2–3 min

---

## Déploiement

Le projet est déployé automatiquement sur **Vercel** à chaque push sur `main`. Aucun workflow GitHub Actions n’est requis pour le déploiement.

**Optionnel** : pour que Vercel attende les checks CI avant de déployer :
1. Vercel Dashboard → Settings → Git
2. Activer « Wait for GitHub Checks »
3. Ajouter le check `CI` comme requis

---

## Dépannage

| Problème | Vérification |
|----------|---------------|
| Workflow ne se déclenche pas | Fichiers dans `.github/workflows/`, syntaxe YAML correcte |
| Tests échouent | Logs dans l’onglet Actions, étape en échec |
| Build échoue | `DATABASE_URL` dans les secrets si nécessaire |
| E2E ne s’exécute pas sur une PR | Comportement voulu : seulement `main` (push) ou déclenchement manuel |
| E2E échoue (migrations / Prisma) | Logs de l’étape « Apply database migrations » ; cohérence du dossier `prisma/migrations` |
| E2E échoue (timeout dev server) | Augmenter `webServer.timeout` dans `playwright.config.ts` si besoin |

---

## Badge

```markdown
![CI](https://github.com/USERNAME/REPO/actions/workflows/ci.yml/badge.svg)
```
