# Documentation API

Référence des endpoints de l'application Apple Music Analytics.

## Paramètres communs

La plupart des endpoints acceptent ces paramètres de requête :

| Paramètre | Type | Description |
|-----------|------|-------------|
| `startDate` | string (YYYY-MM-DD) | Date de début (optionnel) |
| `endDate` | string (YYYY-MM-DD) | Date de fin (optionnel) |
| `userId` | string | ID utilisateur (optionnel) |

---

## Timeline

### GET `/api/timeline`

Données agrégées pour les graphiques temporels.

**Paramètres** : `startDate`, `endDate`, `period` (day \| week \| month), `userId`

**Exemple** : `GET /api/timeline?startDate=2024-01-01&endDate=2024-01-31&period=week`

---

## Vue d'ensemble

### GET `/api/overview`

Statistiques globales (total écoutes, artistes uniques, titres uniques, temps total).

**Paramètres** : `startDate`, `endDate`, `userId`

---

## Last.fm

### GET `/api/lastfm`

Récupère l'historique Last.fm (API réelle ou mock si non configuré).

**Paramètres** :
- `username` : nom d'utilisateur Last.fm
- `limit` : pistes par page (défaut: 50, max: 200)
- `page` : numéro de page (défaut: 1)
- `from`, `to` : timestamps Unix (optionnel)
- `format` : `normalized` \| `raw` (défaut: normalized)

### POST `/api/lastfm/import`

Importe les données Last.fm dans la base.

**Body** :
```json
{
  "userId": "user_123",
  "username": "lastfm_username",
  "limit": 200,
  "page": 1,
  "from": 1704067200,
  "to": 1735689600
}
```

---

## Apple Music Replay

### GET `/api/replay`

Liste les résumés Replay disponibles.

**Paramètres** : `userId`

### POST `/api/replay/import`

Importe un résumé annuel Apple Music Replay.

**Body** :
```json
{
  "userId": "user_123",
  "data": {
    "year": 2024,
    "totalPlayTime": 3600000,
    "totalPlays": 5000,
    "topArtists": [...],
    "topTracks": [...],
    "topAlbums": [...]
  }
}
```

---

## Genres

### GET `/api/genres`

Répartition des écoutes par genre.

**Paramètres** : `startDate`, `endDate`, `userId`

### GET `/api/genres/trends`

Évolution des genres dans le temps.

**Paramètres** : `startDate`, `endDate`, `userId`

---

## Artistes

### GET `/api/artists`

Top artistes par nombre d'écoutes.

**Paramètres** : `startDate`, `endDate`, `userId`, `limit`

### GET `/api/artists/trends`

Tendances des artistes dans le temps.

**Paramètres** : `startDate`, `endDate`, `userId`

---

## Réseau d'artistes

### GET `/api/network`

Données du graphe de connexions entre artistes.

**Paramètres** : `startDate`, `endDate`, `userId`

---

## Analyse temporelle

### GET `/api/temporal-analysis`

Écoutes par heure et jour de la semaine.

**Paramètres** : `startDate`, `endDate`, `userId`

---

## Prédictions

### GET `/api/predictions/listening-habit`

Prédiction du créneau horaire et genre les plus probables pour aujourd'hui.

**Paramètres** : `userId`

---

## Analytics IA

### GET `/api/analytics/taste-evolution`

Évolution du profil de goûts dans le temps.

**Paramètres** : `userId`

### POST `/api/ai/insights`

Génère des insights en langage naturel à partir des analytics. Requiert `GROQ_API_KEY`.

**Body** : analytics agrégés (genres, heures, top artistes, évolution)

### POST `/api/ai/taste-profile`

Profil de goûts musical. Requiert `GROQ_API_KEY`.

---

## Écoutes

### GET `/api/listens`

Liste des écoutes avec pagination.

**Paramètres** : `startDate`, `endDate`, `userId`, `limit`, `offset`

---

## Export

### GET `/api/export/listens`

Export CSV des écoutes.

**Paramètres** : `startDate`, `endDate`, `userId`, `format` (csv)

### GET `/api/export/stats`

Export des statistiques.

**Paramètres** : `startDate`, `endDate`, `userId`

### GET `/api/export/report`

Rapport PDF annuel.

**Paramètres** : `year`, `userId`
