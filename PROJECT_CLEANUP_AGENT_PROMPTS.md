# Prompts Agent – Nettoyage du Projet (Apple Music Analytics)

Ce document contient les prompts à transmettre à l’agent pour nettoyer le projet étape par étape avant le lancement et la mise en marché. Objectif : un repo léger, propre, sans fichiers inutilisés.

**Contexte :** Projet Next.js 14, Prisma, TypeScript. Prêt à être partagé sur les réseaux sociaux.

**Ordre recommandé :** Exécuter les phases dans l’ordre. Valider chaque phase avant de passer à la suivante.

---

## Phase 0 : Audit initial (obligatoire en premier)

### Prompt 0.1 – Inventaire et identification des fichiers suspects

```
Fais un audit du projet apple-music-analytics pour identifier les fichiers potentiellement inutilisés ou redondants :

1. Liste tous les fichiers à la racine et dans les dossiers principaux (scripts/, docs/, .cursorrules/, etc.)
2. Identifie :
   - Fichiers .disabled ou .example non utilisés
   - Scripts dans scripts/ qui ne sont pas référencés dans package.json
   - Fichiers .md de documentation interne/agent (ex. THEME_SWITCHER_AGENT_PROMPTS.md) qui ne servent plus
   - Dossiers prisma/migrationsSaved ou similaires (migrations archivées)
   - Fichiers de config dupliqués ou obsolètes
3. Produis un rapport markdown listant : Fichier | Raison | Action suggérée (supprimer / garder / fusionner)
4. Ne supprime rien encore, seulement lister et recommander
```

---

## Phase 1 : Fichiers désactivés et exemples

### Prompt 1.1 – Fichiers .disabled

```
Gère le fichier instrumentation-client.ts.disabled :

1. Vérifie si instrumentation-client.ts (sans .disabled) existe ou est requis par Sentry/Next.js
2. Si le fichier est volontairement désactivé et n'est plus nécessaire : supprime-le
3. Si Sentry côté client est géré autrement (ex. sentry-init.tsx), mets à jour les commentaires/messages qui référencent encore "instrumentation-client.ts" pour refléter la réalité
4. Supprime instrumentation-client.ts.disabled si confirmé inutile
```

### Prompt 1.2 – Fichiers .example

```
Vérifie les fichiers .example (env.example, next.config.sentry.example.js) :

1. env.example : GARDE-LE – c'est une bonne pratique pour documenter les variables d'environnement
2. next.config.sentry.example.js : Si next.config.js ou next.config.ts intègre déjà la config Sentry, supprime ce fichier .example. Sinon, garde-le et documente son usage dans le README
```

---

## Phase 2 : Scripts

### Prompt 2.1 – Scripts non référencés dans package.json

```
Pour les scripts dans scripts/ qui ne sont PAS dans package.json :

1. Liste : rollback-today-import.js, test-redis.js, clean-mock-data.js (et tout autre trouvé)
2. Pour chaque script :
   - Si c'est un utilitaire de debug/dev utile : ajoute une entrée dans package.json (ex. "db:rollback-today": "node scripts/rollback-today-import.js")
   - Si c'est obsolète ou à usage unique : supprime le fichier et documente dans CHANGELOG si pertinent
3. Ne garde que les scripts qui ont une vraie utilité pour le projet ou pour les contributeurs
```

### Prompt 2.2 – Scripts utilisés : vérification des dépendances

```
Vérifie que tous les scripts référencés dans package.json existent bien et fonctionnent :

1. Pour chaque script dans les scripts npm (lastfm:import, db:reseed:lastfm, etc.), confirme que le fichier existe
2. Si un script référence un fichier manquant : soit le recrée, soit retire la commande de package.json
3. Nettoie les scripts npm inutilisés ou redondants
```

---

## Phase 3 : Documentation

### Prompt 3.1 – Documentation interne vs publique

