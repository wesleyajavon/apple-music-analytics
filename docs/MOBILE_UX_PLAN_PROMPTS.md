# Prompts Plan — Mobile UX native (dashboard)

Playbook pour refondre **toute l’app en vue mobile** comme Musical Profile : une vraie surface téléphone, pas un desktop compressé avec des cartes empilées.

Une session Plan = **un prompt**. Ne pas lancer « tout le dashboard » d’un coup. Après chaque implémentation, vérifier EN + FR au viewport ~390×844 avant le prompt suivant.

Référence visuelle et code : [`lib/components/musical-profile-mobile.tsx`](../lib/components/musical-profile-mobile.tsx)  
Onglets : [`lib/components/dashboard-mobile-bottom-nav.tsx`](../lib/components/dashboard-mobile-bottom-nav.tsx)  
Menu Plus : [`lib/components/dashboard-mobile-plus-menu.tsx`](../lib/components/dashboard-mobile-plus-menu.tsx)

---

## Comment utiliser ce fichier

1. Ouvre une **nouvelle conversation en mode Plan**.
2. Colle d’abord le **préambule** (bloc suivant).
3. Colle **un seul** prompt numéroté.
4. Valide le plan, implémente, vérifie au téléphone, commit.
5. Passe au numéro suivant. Ne saute le chrome (étape 0) que si tu acceptes de restyler chaque page deux fois.

Hors scope de chaque prompt sauf mention contraire : desktop `lg+`, e-mail, cookies, landing marketing publique.

---

## Préambule (à coller au début de CHAQUE prompt)

```text
Contexte Soundprint : dashboard Next.js App Router, i18n en/fr/es, breakpoint mobile = < lg (1024px).
La référence « vraie vue mobile » est /dashboard/musical-profile via lib/components/musical-profile-mobile.tsx :
- arbre dédié lg:hidden, desktop hidden lg:block inchangé
- plein écran (bleed -mx-4 -mt-4), pas de carte dans une gouttière
- hero compact (~40% du viewport utile), identité en haut, actions dans la zone pouce
- métriques en rail horizontal snap, jamais grid-cols-3 de tuiles 0.62rem
- destinations = rangées natives min-h-11 + chevron, pas 3 cartes marketing empilées
- copy produit courte, pas de landing « what this page is for » une fois loggé
- empty state mobile dédié, pas le framing desktop
- bottom sheets pour le secondaire (détail, custom, filtres avancés)
- cibles 44–48px, labels FR lisibles, withFilters pour garder les dates
- e2e mobile-chrome + vérif navigateur EN/FR ~390×844 et un grand iPhone

Interdit : resserrer le desktop avec Tailwind responsive ; empiler les mêmes cards rounded-3xl ; CTA « ouvrir le vrai dashboard » qui concurrence la bottom nav ; hamburger pour la nav primaire ; grilles 3 colonnes de métriques.

Avant de proposer un plan : lis la page et les composants déjà mobile (overview-mobile-flow, musical-profile-mobile, mobile-bottom-sheet). Pose 1 question si le rôle de l’écran n’est pas clair. Desktop hors scope.
```

---

## Règles d’architecture (pour toi, pas pour le modèle)

| Faire | Éviter |
| --- | --- |
| Extraire `*-mobile.tsx` sur le modèle overview / musical-profile | Modifier le même JSX avec `sm:` / `md:` |
| Un job par écran ; le reste en sheet ou rangée | Landing + analytics + manifeste produit empilés |
| List rows, rails snap, sheets | Cards 3-col, hover desktop, copy marketing |
| Bleed sous le sticky header | Double padding (`dashboard-main-area` + `px-4` page) |
| 1 CTA primaire visible sans chasser | Bouton blanc plein largeur **et** 3 cartes « what’s next » |

Chrome partagé (header dates, padding, footer, collision bottom-nav) = **étape 0**. Si tu le sautes, chaque page « native » restera coincée sous une toolbar desktop.

---

## Étape 0 — Chrome dashboard (faire en premier)

**Pourquoi en premier :** chips `7d / 30d / YTD / All / Custom` + avatar mangent le haut de **tous** les écrans. C’est le signal #1 « site desktop ». Un hamburger en plus des tabs est un second overflow — à ne pas réintroduire.

