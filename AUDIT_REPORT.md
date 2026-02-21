# Rapport d'audit – Inventaire des fichiers suspects

*Généré le 20 février 2026 – Phase 0.1 du nettoyage projet*

---

## Synthèse des actions (priorité haute → basse)

| Priorité | Action |
|----------|--------|
| **Haute** | Supprimer `instrumentation-client.ts.disabled` |
| **Haute** | Supprimer `THEME_SWITCHER_AGENT_PROMPTS.md` (feature implémentée) |
| **Moyenne** | Mettre à jour `GUIDE_IMPORT_LASTFM.md` pour utiliser `scripts/create-user.js` |
| **Moyenne** | Supprimer ou archiver `prisma/migrationsSaved/` si non utilisé |
| **Basse** | Ajouter des scripts npm pour les scripts les plus utilisés |
| **Basse** | ~~Vérifier la cohérence de `docs/DOCUMENTATION.md`~~ → Fait : contenu fusionné dans `docs/README.md` |

---

## 1. Priorité haute

### 1.1 Supprimer `instrumentation-client.ts.disabled`

| Fichier | Raison | Action |
|---------|--------|--------|
| `instrumentation-client.ts.disabled` | Ancienne config Sentry client, remplacée par `SentryInit` dans `app/layout.tsx`. Le fichier indique qu'il est conservé pour référence. | **Supprimer** – La migration est faite, le fichier n'est plus utile et peut prêter à confusion. |

### 1.2 Supprimer `THEME_SWITCHER_AGENT_PROMPTS.md`

| Fichier | Raison | Action |
|---------|--------|--------|
| `THEME_SWITCHER_AGENT_PROMPTS.md` | Prompts pour implémenter le Theme Switcher. Le composant `theme-switcher.tsx` existe et fonctionne. | **Supprimer** – La feature est implémentée, les prompts ne sont plus nécessaires. |

---

## 2. Priorité moyenne

### 2.1 Mettre à jour `GUIDE_IMPORT_LASTFM.md`

| Élément | Détail | Action |
|---------|--------|--------|
| `docs/guides/GUIDE_IMPORT_LASTFM.md` | Décrit la création d'un fichier temporaire `create-user.js` à la racine, alors que `scripts/create-user.js` existe. | **Mettre à jour** – Remplacer par l'utilisation de `node scripts/create-user.js`. |

### 2.2 Supprimer ou archiver `prisma/migrationsSaved/`

| Dossier | Contenu | Action |
|---------|---------|--------|
| `prisma/migrationsSaved/20251222210034_refine_schema_normalize_artists_tracks/` | Migration archivée (22 déc. 2025) | **Supprimer** – Migrations archivées non utilisées par Prisma. Ou **garder** si vous voulez conserver un historique de migrations abandonnées. |

---

## 3. Priorité basse

### 3.1 Ajouter des scripts npm pour les scripts les plus utilisés

| Script | Référencé ailleurs ? | Action suggérée |
|--------|----------------------|-----------------|
| `update-lastfm.js` | ✅ `package.json` (`lastfm:update`) | Déjà présent |
| `create-user.js` | ✅ `CHANGELOG.md`, `GUIDE_IMPORT_LASTFM.md` | Ajouter `"db:create-user": "node scripts/create-user.js"` |
| `import-lastfm.js` | ✅ `messages/*.json`, `CHANGELOG.md` | Optionnel : ajouter un script npm |
| `reseed-from-lastfm.js` | ✅ `CHANGELOG.md` | Optionnel : ajouter un script npm |
| `fetch-track-genres.js` | ✅ `messages/*.json` (i18n) | Optionnel : ajouter un script npm |
| `fetch-track-durations.js` | Référencé uniquement dans son propre header | Optionnel : ajouter un script npm |
| `update-track-genres.js` | Référencé uniquement dans son propre header | Optionnel : ajouter un script npm |
| `clean-duplicate-listens.js` | Référencé uniquement dans son propre header | Optionnel : ajouter un script npm |
| `clean-mock-data.js` | Référencé uniquement dans son propre header | Optionnel : ajouter un script npm |
| `rollback-today-import.js` | Référencé uniquement dans son propre header | Optionnel : ajouter un script npm |
| `test-redis.js` | Référencé uniquement dans son propre header | Utile pour debug Redis |

### 3.2 ~~Vérifier la cohérence de `docs/DOCUMENTATION.md`~~ (Fait)

| Fichier | Raison | Action |
|---------|--------|--------|
| `docs/DOCUMENTATION.md` | Supprimé. Contenu fusionné dans `docs/README.md`. TypeDoc génère dans `docs/` (typedoc.json). | **Fait** – `docs/README.md` est le hub de documentation. |

---

## 4. Fichiers à conserver

### 4.1 Fichiers `.example`

| Fichier | Raison |
|---------|--------|
| `env.example` | Template des variables d'environnement, référencé dans `GUIDE_IMPORT_LASTFM.md`. Bonne pratique. |
| `next.config.sentry.example.js` | Exemple de config Next.js avec Sentry pour l'upload des source maps. Utile pour activer Sentry plus tard. |

### 4.2 Configs principales

| Fichier | Raison |
|---------|--------|
| `next.config.js` | Config principale Next.js (sans Sentry). |
| `PROJECT_CLEANUP_AGENT_PROMPTS.md` | Prompts pour le nettoyage du projet – en cours d'utilisation. |