```
Nettoie la documentation (dossiers docs/, .cursorrules/, fichiers .md à la racine) :

1. GARDE (essentiels pour le projet) :
   - README.md (s'il existe et est à jour)
   - CHANGELOG.md
   - env.example
   - docs/guides/ (GUIDE_IMPORT_LASTFM, GUIDE_CI_CD, GUIDE_REDIS) si utiles pour setup
   - docs/quick-start/ si pertinent

2. ÉVALUE (à fusionner ou simplifier) :
   - docs/DOCUMENTATION.md, docs/DATA_SOURCES.md, docs/CODE_REVIEW.md
   - .github/workflows/README.md, SUMMARY.md, DEPLOY_OPTIONS.md
   - Fusionne les infos redondantes dans un seul README ou docs/README.md

3. SUPPRIME ou DÉPLACE :
   - THEME_SWITCHER_AGENT_PROMPTS.md : si le thème est implémenté, ce fichier de prompts agent n'est plus nécessaire en prod – supprime ou déplace dans .cursor/ ou un dossier dev
   - docs/setup/ : garde uniquement les guides de setup vraiment nécessaires (ex. SETUP_CI_CD, SETUP_VERCEL) ; supprime les trop spécifiques (ex. SETUP_GEMINI_DESIGN_MCP) sauf si tu utilises ce MCP
   - .cursorrules/ : garde si tu utilises Cursor rules ; sinon supprime ou simplifie
```

### Prompt 3.2 – TypeDoc et documentation générée

```
Gère la documentation TypeDoc :

1. Le dossier docs/ est-il dans .gitignore ? Si oui, la doc générée n'est pas versionnée – c'est bien
2. typedoc.json : si tu ne génères plus la doc régulièrement et que personne ne l'utilise, envisage de retirer typedoc des devDependencies et le script docs:generate
3. Si tu gardes TypeDoc : assure-toi que docs:clean supprime bien le dossier avant régénération, et que docs/ est dans .gitignore
```

---

## Phase 4 : Migrations et base de données

### Prompt 4.1 – Migrations archivées

```
Gère prisma/migrationsSaved (ou équivalent) :

1. Ce dossier contient des migrations sauvegardées/archivées
2. Si prisma/migrations est la source de vérité et migrationsSaved n'est plus utilisé : supprime migrationsSaved
3. Si tu as besoin de garder une trace : documente brièvement dans README ou docs, puis supprime le dossier (les migrations actives sont dans prisma/migrations)
```

---

## Phase 5 : Configuration et fichiers de projet

### Prompt 5.1 – Fichiers de config redondants

```
Vérifie les fichiers de configuration à la racine :

1. tsconfig.json, tailwind.config.ts, next.config.*, .eslintrc.json : garde, essentiels
2. swagger-ui-react.d.ts : si Swagger est utilisé, garde ; sinon supprime
3. typedoc.json : voir Phase 3.2
4. next.config.sentry.example.js : voir Phase 1.2
5. Supprime tout fichier de config orphelin ou dupliqué
```

### Prompt 5.2 – .gitignore et fichiers à ne pas committer

```
Vérifie et nettoie .gitignore :

1. Assure-toi que .next/, node_modules/, .env*, coverage/, test-results/, playwright-report/, .vercel sont ignorés
2. Vérifie que prisma/migrationsSaved est ignoré si tu le supprimes (ou qu'il n'est plus suivi)
3. Corrige les entrées mal formatées (ex. espace avant "CODE_REVIEW.md" qui peut invalider la règle)
4. Ajoute toute entrée manquante pour les artefacts de build et fichiers sensibles
```

---

## Phase 6 : Code mort et dépendances

### Prompt 6.1 – Dépendances npm inutilisées

```
Identifie les dépendances potentiellement inutilisées :

1. Utilise npm ls ou une analyse des imports pour lister les packages jamais importés
2. Pour chaque dépendance suspecte : vérifie si elle est utilisée (import direct, config, plugin)
3. Supprime les dépendances inutilisées de package.json
4. Lance npm install pour mettre à jour le lockfile
```

