# Sources de Données - Apple Music Analytics

Ce document explique d'où viennent les données pour votre MVP et comment les importer.

## 📊 Sources de Données Disponibles

Votre application supporte actuellement **deux sources de données** :

### 1. 🎵 Last.fm

**Statut** : ✅ Prêt à l'emploi (utilise l'API Last.fm réelle)

**Fonctionnalités** :
- Récupération de l'historique d'écoute depuis l'API Last.fm réelle
- Import automatique dans la base de données
- Fallback vers données mockées si l'API n'est pas configurée (développement uniquement)

**Configuration** :
1. Créez un compte sur [https://www.last.fm/api/account/create](https://www.last.fm/api/account/create)
2. Créez une application API
3. Ajoutez vos clés dans `.env.local` :
   ```env
   LASTFM_API_KEY="votre_api_key"
   LASTFM_API_SECRET="votre_api_secret"
   ```

**Import des données** :
- **Endpoint** : `POST /api/lastfm/import`
- **Body** :
  ```json
  {
    "userId": "user_123",
    "username": "votre_username_lastfm",  // optionnel
    "limit": 50,                          // optionnel (défaut: 50, max: 200)
    "page": 1,                            // optionnel (défaut: 1)
    "from": 1609459200,                   // optionnel (timestamp Unix)
    "to": 1640995200                      // optionnel (timestamp Unix)
  }
  ```

**Exemple avec curl** :
```bash
curl -X POST http://localhost:3000/api/lastfm/import \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "username": "votre_username",
    "limit": 200
  }'
```

### 2. 🍎 Apple Music Replay

**Statut** : ✅ Prêt à l'emploi

**Fonctionnalités** :
- Import manuel des résumés annuels Apple Music Replay
- Statistiques détaillées par année (top artistes, top titres, top albums)
- Comparaison entre années

**Import des données** :
- **Endpoint** : `POST /api/replay/import`
- **Body** :
  ```json
  {
    "userId": "user_123",
    "data": {
      "year": 2024,
      "totalPlayTime": 3600000,
      "totalPlays": 5000,
      "topArtists": [
        {
          "name": "Artiste 1",
          "rank": 1,
          "playCount": 150,
          "imageUrl": "https://..."
        }
      ],
      "topTracks": [
        {
          "title": "Titre 1",
          "artistName": "Artiste 1",
          "rank": 1,
          "playCount": 200,
          "duration": 240
        }
      ],
      "topAlbums": [
        {
          "name": "Album 1",
          "artistName": "Artiste 1",
          "rank": 1,
          "playCount": 180
        }
      ]
    }
  }
  ```

**Comment obtenir les données Apple Music Replay** :
1. Allez sur [https://music.apple.com/replay](https://music.apple.com/replay)
2. Sélectionnez l'année souhaitée
3. Exportez les données (format JSON) ou copiez-les manuellement
4. Utilisez l'endpoint d'import pour les charger

## 🚀 Options pour Démarrer avec des Données

### Option 1 : Données de Test (Recommandé pour le développement)

Utilisez le script de seed pour générer des données de test réalistes :

```bash
npm run db:seed
```

Ce script génère :
- 1 utilisateur de test
- ~50 artistes de différents genres
- ~250 titres
- ~3000+ écoutes sur 3 mois (avec distribution réaliste)

### Option 2 : Import Last.fm (Recommandé pour la production)

1. Configurez vos clés Last.fm dans `.env.local`
2. Créez un utilisateur dans la base de données :
   ```bash
   npm run user:create
   ```
3. Importez vos données (le script gère automatiquement la pagination) :
   ```bash
   npm run lastfm:import -- --userId "VOTRE_USER_ID" --username "VOTRE_USERNAME_LASTFM"
   ```

**Alternative** : Nettoyer et réensemencer avec vos données Last.fm :
   ```bash
   npm run db:reseed:lastfm -- --userId "VOTRE_USER_ID" --username "VOTRE_USERNAME_LASTFM" --keep-user
   ```

### Option 3 : Import Apple Music Replay

1. Récupérez vos données depuis [Apple Music Replay](https://music.apple.com/replay)
2. Formatez-les selon le schéma attendu
3. Importez via `POST /api/replay/import`

## 📝 Structure des Données dans la Base

### Table `Listen`
- Contient toutes les écoutes individuelles
- Champ `source` : `"lastfm"` ou `"apple_music_replay"`
- Liée à `User`, `Track` (qui est lié à `Artist`)

### Table `ReplayYearly`
- Contient les résumés annuels Apple Music Replay
- Liée à `ReplayTopArtist`, `ReplayTopTrack`, `ReplayTopAlbum`

## 🔄 Synchronisation Continue

**Actuellement** : L'import est manuel. Pour automatiser :

1. **Last.fm** : Créez un cron job ou une fonction serverless qui appelle périodiquement `/api/lastfm/import`
2. **Apple Music Replay** : Les données sont annuelles, donc un import manuel par an est suffisant

## 🎯 Recommandations pour le MVP

1. **Développement** : Utilisez `npm run db:seed` pour avoir des données rapidement
2. **Production** : 
   - Configurez Last.fm et importez vos données historiques
   - Importez vos Apple Music Replay annuels
   - Mettez en place une synchronisation automatique pour Last.fm (optionnel)

## 📚 Endpoints API Disponibles

- `GET /api/lastfm` - Récupérer les données Last.fm (sans import)
- `POST /api/lastfm/import` - **Importer les données Last.fm dans la base** ✨
- `POST /api/replay/import` - Importer les données Apple Music Replay
- `GET /api/listens` - Récupérer les écoutes depuis la base de données
- `GET /api/timeline` - Récupérer les données agrégées pour la timeline
- `GET /api/overview` - Statistiques générales
- `GET /api/genres` - Répartition par genres
- `GET /api/network` - Réseau d'artistes
- `GET /api/replay` - Résumés Replay disponibles

## ⚠️ Notes Importantes

1. **Déduplication** : L'import Last.fm évite les doublons en vérifiant `userId`, `trackId`, `playedAt`, et `source`
2. **API Réelle** : L'application utilise l'API Last.fm réelle pour récupérer vos vraies données. Si l'API n'est pas configurée, un fallback vers des données mockées est utilisé (développement uniquement)
3. **Performance** : Les imports sont effectués par lots de 50 tracks avec des transactions pour garantir la cohérence des données et éviter les timeouts
4. **Limites** : Last.fm API limite à 200 tracks par page. Les scripts officiels gèrent automatiquement la pagination pour importer tout l'historique