```text
[Préambule]

Étape 0 — Native-iser le chrome mobile du dashboard, pas une page métier.

Fichiers : lib/components/dashboard-sticky-header.tsx, date-range-filter.tsx, dashboard-main-area.tsx, dashboard-mobile-bottom-nav.tsx, dashboard-mobile-plus-menu.tsx, footer.tsx, mobile-bottom-sheet.tsx, éventuellement dashboard-scroll-wrapper.

Objectif UX < lg :
- Header compact : moins de chips en bandeau. Période = un contrôle (chip ou bouton) qui ouvre un bottom sheet (presets + custom), au-dessus de la bottom nav (insetAboveBottomNav).
- Hide-on-scroll du chrome secondaire si pertinent ; ne jamais cacher la bottom nav.
- Padding main prévisible : une seule gouttière ; les pages doivent pouvoir bleeder avec -mx-4 -mt-4 sans double px-4.
- Footer : ne pas voler un second pb-20 mort au-dessus de la nav.
- Sheets / composers (ask, heatmap, plus) : un seul système de safe-area + inset bottom nav.
- Pas de hamburger. Tabs (Profil, Overview, Artists, Tracks, Plus) + sheet Plus pour le secondaire (Genres, heatmap, Duet, Ask). Trends via rangées in-page ; thème / langue / Spotify via avatar → Settings.

Contraintes : même query params de dates (preset, startDate, endDate) ; desktop lg+ inchangé ; pas de redesign visuel « nouveau brand ».

Livre : plan fichier par fichier, états empty/custom, a11y du sheet, e2e mobile-chrome (ouvrir période, choisir 30d, URL à jour). Vérifier EN + FR (labels longs : « Cette année », « Personnalisé »).
```

---

## Étape 1 — Overview (onglet 2, déjà le plus mature)

**But :** aligner Overview sur le hub Musical Profile (moins de squeeze restant), pas le reconstruire.

```text
[Préambule]

Étape 1 — Vue mobile /dashboard/overview.

Référence : lib/components/overview-mobile-flow.tsx + musical-profile-mobile.tsx.
Page : app/[locale]/dashboard/(main)/overview/page.tsx

Overview a déjà un arbre mobile. Audit squeeze restant :
- double padding / hero encore en card
- switcher ou rails qui forcent un scroll avant la première action
- copy redondante avec la bottom nav
- collision sticky header (après étape 0)

Objectif : écran « now » — insight primaire, rail métriques, listes tops en rangées, un chemin vers Ask / Duet / Musical Profile sans cartes marketing. Desktop inchangé.

Livre : liste des dettes vs hub profil, plan de patchs ciblés (pas de rewrite si le flow tient), e2e overview déjà présents + 1 assertion si tu changes les landmarks.
```

---

## Étape 2 — Artists (onglet 3)

```text
[Préambule]

Étape 2 — Vraie vue mobile /dashboard/artists.

Page : app/[locale]/dashboard/(main)/artists/page.tsx
Il existe déjà un arbre lg:hidden. Les cartes Replay (signature + chips) restent du desktop compressé.

Objectif :
- Hero compact : artiste #1 + 1–2 signaux, pas une cockpit 3 cols
- Liste : rangées natives (avatar, nom, streams, chevron) min-h-11, pas des cards stacked rounded-3xl
- Secondaire (période, compare, insights artiste) en sheet, pas en chips collés dans le hero
- Empty / loading / demo public : arbre mobile dédié

Desktop lg+ inchangé. Extraire lib/components/artists-mobile.tsx si la page est trop grosse.
i18n artists.mobile.* courte. e2e : heading, 1ère rangée tapable, conservation des dates. EN + FR.
```

---

## Étape 3 — Genres (Plus → library)

