# Guide des Tests

Ce répertoire contient tous les tests pour le projet Apple Music Analytics.

## Structure

```
__tests__/
├── api/              # Tests d'intégration pour les routes API
├── e2e/              # Tests end-to-end avec Playwright
├── performance/      # Tests de performance et benchmarks
├── validators/       # Tests des validateurs API
└── README.md         # Ce fichier
```

## Types de Tests

### Tests d'Intégration API (`__tests__/api/`)

Les tests d'intégration vérifient le comportement des routes API en isolant les services avec des mocks.

**Fichiers de test :**
- `timeline.test.ts` - Tests pour `/api/timeline`
- `overview.test.ts` - Tests pour `/api/overview`
- `genres.test.ts` - Tests pour `/api/genres`
- `genres-trends.test.ts` - Tests pour `/api/genres/trends`
- `listens.test.ts` - Tests pour `/api/listens`
- `artists.test.ts` - Tests pour `/api/artists`
- `artists-trends.test.ts` - Tests pour `/api/artists/trends`
- `temporal-analysis.test.ts` - Tests pour `/api/temporal-analysis`
- `ai-insights.test.ts` - Tests pour `/api/ai/insights`
- `taste-profile.test.ts` - Tests pour `/api/ai/taste-profile`
- `listening-habit-prediction.test.ts` - Tests pour `/api/predictions/listening-habit`

**Exécuter les tests d'intégration :**
```bash
npm run test:integration
```

### Tests E2E (`__tests__/e2e/`)

Les tests end-to-end utilisent Playwright pour tester l'application complète dans un navigateur réel.

**Configuration :** `playwright.config.ts`

**Fichiers de test :**
- `dashboard.spec.ts` - Tests de navigation et intégration du dashboard

**Prérequis :**
```bash
npm install --save-dev @playwright/test playwright
npx playwright install
```

**Exécuter les tests E2E :**
```bash
# Tous les tests
npm run test:e2e

# Avec interface graphique
npm run test:e2e:ui

# Mode headed (voir le navigateur)
npm run test:e2e:headed
```

**Note :** Les tests E2E nécessitent que l'application soit en cours d'exécution (Playwright la démarre automatiquement via `webServer`).

### Tests des validateurs (`__tests__/validators/`)

Les tests des validateurs vérifient la logique de validation des paramètres API.

**Fichiers de test :**
- `api-validators.test.ts` - Tests pour `lib/validators/api-validators.ts`

### Tests de Performance (`__tests__/performance/`)

Les tests de performance mesurent le temps d'exécution et identifient les régressions.

**Fichiers de test :**
- `benchmarks.test.ts` - Benchmarks pour les routes API et le traitement de données

**Exécuter les tests de performance :**
```bash
npm run test:performance
```

## Commandes Disponibles

```bash
# Tous les tests unitaires (Vitest)
npm test

# Interface graphique pour les tests Vitest
npm run test:ui

# Couverture de code
npm run test:coverage

# Tests d'intégration uniquement
npm run test:integration

# Tests E2E
npm run test:e2e

# Tests de performance
npm run test:performance

# Tous les tests (unitaires + E2E)
npm run test:all
```

## Objectif de Couverture

L'objectif est d'atteindre **>80% de couverture de code** avec :
- Tests unitaires pour les services critiques
- Tests d'intégration pour toutes les routes API
- Tests E2E pour les parcours utilisateur principaux
- Tests de performance pour les endpoints critiques

## Notes

- Les tests d'intégration utilisent des mocks pour isoler les services
- Les tests E2E nécessitent une base de données avec des données de test
- Les tests de performance peuvent être exécutés en mode CI pour détecter les régressions
- Pour des tests de charge plus complets, considérez des outils dédiés comme k6 ou Artillery



