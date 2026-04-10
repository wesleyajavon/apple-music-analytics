# IDEAS BAG — sac à idées produit

**But :** tout noter ici dès qu’une **idée** ou un **renforcement** te traverse l’esprit — sous forme de **codenames** mémorables — pour ne rien perdre et retrouver vite les docs de cadrage.

> Ouvre ce fichier en routine (racine du repo = tu le vois tout de suite). Quand une idée mérite un vrai dossier, ajoute `docs/NOM_CODENAME.md` et une ligne au tableau ci-dessous.

---

## Vue d’ensemble

| Codename   | Thème (une ligne) | Doc principal |
|------------|-------------------|---------------|
| **Breakwater** | Durcir la démo publique quand coûts, trafic ou risque dépassent le confort actuel | [docs/BREAKWATER.md](docs/BREAKWATER.md) |
| **Encore** | UI **Replay par année** (style Apple Music Replay), API déjà prête | [docs/ENCORE.md](docs/ENCORE.md) |

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
- **Ce fichier** : `IDEAS_BAG`, `ideas bag`, `sac à idées`