```text
[Préambule]

Étape 3 — Vraie vue mobile /dashboard/genres.

Page : app/[locale]/dashboard/(main)/genres/page.tsx
Problème typique : hero grid-cols-3 métriques + labels FR illisibles.

Objectif :
- Signature genre (leader + %) en haut, plein écran compact
- Métriques en rail snap
- Mix / distribution : une chose à la fois (chart simple ou liste), pas pie+bar+légende desktop empilés
- Drill-down jour / artiste du genre en bottom sheet
- Rangée vers /dashboard/genres/palette si c’est un destinaire réel, pas une card feature

Desktop inchangé. Extraire genres-mobile.tsx si besoin. e2e pie/bar existants : adapte-les aux nouveaux landmarks, ne casse pas mobile-chrome. EN + FR.
```

---

## Étape 4 — Tracks (onglet 4)

```text
[Préambule]

Étape 4 — Vue mobile /dashboard/tracks.

Page : app/[locale]/dashboard/(main)/tracks/page.tsx
Hero + rails existent ; la liste sous le hero est encore dense / card-like.

Objectif : écran « replay » — top track en signature, rail signaux, ensuite une liste rangées (titre, artiste, streams). Pas de grille de albums-cards. Filtres avancés en sheet. Empty dédié.

Desktop inchangé. e2e : h1 + au moins 3 rangées ou empty clair. EN + FR.
```

---

## Étape 5 — Heatmap (Plus → patterns)

```text
[Préambule]

Étape 5 — Vue mobile /dashboard/heatmap.

Page : app/[locale]/dashboard/(main)/heatmap/page.tsx
Déjà un sheet jour (MobileBottomSheet). Audit squeeze : calendrier trop petit, stats stacked, double chrome.

Objectif :
- Lead with the loudest day (insight), pas une grille de 365 cellules illisibles
- Cellules / top days : cibles 44px, sheet pour le détail (déjà le pattern)
- Stats en rail, pas 3 tuiles microscopiques
- insetAboveBottomNav cohérent avec l’étape 0

Desktop (grande heatmap) inchangé. e2e day-details : mets à jour les selectors si tu changes le DOM. EN + FR.
```

---

## Étape 6 — Timeline (Plus → patterns)

```text
[Préambule]

Étape 6 — Vue mobile /dashboard/timeline.

Page : app/[locale]/dashboard/(main)/timeline/page.tsx
Chart desktop isolé ; stats souvent grid-cols-2. Rôle : pulse / momentum, pas un duplicate Overview.

Objectif : un moment fort (pic + date), spark/rail compact, rangées pour ouvrir heatmap ou un bucket. Pas de chart axes-heavy collé en 320px. Détail en sheet.

Desktop inchangé. e2e : heading + insight visible sans pinch-zoom. EN + FR.
```

---

## Étape 7 — Temporal analysis (Plus — plus gros squeeze)

```text
[Préambule]

Étape 7 — Créer une VRAIE vue mobile /dashboard/temporal-analysis. Aujourd’hui : hero marketing + sm:grid-cols-3 + radar/bar desktop empilés. C’est le cas d’école « desktop turned mobile ».

Page : app/[locale]/dashboard/(main)/temporal-analysis/page.tsx

Objectif :
- Un arbre lg:hidden dédié (nouveau *-mobile.tsx)
- Une question par viewport : « quand est-ce que j’écoute ? » (jour / heure), pas 4 charts d’un coup
- Switcher segments ou pages internes, pas une landing + 3 graphiques
- Radar/bar riches : desktop only, ou version simplifiée + « voir le détail » sheet
- Couper le copy marketing une fois loggé

Desktop structure inchangée. i18n temporal*.mobile.*. e2e nouveaux. EN + FR.
```

---

## Étape 8 — Palette (Plus → library)

```text
[Préambule]

Étape 8 — Vue mobile /dashboard/genres/palette.

Fichiers : app/[locale]/dashboard/(main)/genres/palette/page.tsx, palette-workbench (et équivalents).
Déjà un split mobile. Objectif : une décision à la fois (queue + CTA pouce), pas un workbench multi-colonnes compressé. Sheets pour suggestions. Conserver les garde-fous métier (unknown genres, confirmations).

Desktop inchangé. Vérifier le flow bout-en-bout : choisir un item, appliquer un genre, état vide de queue. EN + FR.
```

---

## Étape 9 — Ask your Soundprint (Plus → AI)

