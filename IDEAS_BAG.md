# IDEAS BAG — sac à idées produit

**But :** tout noter ici dès qu’une **idée** ou un **renforcement** te traverse l’esprit — sous forme de **codenames** mémorables — pour ne rien perdre et retrouver vite les docs de cadrage.

> Ouvre ce fichier en routine (racine du repo = tu le vois tout de suite). Quand une idée mérite un vrai dossier, ajoute `docs/NOM_CODENAME.md` et une ligne au tableau ci-dessous.

---

## Vue d’ensemble

| Codename   | Thème (une ligne) | Doc principal |
|------------|-------------------|---------------|
| **Breakwater** | Durcir la démo publique quand coûts, trafic ou risque dépassent le confort actuel | [docs/BREAKWATER.md](docs/BREAKWATER.md) |
| **Encore** | UI **Replay par année** (style Apple Music Replay), API déjà prête | [docs/ENCORE.md](docs/ENCORE.md) |
| **Headliner** | Unifier **artiste principal vs featuring** pour des tops et agrégats plus justes (parsing, alias, mbid, ou crédits multiples) | [docs/HEADLINER.md](docs/HEADLINER.md) |
| **Palette** | Atelier **genres** ré-entrant : l’utilisateur mappe les tops artistes « Unknown » (liste existante + saisie), expérience ludique, sans bloquer l’import | [docs/PALETTE.md](docs/PALETTE.md) |
| **Setlist** | Page **`/dashboard/tracks`** au même niveau qu’**Artists** et **Genres** : tops morceaux + tendances temporelles, UX et API alignés sur l’existant | [docs/SETLIST.md](docs/SETLIST.md) |

---

## Breakwater

- **Idée** : une « digue » — tant que la mer est calme tu n’y touches pas ; quand la pression monte, tu actives garde-fous sur routes, IA et lien `/demo`.
- **Playbooks** : [docs/PUBLIC_DEMO_HARDENING.md](docs/PUBLIC_DEMO_HARDENING.md) (3 leviers + prompts agent), [docs/PUBLIC_DEMO_ROUTES_ADVISORY.md](docs/PUBLIC_DEMO_ROUTES_ADVISORY.md) (route map public vs restreint).
- **Quand prioriser** : coûts LLM visibles sur trafic anonyme, abus sur `?userId=`, besoin de réduire la surface exposée.

---

## Encore

- **Idée** : parcours annuel — tops artistes / titres / albums et totaux pour une année importée, cohérent avec le dashboard.
- **Playbook** : [docs/ENCORE_REPLAY_PLAYBOOK.md](docs/ENCORE_REPLAY_PLAYBOOK.md) (phases UI, rate limit, prompt agent).
- **Quand prioriser** : story annuelle produit, imports Replay fiables, alignement avec la politique démo (Breakwater).

---

## Headliner

- **Idée** : traiter « Artiste » et « Artiste feat. X » comme le **même artiste canonique** pour les stats, sans perdre la possibilité d’afficher le crédit brut ou d’analyser les collabs.
- **Doc** : [docs/HEADLINER.md](docs/HEADLINER.md) (axes A→D, métriques produit, ordre d’implémentation, prompt agent).
- **Quand prioriser** : tops artistes jugés « faux » par les utilisateurs ; avant gros marketing / démo ; en même temps qu’un refactor import Last.fm / CSV.

---

## Palette

- **Idée** : quand beaucoup de données restent en **genre inconnu** après import, laisser l’utilisateur **revenir quand il veut** pour « colorier » sa bibliothèque — en priorité les **artistes les plus écoutés** (même logique que le CLI `genres:map-top-unknown`), avec choix parmi les genres déjà connus **ou** saisie libre ; parcours **agrégable** (court, progressif, optionnel).
- **Doc** : [docs/PALETTE.md](docs/PALETTE.md) (flux MVP, UX ludique, déclencheurs, lien CLI / scripts existants, prompt agent).
- **Quand prioriser** : retours utilisateurs sur graphiques genres « vides » ; après stabilisation des imports ; avant d’investir dans de gros backfills automatiques coûteux.

---

## Setlist

- **Idée** : offrir une section **Tracks** dans le dashboard, **parallèle** à **Artists** et **Genres** — tops par écoutes, tendances dans le temps, cohérence visuelle et navigation.
- **Doc** : [docs/SETLIST.md](docs/SETLIST.md) (périmètre, volume / pagination, API, lien Breakwater / Headliner).
- **Quand prioriser** : besoin produit de creuser au niveau **titre** (pas seulement artiste / genre) ; après stabilisation des agrégations existantes pour réutiliser les mêmes patterns.

### Extensions possibles (pas encore de codename dédié)

Ces pistes sont déjà notées dans le playbook Encore ; tu peux leur donner un nom plus tard.

- **Import Replay guidé** — UI d’upload ou flux utilisateur (au lieu de l’import API seul).
- **Synthèse depuis l’historique interne** — générer un résumé « type Replay » à partir des listens stockés (hors paquet officiel Apple).
- **Partage / export visuel** — image ou carte pour les réseaux sociaux.

---

## Ajouter un nouveau codename

Quand une idée mérite son propre dossier, crée `docs/NOM_CODENAME.md` (comme Encore) ou une section ci-dessous, puis ajoute une ligne au tableau **Vue d’ensemble**.

### Gabarit (copier-coller)

```markdown
## NomDuCodename

- **Idée** : …
- **Doc** : (lien vers `docs/….md` quand il existe)
- **Quand prioriser** : …
```

---

## Recherche dans le repo

- **Breakwater** : `Breakwater`, `breakwater`, [docs/BREAKWATER.md](docs/BREAKWATER.md)
- **Encore** : `Encore`, `encore`, [docs/ENCORE.md](docs/ENCORE.md)
- **Headliner** : `Headliner`, `headliner`, `featuring`, `feat.`, `artiste canonique`, [docs/HEADLINER.md](docs/HEADLINER.md)
- **Palette** : `Palette`, `palette`, `Unknown`, `genre`, `mapping genres`, `genres:map-top-unknown`, [docs/PALETTE.md](docs/PALETTE.md)
- **Setlist** : `Setlist`, `setlist`, `tracks`, `titres`, `dashboard/tracks`, [docs/SETLIST.md](docs/SETLIST.md)
- **Ce fichier** : `IDEAS_BAG`, `ideas bag`, `sac à idées`
