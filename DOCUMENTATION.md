# 📚 Documentation du Projet

Ce document explique comment accéder et générer la documentation du projet.

## 🎯 Types de Documentation

### 1. Documentation JSDoc dans l'IDE

La documentation JSDoc est visible directement dans votre IDE (Cursor/VS Code) :

- **Survol (Hover)** : Placez votre curseur sur une fonction pour voir sa documentation
- **Autocomplétion** : Quand vous tapez une fonction, IntelliSense affiche la documentation
- **Go to Definition** : Cmd/Ctrl + Click pour voir la définition complète

**Exemple** : Dans `lib/services/artist-network.ts`, survolez `buildArtistNetworkGraph` pour voir sa documentation complète.

### 2. TypeDoc - Documentation HTML

TypeDoc génère une documentation HTML statique à partir de vos commentaires JSDoc.

#### Installation

```bash
npm install --save-dev typedoc
```

Une fois installé, le fichier de configuration `typedoc.json` est déjà créé à la racine du projet.

#### Génération de la documentation

```bash
npm run docs:generate
```

Cela créera un dossier `docs/` avec un site HTML statique. Ouvrez `docs/index.html` dans votre navigateur.

#### Scripts disponibles

- `npm run docs:generate` - Génère la documentation dans le dossier `docs/`
- `npm run docs:clean` - Supprime le dossier de documentation

Après génération, ouvrez `docs/index.html` dans votre navigateur pour voir la documentation.

### 3. Swagger/OpenAPI pour les Routes API

Pour documenter vos routes API REST (`/api/*`), vous avez plusieurs options :

#### Option A : swagger-jsdoc + swagger-ui-react (✅ Configuré)

Utilise `swagger-jsdoc` pour générer OpenAPI à partir de commentaires JSDoc dans vos routes, et `swagger-ui-react` pour l'interface.

**Installation** :
```bash
npm install --save-dev swagger-jsdoc @types/swagger-jsdoc
npm install swagger-ui-react
```

**Configuration** : Le fichier `swagger.config.js` est déjà créé à la racine du projet.

**Utilisation** :
- Accédez à `http://localhost:3000/api-docs` pour voir la documentation interactive
- La spécification OpenAPI JSON est disponible à `http://localhost:3000/api/swagger`

**Documentation complète** : Voir `SETUP_SWAGGER.md` pour plus de détails.

#### Option B : Swagger JSDoc (Manuel)

Utilisez `swagger-jsdoc` pour générer OpenAPI à partir de commentaires JSDoc dans vos routes.

**Installation** :
```bash
npm install --save-dev swagger-jsdoc swagger-ui-express
```

#### Option C : next-api-doc (Simple)

Une solution simple pour Next.js qui scanne automatiquement vos routes.

**Installation** :
```bash
npm install --save-dev next-api-doc
```

## 📖 Fichiers Documentés

Les fonctions suivantes ont une documentation JSDoc complète :

### Services (`lib/services/`)
- `artist-network.ts` : `buildArtistNetworkGraph`
- `listening.ts` : `getListens`, `getDailyAggregatedListens`, `getWeeklyAggregatedListens`, `getMonthlyAggregatedListens`, `getAggregatedListens`, `getGenreDistribution`, `getOverviewStats`
- `listening-aggregation.ts` : `executeDateAggregation`
- `lastfm.ts` : `importLastFmTracks`
- `replay.ts` : `importReplayYearly`, `getReplayYearlySummaries`, `getReplayYearlySummary`

### Routes API (`app/api/`)
Les routes API ont des commentaires JSDoc basiques. Pour une documentation complète avec Swagger, considérez l'une des options ci-dessus.

## 🔧 Recommandations

1. **Pour le développement quotidien** : Utilisez l'IntelliSense de votre IDE
2. **Pour partager la documentation** : Générez la documentation TypeDoc avec `npm run docs:generate`
3. **Pour documenter les APIs REST** : Utilisez Swagger UI (déjà configuré) - voir `SETUP_SWAGGER.md`

## 📝 Ajouter de la Documentation

Pour ajouter de la documentation JSDoc à une nouvelle fonction :

```typescript
/**
 * Description de la fonction
 * 
 * @param param1 - Description du paramètre 1
 * @param param2 - Description du paramètre 2 (optionnel)
 * 
 * @returns Description de la valeur de retour
 * 
 * @example
 * ```typescript
 * const result = maFonction('param1', 'param2');
 * ```
 */
export async function maFonction(param1: string, param2?: string): Promise<Result> {
  // ...
}
```

