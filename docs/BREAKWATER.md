# Project Breakwater

**Codename** — plan de durcissement de la démo publique lorsque le trafic, les coûts ou le risque de dépassent ce que tu acceptes aujourd’hui.

Pense à une **digue** : tant que la mer est calme, tu n’en as pas besoin ; quand les vagues montent, tu déploies ce qui protège le rivage (démo + APIs).

---

## Phase calme (maintenant)

Le trafic actuel ne rend **pas dangereux** de laisser les appels **IA** accessibles aux visiteurs du profil public. Rien d’urgent à implémenter.

Tu peux ignorer ce dossier jusqu’au jour où un signal ci-dessous apparaît.

---

## Quand passer en « high water » (implémenter Breakwater)

Réutilise ce checklist plus tard :

- Coûts **Groq / LLM** ou quotas qui grimpent de façon visible sur le trafic **anonyme**
- **Abus** ou scraping ciblé sur `?userId=` du profil public
- Besoin de **moins exposer** (titres au jour le jour, blocs IA, surface de l’app)
- Trafic ou visibilité du produit qui rend la **démo trop lisible** pour ton confort perso

---

## Documents du projet

| Document | Rôle |
|----------|------|
| [IDEAS_BAG.md](../IDEAS_BAG.md) | **Sac à idées** — index de tous les codenames (Breakwater, Encore, …) à la racine du repo |
| [PUBLIC_DEMO_HARDENING.md](./PUBLIC_DEMO_HARDENING.md) | **Playbook** — 3 leviers (routes, IA, lien `/demo`), étapes, prompts pour l’agent |
| [PUBLIC_DEMO_ROUTES_ADVISORY.md](./PUBLIC_DEMO_ROUTES_ADVISORY.md) | **Route map** — quelles pages dashboard ouvrir ou fermer au public anonyme |

**Planification produit (hors durcissement)** : [ENCORE.md](./ENCORE.md) — future UI **Replay par année** (API déjà en place) ; à croiser avec la route map quand tu ouvres `/dashboard/replay` au public.

---

## Recherche dans le repo

Pour te retrouver : cherche **`Breakwater`** ou **`breakwater`** — ce fichier et les en-têtes des deux docs pointent ici.
