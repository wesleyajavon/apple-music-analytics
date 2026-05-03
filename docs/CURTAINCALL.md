# CurtainCall — sessions expirantes par inactivité

**Statut** : cadrage produit / sécurité — implémentation à planifier.

**Objectif** : demander une reconnexion après une absence prolongée, au lieu de laisser un dashboard privé réapparaître automatiquement quand l’utilisateur revient sur un navigateur encore authentifié.

---

## Constat

Avec Supabase Auth + `@supabase/ssr`, la session est portée par un access token court et un refresh token plus long, stockés pour être disponibles côté client et serveur. Fermer un onglet ou un navigateur ne détruit donc pas forcément la session.

La documentation Supabase actuelle indique que les sessions durent par défaut indéfiniment, jusqu’à déconnexion ou révocation. Supabase propose aussi des limites de session côté Auth settings : durée maximale, timeout d’inactivité, et session unique par utilisateur. Ces contrôles sont appliqués lors du refresh de session, donc l’effet réel peut être `timeout configure + expiration JWT`.

Docs officielles à revérifier avant implémentation :

- [User sessions](https://supabase.com/docs/guides/auth/sessions)
- [Advanced guide for SSR Auth](https://supabase.com/docs/guides/auth/server-side/advanced-guide)

---

## Décision produit à prendre

Choisir une politique simple, explicable à l’utilisateur :

| Option | Timeout | Usage conseillé |
|--------|---------|-----------------|
| Confort | 24 h | App personnelle peu sensible, friction minimale |
| Équilibré | 2 h | Bon défaut pour dashboard privé + machine partagée occasionnelle |
| Strict | 30 min | Démo publique, données plus sensibles, ordinateur partagé |

Recommandation initiale : **2 h d’inactivité** pour rester aligné avec `DEFAULT_RECENT_AUTH_MAX_AGE_MS` déjà utilisé pour les actions sensibles, puis resserrer à 30 min si le produit devient plus exposé.

---

## Stratégie technique

### 1. Source de vérité Supabase

Si le plan Supabase du projet le permet, configurer **Auth → Sessions → Inactivity timeout** avec la durée retenue.

Pourquoi :

- c’est le seul timeout d’inactivité réellement appliqué par l’autorité d’authentification ;
- il couvre les refreshs serveur et client ;
- il évite de dépendre uniquement de l’état JavaScript d’un onglet.

À noter : selon Supabase, ces limites ne détruisent pas proactivement toutes les sessions existantes ; elles sont vérifiées au prochain refresh.

### 2. UX côté client

Ajouter un petit contrôleur d’inactivité dans le shell authentifié :

- écouter les signaux utilisateur (`mousemove`, `keydown`, `click`, `touchstart`, `visibilitychange`) ;
- stocker `lastActivityAt` en mémoire et éventuellement en `localStorage` pour synchroniser plusieurs onglets ;
- après le seuil retenu, appeler `supabase.auth.signOut()` puis rediriger vers `/{locale}/sign-in?reason=inactive`;
- afficher une copie claire : « Vous avez été déconnecté après une période d’inactivité. »

Cette couche améliore l’expérience, mais ne doit pas être vendue comme une garantie de sécurité forte si elle n’est pas accompagnée du réglage Supabase côté serveur.

### 3. Garde serveur pour routes sensibles

Le projet a déjà `requireRecentAuthenticatedUser` pour les exports, imports onboarding et suppression de données. Cette protection vérifie une authentification récente, pas une activité récente dans l’app.

À conserver :

- les actions sensibles continuent d’exiger une reconnexion récente ;
- le message `RECENT_AUTH_REQUIRED` reste distinct du cas « session expirée par inactivité ».

À ajouter si nécessaire :

- un code d’erreur dédié, par exemple `SESSION_INACTIVE`, pour les réponses API ou redirections liées à CurtainCall ;
- une instrumentation de sécurité légère pour mesurer la fréquence des expirations.

---

## Plan d’implémentation

1. **Valider le timeout produit** : choisir 2 h par défaut, ou 30 min si l’objectif principal est la démo publique / machine partagée.
2. **Configurer Supabase Auth** : activer `Inactivity timeout` dans les settings du projet si disponible sur le plan actuel.
3. **Ajouter l’UX de reconnexion** : composant client monté dans le layout/dashboard authentifié, avec redirection localisée vers sign-in.
4. **Adapter les traductions** : `inactiveSessionNotice` en `en`, `fr`, `es`.
5. **Tester les scénarios clés** :
   - utilisateur actif : pas de déconnexion ;
   - onglet laissé inactif puis retour : sign-out + redirection ;
   - plusieurs onglets : l’activité ou la déconnexion reste cohérente ;
   - routes sensibles : `requireRecentAuthenticatedUser` conserve son comportement.

---

## Prompt agent (brouillon)

> Implémente CurtainCall : ajoute une expiration d’inactivité côté UX pour les utilisateurs authentifiés dans le dashboard Next.js App Router. Lis d’abord les clients Supabase existants (`lib/supabase/*`) et le flux auth (`sign-in`, sidebar, middleware). Ajoute un composant client discret qui suit l’activité utilisateur, synchronise l’état entre onglets, appelle `supabase.auth.signOut()` après **[timeout choisi]**, puis redirige vers la page sign-in localisée avec un motif `reason=inactive`. Ajoute les traductions EN/FR/ES et des tests ciblés si les helpers s’y prêtent. Ne modifie pas la politique d’accès public démo.

---

## Recherche dans le repo

Pour te retrouver : cherche `CurtainCall`, `SESSION_INACTIVE`, `inactiveSessionNotice`, `requireRecentAuthenticatedUser`, ou `DEFAULT_RECENT_AUTH_MAX_AGE_MS`.
