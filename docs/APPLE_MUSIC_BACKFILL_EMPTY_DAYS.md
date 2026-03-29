# Compléter les jours vides avec Apple Music CSV

Ce document décrit le processus pour **remplir les jours sans aucune écoute** en important les données du fichier Apple Music Play History. La plage va de la **première date en base** jusqu’à la **dernière date du fichier CSV**.

## Objectif

- Couvrir la plage : **date la plus ancienne en DB** → **dernière date du CSV**
- N’importer que les écoutes dont le **jour est vide** en base (aucune écoute existante)
- Exemple : si le 25 janvier 2026 n’a aucune écoute, on le remplit avec les données Apple Music ; les jours déjà remplis (Last.fm, etc.) sont ignorés

## Prérequis

- Fichier principal : `Apple Music - Play History Daily Tracks.csv` (export Apple)
- `DATABASE_URL` dans `.env.local`
- User ID de l’utilisateur
- `npm run db:studio` pour trouver le User ID

## Processus en 2 étapes

### Étape 1 : Filtrer le CSV par plage dynamique

Filtrer le CSV pour garder uniquement les lignes entre la **première date en DB** et la **dernière date du CSV**.

```bash
node scripts/filter-apple-music-play-history.js \
  --start-from-db \
  --end-from-csv \
  --userId "VOTRE_USER_ID"
```

**Options utilisées :**

| Option           | Description                                                          |
|------------------|----------------------------------------------------------------------|
| `--start-from-db` | Utilise la date de la première écoute en DB (nécessite `--userId`)   |
| `--end-from-csv`  | Utilise la date maximale trouvée dans le fichier CSV                 |
| `--userId`        | ID utilisateur (requis pour `--start-from-db`)                       |
| `--input`         | Chemin du CSV principal (par défaut : chemin Apple dans Downloads)  |
| `--output`        | Fichier de sortie (par défaut : `apple-music-play-history-backfill.csv`) |
| `--dry-run`       | Affiche la plage et le nombre de lignes sans écrire le fichier      |

**Sortie :**  
Un fichier filtré est créé à la racine du projet : `apple-music-play-history-backfill.csv`.

---

### Étape 2 : Importer en ne remplissant que les jours vides

Importer le fichier filtré en ne créant des écoutes **que** pour les jours qui n’en ont aucune.

```bash
node scripts/import-apple-music-csv.js \
  --userId "VOTRE_USER_ID" \
  --input "apple-music-play-history-backfill.csv" \
  --only-empty-days
```

**Options utilisées :**

| Option            | Description                                                       |
|-------------------|-------------------------------------------------------------------|
| `--userId`         | ID utilisateur (requis)                                          |
| `--input`          | Fichier filtré (par défaut : `apple-music-play-history-filtered.csv`) |
| `--only-empty-days`| N’importer que les écoutes dont le jour est vide en DB           |
| `--dry-run`        | Simule l’import sans écrire en base                              |

Avec `--only-empty-days`, le script :

1. Charge toutes les dates qui ont déjà au moins une écoute pour l’utilisateur
2. Pour chaque écoute du CSV, vérifie si le jour est déjà rempli
3. Ignore les écoutes dont le jour a déjà des données
4. Importe uniquement les écoutes pour les jours encore vides

---

## Récapitulatif du flux

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Filtrage                                                    │
│  CSV principal → [--start-from-db, --end-from-csv] → backfill   │
│  Plage : 1re date DB → dernière date CSV                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Import                                                      │
│  backfill.csv → [--only-empty-days] → DB                        │
│  Seulement les jours sans aucune écoute                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Exemple complet

```bash
# 1. Filtrer le CSV (plage : 21 déc 2025 → dernière date du fichier)
node scripts/filter-apple-music-play-history.js \
  --start-from-db \
  --end-from-csv \
  --userId "cmjqaoqjy00006gfntmiw5ryb"

# 2. Importer uniquement les jours vides
node scripts/import-apple-music-csv.js \
  --userId "cmjqaoqjy00006gfntmiw5ryb" \
  --input "apple-music-play-history-backfill.csv" \
  --only-empty-days
```

---

## Simulation avant import

Pour vérifier ce qui serait importé sans toucher à la base :

