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

---

## Plage de dates

### GET `/api/date-range`

Retourne la plage complète des écoutes en base (dates min et max de `playedAt`). Utilisée notamment lorsque le filtre « tout » est sélectionné pour les insights IA et le profil de goûts, afin d’utiliser tout l’historique plutôt qu’une fenêtre par défaut (ex. 30 jours).

**Paramètres** : `userId` (optionnel) — si absent, la plage est calculée sans filtrer par utilisateur (selon la logique métier du service d’écoute).

**Réponse** : objet JSON avec `startDate` et `endDate` au format `YYYY-MM-DD`, ou `{ "startDate": null, "endDate": null }` s’il n’y a aucune écoute correspondante.

**Exemple** : `GET /api/date-range?userId=user_123`

---

## Apple Music Replay

### GET `/api/replay`

Liste tous les résumés annuels Replay disponibles pour un utilisateur (données enrichies : top artistes, titres, albums, etc., tri par année décroissante).

**Paramètres** : `userId` (optionnel) — si le paramètre est absent, l’implémentation utilise actuellement l’identifiant `default_user` (comportement à aligner avec l’auth lorsque celle-ci sera branchée).

**Exemple** : `GET /api/replay?userId=user_123`

### POST `/api/replay/import`

Importe un résumé annuel Apple Music Replay pour un utilisateur. Crée ou remplace l’entrée pour l’année concernée (transaction côté service).

**Body** (JSON) :

| Champ | Type | Description |
|-------|------|-------------|
| `userId` | string | Obligatoire. Identifiant utilisateur. |
| `data` | objet | Obligatoire. Résumé annuel au format `ReplayYearlyInput` (voir ci-dessous). |

Structure attendue pour `data` :

- `year` (number), `totalPlayTime` (secondes), `totalPlays` (number)
- `topArtists` : tableau d’objets `{ name, playCount, rank, imageUrl? }`
- `topTracks` : tableau d’objets `{ title, artistName, playCount, rank, duration? }`
- `topAlbums` : tableau d’objets `{ name, artistName, playCount, rank, imageUrl? }`

**Réponse** (succès) : `{ "message": "Replay data imported successfully", "replayYearlyId": "<id>" }`

**Erreurs** : en cas d’échec de validation ou d’import, réponse d’erreur avec détails (`validationErrors`, `errors` selon le cas).

**Exemple** :

```json
{
  "userId": "user_123",
  "data": {
    "year": 2024,
    "totalPlayTime": 360000,
    "totalPlays": 1000,
    "topArtists": [{ "name": "Artiste", "playCount": 100, "rank": 1 }],
    "topTracks": [{ "title": "Titre", "artistName": "Artiste", "playCount": 50, "rank": 1 }],
    "topAlbums": [{ "name": "Album", "artistName": "Artiste", "playCount": 40, "rank": 1 }]
  }
}
```

---

## Diagnostic Sentry

### GET `/api/test-sentry-error`

Route de test : déclenche une erreur serveur intentionnelle, l’envoie à Sentry via `captureException`, puis renvoie une réponse HTTP 500 avec un corps JSON `{ "error": "Test error for Sentry" }`.

**Paramètres** : aucun.

**Remarques sécurité** :

- À réserver aux environnements de développement ou de préproduction, ou à protéger fortement en production (pare-feu, authentification, désactivation du déploiement de la route).
- Un appel réussi génère du bruit dans Sentry (événements, alertes) et peut polluer les métriques d’erreurs réelles.
- Ne pas exposer publiquement sans contrôle : risque d’abus pour saturer les quotas Sentry ou déclencher des alertes inutiles.
- En production, préférer désactiver la route, la retirer du build, ou la garder derrière un contrôle d’accès explicite.
