# Duet — social léger & comparaison d’écoute

**Statut** : idée documentée — implémentation à planifier.

**Constat** : l’app est aujourd’hui centrée sur **un utilisateur / une bibliothèque**. Beaucoup de personnes découvrent leurs habitudes en les **mettant en perspective** avec celles d’un ami (« qui stream le plus ce groupe », « nos genres sur la même période », etc.).

**Objectif** : introduire une dynamique **réseau social minimale** — pas un fil d’actualité générique — focalisée sur **amis**, **invitations**, et **vues analytiques comparatives** (deux séries sur un même graphe, défis ludiques optionnels).

---

## Vision produit

- **Relations** : demande d’ami → acceptation / refus ; liste d’amis ; blocage si nécessaire.
- **Comparaison** : choisir un ami + métrique (ex. écoutes agrégées, top artiste partagé, tendance dans le temps) + plage de dates alignée sur les filtres existants du dashboard.
- **Moments « wow »** : pour un **artiste** donné (ou un titre), afficher un classement ou un ratio « toi vs ami » sur une période — léger, partageable, sans gamification lourde au départ.

---

## Périmètre MVP (proposition)

- Invitations par **identifiant interne** ou **email** (selon ce que Supabase / le produit permet déjà sans friction).
- **Opt-in explicite** : aucune donnée comparative visible tant que l’ami n’a pas accepté et qu’un niveau de partage minimal n’est pas défini.
- **1 à 2 écrans** : liste amis + une page « Comparer avec… » réutilisant les composants de charts existants (deux séries, légende claire).
- Hors MVP initial : découverte globale (« trouver des inconnus »), classements publics, chat intégré.

---

## Contraintes à anticiper

- **Autorisation** : chaque endpoint qui renvoie des agrégats « ami » doit **vérifier la relation** et le **scope de partage** ; pas de fuite via `userId` dans l’URL (renforcer avec Breakwater si routes exposées).
- **Perf** : agrégations pour **deux** utilisateurs peuvent doubler le coût — caches ou requêtes batch, limites de plage temporelle.
- **Équité données** : si un ami n’a pas importé la même source ou la même profondeur d’historique, l’UI doit l’indiquer pour éviter les comparaisons trompeuses.

---

## Extensions possibles (post-MVP)

- **Classements privés** entre amis sur un artiste / une semaine.
- **Cartes ou images** de comparaison pour réseaux sociaux (voir aussi pistes dans Encore / Setlist).
- **Groupes** (>2 personnes) si la demande existe.

---

## Prompt agent (brouillon)

> Implémente le socle **Duet** : modèle de relation ami (tables + RLS Supabase), API pour invitations et liste d’amis, page dashboard « Comparer » avec sélection d’un ami et graphe dual pour au moins une métrique (ex. écoutes par jour ou top artiste partagé). Respecte opt-in et vérif côté serveur ; documente les routes dans `docs/API.md` ; vérifie rate limit et absence de fuite cross-user.
