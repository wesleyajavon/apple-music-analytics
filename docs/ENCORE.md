# Project Encore

**Codename** — expérience **Replay annuel** dans l’app : une vue par année calendaire, dans l’esprit d’**Apple Music Replay** (tops artistes, titres, albums, temps d’écoute agrégé), alimentée par les données déjà stockées côté serveur.

« Encore » évoque le **rappel** scène : chaque année, une **seconde** mise en lumière de l’écoute — sans reprendre le nom commercial « Replay » dans le code produit affiché si tu préfères une marque propre (l’API et les modèles gardent le terme *replay* pour la cohérence technique).

---

## Phase actuelle (back-end prêt, UI absente)

La **couche données et API** existe : import validé, persistance Prisma, lecture agrégée. Aucune page dashboard ne consomme encore `GET /api/replay` ; le hook client est prêt mais **non branché**.

**Cartes partage** : la librairie commune `lib/utils/share-card/` (canvas 1080×1080, head-to-head, Web Share API) est utilisée par Duet ; Encore pourra s’y brancher via `head-to-head-share-card.ts` ou un renderer dédié Replay.

Rien d’urgent : ce fichier sert de **cadrage** jusqu’à ce que tu priorises l’UI ou l’intégration import côté utilisateur.

---

## Quand lancer l’implémentation Encore

Signaux utiles :

- Tu veux une **story annuelle** visible dans le produit (marketing, rétention, parité avec l’écosystème Apple Music).
- Les utilisateurs ont (ou auront) des **imports Replay** fiables via `POST /api/replay/import` ou un futur flux automatisé.
- La **démo publique** doit inclure ou exclure cette section : aligner avec [BREAKWATER.md](./BREAKWATER.md) et [PUBLIC_DEMO_ROUTES_ADVISORY.md](./PUBLIC_DEMO_ROUTES_ADVISORY.md) avant d’ouvrir la route au trafic anonyme.

---

## Documents du projet

| Document | Rôle |
|----------|------|
| [IDEAS_BAG.md](../IDEAS_BAG.md) | **Sac à idées** — index de tous les codenames à la racine du repo |
| [ENCORE_REPLAY_PLAYBOOK.md](./ENCORE_REPLAY_PLAYBOOK.md) | **Playbook** — inventaire repo, phases UI/API, rate limit, prompt agent |

---

## Recherche dans le repo

Pour te retrouver : cherche **`Encore`**, **`encore`**, ou **`ENCORE`** — ce fichier et l’en-tête du playbook pointent ici.
