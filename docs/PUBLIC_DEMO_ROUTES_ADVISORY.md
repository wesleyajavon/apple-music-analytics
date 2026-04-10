# Routes dashboard : recommandations pour l’accès public anonyme

> **Project Breakwater — route map** · Vue d’ensemble : [BREAKWATER.md](./BREAKWATER.md)

Avis **produit + confidentialité + coût IA**, basé sur la structure du projet (`app/[locale]/dashboard`, sidebar, appels API). Ce n’est pas un audit de sécurité formel.

Voir aussi : [PUBLIC_DEMO_HARDENING.md](./PUBLIC_DEMO_HARDENING.md) (levier 1, prompts).

---

## Principe

- **Garder ouvert** : ce qui montre la valeur (stats agrégées, graphiques) sans entrer trop dans le « récit personnel » ni exposer des **titres d’écoute** au jour le jour.
- **Fermer au public** : ce qui **sollicite souvent le LLM**, sonne **très personnel**, ou expose des **écoutes détaillées** (titres, horaires).
- **Doc / marketing** : en général **OK public** (peu ou pas de données utilisateur dans le contenu).

**Alignement API** : fermer une page UI ne suffit pas si les `/api/...` restent accessibles sans session pour le `userId` du profil public. Pour un durcissement cohérent, appliquer la même politique côté API (ou accepter le risque résiduel « appels API directs »).

---

## Tableau par route

| Route | Verdict public anonyme | Pourquoi |
|--------|------------------------|----------|
| `/dashboard/overview` | **Garder** | Vitre principale de la démo ; agrégats + widgets ; bon équilibre (éventuellement limiter l’IA sur l’overview plus tard). |
| `/dashboard/overview-bis` | **Optionnel** | Belle vitrine mais redondante ; peut être fermée pour **réduire la surface** sans perdre l’essentiel. |
| `/dashboard/timeline` | **Garder** | Courbe agrégée, lisible pour un prospect. |
| `/dashboard/genres` | **Garder** | Répartition agrégée. |
| `/dashboard/artists` | **Garder** | Top artistes agrégés. |
| `/dashboard/genres/trends` | **Garder** | Tendances agrégées ; un peu « power user » mais pas plus intime que le reste. |
| `/dashboard/artists/trends` | **Garder** | Idem. |
| `/dashboard/temporal-analysis` | **Garder** | Patterns jour/heure en agrégé ; montre la profondeur du produit. |
| `/dashboard/heatmap` | **Fermer ou fortement limiter** | Au clic sur un jour, chargement d’**écoutes détaillées** (`useListens`) → titres, artistes, horaires : granularité la plus sensible pour une démo publique. |
| `/dashboard/musical-profile` | **Fermer** | Hub avec **plusieurs flux IA** (insights, profil, évolution) → coût + surface narrative forte. |
| `/dashboard/ai-insights` | **Fermer** | IA + texte interprétatif ; coût ; contenu très « personnalisé ». |
| `/dashboard/taste-profile` | **Fermer** | Profil de goût généré (LLM). |
| `/dashboard/taste-evolution` | **Fermer** | Tendances + commentaires IA. |
| `/dashboard/when-will-i-listen` | **Fermer** | Prédiction + explication IA ; cadrage « à moi » même si les données sont celles du profil démo. |
| `/dashboard/about` | **Garder** | Contenu éducatif, confiance. |
| `/dashboard/demo` | **Garder** | Vidéo / démo produit. |
| `/dashboard/insights` | **Garder** | Méthodologie / documentation. |
| `/dashboard/sentry-test` | **Admin uniquement** | Ne doit pas être concerné par le mode public ; déjà filtré admin en prod dans la sidebar. |

---

## Synthèse minimale (peu de règles)

1. Bloquer tout le **bloc IA** : `musical-profile`, `ai-insights`, `taste-evolution`, `taste-profile`, `when-will-i-listen`.
2. Bloquer **`heatmap`** (ou désactiver uniquement le détail jour + appels `listens` en mode public — plus fin à implémenter).
3. Laisser ouvert : **overview**, **temporal-analysis**, **genres**, **artists**, **genres/trends**, **artists/trends**, **timeline**, **about**, **demo**, **insights**.

---

## Synthèse « démo plus riche »

- Comme la synthèse minimale, en **gardant** `overview-bis` si tu veux plus de « wow » sans rouvrir le bloc IA ni le heatmap détaillé.

---

## Distinction mode public vs session (rappel)

- **Visiteur public** : pas de session **et** consultation du profil public via `userId` dans l’URL → appliquer les blocages ci-dessus.
- **Utilisateur connecté** : session présente → **ne pas** appliquer ces blocages (parcours normal, y compris pour le propriétaire du profil public).

---

## Étape suivante (implémentation)

Mapper chaque route fermée vers les **endpoints API** à restreindre de la même façon pour les requêtes anonymes sur le seul `userId` public (IA, `/api/listens` en liste brute, etc.).