```bash
node scripts/import-apple-music-csv.js \
  --userId "VOTRE_USER_ID" \
  --input "apple-music-play-history-backfill.csv" \
  --only-empty-days \
  --dry-run
```

---

## Fichiers concernés

| Fichier                               | Rôle                                                   |
|--------------------------------------|--------------------------------------------------------|
| `Apple Music - Play History Daily Tracks.csv` | Fichier source (export Apple)                  |
| `apple-music-play-history-backfill.csv`       | Fichier filtré (plage 1 : après les données)  |
| `apple-music-play-history-backfill-historical.csv` | Fichier filtré (plage 2 : avant les données) |
| `scripts/filter-apple-music-play-history.js` | Script de filtrage                           |
| `scripts/import-apple-music-csv.js`           | Script d’import                               |

---

# Plage 2 : Avant les données (historique)

## Objectif

- Couvrir la plage : **première date du CSV** (ex. 20180725) → **première date en DB** (ex. 20 ou 21 décembre 2025)
- Remplir les jours vides pour toute l'historique Apple Music avant le début des données Last.fm en DB

## Étape 1 : Filtrer le CSV (plage historique)

```bash
node scripts/filter-apple-music-play-history.js \
  --start-from-csv \
  --end-from-db \
  --userId "VOTRE_USER_ID"
```

**Options :**

| Option            | Description                                           |
|-------------------|-------------------------------------------------------|
| `--start-from-csv`| Utilise la date minimale du fichier CSV (1re ligne)  |
| `--end-from-db`   | Utilise la date de la première écoute en DB           |
| `--userId`        | ID utilisateur (requis pour `--end-from-db`)          |
| `--dry-run`       | Affiche la plage et le nombre de lignes sans écrire  |

**Sortie :**  
`apple-music-play-history-backfill-historical.csv` à la racine du projet.

## Étape 2 : Importer (jours vides uniquement)

```bash
node scripts/import-apple-music-csv.js \
  --userId "VOTRE_USER_ID" \
  --input "apple-music-play-history-backfill-historical.csv" \
  --only-empty-days
```

## Dry-run complet (recommandé avant import)

```bash
# 1. Filtrage en mode dry-run
node scripts/filter-apple-music-play-history.js \
  --start-from-csv \
  --end-from-db \
  --userId "VOTRE_USER_ID" \
  --dry-run

# 2. Exécuter le filtrage (sans --dry-run)
node scripts/filter-apple-music-play-history.js \
  --start-from-csv \
  --end-from-db \
  --userId "VOTRE_USER_ID"

# 3. Import en mode dry-run
node scripts/import-apple-music-csv.js \
  --userId "VOTRE_USER_ID" \
  --input "apple-music-play-history-backfill-historical.csv" \
  --only-empty-days \
  --dry-run

# 4. Exécuter l'import
node scripts/import-apple-music-csv.js \
  --userId "VOTRE_USER_ID" \
  --input "apple-music-play-history-backfill-historical.csv" \
  --only-empty-days
```

---

## Erreurs "Server has closed the connection"

Avec Neon (ou une base serverless), de longues transactions peuvent provoquer des coupures. Si tu observes des centaines d’erreurs de ce type, relance l’import avec `--resilient` :

```bash
node scripts/import-apple-music-csv.js \
  --userId "VOTRE_USER_ID" \
  --input "apple-music-play-history-backfill-historical.csv" \
  --only-empty-days \
  --resilient
```

Le mode `--resilient` traite un enregistrement à la fois sans transaction longue (plus lent, mais plus robuste). Les doublons sont automatiquement ignorés.

---

## Vérifier la capacité de la base avant un gros import

Avant d'importer des centaines de milliers d'écoutes, vérifiez que la base a assez d'espace :

```bash
# Après un dry-run qui affiche "272250 écoutes seraient importées"
node scripts/check-db-capacity.js --listens 272250
```

Le script affiche :
- la taille actuelle de la base et des tables Listen, Track, Artist ;
- une estimation de l'espace pour l'import ;
- le total projeté et une alerte en cas de risque de dépassement (ex. plan Neon Free ~0.5 GB).

---

## Voir aussi

- [APPLE_MUSIC_CSV_IMPORT.md](./APPLE_MUSIC_CSV_IMPORT.md) – Import CSV générique et mapping des colonnes