### Prompt 6.2 – Exports et fichiers orphelins

```
Identifie les fichiers orphelins dans lib/ :

1. Les fichiers exportés dans lib/components/index.ts, lib/hooks/index.ts, lib/utils/index.ts : sont-ils tous utilisés ?
2. Les fichiers non exportés et non importés ailleurs : candidats à la suppression
3. Ne supprime pas les fichiers de test (__tests__)
4. Produis une liste des fichiers potentiellement orphelins avant toute suppression
```

---

## Phase 7 : Tests et CI

### Prompt 7.1 – Tests et couverture

```
Vérifie la cohérence des tests :

1. Les tests dans __tests__/ correspondent-ils à des fichiers/routes existants ?
2. Supprime les tests pour des fonctionnalités supprimées
3. Vérifie que npm run test:run et npm run test:e2e passent après le nettoyage
```

### Prompt 7.2 – Workflows GitHub

```
Nettoie .github/workflows/ :

1. Garde : ci.yml, deploy.yml, test-coverage.yml (ou équivalents actifs)
2. Vérifie que les chemins et noms de jobs sont corrects
3. Simplifie README.md, SUMMARY.md, DEPLOY_OPTIONS.md : fusionne en un seul README des workflows si possible
```

---

## Phase 8 : Finalisation

### Prompt 8.1 – README principal

```
Mets à jour le README.md à la racine (ou crée-le s'il n'existe pas) :

1. Titre et courte description du projet
2. Prérequis (Node, PostgreSQL, Redis, etc.)
3. Installation rapide (clone, npm install, variables d'env, db:migrate)
4. Scripts principaux (dev, build, lastfm:import, etc.)
5. Lien vers la doc détaillée si nécessaire
6. Licence et crédits si pertinent
7. Pas de documentation exhaustive – garde-le concis pour les visiteurs du repo
```

### Prompt 8.2 – Vérification finale

```
Fais une vérification finale avant de considérer le nettoyage terminé :

1. npm run build : réussit
2. npm run test:run : réussit
3. npm run lint : aucune erreur
4. Aucun fichier .disabled, .bak, .old à la racine ou dans lib/
5. .gitignore à jour, pas de fichiers sensibles ou build committés
6. README à jour et professionnel
7. Liste les fichiers supprimés et les changements majeurs dans un résumé pour l'utilisateur
```

---

## Notes techniques

- **Prudence :** Toujours faire un commit ou une branche avant une phase de suppression massive.
- **Thème Switcher :** Si THEME_SWITCHER_AGENT_PROMPTS.md a servi pour une feature déjà implémentée, il peut être supprimé ou déplacé dans un dossier .cursor/prompts/ pour référence future.
- **Cursor rules :** Garde .cursorrules/ si tu utilises des règles Cursor pour le projet.
- **Documentation :** Mieux vaut un README court et clair qu’une doc dispersée et redondante.

---

## Commandes utiles

```bash
# Vérifier les scripts manquants
for script in $(node -e "console.log(Object.entries(require('./package.json').scripts).map(([k,v]) => v.match(/node scripts\/([^ ]+)/)?.[1]).filter(Boolean).join('\n'))"); do
  [ -f "scripts/$script" ] || echo "Missing: scripts/$script"
done

# Lister les dépendances
npm ls --depth=0

# Build et tests
npm run build && npm run test:run && npm run lint
```

---

## Résumé des phases

| Phase | Objectif |
|-------|----------|
| 0 | Audit initial – inventaire sans suppression |
| 1 | Fichiers .disabled et .example |
| 2 | Scripts |
| 3 | Documentation |
| 4 | Migrations |
| 5 | Configuration |
| 6 | Code mort et dépendances |
| 7 | Tests et CI |
| 8 | README et vérification finale |
