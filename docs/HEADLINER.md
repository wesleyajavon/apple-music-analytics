# Headliner — cadrage artistes / featuring

**Problème** : aujourd’hui chaque variante de crédit (`Artiste`, `Artiste feat. X`, `X & Artiste`, …) crée un `Artist` distinct (`name` unique côté Prisma). Les tops et agrégats **sous-comptent** un même artiste réel et fragmentent l’historique.

**Objectif** : regrouper les écoutes sous un **artiste canonique** (headliner) tout en gardant la possibilité d’exposer les collaborations quand le produit le demande.

---

## Axes de solution (du léger au lourd)

### A — Parsing heuristique à l’ingestion (sans migration schéma)

- Extraire un **crédit principal** depuis la chaîne brute : marqueurs `feat.`, `ft.`, `featuring`, `with`, `&`, `x`, `×`, `vs`, parenthèses, etc.
- Normaliser casse / espaces ; option : translittération minimale pour comparaisons.
- **Pros** : peu de risque structurel, effet rapide sur les imports futurs.
- **Cons** : faux positifs (groupes dont le nom contient « & »), langues multiples, titres complexes.

**Livrable typique** : module `lib/.../parse-artist-credit.ts` + tests sur un corpus de chaînes réelles (Last.fm + CSV Apple Music).

### B — Alias / fusion explicite (`canonicalArtistId` ou table `ArtistAlias`)

- Conserver le libellé **affiché** sur la piste si besoin ; rattacher tout le monde à un **`Artist` canonique**.
- Schéma possible :
  - `Artist.canonicalArtistId` (auto-référence, nullable) **ou**
  - table `ArtistAlias { rawNameLower, canonicalArtistId }` pour les corrections sans toucher aux noms d’origine.
- **Pros** : correction fine des cas où le parsing échoue ; évolutif vers une UI « fusionner ces artistes ».
- **Cons** : migration + scripts de backfill ; décision sur ce qui est affiché dans l’UI (nom brut vs canonique).

### C — Identifiants externes (`mbid` déjà sur `Artist` / `Track`)

- Résoudre / enrichir via MusicBrainz (ou métadonnées Last.fm quand disponibles) pour **fusionner par ID** plutôt que par texte.
- **Pros** : robuste quand l’ID est fiable.
- **Cons** : couverture incomplète, quotas API, enregistrements ambigus.

### D — Modèle crédits multiples (refonte)

- `Track` → plusieurs lignes `TrackArtist` avec rôle (`primary`, `featured`, `remixer`, …).
- Agrégations : métrique « headliner only » vs « présence (avec poids) ».
- **Pros** : modèle fidèle, stats collaborations propres.
- **Cons** : migration large, adaptation de tous les imports et requêtes.

### E — Normalisation en lot + garde-fous (**base déjà remplie**)

Quand la base contient déjà des `Artist` / `Track` / `Listen`, les phases **A–D** ne suffisent pas : il faut un **script de maintenance** (ou job one-shot) qui rattrape l’existant.

**Comportement typique**

1. **Détection** — Repérer les paires / groupes suspects : même préfixe + marqueur `feat.` / `ft.` / `&` / etc., ou résultat du **même parser qu’en A** appliqué aux noms déjà stockés.
2. **Proposition** — Sortie **dry-run** (CSV ou log) : « fusionner `Artist` A → canonique B », avec comptage de `Track` / `Listen` impactés.
3. **Application** — Après validation humaine ou règles sûres :
   - réattribuer `Track.artistId` vers l’`Artist` canonique **et/ou**
   - remplir `canonicalArtistId` (si tu as choisi le modèle **B**) sans casser l’affichage du crédit brut si tu le conserves ailleurs.
4. **Nettoyage** — Supprimer ou marquer les `Artist` orphelins (après vérif qu’aucun `Track` ne pointe encore dessus).

**Garde-fous obligatoires**

- **Dry-run par défaut** ; mode `--apply` explicite.
- **Sauvegarde / snapshot BDD** avant premier apply réel.
- **Idempotence** : relancer le script ne doit pas dupliquer ni casser les contraintes (`@@unique([title, artistId])` sur `Track` : prévoir fusion de `Track` doublons ou stratégie de « winner »).
- **Journal** : liste des fusions effectuées + rollback documenté (au minimum export des `id` modifiés).

**Livrable typique** : `scripts/headliner-backfill-artists.ts` (ou équivalent) + doc d’exécution dans ce fichier ou `README` scripts.

---

## Métriques produit à trancher tôt

| Vue | Comportement suggéré |
|-----|----------------------|
| **Top artistes (défaut)** | Compte par **artiste canonique / primary** par écoute. |
| **Collaborations** | Option ou onglet : inclure les featuring avec un **poids** (ex. 0,25–0,5) ou comptage séparé. |
| **Fiche morceau** | Afficher le crédit **brut** source si tu veux la fidélité visuelle. |

---

## Ordre de mise en œuvre recommandé

1. **A** sur le chemin d’import (Last.fm + CSV) + tests.
2. **B** minimal (alias ou `canonicalArtistId`) pour corriger les résidus et permettre des fusions manuelles / scriptées.
3. **E** dès qu’il y a des données en production ou un gros historique local : **backfill** avec dry-run, puis apply après revue (souvent **juste après B** si la migration ajoute `canonicalArtistId`).
4. **C** en enrichissement progressif (job async ou à la volée avec cache).
5. **D** seulement si le produit exige remixes / rôles multiples de première classe.

---

## Références code actuel

- Schéma : `Artist.name` / `nameLower` uniques, `Track.artistId` — `prisma/schema.prisma`.
- Toute nouvelle clé d’unicité pour `Track` devra tenir compte d’un éventuel **artiste canonique** vs **titre** pour éviter les doublons de morceaux.

---

## Prompt agent (brouillon)

> Implémente la phase **A** (parser crédit principal + featured optionnel) pour les imports existants, avec tests Vitest sur un fichier de fixtures. Ne change pas encore le schéma Prisma ; documente les hooks où brancher **B** ensuite.

> Variante **base déjà remplie** : après **B**, ajoute le script **E** (dry-run par défaut) qui propose des fusions `Artist` → canonique et met à jour `Track` / `Listen` en gérant les collisions sur `unique_title_artist`.
