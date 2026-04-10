# Durcir la démo publique (sans l’enlever)

> **Project Breakwater — playbook** · Point d’entrée mémorable : [BREAKWATER.md](./BREAKWATER.md)

Document de **cadrage** : plan étape par étape et **prompts** réutilisables pour une implémentation future. Les trois leviers peuvent être combinés ou pris séparément.

**Voir aussi** : [PUBLIC_DEMO_ROUTES_ADVISORY.md](./PUBLIC_DEMO_ROUTES_ADVISORY.md) — *Breakwater route map* : quelles routes dashboard ouvrir ou fermer au public anonyme.

---

## Levier 1 — Retirer des pages sensibles du parcours public

**Objectif** : un visiteur non connecté avec `?userId=<profil public>` ne peut plus ouvrir certaines routes du dashboard (ou reçoit un message + redirection).

### Étapes possibles

1. **Inventaire** : lister les routes sous `/dashboard/*` et classer chaque page en `OK public` / `restreinte` (ex. pages très personnelles, prédictions, insights IA longs, etc.).
2. **Décision produit** : valider la liste (ce qui reste visible pour la démo vs ce qui est réservé aux comptes connectés).
3. **Middleware ou layout** : pour les routes restreintes, si `!user` **et** `searchParams.userId === publicProfileId` → redirection vers `/dashboard/overview?userId=...` ou page « connectez-vous pour voir cette section ».
4. **Navigation** : masquer ou désactiver les entrées de sidebar correspondantes quand on est en mode « vue publique » (détection : pas de session + `userId` présent et égal au profil public).
5. **Tests** : vérifier qu’un anonyme ne peut pas contourner en tapant l’URL directe ; qu’un utilisateur connecté garde un comportement normal.

### Prompt associé (pour une future session agent)

> Limite l’accès aux pages du dashboard pour les visiteurs non authentifiés qui consultent uniquement le profil public (`userId` = `NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID`). Dresse d’abord la liste des routes sous `app/[locale]/dashboard`, puis implémente une allowlist ou blocklist : **[insérer les chemins à bloquer]**. Les utilisateurs connectés ne doivent pas être affectés. Utilise le middleware existant et/ou un guard dans le layout dashboard, et adapte la sidebar pour cacher les liens interdits en mode public.

---

## Levier 2 — Désactiver ou limiter l’IA pour les requêtes anonymes

**Objectif** : réduire coût, abus et surface d’exposition textuelle générée pour les non connectés.

### Étapes possibles

1. **Identifier les points d’entrée IA** : routes `POST/GET` sous `/api/ai/*`, et tout appel Groq / quota déjà géré par `userId` ou IP.
2. **Choisir la politique** :
   - **A — Blocage total** : si pas de session et requête liée au profil public → réponse dégradée fixe (`aiUnavailable`, etc.) sans appel LLM.
   - **B — Quota séparé** : quota journalier très bas pour l’« anonyme + profil public » (clé de rate limit dédiée).
   - **C — Cache only** : servir uniquement du cache pour l’anonyme, jamais de génération à la volée.
3. **Implémentation** : centraliser la détection « requête anonyme pour données du profil public » (même notion que `resolveAuthorizedDataUserId` côté lecture) et court-circuiter avant `assertGroqUserQuota` / appel modèle.
4. **UX** : message clair du type « Connectez-vous pour générer de nouveaux insights » sur les widgets concernés.
5. **Tests** : appels API anonymes ne déclenchent pas le LLM (ou respectent le plafond).

### Prompt associé

> Pour toutes les routes API qui invoquent un LLM (**liste : [ou “trouve-les dans le repo”]**), ajoute une règle : si l’utilisateur n’est pas authentifié et que les données demandées concernent uniquement le profil public, ne pas appeler Groq / ne pas incrémenter le quota utilisateur comme pour un compte normal ; renvoie une réponse dégradée cohérente avec les DTO existants. Option : quota IP séparé très bas pour l’anonyme. Ne casse pas le comportement pour les utilisateurs connectés.

---

## Levier 3 — Ne plus exposer l’UUID sur la page d’accueil (lien privé)

**Objectif** : la démo reste accessible par URL, mais **tu ne la publicises plus** sur le site (réduction du bruit, moins de crawlers / referrers évidents — **pas** une protection d’auth à elle seule).

### Étapes possibles

1. **Retirer** les liens qui construisent `?userId=<uuid>` sur la home, le shell auth, et tout autre endroit marketing.
2. **Remplacer** par un libellé générique : « Voir une démo » → même URL en dur côté serveur **ou** route intermédiaire du type `/demo` qui **redirige** vers `/dashboard/overview?userId=...` (l’UUID n’apparaît pas dans le HTML de la home, mais reste visible après redirection dans la barre d’adresse — acceptable si l’objectif est surtout « pas dans le lien partageable depuis la home »).
3. **Mieux (optionnel)** : route `/demo` qui lit l’UUID **uniquement côté serveur** depuis une variable d’environnement **non** `NEXT_PUBLIC_*`, fait une `redirect()` vers l’overview avec le query param — l’UUID ne serait pas dans le bundle client de la home. (Toujours visible après redirect dans l’URL.)
4. **Communication** : partager le lien `/demo` ou le lien complet en privé (newsletter, DM, etc.).
5. **Docs internes** : noter que le profil public reste lisible par quiconque possède l’URL complète.

### Prompt associé

> Retire de la page d’accueil localisée et des pages auth tous les liens qui exposent explicitement `userId=<uuid>` dans le HTML ou le bundle. Ajoute une route serveur `/[locale]/demo` qui redirige vers `/dashboard/overview` avec le `userId` du profil public lu depuis une variable d’environnement serveur uniquement (pas `NEXT_PUBLIC`). Mets à jour les traductions pour pointer vers `/demo`. Vérifie que le middleware autorise toujours l’accès dashboard anonyme pour le profil public.

---

## Ordre de mise en œuvre suggéré

| Priorité | Levier | Effort typique | Impact principal |
|----------|--------|----------------|------------------|
| 1 | IA limitée / coupée pour anonyme | Moyen | Coût, abus, surface « texte » |
| 2 | Pages dashboard restreintes | Moyen à fort | Surface de données exposée |
| 3 | UUID retiré de la home + `/demo` | Faible à moyen | Discrétion / marketing (pas la sécurité auth) |

---

## Rappels

- **Levier 3** améliore surtout la **discrétion** et le **partage contrôlé** ; il **ne remplace pas** une bonne **autorisation serveur** (levier 1 + règles API existantes comme `resolveAuthorizedDataUserId`).
- Tu peux utiliser **un prompt par levier** ou un prompt **combiné** en précisant par exemple : « applique les leviers 1 et 2, pas le 3 ».

### Table « route → public oui/non » (à remplir avant implémentation du levier 1)

| Route | Public OK | Notes |
|-------|-----------|--------|
| `/dashboard/overview` | ☐ | |
| `/dashboard/overview-bis` | ☐ | |
| *(à compléter)* | | |

---

## Fichiers et concepts déjà en place (référence)

- `lib/constants/public-profile.ts` — UUID par défaut / `NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID`
- `lib/auth/resolve-authorized-data-user-id.ts` — qui peut lire quelles données
- `middleware.ts` — accès dashboard anonyme si `userId` = profil public