```text
[Préambule]

Étape 9 — Vue mobile /dashboard/ask-your-soundprint.

Page déjà chat + composer sticky + sheet presets. Audit :
- composer vs bottom nav (padding, safe-area) après étape 0
- presets en sheet, pas une grille de cards
- une question featured, le reste dans « toutes les questions »
- pas de tutoriel / landing au-dessus du chat

Desktop inchangé. Vérif : envoyer un preset, clavier ouvert, nav toujours tappable. EN + FR.
```

---

## Étape 10 — AI insights (Plus — squeeze fort)

```text
[Préambule]

Étape 10 — Vue mobile /dashboard/ai-insights. Aujourd’hui hero + chips wrap + cards empilées, pas d’arbre dédié.

Page : app/[locale]/dashboard/(main)/ai-insights/page.tsx

Objectif : un insight à la une, ensuite une liste de cartes-rangées (pas stacked feature cards). États loading / quota Groq / IA off comme sur musical-profile. Lien clair vers Ask. Desktop inchangé.

e2e : heading + 1 insight ou empty/quota. EN + FR.
```

---

## Étape 11 — Duet friends

```text
[Préambule]

Étape 11 — Vue mobile /dashboard/duet/friends.

Aujourd’hui hero 2-col + sub-nav + chips wrap (desktop empilé). Composants duet-friends-*.

Objectif : liste d’amis / invitations en rangées, CTA invite dans la zone pouce, pas un hero marketing. Sub-nav : segmented control ou tabs bas de contenu, pas une 2e toolbar collée sous le date filter. Demo publique : empty / gated clair.

Desktop inchangé. e2e : heading + CTA invite ou empty. EN + FR.
```

---

## Étape 12 — Duet compare

```text
[Préambule]

Étape 12 — Vue mobile /dashboard/duet/compare.

Problème : sticky context bar + battle grids + tabs = double sticky avec le date filter, viewport mort.

Objectif : un comparatif (toi vs un ami, un artiste) en colonnes simples ou rangées face-à-face, pas une grille battle desktop. Le picker d’ami / d’artiste en sheet. Une seule barre sticky en plus du chrome global, ou aucune si le sheet suffit.

Desktop inchangé. Vérifier deep links existants. EN + FR.
```

---

## Étape 13 — Settings

```text
[Préambule]

Étape 13 — Vue mobile /dashboard/settings.

Les formulaires en stack peuvent rester, mais l’écran doit être un hub iOS Settings : groupes de rangées (compte, apparence, data/privacy, IA, démo), pas des cards marketing empilées. Une section = un groupe. Toggles 44px. Pas de hamburger.

Desktop peut rester plus aéré. e2e : au moins Compte + Data & privacy visibles. EN + FR.
```

---

## Étape 14 — About (Plus → help)

```text
[Préambule]

Étape 14 — Vue mobile /dashboard/about.

Aujourd’hui longue copy / sections cards. Une fois dans le dashboard, ce n’est plus une landing. Objectif : liste de rangées (produit, privacy, credits) + éventuellement un court hero. Couper le manifeste répété. Desktop peut garder le long form.

EN + FR + ES si les clés about.* bougent.
```

---

## Étape 15 — Trends (rangées depuis Artists / Genres / Tracks)

Artists / genres / tracks trends : `.../artists/trends`, `.../genres/trends`, `.../tracks/trends`. Accès mobile via les rangées des pages parents, pas via un hamburger.

```text
[Préambule]

Étape 15 — Vues mobile des 3 pages trends (artists, genres, tracks).

Même brief pour les trois, un plan qui les aligne :
- insight (qui/what mène la fenêtre) en haut
- spark compact, pas le chart desktop axes-heavy
- sélection multi en sheet, pas une forêt de chips
- rangée vers la page leaderboard correspondante

Ne les fusionne pas en une seule route. Desktop inchangé. Accès = rangée depuis Artists/Genres/Tracks mobile (étape 2–4), pas un 6e tab ni un hamburger.

EN + FR. e2e au moins une des trois.
```

---

## Étape 16 — Onboarding

