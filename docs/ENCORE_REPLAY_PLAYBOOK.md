# Encore — Replay annuel (playbook d’implémentation)

> **Project Encore** · Point d’entrée : [ENCORE.md](./ENCORE.md)

Document de **cadrage** pour une future **UI Replay par année**, calquée sur l’expérience **Apple Music Replay** : mise en avant des tops et des totaux pour une année donnée, navigation entre les années disponibles.

---

## 1. Objectif produit

- Permettre à l’utilisateur de **parcourir ses années** pour lesquelles un résumé Replay a été importé.
- Afficher pour **une année** : totaux (`totalPlayTime`, `totalPlays`), **top artistes**, **top titres**, **top albums** (rangs, compteurs, visuels quand disponibles).
- Conserver une **cohérence visuelle** avec le reste du dashboard (cartes, typographie) tout en permettant une **identité** légèrement « moment annuel » (hero année, transitions) si tu le souhaites plus tard.

---

## 2. Inventaire technique existant (repo)

| Élément | Emplacement | Rôle |
|--------|-------------|------|
| Liste des années + détail sérialisé | `GET /api/replay` — `app/api/replay/route.ts` | `getReplayYearlySummaries(userId)` → tableau `ReplayYearlySummaryDto[]` |
| Import / remplacement année | `POST /api/replay/import` — `app/api/replay/import/route.ts` | Corps `{ userId, data }` avec `ReplayYearlyInput` ; **rate limit** 5 req / 60 s |
| Service | `lib/services/replay/replay-service.ts` | `importReplayYearly`, `getReplayYearlySummaries`, transaction Prisma |
| DTO / validation | `lib/dto/replay.ts`, `lib/dto/schemas` | Types import + réponse API |
| Schéma DB | `prisma/schema.prisma` — `ReplayYearly`, relations tops | Une ligne par `(userId, year)` ; réimport = remplacement |
| Hook client (non utilisé) | `lib/hooks/use-replay.ts` — `useReplaySummaries` | Appelle `apiClient.get('/replay?userId=…')` → **`/api/replay`** |
| Tests API | `__tests__/api/replay.test.ts` | GET + import |

**Trou dans le produit** : aucune page sous `app/[locale]/dashboard/*` n’importe `useReplaySummaries` ni n’appelle directement `/api/replay`.

---

## 3. Hors périmètre ou phase ultérieure (à trancher)

- **Acquisition des données** : aujourd’hui l’import est **API programmatique** ; une future **UI d’upload** ou intégration **MusicKit / export Apple** peut vivre dans un projet séparé ou une phase « Encore — import guidé ».
- **Génération synthétique** depuis l’historique d’écoute interne : possible en produit plus tard ; le modèle actuel reflète le **paquet Replay officiel** importé.
- **Partage social / image export** : optionnel après la v1 lecture seule.

---

## 4. Phases d’implémentation recommandées

### Phase A — Navigation et liste

1. Ajouter une entrée **sidebar** (ex. « Replay » ou « Par année ») sous le dashboard.
2. Page **index** : `useReplaySummaries` avec `userId` résolu comme sur les autres pages (session + `?userId=` profil public si applicable).
3. États vides : message du type « Aucune année importée » + lien vers doc ou futur flux d’import.
4. Liste des années (tri décroissant) menant au détail.

**Route suggérée** : `app/[locale]/dashboard/replay/page.tsx` (liste).

### Phase B — Détail par année

1. Route dynamique **`/dashboard/replay/[year]`** (valider `year` entier, plage cohérente avec les données).
2. Données : soit **filtrer** le résultat de `GET /api/replay` côté client (un seul fetch liste), soit ajouter plus tard **`GET /api/replay/[year]`** si le payload liste devient trop lourd (non requis tant que le nombre d’années reste modeste).
3. Sections : hero année + cartes top artistes / titres / albums en réutilisant les patterns des pages artists/genres (voir commentaires « style Replay » existants).

### Phase C — Durcissement & démo publique

1. **`GET /api/replay`** : aujourd’hui **sans** `assertRateLimit` — ajouter un plafond aligné sur les autres routes analytics (ex. 20 / 60 s) avant d’exposer fortement la fonctionnalité ou le profil public.
2. Mettre à jour [PUBLIC_DEMO_ROUTES_ADVISORY.md](./PUBLIC_DEMO_ROUTES_ADVISORY.md) : classer `/dashboard/replay` en OK public ou restreint selon ta politique.
3. Si Breakwater est actif : masquer l’entrée Replay pour les anonymes ou servir une vue dégradée.

### Phase D — Polish (optionnel)

- Illustrations / couleurs par année, animations légères.
- CTA « Importer une autre année » quand un flux import UI existera.

---

## 5. Cohérence auth / `userId`

Réutiliser le même modèle que le reste du dashboard : **`resolveAuthorizedDataUserId`** côté API est déjà en place sur `GET /api/replay`. Côté client, passer le **`userId`** attendu par les hooks (profil public ou utilisateur connecté) comme sur `useArtistStats` / `useListenDateRange`.

---

## 6. Prompt agent (session future)

> **Project Encore** — Implémente l’UI Replay annuel : (1) page liste `app/[locale]/dashboard/replay/page.tsx` qui utilise `useReplaySummaries` depuis `lib/hooks/use-replay.ts` avec le même schéma `userId` que les autres pages dashboard ; (2) page détail `app/[locale]/dashboard/replay/[year]/page.tsx` qui affiche tops et totaux à partir des DTO existants ; (3) entrée de navigation dans la sidebar du dashboard ; (4) états de chargement et vide. Ajoute `assertRateLimit` sur `GET /api/replay` aligné sur les routes analytics existantes. Mets à jour `PUBLIC_DEMO_ROUTES_ADVISORY.md` si la route est exposée au public. Ne casse pas `POST /api/replay/import` ni les tests dans `__tests__/api/replay.test.ts`.

---

## 7. Références croisées

- [ENCORE.md](./ENCORE.md) — résumé codename et timing.
- [BREAKWATER.md](./BREAKWATER.md) — démo publique sous pression.
- [API.md](./API.md) — section documentée `GET /api/replay` / `POST /api/replay/import`.
