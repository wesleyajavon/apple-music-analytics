# Import Apple Music Play History (CSV → Database)

Ce document décrit le processus d'import des données Apple Music depuis un fichier CSV filtré vers la base de données. L’import sert à compléter les écarts de dates non couvertes par Last.fm.

## Prérequis

1. **Fichier CSV source** : `apple-music-play-history-filtered.csv` à la racine du projet (ou chemin personnalisé).
2. **Variable d’environnement** : `DATABASE_URL` définie dans `.env.local`.
3. **User ID** : identifiant de l’utilisateur pour lequel importer les écoutes.

## Étapes d’import

### 1. Filtrer le CSV par dates (optionnel)

Si le CSV Apple Music contient plus de données que nécessaire, filtrez d’abord par plage de dates :

```bash
npm run apple-music:filter
```

Ou avec des options :

```bash
node scripts/filter-apple-music-play-history.js \
  --input "/chemin/vers/Apple Music - Play History Daily Tracks.csv" \
  --start "2026-02-21" \
  --end "2026-03-04"
```

Le fichier filtré est généré à la racine du projet : `apple-music-play-history-filtered.csv`.

### 2. Importer le CSV filtré dans la base de données

```bash
node scripts/import-apple-music-csv.js --userId "VOTRE_USER_ID"
```

Ou via le script npm :

```bash
npm run apple-music:import -- --userId "VOTRE_USER_ID"
```

**Options :**

| Option    | Description                                                |
|-----------|------------------------------------------------------------|
| `--userId`| **Requis.** ID de l’utilisateur dans la table `User`.       |
| `--input` | Chemin vers le fichier CSV (par défaut : `apple-music-play-history-filtered.csv`). |
| `--dry-run` | Mode simulation : affiche le nombre d’écoutes qui seraient importées sans écrire en base. |

**Exemples :**

```bash
# Import avec fichier par défaut
node scripts/import-apple-music-csv.js --userId "clxxx123"

# Import avec fichier personnalisé
node scripts/import-apple-music-csv.js --userId "clxxx123" --input "./mon-filtre.csv"

# Simulation sans écriture en base
node scripts/import-apple-music-csv.js --userId "clxxx123" --dry-run
```

## Mapping CSV ↔ Base de données

### Structure du CSV Apple Music

| Colonne CSV              | Index | Exemple           | Utilisation                     |
|--------------------------|-------|-------------------|---------------------------------|
| Country                  | 0     | Belgium           | Non utilisé                     |
| Track Identifier         | 1     | 1434429909        | Non utilisé                     |
| Media type               | 2     | AUDIO             | Non utilisé                     |
| **Date Played**         | 3     | 20260221          | Date de l’écoute (YYYYMMDD)     |
| **Hours**               | 4     | "3, 19, 20" ou 22 | Heure(s) de l’écoute (0–23)     |
| Play Duration Milliseconds | 5  | 880890             | Non utilisé                     |
| End Reason Type          | 6     | NATURAL_END_OF_TRACK | Non utilisé                  |
| Source Type              | 7     | IPHONE            | Non utilisé                     |
| **Play Count**          | 8     | 4                 | Nombre d’écoutes à créer        |
| Skip Count              | 9     | 0                 | Non utilisé                     |
| Ignore For Recommendations | 10 | false           | Non utilisé                     |
| Track Reference         | 11    | 1434429909        | Non utilisé                     |
| **Track Description**   | 12    | "Artist - Title"  | Artiste et titre de la piste    |

### Tables de la base de données

#### Artist

- **Recherche avant création** : par `nameLower` (insensible à la casse).
- **Création** : `name`, `nameLower`.
- **Mise à jour** : si un artiste existe déjà (même nom en minuscules), seul `name` est mis à jour.

#### Track

- **Recherche avant création** : par `artistId` + `titleLower`.
- **Création** : uniquement si la piste n’existe pas déjà (même artiste + même titre).
- **Champs** : `title`, `titleLower`, `artistId`.

#### Listen

- **Source** : toujours `"lastfm"` pour garder la cohérence avec le reste de l’app.
- **playedAt** : construit à partir de :
  - **Date Played** (YYYYMMDD) ;
  - **Hours** : une ou plusieurs heures (ex. `"3, 19, 20"`) ;
  - **Minutes et secondes** : valeurs aléatoires (le CSV ne fournit que date et heure).
- **Détection des doublons** : `userId`, `trackId`, `playedAt`, `source` (les doublons sont ignorés).

### Parsing du champ "Track Description"

Format attendu : `"Artist name - Track name"` (séparation sur le premier ` - `).

Exemples :

- `"Fally Ipupa - Biçarbonate"` → Artist: `Fally Ipupa`, Track: `Biçarbonate`
- `"Travis Scott - Nightcrawler (feat. Swae Lee & Chief Keef)"` → Artist: `Travis Scott`, Track: `Nightcrawler (feat. Swae Lee & Chief Keef)`
- `"Grupo Niche - México, México"` → Artist: `Grupo Niche`, Track: `México, México`

## Règles de traitement

1. **Listen** : création uniquement si aucune écoute identique n’existe (`userId`, `trackId`, `playedAt`, `source`).
2. **Track** : création uniquement si la piste n’existe pas déjà pour cet artiste (comparaison insensible à la casse).
3. **Artist** : création si aucun artiste avec le même `nameLower` n’existe ; sinon réutilisation.
4. **Heure manquante** : si la colonne Hours contient plusieurs valeurs (ex. `"3, 19, 20"`), les écoutes sont réparties entre ces heures (ex. Play Count = 4 → 4 écoutes réparties sur 3, 19 et 20).
5. **Minutes/secondes** : générées aléatoirement pour compléter l’instant de l’écoute.

## Trouver le User ID

Via Prisma Studio :

```bash
npm run db:studio
```

Ou via une requête SQL/Prisma :

```ts
const user = await prisma.user.findFirst({ where: { email: "votre@email.com" } });
console.log(user?.id);
```

## Cas d’usage : compléter les jours vides

Pour remplir uniquement les jours sans aucune écoute (par ex. entre la première date en DB et la fin du CSV), voir :

**[APPLE_MUSIC_BACKFILL_EMPTY_DAYS.md](./APPLE_MUSIC_BACKFILL_EMPTY_DAYS.md)**

---

## Dépannage

**`DATABASE_URL non trouvée`**  
Vérifiez que `.env.local` existe et contient `DATABASE_URL`.

**`Utilisateur non trouvé`**  
Le `userId` doit correspondre à un enregistrement existant dans la table `User`.

**`Fichier introuvable`**  
Vérifiez que le CSV est bien à la racine du projet (`apple-music-play-history-filtered.csv`) ou utilisez `--input` pour indiquer le bon chemin.