```text
[Préambule]

Étape 16 — Mobile /dashboard/onboarding.

Déjà onboarding-mobile-sticky-actions (bottom-nav off). Objectif : un step = un job, CTA unique dans le pouce, pas le wizard desktop scrollable. Progression visible. États erreur import / permissions au moment du besoin, pas un overlay coach marks.

Ne casse pas le funnel d’import (Apple CSV, Spotify). Vérifier pb-32 / collision sticky. EN + FR.
```

---

## Étape 17 — Spotify playground / snapshot (secondaire)

```text
[Préambule]

Étape 17 — Audit mobile Spotify playground + snapshot.

Fichiers : spotify-playground-mobile.tsx, SpotifySnapshotMobileFlow.
Déjà des arbres mobile. Uniquement corriger squeeze restant (listes vs cards, sheets vs modals centrés, padding vs bottom nav). Hors scope si déjà native. Dis-le clairement dans le plan si le patch est No-Op.
```

---

## Étape 18 — Passes transversales (après les écrans)

À lancer **une fois** que 0–14 sont stables. Sinon tu tes les mêmes bugs N fois.

### 18a — Empty / loading / erreur

```text
[Préambule]

Étape 18a — Harmoniser empty, loading, erreur, quota Groq, démo publique sur toutes les vues mobile du dashboard.

Même rythme que musical-profile-mobile empty : hero compact + 1 CTA, pas ParallaxHero + framing desktop. Skeletons qui matchent le hub (pas 2 blocs rounded-3xl). Quota / IA off : notice existante, pas une 2e card cinématique.

Liste les pages encore partagées desktop/mobile sur l’empty et patch-les. Pas de nouveau design system.
```

### 18b — i18n mobile

```text
[Préambule]

Étape 18b — Passer en revue *.mobile dans messages/en.json, fr.json, es.json pour overview, artists, genres, tracks, heatmap, timeline, temporal, ask, ai-insights, duet, settings, about.

Règle : labels courts, actionnels, FR sans wrap dans un rail. Supprimer nextTitle/overviewCta style landing s’il en reste. Ne pas réécrire le desktop.
```

### 18c — E2E mobile-chrome

```text
[Préambule]

Étape 18c — Étendre __tests__/e2e/mobile-dashboard.spec.ts (projet mobile-chrome, Pixel 5).

Couvrir : bottom nav (profil, overview, artists, tracks, plus), heatmap sheet, genres via plus, ask via plus, settings via avatar, conservation des query dates. Selectors par role/name, pas des className. Skip desktop. Si global-setup prisma est fragile hors CI, documente PLAYWRIGHT_SKIP_WEBSERVER + BASE_URL.
```

### 18d — QA manuelle finale

```text
[Préambule]

Étape 18d — Checklist QA mobile uniquement (pas de code sauf bugs bloquants).

Parcourir en 390×844 et 430×932, EN et FR, données + empty :
1. Musical profile (référence)
2. Overview, Artists, Tracks
3. Plus : heatmap, timeline, temporal, genres, palette, ask, ai-insights, duet friends/compare, about, settings
4. Onboarding si compte sans data

Chasse : double sticky, chips coupés, tap < 44px, footer+nav, clavier sur Ask, sheet sous la nav, 3 cols métriques, copy landing. Livrable : liste bugs P0/P1 par route.
```

---

## Ordre si tu n’as que 4 sessions

| Session | Prompt |
| --- | --- |
| 1 | Étape 0 (chrome) |
| 2 | Étape 2 Artists |
| 3 | Étape 3 Genres |
| 4 | Étape 7 Temporal **ou** 10 AI insights **ou** 11–12 Duet (le plus douloureux au screenshot) |

Overview / heatmap / ask / palette : déjà plus natifs — les traiter en audit (1, 5, 8, 9) seulement après le chrome.

---

## Ce que tu colles si une page « a déjà du mobile »

Beaucoup d’écrans ont `lg:hidden` et **restent du desktop stacked**. Le prompt doit dire :

```text
N’accepte pas « il existe déjà un arbre mobile » comme succès. Succès = thumb zone, bleed, rails/rows/sheets, copy produit, empty dédié. Si l’arbre actuel est une stack de cards desktop, extrais un nouveau *-mobile.tsx comme musical-profile-mobile.
```
