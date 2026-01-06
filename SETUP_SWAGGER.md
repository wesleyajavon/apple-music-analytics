# 🔧 Configuration Swagger/OpenAPI

Ce guide explique comment installer et configurer Swagger pour documenter vos routes API.

## 📦 Installation

Installez les dépendances nécessaires :

```bash
npm install --save-dev swagger-jsdoc @types/swagger-jsdoc
npm install swagger-ui-react
```

## 🚀 Utilisation

Une fois les dépendances installées :

1. **Démarrer le serveur de développement** :
   ```bash
   npm run dev
   ```

2. **Accéder à la documentation Swagger** :
   - Ouvrez votre navigateur à l'adresse : `http://localhost:3000/api-docs`
   - Vous verrez une interface Swagger UI interactive pour explorer et tester vos routes API

3. **Spécification OpenAPI JSON** :
   - La spécification OpenAPI est disponible à : `http://localhost:3000/api/swagger`
   - Vous pouvez utiliser cette URL pour intégrer avec d'autres outils

## 📝 Structure

- **`swagger.config.js`** : Configuration Swagger avec les schémas et métadonnées
- **`app/api/swagger/route.ts`** : Route API qui sert la spécification OpenAPI en JSON
- **`app/api-docs/page.tsx`** : Page Next.js qui affiche Swagger UI
- **Annotations dans `app/api/**/route.ts`** : Documentation Swagger directement dans vos routes

## ✏️ Ajouter de la Documentation à une Nouvelle Route

Pour documenter une nouvelle route API, ajoutez des annotations JSDoc au format Swagger :

```typescript
/**
 * @swagger
 * /api/ma-route:
 *   get:
 *     summary: Description courte
 *     description: Description détaillée
 *     tags:
 *       - NomDuTag
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *         description: Description du paramètre
 *     responses:
 *       200:
 *         description: Succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  // Votre code...
}
```

## 🎯 Routes Documentées

Les routes suivantes sont actuellement documentées :

- ✅ `GET /api/overview` - Statistiques d'aperçu
- ✅ `GET /api/genres` - Distribution des genres
- ✅ `GET /api/timeline` - Données de timeline
- ✅ `GET /api/network` - Réseau d'artistes
- ✅ `GET /api/listens` - Écoutes individuelles ou agrégées
- ⏳ `GET /api/replay` - Résumés Replay (à documenter)
- ⏳ `POST /api/replay/import` - Import Replay (à documenter)
- ⏳ `GET /api/lastfm` - Données Last.fm (à documenter)
- ⏳ `POST /api/lastfm/import` - Import Last.fm (à documenter)

## 🔍 Schémas Disponibles

Les schémas suivants sont définis dans `swagger.config.js` :

- `Error` - Format d'erreur standard
- `ListenDto` - Données d'écoute
- `OverviewStats` - Statistiques d'aperçu
- `GenreDistribution` - Distribution par genre
- `ArtistNetworkGraph` - Graphe du réseau d'artistes
- `ArtistNode` - Nœud d'artiste
- `ArtistEdge` - Arête de connexion

## 📚 Ressources

- [Documentation Swagger/OpenAPI](https://swagger.io/docs/)
- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI React](https://github.com/swagger-api/swagger-ui/tree/master/docs/usage/installation#npm)



