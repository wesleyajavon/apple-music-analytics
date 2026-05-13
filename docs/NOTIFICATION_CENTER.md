# Centre de notifications — plan d’implémentation

Objectif : ajouter un **petit centre de notifications** dans la **barre supérieure** du dashboard (la zone sticky qui contient déjà le filtre de période et les exports), **immédiatement à gauche** du bloc « Export » (CSV / JSON / PDF).

Références dans le code actuel :

- Enveloppe de la barre : `lib/components/dashboard-scroll-wrapper.tsx` (sticky + `DashboardToolbarBrand` + `DateRangeFilter`).
- Emplacement des boutons d’export : fin du composant `DateRangeFilter` dans `lib/components/date-range-filter.tsx` (bloc avec `border-l` et `exportLabel`).

---

## 1. Clarifier le produit (avant de coder)

1. **Types de notifications** : uniquement des événements **dans l’app** (ex. import terminé, backfill genre, erreur de sync Spotify) ou aussi des **messages marketing / release notes** ?
2. **Persistance** : les notifications doivent-elles survivre au rechargement et entre appareils ?
   - *Client seul* : `localStorage` / `IndexedDB`, rapide à livrer.
   - *Serveur* : table Prisma + route API + invalidation, nécessaire pour le multi-appareil et l’historique fiable.
3. **Public démo** : si `DashboardViewerProvider` / profil public sans session complète, faut-il masquer le centre ou n’afficher que des messages neutres ?

Sans ces réponses, un bon **MVP** est : **liste en mémoire + optionnellement persistance locale**, déclenchée par les flux existants (toasts Sonner restent pour le feedback immédiat ; le centre garde l’**historique court**).

---

## 2. Modèle de données et API interne

### 2.1 Structure minimale d’un item

Proposer un type du genre :

- `id` : string (UUID ou `crypto.randomUUID()` côté client).
- `title` : string.
- `body` : string optionnel.
- `createdAt` : `Date` (ISO string si sérialisation JSON).
- `read` : boolean.
- `severity` : `"info" | "success" | "warning" | "error"` (pour l’icône / la couleur).
- `href` : string optionnel (lien vers une page dashboard pertinente).
- `source` : string optionnel (ex. `"spotify-sync"`, `"genre-backfill"`) pour le filtrage ou la télémétrie.

### 2.2 Stockage (choix selon étape 1)

- **MVP client** : contexte React + `useReducer` ou petit store ; option `localStorage` avec debounce pour sérialiser les N derniers items.
- **V1 serveur** (si besoin) : table `UserNotification` (userId, payload JSON, readAt, createdAt), routes `GET/PATCH /api/user/notifications`, alignées sur les patterns d’auth existants (`getCurrentUserId`, etc.).

---

## 3. Couche UI — composant dédié

1. Créer **`lib/components/notification-center.tsx`** (Client Component), pour ne pas alourdir `date-range-filter.tsx`.
2. Contenu suggéré :
   - **Bouton icône** (cloche) avec **badge** du nombre d’items non lus (masquer le badge si 0).
   - **Panneau** ancré sous le bouton (position `absolute` / `fixed` selon le overflow du sticky header) : largeur max ~`min(20rem, 100vw - 2rem)`, scroll si la liste dépasse ~5–8 lignes.
   - États : liste vide (« Aucune notification »), chargement (si fetch serveur plus tard), erreur.
3. **Accessibilité** :
   - `aria-label` / `aria-expanded` sur le bouton ;
   - fermeture **Escape** ;
   - clic **à l’extérieur** pour fermer (`useRef` sur le conteneur + écoute `pointerdown`) ;
   - focus : au minimum, ne pas piéger le focus de manière agressive en MVP ; ou utiliser un primitives `Popover` si le projet en a un (Radix, etc. — vérifier les dépendances existantes avant d’ajouter une lib).

---

## 4. Intégration dans la barre (placement exact)

Dans `date-range-filter.tsx`, la rangée principale est :

```tsx
<div className="flex flex-wrap items-center justify-between gap-4">
  <div className="flex items-center gap-4">… période …</div>
  {/* Cible : regrouper notification + export dans un flex row */}
</div>
```

**Approche recommandée** : remplacer le nœud final isolé (export seul) par un **conteneur flex** :

1. `flex items-center gap-2 sm:gap-3` (ou similaire).
2. Premier enfant : `<NotificationCenter />`.
3. Second enfant : le bloc export actuel, en conservant `pl-4 border-l border-card-border` **sur le groupe export** ou en dupliquant une séparation visuelle entre « notifications » et « export » (ex. `border-l` entre les deux blocs pour lisibilité).

Cela respecte la demande : **à gauche des exports**, dans la **même barre** que le filtre de dates.

### 4.1 Responsive

Sur très petit écran, `flex-wrap` peut faire passer la rangée sur deux lignes. Tester que le panneau du centre ne soit pas **coupé** par `overflow-hidden` du header ; ajuster `z-index` (déjà `z-30` sur le sticky) et éventuellement rendre le dropdown en `fixed` avec coordonnées calculées si nécessaire.

---

## 5. Internationalisation

1. Ajouter les clés sous `messages/en.json`, `fr.json`, `es.json`, par ex. `components.notificationCenter.*` :
   - titre du panneau, bouton, état vide, « Tout marquer comme lu », libellés de sévérité si besoin.
2. Dans le composant, utiliser `useTranslations("components.notificationCenter")` comme pour `dateRangeFilter`.

---

## 6. Alimenter le centre (émetteurs)

Sans backend, exposer une **API minimale** pour le reste de l’app :

1. **`NotificationCenterProvider`** dans `lib/context/…` enveloppant le dashboard (ou placé dans `DashboardScrollWrapper` / `DashboardViewerProvider` selon la portée voulue).
2. Hook **`useNotifications()`** retournant `{ items, addNotification, markAllRead, markRead(id) }`.
3. Appeler `addNotification` depuis :
   - les handlers d’export dans `date-range-filter` après succès / échec (en complément des toasts) ;
   - `genre-backfill-global-badge` ou le hook de statut backfill quand l’état passe à « terminé » / « erreur » ;
   - tout futur flux (sync Spotify, onboarding).

Éviter les doublons : dédoublonner par `source` + fenêtre temporelle si le même événement se répète.

---

## 7. Tests et qualité

1. **Test unitaire léger** du reducer / logique de tri (non lus en premier, limite de taille du buffer).
2. **Test RTL** (optionnel) : ouverture / fermeture au clavier.
3. Vérifier **pas de régression** sur le sticky header (hauteur mesurée via `ResizeObserver` dans `dashboard-scroll-wrapper.tsx`).

---

## 8. Ordre de travail concret (checklist)

1. Valider persistance MVP (mémoire vs `localStorage` vs DB).
2. Définir le type `NotificationItem` + reducer / provider.
3. Implémenter `notification-center.tsx` + i18n.
4. Intégrer dans `date-range-filter.tsx` à gauche du bloc export.
5. Brancher 1–2 émetteurs réels (ex. export réussi, backfill terminé).
6. Ajuster responsive / z-index / focus.
7. Tests + revue accessibilité.

---

## 9. Évolutions possibles

- Préférences utilisateur (« désactiver ce type de notification »).
- WebSockets ou Supabase Realtime pour les notifications serveur poussées.
- Lien avec les toasts Sonner : option « Voir dans le centre » sur un toast long.
