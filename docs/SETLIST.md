# Setlist — page dashboard **Tracks** (cadrage produit)

**Statut** : idée documentée — implémentation à planifier.

**Constat** : le dashboard expose déjà des vues dédiées pour **artistes** et **genres** (tops, tendances dans le temps). Les **morceaux** (`Track`) sont au centre du modèle (`Listen` → `Track` → `Artist`) mais n’ont pas d’équivalent « première classe » dans la navigation.

**Objectif** : ajouter **`/dashboard/tracks`** (avec i18n comme le reste), **cohérent** avec le niveau de détail et le ton des pages **Artists** et **Genres** : tops, filtres temporels, et **tendances** (jour / semaine / mois ou granularité alignée sur l’existant).

---

## Périmètre fonctionnel (brouillon)

- **Vue d’ensemble** : top titres par nombre d’écoutes (période sélectionnable, comme sur les autres pages).
- **Tendances** : évolution des écoutes dans le temps pour les tracks (ou sous-ensemble « top N ») — réutiliser les patterns graphiques / API déjà utilisés pour artistes et genres pour garder une **expérience homogène**.
- **Contexte** : afficher **artiste** (et genre du track si dispo) pour chaque ligne — lien vers les pages existantes si pertinent.
- **Navigation** : entrée sidebar / menu au même niveau que Artists et Genres.

---

## Contraintes techniques & produit à anticiper

- **Volume** : il y a typiquement **beaucoup plus de tracks que d’artistes** — pagination, recherche / filtre par titre ou artiste, et éventuellement limite sur les séries temporelles (top 20 + « autre ») pour rester performant.
- **API** : vérifier [`docs/API.md`](API.md) et les services sous `lib/services/**` — probablement nouveaux endpoints ou extension des agrégations existantes ; alignement avec la **politique démo** (Breakwater) si routes sensibles.
- **Données** : une même « chanson » peut exister en plusieurs `Track` si titres légèrement différents (problème orthogonal, lié à **Headliner** / normalisation) ; la page peut vivre avec l’état actuel du schéma.

---

## Prompt agent (brouillon)

> Ajoute la route `dashboard/tracks` (App Router + `next-intl`), en miroir des pages `dashboard/artists` et `dashboard/genres` : tops, trends, composants et hooks partagés si possible. Étends l’API et les services avec pagination ; documente les nouveaux endpoints dans `docs/API.md`. Vérifie rate limit et accès public (Breakwater) si applicable.
