# Crystal — Apple-product UI playbook

Playbook pour faire **ressembler** Soundprint à un produit Apple : calme, lisible, tactile, chrome en **verre** — tout en restant un **dashboard à onglets**.

Ce n’est **pas** une conversion Replay → récit / story. [Apple Music Replay](https://music.apple.com/be/replay) sert de **référence visuelle** (sélecteur, tuiles « Your Top Artists » : portrait + pied verre). [Apple Music Home](https://music.apple.com/be/home) sert pour la **sidebar verre**.

**Première page métier : `/dashboard/overview` (Your Music).**  
Le chrome (sidebar + header) se fait **avant** Overview, sinon chaque section sera restylée deux fois.

---

## Correction produit (à ne plus rater)

| On veut | On ne veut pas |
| --- | --- |
| Dashboard. Onglets. Un panneau à la fois (`view=`). | Remplacer les onglets par un scroll-histoire Replay |
| Le **look** du sélecteur Replay + des tuiles « Your Top Artists » | Cloner le wordmark / le rouge Apple Music |
| Sections **sans boîte widget** : titre sur le canvas + tuiles média | `rounded-[2rem]` + `shadow-card` + hover lift **autour** d’une section |
| Verre sur le **chrome** et sur le **pied des tuiles média** | Une carte verre autour d’un KPI / d’un widget entier |

**Source de vérité visuel (étapes 4–5, faites) :** tuiles portrait Replay — `aspect-[3/4]`, `rounded-[22px]`, rang grand, pied frost plein cadre (`.dashboard-replay-card-frost`), nom + métrique + sous-titre **toujours visibles**, pager 4-up + flèches circulaires.

- Spotlight : [`spotlight-artists-featured-list.tsx`](../lib/components/spotlight-artists-featured-list.tsx)
- Tops + pages suivantes : [`replay-ranking-grid.tsx`](../lib/components/replay-ranking-grid.tsx) (grille partagée, `grid-cols-2` + `lg:grid-cols-4`)
- Charts Overview : [`overview-trends-chart.tsx`](../lib/components/charts/overview-trends-chart.tsx) + [`crystal-chart.ts`](../lib/constants/crystal-chart.ts)

Le plus gros écart **restant** n’est plus Overview, artists / tracks / genres, ni le chrome header (**8a–8b faites**). **7f** a livré le chrome Ask + Duet friends / compare, mais a **volontairement laissé** friend-music en `TopLibraryCard`. **Vague en cours : Étape 9** — surfaces Duet produit (music / compare / friends) alignées sur Overview (tuiles Replay + overlay ami). **Après 9 : Étape 10** — wizard onboarding (`/dashboard/onboarding`), encore en hero cinématique + cartes verre alors que le reste du dashboard est Crystal.

---

## Faut-il activer le mode Plan ?

**Oui, pour chaque étape d’implémentation. Non, pas pour ce fichier.**

| Moment | Mode | Pourquoi |
| --- | --- | --- |
| Lire / ajuster ce playbook | Agent (ou rien) | Document uniquement |
| Étapes 0–5 (desktop Crystal) | — | **Livrées.** Ne pas rejouer. |
| Étape 6 (Overview mobile) | — | **Livrée.** Dual tree `lg:hidden` ; mêmes onglets que le desktop |
| Étape 7a–7g (artists → settings) | — | **Livrées.** Ne pas rejouer. |
| Étape 8a–8b (header actions) | — | **Livrées.** Ne pas rejouer. |
| Étape 9a–9d (Duet produit) | **Plan**, une session = un prompt **complet** | Pas les one-liners du tableau. Coller le bloc numéroté. |
| Étape 10a–10b (onboarding wizard) | **Plan**, une session = un prompt **complet** | Après 9. Coller le bloc 10a ou 10b. |

Règle d’or : **une conversation Plan = un prompt numéroté**. Après implémentation : EN + FR, light + dark, desktop `lg+` **et** mobile ~390×844.

Crystal **desktop Overview est livré**. Mobile = arbre `lg:hidden` dédié. Ne pas fusionner avec des `sm:`.

---

## Comment utiliser ce fichier

1. Ouvre une **nouvelle conversation en mode Plan**.
2. Colle le **préambule**.
3. Colle **un seul** prompt numéroté.
4. Valide le plan, implémente, vérifie au navigateur, commit.
5. Passe au numéro suivant.

Étapes **9a–9d** et **10a–10b** : coller le **bloc complet** (sections Étape 9a … / 10a …), pas la cellule du tableau d’ordre. Le tableau n’est qu’un index.

Hors scope de chaque prompt sauf mention contraire : landing marketing, e-mail, cookies, auth pages, APIs, Prisma.  
**Exception Étape 10** : le wizard onboarding **est** le scope (chrome seulement). Les prompts 0–9 gardent l’onboarding hors scope.

---

## Préambule (à coller au début de CHAQUE prompt)

```text
Contexte Soundprint : dashboard Next.js App Router, i18n en/fr/es, thèmes light + dark (class `html.dark`).
Breakpoint desktop sidebar = lg (1024px). Mobile = arbre dédié `lg:hidden`, pas du desktop compressé.

Projet Crystal : UI « produit Apple » sur un DASHBOARD À ONGLETS. On restyle la matière, on ne change pas le modèle d’information.
Garder : OverviewSectionSwitcher + DashboardSectionPanel + query param `view=` (spotlight / tops / trends / context / summary / friends / further). Un panneau visible à la fois — y compris sur mobile après l’étape 6.
Interdit : convertir Overview en story Replay (tout le contenu dans un seul scroll, onglets → ancres, tuer le switcher).

Inspiration visuelle (pas le branding) :
- Apple Music Home (music.apple.com/be/home) : sidebar verre.
- Apple Music Replay (music.apple.com/be/replay) : sélecteur (pills / segmented, pas une rangée de chips-cartes) ; tuiles « Your Top Artists » = portrait 3:4, coins ~22px, rang gros, pied frost plein cadre (nom + métrique toujours visibles). Copier `replay-ranking-grid.tsx` (étape 5, faite) — pas une liste iOS à la place des tuiles. Spotlight Overview reste la première recette (étape 4).

Inspirer, ne pas cloner : pas de logo Apple, pas de rouge Apple Music comme marque, pas de SF Pro sous licence. Accent Soundprint (violet / rose / cyan) en touches, pas en glow de carte.

Anti-carte (non négociable sur Overview) :
Interdit autour d’une SECTION : rounded-[2rem], shadow-card, ring-1, hover:-translate-y, border+gradient « widget », carte dans la carte, overlay hover qui cache le nom.
Autorisé : titre de section (large title / eyebrow 13px) collé au canvas ; tuile Replay (portrait, frost `.dashboard-replay-card-frost`, texte centré en bas) ; metric strip pour les KPI (pas des tuiles) ; verre chrome (sidebar, header, piste segmented, flèches Replay).
Listes iOS grouped : seulement pour du non-média (amis, settings), pas pour tracks / artistes / genres.

Scale : refined. Tracking négatif titres, labels 13px, cibles 44px.
Accessibilité verre : WCAG AA ; prefers-reduced-transparency → opaque ; prefers-reduced-motion.
design-system.md racine = LANDING dark. Ne pas le coller sur le dashboard. Source = globals.css + dashboard-ui.tsx + ce playbook.

Avant de proposer un plan : lis les fichiers du prompt. Pose 1 question si besoin. Ne change pas hooks / APIs / query params (startDate, endDate, userId, view).
```

---

## Nord visuel Replay → Overview

Référence : [Apple Music Replay](https://music.apple.com/be/replay) — **masthead**, **sélecteur**, et **Your Top Artists**.

### Masthead Overview (pas un hero-carte)

Replay / Apple Music Home : le titre de page vit **sur le canvas**, puis le sélecteur, puis la première section. Pas de billboard glow, pas de logo + avatar + badge dans une `rounded-[2rem]`.

Chez nous, **livré** (étapes 2.5 + 6) : [`OverviewHeroFrame`](../lib/components/overview-hero.tsx) — `h1` + insight typo sur le canvas, suit light/dark. `OverviewMobileHero` = wrapper compact du même frame. Plus de `OVERVIEW_MOBILE_HERO_SHELL` / `DashboardCinematicHeroBg` sur Overview.

### Sélecteur

Replay : une piste compacte, un item actif évident, le reste discret. Pas d’icône obligatoire, pas de carte qui encapsule chaque onglet.

Chez nous, **livré** (étapes 2–3 + 6) : `DASHBOARD_SEGMENTED_*` sur la période (`date-range-filter.tsx`) et sur les vues Overview (`dashboard-section-switcher.tsx`), y compris mobile (`idPrefix overview-mobile`).

### « Your Top Artists » (tuiles Replay — **fait**, étape 4)

Replay : le titre vit **sur le fond de page**. Quatre tuiles portrait. Photo plein cadre. Rang gros en haut à gauche. Pied **frost** (blur + dégradé, pas une pastille inset) : nom centré, métrique muted, toujours visibles. Flèches circulaires givrées + pager 1–4 / 5–8 / ….

Chez nous, c’est **livré** sur Overview `view=spotlight` :

- [`top-three-artists-overview-widget.tsx`](../lib/components/top-three-artists-overview-widget.tsx) — section canvas (eyebrow + titre + See all ghost)
- [`spotlight-artists-featured-list.tsx`](../lib/components/spotlight-artists-featured-list.tsx) — tuiles + pager
- [`top-three-artists-cards.tsx`](../lib/components/top-three-artists-cards.tsx) — **legacy** `CARD_SHELL` (débranché de `/artists` en 7a)

Recette à recopier (étapes 6+) — primitive partagée : [`replay-ranking-grid.tsx`](../lib/components/replay-ranking-grid.tsx) :

1. Pas de mega-carte autour de la section.
2. Grille 4-up (desktop) de tuiles `aspect-[3/4] rounded-[22px]`.
3. Pied `.dashboard-replay-card-frost` + texte blanc centré (nom, count, sous-titre). `prefers-reduced-transparency` : fond opaque, blur 0.
4. Pager si > 4 items : labels `{start}–{end}` au-dessus + flèches circulaires `bg-white/15 backdrop-blur-xl`.
5. Nom visible sans hover. Clic tuile = insight / navigation, pas un chrome de carte.
6. CTA See all = lien ghost, pas un footer de widget.

Les vues **tops** (desktop + mobile) reprennent déjà ces tuiles (`overview-library-replay.tsx`). `/artists` : Crystal 7a (tuiles Replay). `/tracks` `/genres` : encore hero/widget jusqu’à **7b–7c**.

### Anti-carte — inventaire Overview

Overview **fait** (étapes 2.5–6). Restant :

| Surface | Fichier | Pattern actuel |
| --- | --- | --- |
| `/artists` | 7a **faite** (tuiles Replay + 3 panneaux) | 4ᵉ onglet trends = 7b |
| `/tracks` `/genres` | shells page `rounded-[2rem]` | Hero/widget jusqu’à 7b–7c |
| `TopLibraryCard` | `overview-library-rankings.tsx` | Legacy ; encore Duet friend-music → **9a** |

Remplacement type Apple :

| Au lieu de | Utiliser |
| --- | --- |
| Widget card autour d’une section | Section : `h2` + contenu sur le canvas |
| Hero cinématique | Masthead : `h1` + insight en typo, pas de boîte |
| Carte KPI | Strip : label 13px au-dessus, chiffre large, hairline entre colonnes |
| Carte artiste / track / genre | Tuile Replay (portrait + frost) comme spotlight |
| Row dans une mini-carte (média) | Encore une tuile Replay, ou pager 4-up |
| Row non-média (amis, settings) | List row : titre, subtitle, count, hairline |
| Chip onglet | Segmented pill (chrome) ou labels discrets `1–4` (pager tuiles) |

Le verre n’est **pas** une carte de section. C’est chrome (sidebar / header / piste) **ou** le pied frost d’une tuile média.

---

## Règles d’architecture (pour toi, pas pour le modèle)

| Faire | Éviter |
| --- | --- |
| Tokens + primitives `dashboard-ui.tsx` d’abord | Restyler Overview avec des `bg-white/10` one-off |
| Sidebar verre **avant** la page | Peindre Overview sur un chrome encore opaque |
| Dual tree desktop / mobile | Un seul JSX `lg:` |
| Primitives : `DASHBOARD_GLASS_CHROME`, `DASHBOARD_SEGMENTED`, `DASHBOARD_SECTION_TITLE`, tuile Replay (`.dashboard-replay-card-frost`) | Réutiliser `DASHBOARD_WIDGET_CARD_SHELL` / `DASHBOARD_CINEMATIC_HERO_SHELL` / `CARD_SHELL` / `TopLibraryCard` sur Overview |
| Garder `view=` et un panneau à la fois | Story scroll, TOC-anchors à la place des tabs |
| Gemini `modify_frontend` après tokens, 1 surface | `create_frontend` d’Overview entier |
| Light **et** dark | Copier uniquement le dark Replay |

Fichiers chrome / Overview :

| Zone | Fichiers |
| --- | --- |
| Tokens | `app/globals.css`, `tailwind.config.ts` |
| Primitives | `lib/components/dashboard-ui.tsx` |
| Shell | `dashboard-scroll-wrapper.tsx`, `dashboard-main-area.tsx` |
| Sidebar | `lib/components/sidebar.tsx` |
| Header / période | `dashboard-sticky-header.tsx`, `date-range-filter.tsx` |
| Header actions | `notification-center.tsx`, `dashboard-user-menu.tsx` (**étape 8**) |
| Masthead Overview | `overview-hero.tsx` (`OverviewHeroFrame` + `OverviewMobileHero` compact **faits**) |
| Onglets Overview | `dashboard-section-switcher.tsx`, `overview-section-switcher.tsx` |
| Overview desktop | `overview/page.tsx`, `overview-desktop-flow.tsx`, `overview-stats-section.tsx`, `overview-library-replay.tsx`, `replay-ranking-grid.tsx`, `top-three-artists-overview-widget.tsx`, `spotlight-artists-featured-list.tsx`, `charts/overview-trends-chart.tsx` |
| Overview mobile | `overview-mobile-flow.tsx` (**fait** étape 6) |

---

## Étape 0 — Tokens verre + primitives sans-carte (**FAIT**)

**Pourquoi en premier :** `--surface-sidebar` est opaque. Les shells Overview sont des **cartes**. Sans primitives « section / featured / list / segmented », chaque job réinventera une boîte.

```text
[Préambule]

Étape 0 — Crystal tokens & primitives. Pas de page métier.

Fichiers : app/globals.css, tailwind.config.ts, lib/components/dashboard-ui.tsx.
Optionnel : docs/dashboard-design-system.md (nouveau). Ne pas écraser design-system.md (landing).

Objectif :
- Chrome : --glass-chrome, --glass-hairline, --glass-blur. Light verre blanc 0.62–0.78 ; dark #0b0d16 0.55–0.72.
- Primitive DASHBOARD_GLASS_CHROME (sidebar/header) DISTINCTE de toute carte de contenu.
- Nouvelles primitives Overview (classes exportées, pas encore branchées) :
  - DASHBOARD_SEGMENTED_TRACK + DASHBOARD_SEGMENTED_PILL (actif / inactif)
  - DASHBOARD_SECTION_TITLE (eyebrow 13px + titre tracking-tight)
  - DASHBOARD_FEATURED_MEDIA (frame pochette, pas une card)
  - DASHBOARD_LIST_ROW + séparateur hairline
  - DASHBOARD_METRIC_STRIP (chiffre + label, pas STATS_SHELL)
- @media (prefers-reduced-transparency: reduce) : fonds opaques, blur 0.
- Typo refined. Inter + system-ui (pas SF Pro).
- Documenter : DASHBOARD_WIDGET_CARD_SHELL et DASHBOARD_CINEMATIC_HERO_SHELL = legacy. Interdit sur Overview Crystal. Ne pas les supprimer encore (autres pages).

Contraintes : aucun layout Overview / nav. Light + dark. Pas de nouvelle dépendance CSS.

Livre : recettes exactes (classes), reduced-transparency, plan fichier par fichier.
```

---

## Étape 1 — Sidebar verre (Apple Music Home) (**FAIT**)

**Pourquoi ensuite :** signal « produit Apple » sur tout le dashboard. Référence : [Home](https://music.apple.com/be/home).

```text
[Préambule]

Étape 1 — Crystal glass sidebar desktop. lib/components/sidebar.tsx (+ tokens étape 0).

Référence : sidebar Apple Music web — frosted, hairline, nav compacte, contenu qui passe derrière.
Ne pas copier Listen Now / Browse / Radio. Garder groupes et hrefs Soundprint.

Objectif lg+ :
- aside : DASHBOARD_GLASS_CHROME, backdrop-blur-xl, hairline, plus de bg-surface-sidebar opaque ni shadow violette.
- Largeur w-64 / w-20 OK. Sticky viewport inchangé.
- Item actif : pill segmented (verre plus dense), pas tick brand-gradient + bg-primary/10 lourd.
- Nested : hairline, pas une carte dans la carte.
- Footer (avatar, thème, langue, sign-out) : même matière.
- z-index : sidebar > canvas, < modales.

Contraintes : IA nav inchangée (hrefs, badges Duet, demo, collapse). Mobile inchangé. e2e theme switcher verts.

Livre : classes + a11y focus sur verre. Light/dark, collapsed/expanded, Overview en fond pour juger le blur.
```

---

## Étape 2 — Header + sélecteur de période (Replay selector, chrome) (**FAIT**)

Le sélecteur Replay n’est pas seulement les onglets Overview : la **période** en header est le premier contrôle Apple-like que l’utilisateur touche.

```text
[Préambule]

Étape 2 — Crystal chrome : header + date range. Pas de restyle des widgets Overview.

Fichiers : dashboard-sticky-header.tsx, date-range-filter.tsx, dashboard-main-area.tsx, dashboard-scroll-wrapper.tsx.
Mobile : ne pas réouvrir MOBILE_UX étape 0. Si tu touches date-range-filter, desktop d’abord ; pas de régression sheet mobile.

Objectif lg+ :
- Header = DASHBOARD_GLASS_CHROME, hairline, pas de shadow violette.
- Date range = DASHBOARD_SEGMENTED_* (piste + pills), comme le year selector Replay. Custom accessible (pas enterré).
- Canvas calme pour que sidebar/header aient quelque chose à flouter.
- z-index header (z-30) > sidebar (z-20).
- **Hors scope ici** : `NotificationCenter` + `DashboardUserMenu` (coin droit) — voir **étape 8**.

Contraintes : mêmes query params période ; onboarding sans filtres ; Ask layout plein écran inchangé.

Livre : plan fichiers, états custom / all, a11y. Pas d’OverviewDesktopFlow ici.
```

---

## Étape 2.5 — Overview masthead (sortir de la carte glow) (**FAIT**)

**Pourquoi avant le sélecteur :** le chrome verre (étapes 1–2) a besoin d’un canvas calme. Le hero cinématique est encore la surface la plus « pas Apple » au-dessus des onglets. Restyler le tablist (étape 3) sous un glow violet fausse le jugement. Spotlight (étape 4) possède le grand visuel ; ce bloc ne doit pas le concurrencer.

Ce n’est **pas** une nouvelle carte plus sobre. C’est un en-tête de page.

```text
[Préambule]

Étape 2.5 — Crystal Overview masthead desktop. Pas de nouvelle carte. Pas d’étape 3 (switcher) ni 4 (spotlight).

Fichiers : lib/components/overview-hero.tsx, overview-desktop-flow.tsx, app/[locale]/dashboard/(main)/overview/page.tsx (états empty / error desktop qui réutilisent OverviewHeroFrame).
Duet : duet-friend-music-desktop.tsx importe OverviewHeroFrame — le flatten du shell partagé est voulu ; ne pas fourcher un deuxième hero cinématique pour Duet. Si Duet casse, corrige le frame, pas un fork Overview.
Mobile HORS SCOPE (OverviewMobileHero / étape 6). Ne pas toucher OVERVIEW_MOBILE_HERO_SHELL.

Référence : titre de page Apple Music Home / Replay — large title sur le canvas, puis le sélecteur. Pas de billboard, pas de wordmark dans le contenu.
Aujourd’hui : DASHBOARD_CINEMATIC_HERO_SHELL + DashboardCinematicHeroBg (always-dark, glow violet) + SoundprintBrandMark + avatar XL + OverviewPeriodBadgeButton + OverviewInsightCard (carte dans la carte).

Objectif lg+ :
- Plus de DASHBOARD_CINEMATIC_HERO_SHELL / OVERVIEW_DESKTOP_HERO_SHELL glow. Plus de DashboardCinematicHeroBg sur le desktop Overview.
- Masthead sur le canvas : eyebrow 13px (DASHBOARD_SECTION_EYEBROW) + h1 (titre page, tracking-tight) + insight en typographie (metric tabular-nums + titre + ligne muted). PAS OverviewInsightCard, PAS rounded-3xl border autour de l’insight.
- Light ET dark : le masthead suit le thème de la page. Interdit : forcer gray-950 / text-white en light.
- Retirer du masthead : wordmark Soundprint (sidebar), badge période (header étape 2). Avatar : omit, ou taille discrète à côté du titre — pas un header de profil.
- Artwork : omit, ou pochette 1:1 petite (DASHBOARD_FEATURED_MEDIA, ~120px, radius 12px) du top track. PAS une carte autour. Le grand visuel média = Spotlight (étape 4, **faite** : tuiles Replay, pas un featured #1 isolé).
- Garder : h1, buildOverviewPrimaryInsight (data inchangée), hint période si All, children (empty/error). Copy : ne plus dire « open a card » si le subtitle le dit encore (i18n overview.subtitle).
- Loading / empty / error desktop : même masthead sans-carte, pas le shell cinématique.

Contraintes : hooks / APIs / query params inchangés. Pas de story scroll. Pas de restyle du switcher ni des panneaux. i18n EN/FR. Demo ?userId=. Gemini modify_frontend 1 surface (masthead) si tu t’en sers.

Livre : avant/après classes, Duet friend-music toujours lisible, light/dark EN/FR desktop lg+. e2e overview si le DOM hero (shell / insight card) est asserté.
```

---

## Étape 3 — Overview : sélecteur d’onglets (Replay selector) (**FAIT**)

**On garde les 7 vues.** On restyle uniquement le tablist pour qu’il ait la famille Replay, plus une barre-carte de chips.

```text
[Préambule]

Étape 3 — Crystal Overview tab selector. IA INCHANGÉE (mêmes vues, view=, un panneau à la fois).

Fichiers : lib/components/dashboard-section-switcher.tsx, overview-section-switcher.tsx.
Les autres pages qui réutilisent DashboardSectionSwitcher (artists / tracks / genres) hériteront du look — c’est voulu (sélecteur Apple partout). Si une page casse, corrige le primitive, ne fourche pas Overview.

Référence : sélecteur Replay (music.apple.com/be/replay) — piste unique, pill actif, labels lisibles, peu ou pas d’icônes.
Aujourd’hui : rounded-[1.5rem] border shadow-sm + boutons rounded-2xl border (chips-cartes).

Objectif :
- tablist = DASHBOARD_SEGMENTED_TRACK.
- tab = DASHBOARD_SEGMENTED_PILL. Actif = contraste fort (fond opaque léger), inactif = muted, pas de border par chip.
- Overflow mobile : scroll-x sur la piste, pas une deuxième carte.
- Keyboard / ARIA déjà en place (Arrow, Home/End, tabpanel ids) : ne pas casser.

Contraintes : pas de nouvelle vue ; pas de story scroll ; i18n overview.viewSwitcher.* inchangé sauf si un label est trop long pour le pill (FR).

Livre : avant/après classes, vérif EN/FR light/dark, artists/tracks/genres switcher toujours utilisable, e2e si landmarks tabs.
```

---

## Étape 4 — Overview spotlight : tuiles Replay (**FAIT — ne pas rejouer**)

Vue `spotlight` desktop. **Livré.** Ne pas recoller ce prompt. Ne pas revenir à featured #1 + `DASHBOARD_LIST_ROW`.

Recette livrée (à copier via `replay-ranking-grid.tsx` aux étapes 6+) :

- Section canvas : eyebrow + titre + See all ghost. Pas de `rounded-[2rem]` / `shadow-card` autour de la section.
- Grille 4-up, `SPOTLIGHT_PAGE_SIZE = 4`, jusqu’à 10 artistes. Labels pager `{start}–{end}` au-dessus de la grille.
- Tuile : `aspect-[3/4] rounded-[22px]`, photo plein cadre, rang gros en haut à gauche, pied `.dashboard-replay-card-frost` (blur + mask, pas une pastille inset). Nom + streams + signature **toujours visibles**, centrés, texte blanc.
- Flèches circulaires `bg-white/15 backdrop-blur-xl`. Clavier flèches sur le tablist pager.
- Clic tuile → `onOpenArtistInsights`. Noms dans le document (a11y).
- Page `/dashboard/artists` : **7a faite** (`ReplayRankingGrid`, plus de `CARD_SHELL` 3-up).

Fichiers : `top-three-artists-overview-widget.tsx`, `spotlight-artists-featured-list.tsx`, `.dashboard-replay-card-frost` dans `globals.css`. i18n `overview.artistSpotlight.pageRange` / `pagesNav` / `previousPage` / `nextPage`.

---

## Étape 5 — Overview desktop : un-card le reste des onglets (**FAIT — ne pas rejouer**)

Desktop `lg+`. **Livré.** Ne pas recoller ce prompt. Ne pas revenir à `TopLibraryCard` / `STATS_SHELL_CLASS` sur Overview.

Recette livrée (à composer à l’étape 6, pas à réécrire) :

- **summary** — [`overview-stats-section.tsx`](../lib/components/overview-stats-section.tsx) : `DASHBOARD_METRIC_STRIP`, hairline, pas de tuiles 3:4.
- **tops** — [`overview-library-replay.tsx`](../lib/components/overview-library-replay.tsx) + [`replay-ranking-grid.tsx`](../lib/components/replay-ranking-grid.tsx) : 3 sections canvas (tracks / artists / genres), `REPLAY_PAGE_SIZE = 4`, frost, pager. `grid-cols-2 lg:grid-cols-4` déjà dans la grille.
- **trends** — [`overview-momentum-tabs.tsx`](../lib/components/overview-momentum-tabs.tsx) (`DASHBOARD_SEGMENTED_*`) + [`overview-trends-chart.tsx`](../lib/components/charts/overview-trends-chart.tsx) + [`crystal-chart.ts`](../lib/constants/crystal-chart.ts). Plot sur le canvas, pas de `Legend` Recharts. Les widgets summary artistes / tracks / genres **réutilisent déjà** ce chart.
- **context** — `OverviewCanvasFrame` (AI insights list rows + heatmap), pas de mega-carte.
- **friends** — `DASHBOARD_LIST_ROW`.
- **further** — [`overview-feature-promos.tsx`](../lib/components/overview-feature-promos.tsx) : list rows, plus de cartes promo.

`overview-library-rankings.tsx` (`TopLibraryCard`) n’est plus branché sur Overview ; encore Duet friend-music + tests. Mobile Overview compose `ReplayRankingGrid` via `overview-library-replay.tsx`.

i18n pager tops : `overview.replayPager.*`.

---

## Étape 6 — Overview mobile : même dashboard, même matière (**FAIT**)

Pas un récit Replay. **Même modèle d’information que le desktop Crystal** : `view=` + `OverviewSectionSwitcher`, un panneau à la fois. Le scroll unique actuel (hero + 3 listes de 3 + destinations) est l’ancien flow MOBILE_UX — à remplacer, pas à « adoucir ».

Dual tree : `lg:hidden` dédié. Ne pas fusionner avec des `sm:` sur `OverviewDesktopFlow`.

Composer les sections desktop déjà Crystal (`OverviewStatsSection`, `OverviewLibraryReplaySections`, `TopThreeArtistsOverviewWidget`, `OverviewMomentumTabs`, `OverviewFriendsSection`, `OverviewGoFurtherSection`, heatmap / AI) plutôt que de fourcher une deuxième grille Replay.

```text
[Préambule]

Étape 6 — Crystal Overview mobile. Desktop Crystal (étapes 0–5) HORS SCOPE — ne pas retoucher overview-desktop-flow.tsx ni replay-ranking-grid sauf pageSize optionnel.

Aujourd’hui (à remplacer) : MobileOverviewFlow = scroll unique SANS view=. OverviewMobileHero + DashboardCinematicHeroBg (always-dark). MobileMetricRail = cartes rounded-3xl bg-slate-950. MobileLeaderRow = rows-cartes rounded-2xl. DestinationRow = cartes promo. Pas de Spotlight Replay, pas de trends, pas de context.

Fichiers : lib/components/overview-mobile-flow.tsx, OverviewMobileHero + fallbacks empty/error/loading dans overview-hero.tsx, app/[locale]/dashboard/(main)/overview/page.tsx (wiring seulement). Réutiliser : overview-section-switcher.tsx, overview-stats-section.tsx, overview-library-replay.tsx, replay-ranking-grid.tsx, top-three-artists-overview-widget.tsx, overview-momentum-tabs.tsx, overview-go-further.tsx, overview-friends-section.tsx. e2e __tests__/e2e/mobile-dashboard.spec.ts si le DOM mobile est asserté.

Référence visuel : ReplayRankingGrid + OverviewHeroFrame desktop + overview-trends-chart.tsx. Pas musical-profile-mobile comme look média. Pas featured #1 + list rows.

Objectif < lg :
- Même 7 vues que le desktop (spotlight / tops / trends / context / summary / friends / further) via OverviewSectionSwitcher (idPrefix overview-mobile) + OverviewViewPanel. view= partagé. Un panneau à la fois. Piste DASHBOARD_SEGMENTED_* overflow-x, pas une deuxième carte.
- Masthead : plus de OVERVIEW_MOBILE_HERO_SHELL / DashboardCinematicHeroBg. Titre + insight sur le canvas, suit light/dark (même matière qu’OverviewHeroFrame, type un peu plus compact OK). Empty / error / loading mobile alignés.
- Summary : DASHBOARD_METRIC_STRIP (scroll-x si 4 colonnes ne tiennent pas). PAS MobileMetricRail cartes dark.
- Spotlight + tops : composer les widgets desktop. Grille déjà grid-cols-2 sous lg. Page = 4 tuiles (2×2), pager si > 4 — PAS un pager toutes les 2 tuiles. Si tu ajoutes pageSize, défaut desktop = 4.
- Trends : mêmes charts Crystal (OverviewTrendsChart), pas de carte-widget autour du SVG.
- Context : canvas (AI rows + heatmap), pas de boîte.
- Friends : list rows. Further : list rows (OverviewFeaturePromos), plus de DestinationRow cartes. Demander Ask / Duet / Profile peut rester en rows, pas rounded-2xl marketing.
- Bottom nav : ne pas retoucher sauf régression. Elle est bg-surface-glass/95, pas DASHBOARD_GLASS_CHROME — suffisant.

Contraintes : 44px, EN+FR, withFilters, demo ?userId=. prefers-reduced-transparency sur le frost. Ne pas réintroduire featured+list / CARD_SHELL / TopLibraryCard. Ne pas tuer view=.

Livre : avant/après (plus de cinematic hero ni rows-cartes média), view= mobile, ~390×844 + grand iPhone light/dark EN+FR, empty/error, e2e mobile overview.
```

---

## Étape 7 — Pages suivantes (après Overview)

Un écran par session. **Garder leurs onglets / panneaux.** Un-card + segmented + **`ReplayRankingGrid`** pour tout ranking média **top-N**. List rows seulement pour du non-média. Le switcher artists / tracks / genres est **déjà** Crystal (étape 3).

**Composer, ne pas réinventer.** Recette déjà livrée : [`replay-ranking-grid.tsx`](../lib/components/replay-ranking-grid.tsx), [`overview-hero.tsx`](../lib/components/overview-hero.tsx) (`OverviewHeroFrame`), [`DASHBOARD_METRIC_STRIP`](../lib/components/dashboard-ui.tsx), [`docs/dashboard-design-system.md`](./dashboard-design-system.md). Interdit : copier-coller le JSX des tuiles dans la page ; restyler `CARD_SHELL` « un peu plus Apple » ; hero always-dark.

Catalogue paginé + recherche (vue ranking, 10–50 lignes) : **pas** des tuiles 3:4. Un-card le chrome (`DASHBOARD_SPOTLIGHT_*`), chercheur = `DASHBOARD_SEARCH_FIELD`. Thumb + nom + métrique, hairline — pas `rounded-2xl` + `shadow-sm` par row.

Les plots Overview + widgets `*-trends-summary-widget.tsx` utilisent **déjà** `OverviewTrendsChart`. Ne pas les restyler. Le **corps** de `/artists/trends` `/tracks/trends` `/genres/trends` **et** `/timeline` `/heatmap` = **7e** (chrome + plots `DASHBOARD_CHART_THEME` encore legacy sur les pages dédiées). Le **4ᵉ onglet** du listing (lien vers `*/trends`) = 7b / 7c, pas 7e.

### Contrat d’onglets artists / tracks (cible produit)

Les deux pages ont **le même modèle d’information** : 4 items dans le sélecteur. Les 3 premiers sont des panneaux locaux (`view=`). Le 4ᵉ **n’est pas un panneau** : c’est une navigation vers la page trends dédiée.

| # | `id` | Label EN (FR) | Contenu | Où |
| --- | --- | --- | --- | --- |
| 1 | `spotlight` | Top artists / Top tracks (Top artistes / Top titres) | `ReplayRankingGrid` top-N, pager 4 | `view=` défaut (`spotlight`) |
| 2 | `leaderboard` | Top 20 | BarChart top 20 sur le canvas | `view=leaderboard` |
| 3 | `ranking` | Full ranking (Classement complet) | catalogue search + pagination, **pas** de tuiles 3:4 | `view=ranking` |
| 4 | `trends` | Trends (Tendances) | **lien** — pas un 4ᵉ `tabpanel` | `/dashboard/artists/trends` ou `/dashboard/tracks/trends` (dates / `userId` conservés) |

**Ne pas fusionner tuiles + bar chart dans le même onglet.** Spotlight = tuiles Replay. Leaderboard = chart seulement. Ranking = liste. Trends = autre route.

**7a livrée :** 3 onglets locaux (spotlight / leaderboard / ranking) + CTA trends ghost dans le masthead. **Manque :** le 4ᵉ item `trends` dans le switcher (et le même switcher sur `/artists/trends`). 7b aligne `/artists` sur ce contrat **et** livre `/tracks` dessus.

Ordre (index). **7a–7g = blocs complets plus bas.** Puis **étape 8** (header actions).

| # | Route | Session |
| --- | --- | --- |
| **7a** | `/dashboard/artists` | **Faite** (visuel). Recette : masthead + strip + `ReplayRankingGrid` + un-card chart/table. Dual tree. 4ᵉ onglet trends = 7b. |
| **7b** | `/dashboard/tracks` | Même **4 onglets** que la cible artists. 1er = tuiles Top tracks (pas le bar chart). + parité trends sur `/artists`. |
| **7c** | `/dashboard/genres` | Même contrat 4 onglets (top / chart / ranking / lien trends). `GENRE_SPOTLIGHT_CARD_SHELL` → `ReplayRankingGrid` `kind: "fill"`. |
| **7d** | `/dashboard/musical-profile` | **Hub empilé** (pas de `view=`). Masthead canvas + strip + tuiles Replay (top 4) + list rows destinations. Dual tree. |
| **7e** | `/timeline`, `/heatmap`, `*/trends` | Chrome canvas + plots Crystal (`OverviewTrendsChart` / `crystal-chart.ts`). Dual tree. |
| **7f** | Ask + Duet (friends / compare) | Chrome seulement. `TopLibraryCard` friend-music **hors scope** → **étape 9a**. |
| **7g** | Empty + AI Insights + temporal + palette + settings | **Faite.** Canvas / list rows ; empty partagés Crystal ; dual tree. |

**Après 7g — chrome header actions (étape 8).** Index :

| # | Surface | Session |
| --- | --- | --- |
| **8a** | Centre de notifications (cloche) | **Faite.** Chrome panneau + trigger. IA / polling / sources inchangés. |
| **8b** | Menu compte (avatar) | **Faite.** Chrome menu + trigger. Settings / sign-out / profil inchangés. |

**Après 8 — Duet produit (étape 9).** Index :

| # | Route / surface | Session |
| --- | --- | --- |
| **9a** | `/dashboard/duet/music?friendUserId` · `view=tops` | Média : `TopLibraryCard` / rows → tuiles Replay + overlay insights **ami**. |
| **9b** | Friend-music chrome + `view=trends` | **Faite** — picker / gated / skeleton Crystal ; chart `OverviewTrendsChart`. |
| **9c** | `/dashboard/duet/compare` · `section=` | Cohérence overview / shared / target + empty picker. |
| **9d** | `/dashboard/duet/friends` · `section=` | Polish residual + sub-nav Duet cross-routes. |

---

### Étape 7a — `/dashboard/artists` (**FAITE** — recette visuelle à copier)

Visuel Crystal **livré**. Ne pas recoller ce prompt. L’IA **cible** est le [contrat d’onglets](#contrat-donglets-artists--tracks-cible-produit) (4 items). 7a a livré les 3 panneaux locaux ; le 4ᵉ onglet trends se fait en **7b** (parité), pas ici.

```text
[Préambule]

Étape 7a — Crystal /dashboard/artists. Une page. Composer les primitives Overview (étapes 4–6), ne pas les réécrire.

Aujourd’hui (à remplacer) :
- Desktop : ARTISTS_HERO_SHELL always-dark rounded-[2rem] + glow + KPI en mini-cartes verre. Spotlight = mega-carte rounded-[2rem] + TopThreeArtists CARD_SHELL 3-up (hover overlay qui cache le nom) + AllArtistsGrid 4–10 dans la même boîte. Leaderboard = DASHBOARD_SPOTLIGHT_SHELL + BarChart glow. Ranking = table dans DASHBOARD_SPOTLIGHT_*.
- Mobile : artists-mobile.tsx — DashboardCinematicHeroBg always-dark, SignalTile snap-cartes, ArtistRankRow rounded-2xl border+shadow. PAS de view= / switcher (scroll unique). e2e mobile-dashboard.spec.ts assert tablist artist sections = 0.

Fichiers : app/[locale]/dashboard/(main)/artists/page.tsx, lib/components/artists-mobile.tsx, lib/components/top-three-artists-cards.tsx (ne plus l’importer ici), lib/components/artist-user-insights-panel.tsx (flatten chrome fiche, garder le drawer). Réutiliser SANS copier le JSX tuile : replay-ranking-grid.tsx (ReplayRankingSection + ReplayRankingGrid + ReplayRankingSkeleton), overview-hero.tsx (OverviewHeroFrame / compact), dashboard-ui.tsx (DASHBOARD_METRIC_STRIP, DASHBOARD_SECTION_*, DASHBOARD_SEARCH_FIELD, DASHBOARD_BTN_GHOST). Switcher déjà Crystal : dashboard-section-switcher.tsx — ne pas le restyler. Mapping tuiles : overview-library-replay.tsx (kind: "artist"). e2e : __tests__/e2e/mobile-dashboard.spec.ts si le DOM mobile change. HORS SCOPE : artists/trends, Overview, hooks / APIs / query params (startDate, endDate, userId, view, page, pageSize).

Référence visuel : Overview masthead + ReplayRankingGrid + metric strip. docs/dashboard-design-system.md (Replay tiles). Pas musical-profile-mobile comme look média. Pas featured #1 + list rows.

Objectif — garder ARTISTS_VIEWS (spotlight / leaderboard / ranking), view=, un panneau à la fois, y compris mobile (comme Overview étape 6, pas le scroll unique MOBILE_UX).

Desktop lg+ :
- Masthead : plus de ARTISTS_HERO_SHELL / radial glow / KPI-cartes. Titre + subtitle sur le canvas, suit light/dark (même matière qu’OverviewHeroFrame ; réutiliser le frame OK). CTA trends = DASHBOARD_BTN_GHOST (pas bouton blanc lift). Badge période : déjà dans le header — ne pas le reposer en carte. Stats = DASHBOARD_METRIC_STRIP (total artistes / écoutes / top), PAS rounded-2xl. Empty / error / loading : même masthead sans-carte.
- Section titles : DASHBOARD_SECTION_EYEBROW + DASHBOARD_SECTION_TITLE (pas font-mono uppercase tracking-[0.24em] primary).
- Spotlight : plus de CARD_SHELL / TopThreeArtists / mega-carte roster / AllArtistsGrid. Un ReplayRankingSection + ReplayRankingGrid des top artistes (jusqu’à 10, pager 4, défaut REPLAY_PAGE_SIZE = 4). media.kind = "artist" (artistId, artistName, imageUrl). Clic tuile → handleOpenArtistInsights. Nom + métrique toujours visibles, pas d’overlay hover. Loading = ReplayRankingSkeleton.
- Leaderboard : garder le BarChart (IA charts). Sortir DASHBOARD_SPOTLIGHT_SHELL / INNER_WELL / feDropShadow glow. Plot sur le canvas. Ne pas transformer ce panneau en tuiles Replay (c’est spotlight).
- Ranking : garder recherche + pagination catalogue. PAS des tuiles 3:4. Un-card DASHBOARD_SPOTLIGHT_*. Search = DASHBOARD_SEARCH_FIELD. Rows : thumb + nom + count, hairline, pas une mini-carte par ligne.
- Fiche ArtistUserInsightsPanel : garder open/close + données. Pochette + nom + métriques visibles sans hover. Plus de INSIGHT_CARD_SOLID / well carte autour de chaque bloc. Ne pas en faire une tuile Replay dans le tiroir.

Mobile < lg (artists-mobile.tsx, dual tree — ne pas fusionner avec sm: sur le desktop) :
- Même 3 vues via ArtistsViewSwitcher (idPrefix artists-mobile) + view= partagé. Piste segmented overflow-x, pas une deuxième carte.
- Masthead : plus de HERO_SHELL / DashboardCinematicHeroBg / MusicalProfilePeriodBadge dans le hero (période = header). Titre + insight/strip sur le canvas, light/dark. Compact OK.
- Spotlight : composer ReplayRankingGrid (page 4 = 2×2). PAS ArtistRankRow cartes pour le top.
- Strip : DASHBOARD_METRIC_STRIP (scroll-x si besoin). PAS SignalTile rounded-3xl bg-gray-950.
- Leaderboard : chart sur canvas sans shell, ou omettre si illisible à 390px — ne pas inventer une 2e grille tuiles.
- Ranking : recherche + liste paginée un-carded (cibles 44px). e2e : une rangée / tuile ouvre toujours les insights (aria artistInsightsAriaOpen). Lien Artist trends conserve les dates / userId.
- Empty / error / skeleton alignés (plus de cinematic).

Contraintes : 44px, EN+FR, demo ?userId=, prefers-reduced-transparency sur le frost. Ne pas réintroduire CARD_SHELL / hover overlay / featured+list. Ne pas tuer view=. Ne pas changer REPLAY_PAGE_SIZE défaut. i18n pager : réutiliser overview.replayPager.* ou ajouter artists.replayPager. Gemini modify_frontend 1 surface si tu t’en sers. top-three-artists-cards.tsx : plus branché sur /artists ; ne pas supprimer le fichier tant que le test dédié existe — ou mets le test à jour / supprime-le si plus rien ne l’importe.

Livre : avant/après (plus de hero always-dark ni CARD_SHELL 3-up), view= desktop+mobile, ~390×844 + lg+ light/dark EN/FR, empty/error, fiche insights, e2e artists mobile (tablist désormais attendu ; plus de count 0).
```

---

### Étape 7b — `/dashboard/tracks` (après 7a) + parité onglet trends `/artists`

Copier **l’IA livrée en 7a** (3 panneaux : tuiles → bar chart → ranking), puis **fermer le contrat 4 onglets** sur les deux pages. Interdit : coller les tuiles Replay dans l’onglet Top 20.

```text
[Préambule]

Étape 7b — Crystal /dashboard/tracks + parité 4ᵉ onglet trends sur /artists. Composer ReplayRankingGrid + masthead canvas comme 7a (faite). Ne pas réécrire la tuile. Ne pas restyler le corps de /tracks/trends ni /artists/trends (7e).

Contrat d’onglets (non négociable, artists ET tracks) — 4 items, même ordre :

1. spotlight — EN "Top tracks" / FR "Top titres" (artists déjà : "Top artists" / "Top artistes"). Panneau : ReplayRankingGrid. Défaut (pas de view= ou view=spotlight).
2. leaderboard — "Top 20". Panneau : BarChart top 20 SEUL sur le canvas. PAS de tuiles ici.
3. ranking — "Full ranking" / "Classement complet". Catalogue search + pagination. PAS de tuiles 3:4.
4. trends — "Trends" / "Tendances". PAS un tabpanel : navigation vers /dashboard/tracks/trends (listing tracks) ou /dashboard/artists/trends (listing artists). Conserver startDate, endDate, userId. Retirer view= / page / pageSize / q du query string trends.

Aujourd’hui (à remplacer) :
- Tracks desktop : TRACKS_HERO_SHELL always-dark rounded-[2rem] + KPI-cartes. TRACKS_LOCAL_VIEWS = leaderboard + ranking seulement (pas de 1er onglet tuiles). Leaderboard = DASHBOARD_SPOTLIGHT_SHELL + BarChart glow. Ranking = table DASHBOARD_SPOTLIGHT_*. 3ᵉ item switcher = trends (lien) — garder ce pattern, l’insérer en 4ᵉ après le nouveau spotlight.
- Tracks mobile : tracks-mobile.tsx = cinematic hero + SignalTile + rows-cartes. e2e tablist track sections = 0.
- Artists (7a livrée) : 3 onglets locaux OK. Trends = seulement CTA ghost masthead (ArtistsMasthead). /artists/trends n’a PAS le switcher (contrairement à /tracks/trends qui a déjà TracksSectionSwitcher). À aligner.

Fichiers tracks : app/[locale]/dashboard/(main)/tracks/page.tsx, lib/components/tracks-mobile.tsx, lib/utils/tracks-section.ts, lib/components/tracks-section-switcher.tsx (look déjà Crystal — ne pas restyler les pills ; étendre les items). Nouveau OK : tracks-spotlight.tsx (miroir de artists-spotlight.tsx) + tracks-chrome.tsx si tu sors masthead/strip de page.tsx. Réutiliser SANS copier le JSX tuile : replay-ranking-grid.tsx, artists-spotlight.tsx (recette), overview-hero.tsx, dashboard-ui.tsx (metric strip, search field, section titles). Mapping tuiles : overview-library-replay.tsx — title = nom du titre, subtitle = artiste, metric = écoutes, media.kind = "artist" (artistId / artistName, pas d’artwork track dédié). Limite + pager = même chose que ArtistsSpotlight (ARTISTS_SPOTLIGHT_LIMIT / pager 4). e2e : __tests__/e2e/mobile-dashboard.spec.ts.

Fichiers artists (parité IA seulement, pas un 2ᵉ restyle Crystal) : lib/components/artists-view-switcher.tsx, lib/components/artists-chrome.tsx, app/[locale]/dashboard/(main)/artists/page.tsx, lib/components/artists-mobile.tsx, app/[locale]/dashboard/(main)/artists/trends/page.tsx (+ mobile trends si le switcher y vit). Introduire le même split que tracks-section.ts : vues locales vs section trends (ARTISTS_SECTIONS = spotlight / leaderboard / ranking / trends). Brancher le switcher 4 items sur /artists ET sur /artists/trends (activeSection="trends"), comme TracksSectionSwitcher l’est déjà sur /tracks/trends.

i18n EN+FR+ES : tracks.viewSwitcher.views.spotlight ; artists.viewSwitcher.views.trends. Ne pas rester sur un label "Top 20" pour le 1er onglet tracks.

HORS SCOPE : APIs / hooks data ; query params métier (startDate, endDate, userId, page, pageSize, q) — view= spotlight|leaderboard|ranking EST dans le scope (nouvelle valeur spotlight, défaut = spotlight comme artists). Corps visuel des pages */trends (hero always-dark, charts DASHBOARD_CHART_THEME) = 7e. Overview. Genres.

Objectif tracks — 4 items, un panneau à la fois pour 1–3, y compris mobile (comme artists 7a / Overview étape 6, pas le scroll unique MOBILE_UX).

Desktop lg+ tracks :
- Masthead canvas (OverviewHeroFrame / même matière qu’ArtistsMasthead) + DASHBOARD_METRIC_STRIP. Plus de TRACKS_HERO_SHELL / glow / badge période carte / KPI rounded-2xl. Light ET dark. Ne PAS remettre un CTA trends dans le masthead : le 4ᵉ onglet EST le chemin.
- Spotlight (nouveau 1er onglet) : ReplayRankingSection + ReplayRankingGrid des top tracks. PAS featured+list, PAS TopLibraryCard, PAS CARD_SHELL. Loading = ReplayRankingSkeleton. Clic tuile : même règle qu’Overview tops (artiste via media.kind artist) — ne pas inventer un drawer track si la page n’en a pas.
- Leaderboard : garder le BarChart (IA charts, top 20). Sortir DASHBOARD_SPOTLIGHT_SHELL / INNER_WELL / glow. Plot sur le canvas. INTERDIT de mettre ReplayRankingGrid dans cet onglet (c’est spotlight).
- Ranking : un-card table + DASHBOARD_SEARCH_FIELD + pagination. PAS des tuiles 3:4 pour 20+ rows.
- Section titles : DASHBOARD_SECTION_*. Empty / error / loading sans-carte.
- Switcher : TracksSectionSwitcher à 4 items (spotlight, leaderboard, ranking, trends). trends → router.push /dashboard/tracks/trends + dates/userId. Défaut listing = spotlight.

Mobile < lg tracks :
- Mêmes 3 panneaux + 4ᵉ item trends via TracksSectionSwitcher idPrefix tracks-mobile, view= partagé.
- Plus de cinematic / SignalTile / rows-cartes média pour le top. Spotlight = Replay 2×2. Leaderboard = chart canvas (ou omettre si illisible à 390px — ne pas inventer une 2ᵉ grille tuiles). Ranking = liste paginée un-carded 44px.
- e2e : tablist désormais attendu (plus de count 0) ; 4 items ; première tuile / rangée tappable ; item trends conserve dates / userId.

Parité artists (petit diff, même session) :
- 4ᵉ item trends dans le switcher (desktop + mobile), même pattern que tracks (local vs navigation).
- Monter ce switcher sur /artists/trends avec trends actif — ne pas restyler le hero/chart trends.
- Retirer le Link viewTrends du masthead (ArtistsMasthead) une fois l’onglet en place, pour ne pas avoir deux chemins. Empty / error / skeleton artists : plus besoin de trendsHref dans le masthead.

Contraintes : 44px, EN+FR (+ ES labels switcher), demo ?userId=, frost reduced-transparency. Ne pas cloner le JSX tuile. Ne pas fusionner spotlight et leaderboard. Ne pas changer REPLAY_PAGE_SIZE défaut. Gemini modify_frontend 1 surface si tu t’en sers.

Livre : tracks sans hero always-dark ni spotlight-shell ; 4 onglets identiques artists/tracks (top → top 20 chart → ranking → trends lien) ; view= spotlight par défaut sur /tracks ; /artists a l’onglet trends ; light/dark EN/FR ~390×844 + lg+ ; e2e tracks mobile (tablist attendu) + artists (4ᵉ item).
```

---

### Étape 7c — `/dashboard/genres` (après 7a–7b)

```text
[Préambule]

Étape 7c — Crystal /dashboard/genres. Même recette que 7a–7b (faites), y compris le contrat 4 onglets : spotlight (tuiles) / distribution (chart) / ranking / trends = lien vers /dashboard/genres/trends (pas un panneau ; retirer le CTA trends du hero une fois l’onglet en place). Composer ReplayRankingGrid. Ne pas retoucher artists/tracks ni le corps de genres/trends (7e) ni palette (sauf régression lien).

Aujourd’hui : GENRES_HERO_SHELL always-dark. Spotlight = GENRE_SPOTLIGHT_CARD_SHELL 3-up (collage 3 artistes, overlay hover qui cache le nom, panneau verre inset) + gallery 4–10. Distribution = GenreDistributionChart showShell (carte). Ranking = DASHBOARD_SPOTLIGHT_SHELL + rows. Mobile genres-mobile.tsx = cinematic + cartes. e2e tablist genre sections = 0.

Fichiers : app/[locale]/dashboard/(main)/genres/page.tsx, lib/components/genres-mobile.tsx, app/[locale]/dashboard/(main)/genres/trends/page.tsx (switcher seulement). Réutiliser : replay-ranking-grid.tsx, overview-hero.tsx, dashboard-ui.tsx, overview-library-replay.tsx (genres → media.kind "fill", seed = nom du genre). Switcher déjà Crystal. e2e mobile-dashboard.spec.ts. HORS SCOPE : corps visuel de /genres/trends (7e), /genres/palette (lien ghost OK), APIs / hooks / query params métier.

Objectif — GENRES_VIEWS locales (spotlight / distribution / ranking) + 4ᵉ item trends (navigation vers /dashboard/genres/trends), view=, un panneau à la fois desktop ET mobile. Ne pas fusionner tuiles et pie/bar dans le même onglet.

Desktop lg+ :
- Masthead canvas + metric strip (count genres / écoutes / top genre name). Plus de GENRES_HERO_SHELL / glow / KPI-cartes / badge période carte. Pas de CTA trends dans le masthead : le 4ᵉ onglet EST le chemin.
- Spotlight : plus de GENRE_SPOTLIGHT_CARD_SHELL / hover overlay / collage 3-up. ReplayRankingSection + ReplayRankingGrid top genres (jusqu’à 10, pager 4). fill + initiale. title = genre, metric = écoutes, subtitle = % ou 1–3 artistes en texte (pas tags-cartes). Nom toujours visible. Loading = ReplayRankingSkeleton. Ne pas réintroduire group-hover:opacity-0 sur le nom.
- Distribution : GenreDistributionChart sur le canvas (showShell false / sortir la carte rounded-[2rem]). Garder pie|bar IA. Pas de blur sur le SVG. Ne pas remplacer par OverviewTrendsChart (données différentes). Ne pas restyler les widgets *-trends-summary-widget (déjà Crystal).
- Ranking catalogue : un-card + DASHBOARD_SEARCH_FIELD + pagination. PAS tuiles 3:4 pour le catalogue.
- Palette notice / liens : ghost, pas cartes promo.
- Switcher 4 items ; trends → /dashboard/genres/trends (dates / userId). Monter le même switcher sur /genres/trends (active = trends).

Mobile < lg :
- Mêmes 3 panneaux + 4ᵉ item trends, idPrefix genres-mobile, view= partagé.
- Plus de cinematic. Spotlight = Replay 2×2 fill. Distribution = plot sans shell. Ranking = liste un-carded. e2e : tablist attendu, première rangée tappable, dates / userId, item trends.

Contraintes : 44px, EN+FR, demo ?userId=. Ne pas cloner CARD_SHELL « genre ». Ne pas tuer view=.

Livre : plus de GENRE_SPOTLIGHT_CARD_SHELL ni hero always-dark, 4 onglets (top / chart / ranking / trends lien), view= mobile, light/dark EN/FR, e2e genres mobile (tablist désormais attendu).
```

---

### Étape 7d — `/dashboard/musical-profile` (après 7a–7c)

Hub d’accueil dashboard. **Pas** de `view=` / switcher (validé) : rester empilé, un écran. **Pas** un récit Replay. Dual tree conservé.

```text
[Préambule]

Étape 7d — Crystal /dashboard/musical-profile. Hub empilé (PAS de view= / PAS de tablist). Composer OverviewHeroFrame + DASHBOARD_METRIC_STRIP + ReplayRankingGrid + DASHBOARD_LIST_ROW. Ne pas réécrire la tuile. Ne pas toucher Ask / Duet / timeline / heatmap / onboarding / MusicalProfilePeriodBadge sur les autres pages.

Aujourd’hui (à remplacer) :
- Desktop : hero rounded-[2rem] always-dark + ParallaxHero + grain/orbes/sweep. Period badge dans le hero (déjà dans le header). Cockpit : avatar well + KPI mini-cartes + rythme cartes imbriquées. CTA blanc lift « Open Your Music » ET 3 FeaturePillarCard (rounded-3xl + shadow-card + hover lift). Identité IA = 2e mega-carte always-dark (carte dans la carte).
- Mobile : musical-profile-mobile.tsx — bleed bg-gray-950 cinématique, h1 = nom d’artiste, rail KPI rounded-3xl dark, DestinationRow cartes, quote dans un well dark. e2e : h1 + liens Your Music / Soundprint chat / Duet. PAS de tablist — ne pas en ajouter.

Fichiers : app/[locale]/dashboard/(main)/musical-profile/page.tsx, lib/components/musical-profile-mobile.tsx. Nouveau : lib/components/musical-profile-chrome.tsx (masthead, strip, destinations, identité) + lib/components/musical-profile-spotlight.tsx si le mapping Replay encombre. Réutiliser SANS copier le JSX tuile : replay-ranking-grid.tsx, artists-spotlight.tsx (toArtistReplayItems), overview-hero.tsx, dashboard-ui.tsx, overview-feature-promos.tsx (pattern list row). e2e : __tests__/e2e/mobile-dashboard.spec.ts. Ne PAS supprimer musical-profile-cinematic.tsx (onboarding). HORS SCOPE : APIs / hooks / query params (startDate, endDate, userId) ; 7e–7f.

IA — garder le hub empilé, même ordre desktop ET mobile : masthead → metric strip → tuiles Replay top 4 → destinations list rows → citation IA. Un écran, pas un panneau à la fois. Ne pas inventer un contrat rankings 4 onglets.

Desktop lg+ :
- Masthead : OverviewHeroFrame, h1 = musical-profile.title, subtitle allégé (plus « premium replay »). Light ET dark. Plus de ParallaxHero / cinematic / wordmark / period badge / CTA lift masthead.
- Strip : DASHBOARD_METRIC_STRIP (streams / temps / artistes / titres + peak day / hour). Scroll-x sous lg. PAS de mini-cartes rythme.
- Spotlight : ReplayRankingSection + ReplayRankingGrid jusqu’à 4 artistes (kind: "artist"), 1 page, PAS de pager. Loading = ReplayRankingSkeleton. See all ghost → /dashboard/artists (dates / userId). TOP_LIMIT = 6 reste pour l’input IA ; slice(0, 4) pour l’affichage.
- Destinations : DASHBOARD_LIST_ROW + hairline (Your Music, Chat, Duet). Plus de FeaturePillarCard / hover lift.
- Identité : citation en typo canvas. Quota / backfill / AiUnavailableCta (tone default). Plus de rounded-3xl dark.
- Empty / error / loading : même masthead sans-carte.
- Retirer SoundprintBrandDividerSection.

Mobile < lg (musical-profile-mobile.tsx, dual tree — ne pas fusionner avec sm:) :
- Même ordre de sections. Masthead compact. Plus de cinematic bleed / period badge / h1 = nom d’artiste.
- Strip scroll-x. Spotlight Replay 2×2. Destinations = list rows (aria-label = titre pour e2e Your Music / Chat / Duet). Quote canvas.
- Empty / error : OverviewHeroFrame compact + CTAs (pas DashboardMobileImportEmpty cinématique).

Contraintes : 44px, EN+FR (+ ES copy), demo ?userId=, frost reduced-transparency. Ne pas cloner le JSX tuile. Ne pas tuer le dual tree. Ne pas introduire view=. Gemini modify_frontend 1 surface si tu t’en sers.

Livre : plus de hero always-dark ni FeaturePillarCard ; hub empilé Crystal ; light/dark EN/FR ~390×844 + lg+ ; e2e hub (h1 + 3 liens, tablist count 0).
```

---

### Étape 7e — Timeline, heatmap, `*/trends` (après 7a–7d)

Session multi-surfaces, **une** conversation Plan. Même recette chrome partout ; plots = composer `OverviewTrendsChart` / `crystal-chart.ts` (pas une 2ᵉ grammaire SVG). Les widgets `*-trends-summary-widget.tsx` et Overview `view=trends` / heatmap Overview sont **déjà** Crystal — ne pas les retoucher.

```text
[Préambule]

Étape 7e — Crystal temporal + trends pages. Composer OverviewHeroFrame + DASHBOARD_METRIC_STRIP + OverviewTrendsChart + crystal-chart.ts. Ne pas réécrire la tuile Replay. Ne pas retoucher Overview, listings artists/tracks/genres (sauf régression switcher trends), musical-profile, Ask, Duet.

Contrat (non négociable) :
- Chrome de page = masthead canvas (light/dark) + metric strip. Plus de *_HERO_SHELL always-dark rounded-[2rem] + glow + KPI mini-cartes verre.
- Plot = sur le canvas. Plus de DASHBOARD_SPOTLIGHT_SHELL / INNER_WELL / feDropShadow glow autour du SVG. Pas de blur sur le SVG.
- Lignes / aires multi-séries : OverviewTrendsChart (+ getCrystalSeriesColor). Interdit : DASHBOARD_CHART_THEME, Recharts Legend, ticks X inclinés, .chart-tooltip-accessible (utiliser .crystal-chart-tooltip via OverviewTrendsTooltip).
- Pickers / période / cumulative : déjà Crystal (PeriodSelector segmented, ListenTrendChartViewToggle, DASHBOARD_FILTER_CHIP, DASHBOARD_SEARCH_FIELD). Ne pas les restyler.
- Switchers artists/tracks/genres sur les pages */trends : déjà Crystal (7b–7c). Ne pas les restyler ; activeSection="trends" inchangé.
- IA métier inchangée : period, sélection séries, commentary Groq, day-details heatmap, query params (startDate, endDate, userId, period, artistIds/trackIds/…).

Aujourd’hui (à remplacer) :
- Desktop timeline : TIMELINE_HERO_SHELL always-dark + KPI-cartes ; chart dans DASHBOARD_SPOTLIGHT_SHELL + DASHBOARD_CHART_THEME LineChart.
- Desktop heatmap : HEATMAP_HERO_SHELL always-dark + KPI-cartes ; calendrier dans DASHBOARD_SPOTLIGHT_SHELL (lime).
- Desktop */trends (artists, tracks, genres) : TRENDS_HERO_SHELL always-dark + KPI-cartes + CTA blanc lift « back » ; chart LineChart + Legend + DASHBOARD_CHART_THEME dans DASHBOARD_SPOTLIGHT_* ; titres section font-mono uppercase primary ; souvent OVERVIEW_STARTUP_SURFACE / carte rounded-[2rem] hover-lift pour le panneau commentary IA.
- Mobile timeline/heatmap : TimelineMobile* / HeatmapMobile* — HERO_SHELL bg-gray-950 + DashboardCinematicHeroBg, SignalTile / rows-cartes.
- Mobile */trends : trends-mobile-hub.tsx — TRENDS_MOBILE_HERO cinematic, TrendsMobileSignalTile dark, DestinationRow cartes. artist-trends-mobile / track-trends-mobile / genre-trends-mobile composent ce hub.

Fichiers (scope) :
- Timeline : app/[locale]/dashboard/(main)/timeline/page.tsx, lib/components/timeline-mobile.tsx, lib/components/timeline-mobile-spark.tsx (un-card si carte).
- Heatmap : app/[locale]/dashboard/(main)/heatmap/page.tsx, lib/components/heatmap-mobile.tsx, lib/components/heatmap-day-details-panel.tsx (flatten chrome fiche / sheet, garder open/close + données). calendar-heatmap.tsx = cellules couleur — ne pas le transformer en tuiles Replay ; sortir seulement le shell parent.
- Trends artists : app/[locale]/dashboard/(main)/artists/trends/page.tsx, lib/components/artist-trends-mobile.tsx.
- Trends tracks : app/[locale]/dashboard/(main)/tracks/trends/page.tsx, lib/components/track-trends-mobile.tsx.
- Trends genres : app/[locale]/dashboard/(main)/genres/trends/page.tsx, lib/components/genre-trends-mobile.tsx.
- Hub mobile partagé : lib/components/trends-mobile-hub.tsx, lib/components/trends-mobile-spark.tsx — Crystaliser une fois, les 3 mobiles en héritent.
- Chart : lib/components/charts/overview-trends-chart.tsx, lib/constants/crystal-chart.ts, lib/components/charts/overview-trends-tooltip.tsx, listen-trend-chart-view-toggle.tsx (ne pas restyler).
- Réutiliser : overview-hero.tsx, dashboard-ui.tsx (metric strip, section titles, search, filter chips, ghost btn). Pickers : artist-trends-artist-picker.tsx / track-trends-track-picker.tsx (déjà chips Crystal).
- e2e : __tests__/e2e/mobile-dashboard.spec.ts (timeline, heatmap day sheet, artist/track trends FR/EN), __tests__/e2e/dashboard.spec.ts (timeline nav) si le DOM hero change.

HORS SCOPE :
- Overview (view=trends, view=context heatmap widget OverviewCanvasFrame — déjà Crystal).
- *-trends-summary-widget.tsx (déjà OverviewTrendsChart).
- Listings /dashboard/artists|tracks|genres (panneaux locaux).
- Ask, Duet, musical-profile, onboarding, APIs / hooks / query params métier.
- Ne pas inventer un view= sur timeline/heatmap (pages empilées, pas un dashboard à onglets locaux).
- docs/dashboard-design-system.md (Crystal charts) : aligné — 7e = chrome **et** migration des plots legacy des pages dédiées.

Objectif desktop lg+ (chaque page) :
- Masthead : OverviewHeroFrame (ou même matière). h1 = titre page, subtitle allégé. Light ET dark. Plus de radial glow / orbes / badge période carte (période = header). KPI → DASHBOARD_METRIC_STRIP (scroll-x sous lg si besoin). Empty / error / loading : même masthead sans-carte.
- Timeline : 1 série listens → OverviewTrendsChart (série unique). Toolbar PeriodSelector + ListenTrendChartViewToggle restent ; sticky OK si hairline, pas une 2ᵉ carte.
- Heatmap : calendrier sur le canvas (plus de SPOTLIGHT_SHELL). Day details panel : pochette/list visibles, plus de well carte autour de chaque bloc. Lien / CTA ghost vers timeline OK.
- */trends : back-to-listing = DASHBOARD_BTN_GHOST (pas bouton blanc lift). Switcher 4 items inchangé. Section titles = DASHBOARD_SECTION_*. Chart multi-séries = OverviewTrendsChart ; identité des séries = picker chips (pas Legend). Commentary IA = typo / list rows sur canvas (plus de mega-carte always-dark / startup surface hover-lift). Skeleton chart sans well rounded carte.

Objectif mobile < lg (dual tree — ne pas fusionner avec sm: sur le desktop) :
- Plus de TRENDS_MOBILE_HERO / DashboardCinematicHeroBg / SignalTile dark. Masthead compact canvas + strip.
- Timeline : spark / buckets utilisables ; rows destinations = DASHBOARD_LIST_ROW (lien heatmap), pas rounded-2xl marketing. e2e : heading + spark captions + lien calendrier.
- Heatmap : grille / top days sans cinematic ; sheet day-details conserve open au tap (e2e). Empty / error alignés.
- */trends : composer le hub Crystal ; spark OK ; legend rows = list rows + color dot ; PeriodSelector compact + picker. e2e artist/track trends FR/EN : heading utilisable, pas de régression dates / userId / switcher trends.

Contraintes : 44px, EN+FR (+ ES si copy touchée), demo ?userId= sur timeline/heatmap/trends (pas Duet), prefers-reduced-transparency sur tooltips glass. Ne pas cloner le JSX chart Overview — importer OverviewTrendsChart. Ne pas mettre de tuiles Replay 3:4 sur timeline/heatmap. Gemini modify_frontend 1 surface (ex. masthead trends ou chart well) si tu t’en sers.

Livre : plus de hero always-dark ni SPOTLIGHT_SHELL autour des plots ; plus de DASHBOARD_CHART_THEME sur timeline + */trends ; light/dark EN/FR ~390×844 + lg+ ; e2e timeline / heatmap sheet / trends mobiles verts.
```

---

### Étape 7f — Ask + Duet friends / compare (après 7e)

Chrome seulement. **Pas** une refonte chat ni Duet produit. Friend-music `TopLibraryCard` → Replay = **hors scope** (session dédiée plus tard).

```text
[Préambule]

Étape 7f — Crystal chrome Ask + Duet (friends / compare). Composer OverviewHeroFrame + DASHBOARD_METRIC_STRIP + DASHBOARD_LIST_ROW + (compare) OverviewTrendsChart si le dual-series est encore DASHBOARD_CHART_THEME. Ne pas retoucher Overview, */trends, timeline, heatmap, musical-profile, listings rankings.

Contrat :
- Ask = surface chat plein écran (déjà hors header filtres sur certaines layouts). Garder IA presets / composer / sheets. Un-card les presets et le chrome empty-state ; ne pas convertir Ask en story Replay ni en onglets view=.
- Duet friends / compare = masthead canvas + listes / panels sans mega-carte. Auth-only : ne pas brancher ?userId= démo publique.
- Friend-music (/dashboard/duet/music) : HORS SCOPE sauf régression import partagé (OverviewHeroFrame déjà en place). Ne PAS migrer TopLibraryCard → ReplayRankingGrid ici.
- Hooks / APIs / consent / shareScope / rate limits inchangés.

Aujourd’hui (à remplacer) :
- Ask desktop : empty-state déjà assez canvas, mais AskSoundprintSuggestionTile = rounded-2xl border + shadow-sm (mini-cartes) ; period chips bordered ; dialog playbook rounded-3xl OK (interaction). Mobile : AskSoundprintPresetRow = rows-cartes shadow-sm.
- Duet friends desktop : DuetFriendsHero always-dark rounded-[2rem] + KPI-cartes + CTA blanc lift ; listes / invite dans DASHBOARD_SPOTLIGHT_SHELL (gradients cyan/violet/lime).
- Duet compare desktop : DuetCompareHero always-dark + « how it works » cartes ; timeline dual + arena dans DASHBOARD_SPOTLIGHT_* + DASHBOARD_CHART_THEME.
- Duet mobile : duet-friends-mobile / duet-compare-mobile — HERO_SHELL cinematic + DashboardCinematicHeroBg ; compare chart theme legacy.
- Skeletons compare : DUET_COMPARE_HERO_SHELL + SPOTLIGHT shells.

Fichiers :
- Ask : app/[locale]/dashboard/(main)/ask-your-soundprint/page.tsx, lib/components/ask-soundprint-chat.tsx (tiles / composer chrome), lib/components/ask-soundprint-mobile.tsx. e2e mobile-dashboard ask presets / sheet / FR.
- Duet friends : lib/components/duet/duet-friends-client.tsx, lib/components/duet/duet-friends-hero.tsx, lib/components/duet/duet-friends-mobile.tsx, lib/components/duet/duet-friends-skeleton.tsx. Page = thin wrapper.
- Duet compare : lib/components/duet/duet-compare-client.tsx, lib/components/duet/duet-compare-hero.tsx, lib/components/duet/duet-compare-mobile.tsx, lib/components/duet/duet-compare-skeleton.tsx, lib/components/duet/duet-entity-head-to-head-panel.tsx / duet-entity-duel-blocks.tsx (flatten shells, garder IA), lib/components/duet/duet-shared-artists-panel.tsx (sortir SPOTLIGHT_SHELL ; rows OK). Sub-nav : duet-sub-nav / duet-mobile-sub-nav / duet-compare-section-tabs — segmented si chips-cartes, sinon ne pas fourcher.
- e2e : __tests__/e2e/mobile-dashboard.spec.ts (ask, duet friends/compare gated), __tests__/e2e/duet-compare.spec.ts (auth redirect — ne pas casser).

HORS SCOPE : duet-friend-music-desktop.tsx / mobile TopLibraryCard → Replay ; account settings share toggles (sauf classes spotlight copiées qui cassent le contraste — alors tokens seulement) ; landing home-ask / home-duet previews ; APIs.

Objectif Ask :
- Desktop empty : titre + trust sur le canvas (déjà). Presets featured : list rows ou suggestion sans shadow-card / hover lift violet — pattern proche OverviewFeaturePromos / DASHBOARD_LIST_ROW, pas une grille de mini-cartes marketing. Composer : piste discrète (glass chrome OK sur le champ), cibles 44px. Period chip : pill discrète, pas une carte. Playbook dialog = OK (conteneur d’interaction). Ne pas remettre un hero always-dark.
- Mobile : PresetRow sans shadow-sm carte si list row suffit ; h1 + composer + sheet all-questions intact pour e2e (heading « Ask your Soundprint », boutons « Ask: », #ask-soundprint-composer). Bottom nav non couverte.
- Gates Groq / backfill / demo : AiUnavailableCta tone default, pas mega-carte.

Objectif Duet friends lg+ :
- Masthead OverviewHeroFrame : titre + subtitle. Strip = counts friends / pending in / out (DASHBOARD_METRIC_STRIP). CTAs Compare / Invite = DASHBOARD_BTN_GHOST ou primary soft — pas blanc lift hover:-translate-y.
- Sections invite / pending / list : plus de DASHBOARD_SPOTLIGHT_SHELL + gradients hairline. Headers DASHBOARD_SECTION_* ; rows amis = DASHBOARD_LIST_ROW + hairline ; formulaires invite sur canvas (search/input = DASHBOARD_SEARCH_FIELD si applicable). Empty gated lisible light/dark.
- Mobile : plus de cinematic hero. Même info ; e2e heading + invite ou empty gated.

Objectif Duet compare lg+ :
- Masthead canvas (plus de CompareHowItWorks dans une carte always-dark — steps en list rows ou omit si redondant avec trust line). Friend picker + period sur canvas.
- Timeline dual-series : OverviewTrendsChart (2 séries self/friend, couleurs crystal). Plus de SPOTLIGHT_SHELL / CHART_THEME / Legend.
- Shared artists / head-to-head : sortir shells ; bars/duel sur canvas ; empty = typo + CTA ghost.
- Mobile : plus de cinematic ; chart lisible ou sheet ; e2e heading + gated empty FR/EN.

Contraintes : 44px, EN+FR (+ ES labels), prefers-reduced-transparency. Demo Ask ?userId= OK ; Duet reste auth. Ne pas tuer dual tree. Ne pas introduire view= sur Ask. Gemini modify_frontend 1 surface si tu t’en sers.

Livre : Ask presets moins « carte » ; Duet friends/compare sans hero always-dark ni SPOTLIGHT mega-cartes ; compare plot Crystal si legacy ; light/dark EN/FR ~390×844 + lg+ ; e2e ask + duet mobiles + redirect auth verts. Friend-music TopLibraryCard toujours legacy (attendu).
```

---

### Étape 7g — Empty + AI Insight + Temporal + Genre Palette + Settings (**FAITE** — après 7f)

Chrome seulement. **Livré.** **Pas** de changement de logique produit, scoring IA, auth, ni routes. Objectif : supprimer le rendu “collection de cartes” résiduel.

```text
[Préambule]

Étape 7g — Crystal cleanup des pages encore card-oriented. Composer OverviewHeroFrame + DASHBOARD_METRIC_STRIP + DASHBOARD_LIST_ROW + sections canvas (hairlines / spacing) sans mega-shell.

Contrat :
- Empty states (dont « Empty library ») = message lisible sur canvas avec CTA utile ; pas de bloc carte marketing isolé au centre.
- /dashboard/ai-insights, /dashboard/temporal-analysis, /dashboard/genres/palette, /dashboard/settings : conserver les fonctionnalités, réduire le chrome carte, harmoniser headers/sections avec Crystal.
- Ne pas toucher APIs, hooks de données, permissions, feature flags ni instrumentation analytics.
- Garder la dual tree mobile si ces pages ont des composants mobiles dédiés ; sinon responsive sans fork produit.

Aujourd’hui (à remplacer) :
- Empty « Empty library » encore rendu dans des shells carte (rounded + border + shadow) sur certaines vues et états gate/backfill.
- AI Insight : sections encapsulées dans des cards épaisses (background contrasté + lift) au lieu de blocs canvas.
- Temporal Analysis : widgets/plots parfois dans des wrappers spotlight/carte hérités.
- Genres Palette : panneaux palette / légende / détails encore structurés en card stacks.
- Settings : groupes/toggles dans des containers carte trop lourds visuellement pour le système Crystal.

Fichiers :
- AI Insights : app/[locale]/dashboard/(main)/ai-insights/page.tsx + `lib/components/ai-insights-mobile.tsx`.
- Temporal Analysis : app/[locale]/dashboard/(main)/temporal-analysis/page.tsx + `lib/components/temporal-analysis-mobile.tsx`.
- Genres Palette : app/[locale]/dashboard/(main)/genres/palette/page.tsx + `lib/components/palette/*`.
- Settings : app/[locale]/dashboard/(main)/settings/* + `lib/components/settings-mobile.tsx`.
- Empty states partagés : `empty-state.tsx`, `dashboard-mobile-import-empty.tsx`, `error-state.tsx` (startup).

Objectif desktop lg+ :
- Masthead canvas (titre + subtitle/trust line), pas de hero always-dark ni carte parent.
- Sections : titres `DASHBOARD_SECTION_*`, contenu directement sur canvas ; si regroupement requis, utiliser hairline soft plutôt qu’un shell plein.
- KPI courts éventuels via `DASHBOARD_METRIC_STRIP` (pas mini-cartes empilées).
- Visualisations : plus de `DASHBOARD_SPOTLIGHT_SHELL`/CARD_SHELL autour des plots ; conserver lisibilité light/dark.
- Empty library : état vide unifié Crystal (copy + CTA + éventuellement hint), sans icône géante dans une carte flottante.

Objectif mobile < lg :
- Plus de hero cinématique/carte lourde ; header compact + sections empilées lisibles.
- Rows actions/settings = `DASHBOARD_LIST_ROW` ou pattern équivalent sans shadow-card.
- Empty states compacts : heading + message + CTA 44px, sans panneau modal-like permanent.
- Aucune régression navigation, sheets, toggles, ni accès auth.

Contraintes :
- 44px touch targets, EN+FR (+ ES si copy touchée), light/dark.
- `prefers-reduced-transparency` respecté pour glass/frost.
- Pas de réintroduction `CARD_SHELL`, `*_HERO_SHELL`, `DASHBOARD_SPOTLIGHT_SHELL` sur ces surfaces.
- Gemini `modify_frontend` 1 surface max si utilisé, puis adaptation manuelle.

Livre :
- Empty states (incluant « Empty library ») alignés Crystal.
- Pages AI Insight / Temporal Analysis / Genres Palette / Settings visuellement cohérentes avec Overview/7e/7f.
- Plus de “mur de cartes” résiduel desktop/mobile ; UX et données inchangées.
```

---

## Étape 8 — Header actions : notifications + menu compte

Complément de l’**étape 2** (header + période). Les deux contrôles du **coin droit** (`headerActions` dans `date-range-filter.tsx`) sont encore du chrome « carte / shadow / hover lift » alors que la période est déjà Crystal.

**Pourquoi après 7g :** pages métier livrées ; ce chrome apparaît sur **toutes** les routes dashboard — un restyle ici a le meilleur ratio impact / risque. Une session Plan = **un** sous-prompt (8a **ou** 8b).

Référence produit : [`NOTIFICATION_CENTER.md`](./NOTIFICATION_CENTER.md) (IA / sources). Crystal = **matière uniquement**.  
Référence visuelle : Apple Music / iOS — icônes calmes, popover frost, rows hairline ; pas de bouton borduré + shadow soft, pas de menu `shadow-card`.

---

### Étape 8a — Centre de notifications (cloche)

```text
[Préambule]

Étape 8a — Crystal chrome : NotificationCenter (header). Pas de restyle du menu avatar (8b). Pas de pages métier.

Fichiers : lib/components/notification-center.tsx. Placement déjà OK dans date-range-filter.tsx (headerActions) — ne pas déplacer. Contexte : notification-center-context.tsx + hooks Duet / genre backfill — LIRE, ne pas réécrire.
Masquage démo : useHideNotificationCenterForPublicDemo inchangé.
HORS SCOPE : nouvelle API serveur notifications, WebSocket, préférences « mute type », toasts Sonner, sidebar footer, DashboardUserMenu, période / exports.

Aujourd’hui (à remplacer) :
- Trigger : h-9 w-9 rounded-md border + bg-background/80 + shadow soft (mini-carte).
- Panneau : rounded-lg border-border bg-card/95 + ombre marketing lourde.
- Header panneau : uppercase tracking large + boutons mark-all / clear bordurés.
- Rows : stripe sévérité OK ; look encore « admin card list », pas list rows Crystal.
- Badge unread : OK fonctionnellement ; calmer le contraste si trop « sticker ».

Objectif lg+ et mobile (même composant — pas de fork sm:) :
- Trigger = contrôle chrome calme : min 44×44 (garder max-lg:h-11), rounded-full ou radius soft, hairline OU fond glass discret — PAS border+shadow carte, PAS hover:-translate-y.
- Panneau = DASHBOARD_GLASS_FLOATING_PANE (ou même matière glass + hairline). Light ET dark. prefers-reduced-transparency → opaque.
- Titre panneau : 13px medium / section eyebrow, PAS uppercase tracking-[0.14em] mono admin.
- Actions mark all / clear : DASHBOARD_BTN_GHOST ou text button 44px, pas mini-cartes bordurées.
- Liste : DASHBOARD_LIST_ROW + DASHBOARD_LIST_SEPARATOR (ou hairline équivalent). Empty = typo muted sur le panneau, pas empty-state carte.
- Garder : open/close, Escape, click outside, aria-expanded / aria-haspopup, unread badge, merge client+Duet server items, markRead / markAllRead / clearAll, CTAs genre Groq nudge / liens href, formatNotificationDisplay.
- z-index : panneau au-dessus du sticky header (z-50 OK si déjà).

Contraintes : IA notification inchangée (sources, polling Duet, severity). i18n EN/FR (+ ES si copy touchée). Demo ?userId= masque toujours le centre. Gemini modify_frontend 1 surface (panneau OU trigger) si tu t’en sers.

Livre : avant/après classes ; light/dark EN/FR desktop + mobile header ; unread + empty + Duet pending + mark all ; pas de régression e2e Duet badge si asserté.
```

---

### Étape 8b — Menu compte (avatar)

```text
[Préambule]

Étape 8b — Crystal chrome : DashboardUserMenu (header). Pas de restyle NotificationCenter sauf régression visuelle du cluster headerActions. Pas de pages métier.

Fichiers : lib/components/dashboard-user-menu.tsx (+ UserAvatar si classes size seulement). Placement déjà OK dans date-range-filter.tsx — ne pas déplacer vers la sidebar.
Sidebar footer (avatar / thème / langue / sign-out) : HORS SCOPE sauf si tu partages une primitive trigger — alors ne pas fourcher le footer.
HORS SCOPE : /api/user/me, upload avatar, auth Supabase, settings page chrome (déjà 7g), NotificationCenter produit.

Aujourd’hui (à remplacer) :
- Trigger : hover:-translate-y-0.5 (lift carte) ; rounded-xl.
- Menu : rounded-xl border-card-border bg-surface-raised shadow-card (carte marketing).
- Items : hover:bg-primary/10 hover:text-primary (glow marque).

Objectif lg+ et mobile (même composant) :
- Trigger = avatar bouton calme, min 44×44 (max-lg déjà h-11), focus ring OK, PLUS de hover:-translate-y. Radius cohérent avec chrome (full ou soft), pas une carte.
- Menu = DASHBOARD_GLASS_FLOATING_PANE (même matière que 8a). Header identité (nom + email) + hairline ; pas de mega-carte.
- Items Settings / Sign out = DASHBOARD_LIST_ROW (ou row équivalente min-h-11), hover muted soft — PAS primary/10 violet. Sign-out danger soft OK (text accent-rose), pas bouton carte.
- Garder : fetch /api/user/me + auth listener, settingsHref avec mergeDashboardSearchParams, sign-out → /sign-in, Escape / click outside, aria-expanded / aria-haspopup="menu", i18n dashboardUserMenu + sidebar.settings.

Contraintes : pas de nouveau menu mobile dédié ; cluster headerActions reste cloche + avatar. Light/dark EN/FR. prefers-reduced-transparency. Gemini modify_frontend 1 surface si tu t’en sers.

Livre : menu lisible light/dark ; settings + sign-out OK ; demo ?userId= (avatar toujours visible) ; pas de régression mobile header 44px.
```

---

## Étape 9 — Duet produit (music / compare / friends)

**Pourquoi après 8 :** chrome header livré ; Overview + Your Music listings Crystal. Duet friends / compare ont déjà le **masthead canvas** (7f), mais friend-music reste le dernier îlot `TopLibraryCard` / hero always-dark. L’utilisateur attend la **même matière média** que `/dashboard/overview` — notamment le carrousel artistes + overlay — sur la bibliothèque de l’ami.

**Contrat produit Duet (ne pas casser) :**

| Route | Params | Modèle |
| --- | --- | --- |
| `/dashboard/duet/music` | `friendUserId` requis pour le contenu ; `view=tops` \| `trends` | Dashboard à onglets (comme Overview). Auth-only. |
| `/dashboard/duet/compare` | `friendUserId` optionnel (picker si absent) ; `section=overview` \| `shared` \| `target` ; `arenaMode` | Segmented sections, pas `view=`. |
| `/dashboard/duet/friends` | `section=invite` \| amis / incoming / outgoing | Listes non-média + invite. |

Auth-only : **ne pas** brancher `?userId=` démo publique sur Duet. Consent / shareScope / rate limits / APIs inchangés sauf si 9a doit passer `friendUserId` dans `ArtistUserInsightsPanel` (déjà supporté via prop `userId`).

Une session Plan = **un** sous-prompt (9a **ou** 9b **ou** 9c **ou** 9d).

Référence visuelle : Overview `view=spotlight` / `view=tops` — [`spotlight-artists-featured-list.tsx`](../lib/components/spotlight-artists-featured-list.tsx), [`overview-library-replay.tsx`](../lib/components/overview-library-replay.tsx), [`ArtistUserInsightsPanel`](../lib/components/artist-user-insights-panel.tsx).

---

### Étape 9a — Friend music `view=tops` : tuiles Replay + overlay ami

Session **média**. C’est le gap volontaire de 7f. Objectif : `/dashboard/duet/music?friendUserId&view=tops` lit comme Overview tops / spotlight artistes.

```text
[Préambule]

Étape 9a — Crystal Duet friend-music view=tops. Composer ReplayRankingGrid + (artistes) même carrousel Overview. Brancher ArtistUserInsightsPanel avec userId = friendUserId. Pas de refonte compare/friends (9c–9d). Pas de restyle trends chart (9b).

Contrat :
- Routes : /dashboard/duet/music (+ ?friendUserId). Garder view=tops|trends + DashboardSectionSwitcher / DashboardSectionPanel (idPrefix friend-music-desktop / mobile). Un panneau à la fois, y compris mobile.
- Auth-only Duet. Ne pas brancher ?userId= démo. Hooks friend-overview / friends / consent inchangés.
- Clic tuile artiste → overlay insights de CET ami (pas du viewer). Même drawer qu’Overview (ArtistUserInsightsPanel), prop userId={friendUserId}, subjectName={nom ami} pour l’eyebrow (« {name}'s streaming » / pas « Your streaming »).

Aujourd’hui (à remplacer) :
- Desktop duet-friend-music-desktop.tsx : grille 3× TopLibraryCard (artists / tracks / genres) — legacy overview-library-rankings. Pas d’overlay insights.
- Mobile duet-friend-music-mobile.tsx view=tops : LeaderRows listes (pas tuiles Replay), hero HERO_SHELL always-dark encore possible sur d’autres états (picker = 9b).
- Client : pas d’état artistInsightsTarget.

Fichiers :
- lib/components/duet/duet-friend-music-desktop.tsx, duet-friend-music-mobile.tsx, duet-friend-music-client.tsx
- Réutiliser SANS copier le JSX tuile : replay-ranking-grid.tsx (ReplayRankingSection + ReplayRankingGrid + ReplayRankingSkeleton), spotlight-artists-featured-list.tsx OU le mapping overview-library-replay.tsx (kind artist / track / genre)
- Overlay : artist-user-insights-panel.tsx + useArtistUserInsights (déjà accepte userId)
- Mapper FriendMusicLeaderItem → ReplayRankingItem / preview ArtistStatsDto (artistId = id, artistName = title, listenCount = count, imageUrl)
- i18n : réutiliser overview.replayPager.* ou duet.friendMusic.replayPager ; aria artistInsightsAriaOpen avec nom artiste
- Tests : composants friend-music / e2e Duet music si assertés ; ne pas casser data-testid duet-friend-music-top-tracks

HORS SCOPE : compare sections, friends invite, APIs Prisma, share settings page, landing home-duet, trends AreaChart legacy (9b), MUSIC_HERO_SHELL picker/gated (9b).

Objectif desktop lg+ view=tops :
- Plus de TopLibraryCard / grille 3 cartes widget. Sections canvas : comme Overview tops — `ReplayRankingSection` (eyebrow Tops + Top artists/tracks/genres) sans header page « What stood out » au-dessus (évite le doublon Tops).
- Artistes : même look carrousel / grille Replay qu’Overview (pager 4-up, frost, rang visible). Préférer SpotlightArtistsFeaturedList si les items sont mappables en ArtistStatsDto ; sinon ReplayRankingGrid media.kind="artist". Limite ≈ SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT / REPLAY_TOPS_LIMIT — ne pas inventer une 2e primitive tuile.
- Tracks + genres : ReplayRankingGrid comme overview-library-replay (tracks : subtitle = artiste si dispo ; genres : kind fill + %).
- onOpenArtistInsights → setState + ArtistUserInsightsPanel open (monté dans client ou desktop+mobile parents). userId = friendUserId. startDate/endDate = période dashboard actuelle. previewArtist + colorIndex comme Overview.
- Hints aggregates / empty tracks : typo + lien ghost sur canvas, PAS rounded-[1.35rem] carte marketing.
- Masthead OverviewHeroFrame déjà OK — ne pas le refourcher.

Objectif mobile < lg view=tops :
- Même view= + switcher. Remplacer LeaderRows artistes/tracks/genres par ReplayRankingGrid 2×2 (pageSize 4). Clic → même overlay (sheet/drawer existant du panel).
- Plus de list-row « admin » pour le top média. Dual tree : ne pas fusionner sm: sur le desktop.

Contraintes : 44px, EN+FR (+ ES si copy), prefers-reduced-transparency sur frost. Ne pas réintroduire CARD_SHELL / TopLibraryCard / hover overlay qui cache le nom. Ne pas tuer view=. Ne pas changer consent / shareScope. Gemini modify_frontend 1 surface max si utile.

Livre : avant/après tops sans TopLibraryCard ; clic artiste ouvre insights ami (vérifier que les métriques / période correspondent à friendUserId) ; light/dark EN/FR lg+ + ~390×844 ; testids tops tracks OK.
```

---

### Étape 9b — Friend music chrome résiduel + `view=trends` (**FAITE**)

Après 9a. **Livré.** Ne pas recoller ce prompt. Picker / gated / skeleton / mobile hero = `OverviewHeroFrame` ; trends desktop = `OverviewTrendsChart` 1 série.

```text
[Préambule]

Étape 9b — Crystal Duet friend-music chrome + view=trends. Composer OverviewHeroFrame + OverviewTrendsChart. Ne pas retoucher les tuiles tops (9a). Ne pas refondre compare/friends.

Contrat :
- Garder états : no friendUserId (picker), gated 403, unavailable, empty stats, loading skeleton, dual tree.
- view=trends inchangé (query param). Chart = série unique « ami » (pas dual compare).
- Auth-only. APIs / hooks inchangés.

Aujourd’hui (à remplacer) :
- duet-friend-music-client.tsx : MUSIC_HERO_SHELL always-dark rounded-[2rem] + DASHBOARD_SPOTLIGHT_* sur picker / gated / skeleton desktop.
- duet-friend-music-mobile.tsx : HERO_SHELL bg-gray-950 cinématique sur frames mobile.
- FriendMusicTimelinePanel (desktop) : AreaChart Recharts maison + wells rounded-[1.75rem] / CHART_TOOLTIP_STYLES legacy (pas OverviewTrendsChart / crystal-chart).
- Mobile trends : résumé Signal-like / listes — sortir carte lourde si encore présente.

Fichiers : duet-friend-music-client.tsx, duet-friend-music-desktop.tsx (FriendMusicTimelinePanel), duet-friend-music-mobile.tsx. Réutiliser overview-hero, OverviewTrendsChart, ListenTrendChartViewToggle si encore pertinent (ou le toggle déjà branché sur OverviewTrendsChart ailleurs). e2e Duet music / mobile-dashboard si gated asserté.

HORS SCOPE : 9a tuiles, compare arena, friends invite, settings share toggles, APIs.

Objectif :
- Picker / gated / unavailable / skeleton : masthead canvas (OverviewHeroFrame) + list rows amis (DASHBOARD_LIST_ROW) pour choisir un ami ; empty Crystal ; plus de MUSIC_HERO_SHELL / SPOTLIGHT_SHELL / radial violet.
- Mobile : plus de HERO_SHELL always-dark ; compact OverviewHeroFrame.
- view=trends : plot sur canvas via OverviewTrendsChart (1 série), plus de double well border+glass autour du chart. Toggle période si déjà là — garder IA, calmer chrome.
- Hints / empty : typo muted + CTA ghost, pas carte.

Contraintes : 44px, EN+FR, prefers-reduced-transparency. Ne pas introduire view=spotlight. Gemini 1 surface si utile.

Livre : picker/gated lisibles light/dark ; trends Crystal ; pas de régression deep-link friendUserId + view= ; e2e gated OK.
```

---

### Étape 9c — Compare : sections `overview` / `shared` / `target`

Chrome + plots déjà partiellement Crystal (7f). Cette session **ferme la cohérence** de toutes les sections et du empty picker.

```text
[Préambule]

Étape 9c — Crystal Duet compare (toutes sections). Composer OverviewHeroFrame + DASHBOARD_METRIC_STRIP + DASHBOARD_LIST_ROW + OverviewTrendsChart. Ne pas retoucher friend-music (9a–9b) ni friends invite (9d) sauf sub-nav partagé si classe legacy.

Contrat :
- /dashboard/duet/compare sans friendUserId = picker amis (list rows).
- Avec friendUserId : section=overview|shared|target (DuetCompareSectionTabs / mobile sub-nav). Ne pas renommer les sections. arenaMode inchangé.
- Auth-only. Hooks compare timeline / shared-artists / entity / metadata inchangés.

Aujourd’hui (écarts résiduels à auditer puis fixer) :
- section=overview : timeline dual-series — vérifier plus aucun DASHBOARD_SPOTLIGHT_SHELL / DASHBOARD_CHART_THEME / Legend legacy ; doit être OverviewTrendsChart 2 séries.
- section=shared : DuetSharedArtistsPanel — rows OK ; sortir shells / empty carte si restants ; pas de tuiles Replay 3:4 sauf décision produit explicite (défaut = list rows head-to-head).
- section=target (arena) : DuetEntityHeadToHead / duel blocks / battle arena UI — flatten shells ; search = DASHBOARD_SEARCH_FIELD ; plots Crystal si encore legacy.
- Empty picker + skeletons : déjà OverviewHeroFrame — calmer tout residual rounded-[2rem] / how-it-works cartes.
- Sub-nav : duet-sub-nav / duet-mobile-sub-nav / duet-compare-section-tabs — segmented Crystal si encore chips-cartes ; sinon ne pas fourcher.

Fichiers : duet-compare-client.tsx, duet-compare-hero.tsx, duet-compare-mobile.tsx, duet-compare-skeleton.tsx, duet-shared-artists-panel.tsx, duet-shared-artists-empty.tsx, duet-entity-head-to-head-panel.tsx, duet-entity-duel-blocks.tsx, duet-battle-arena-ui.tsx, duet-compare-context-bar.tsx, duet-metadata-banner.tsx, duet-chart-view-toggle.tsx. e2e : duet-compare.spec.ts (auth redirect), mobile-dashboard compare gated.

HORS SCOPE : friend-music médias, friends CRUD métier, APIs, share image pipeline (sauf classes shell qui cassent le contraste — tokens seulement).

Objectif par section :
- overview : masthead + context bar canvas ; dual timeline Crystal ; CTAs See music / share = ghost / primary soft, pas lift carte.
- shared : header section canvas ; liste / empty un-carded.
- target : mode artist|track sur canvas ; duel lisible light/dark ; empty search = typo.
- Mobile : mêmes sections ; plus de cinematic ; charts lisibles ou sheet.

Contraintes : 44px, EN+FR (+ ES labels), prefers-reduced-transparency. Ne pas introduire view= à la place de section=. Gemini 1 surface si utile.

Livre : 3 sections light/dark EN/FR lg+ + mobile ; picker sans ami ; redirect auth e2e vert ; deep-link ?friendUserId&section=overview OK.
```

---

### Étape 9d — Friends + cohérence sub-nav Duet

Dernière passe Duet. Listes non-média + invite ; aligner le chrome commun des 3 routes.

```text
[Préambule]

Étape 9d — Crystal Duet friends + sub-nav cross-routes. Composer OverviewHeroFrame + DASHBOARD_METRIC_STRIP + DASHBOARD_LIST_ROW. Ne pas retoucher friend-music tuiles/trends (9a–9b) ni compare panels (9c) sauf imports sub-nav partagés.

Contrat :
- /dashboard/duet/friends?section=invite|… — garder sections existantes (invite / list / pending in / out). Pas de view= média.
- Mutations invite / accept / decline / block / invite-link inchangées.
- Auth-only.

Aujourd’hui (à auditer) :
- 7f a déjà masthead + strip + rows sur friends desktop/mobile — chercher residual : gradients SPOTLIGHT, badges mono uppercase tracking large, CTA blanc lift, empty carte, forms invite en mini-cartes.
- duet-sub-nav / duet-mobile-sub-nav : doit être le même langage segmented / tabs que compare (pas une 3e esthétique).
- Share settings snippet dans friends si présent : tokens seulement.

Fichiers : duet-friends-client.tsx, duet-friends-hero.tsx, duet-friends-mobile.tsx, duet-friends-skeleton.tsx, duet-sub-nav.tsx, duet-mobile-sub-nav.tsx, éventuellement duet-share-settings-section.tsx (classes muted seulement). e2e mobile-dashboard friends gated + heading.

HORS SCOPE : APIs friendship, tokens invite, page /duet/accept marketing, landing home-duet, notification center (8a).

Objectif :
- Friends : rows 44px + hairline ; invite form sur canvas (DASHBOARD_SEARCH_FIELD / inputs calmes) ; metric strip counts ; empty gated Crystal.
- Sub-nav Music | Compare | Friends : une seule matière sur les 3 routes (active state segmented, pas chips-cartes).
- Mobile : compact hero + sections ; pas cinematic.

Contraintes : 44px, EN+FR, light/dark. Gemini 1 surface si utile.

Livre : friends invite + list OK ; sub-nav cohérent music/compare/friends ; e2e friends mobile vert.
```

---

## Étape 10 — Onboarding wizard (import Apple / Spotify)

**Pourquoi après 9 :** le dashboard métier + Duet sont Crystal ; le **premier contact produit** (`/dashboard/onboarding`) est encore l’îlot legacy — hero cinématique always-dark, `DASHBOARD_GLASS_CARD_SHELL`, Genre AI en carte marketing. L’utilisateur quitte un funnel « carte 2024 » pour atterrir sur un Overview Apple-product : écart trop visible.

**Contrat produit onboarding (ne pas casser) :**

| Élément | Règle |
| --- | --- |
| Phases | `welcome` → `pick` → `guide` → `import` → `finish` (état client inchangé) |
| Route | `/dashboard/onboarding` ; re-entry `?addData=1` ; landing consent genre AI via query existante |
| Providers | Spotify ZIP / Apple CSV — guides et images inchangés sémantiquement |
| Import | multipart + JSON batch, genre backfill, skip / complete — **APIs hors scope** |
| Mobile | Dual tree `lg:hidden` (`OnboardingMobile`) ; **pas** de bottom nav dashboard |

Chrome only. Une session Plan = **un** sous-prompt (**10a** **ou** **10b**).

Référence visuelle : masthead Overview (`OverviewHeroFrame`), list rows settings / friends (7g / 9d), empty Crystal (7g). **Pas** de tuiles Replay média ici (wizard, pas library).

---

### Étape 10a — Desktop onboarding + finish / Genre AI

Session **desktop `lg+`**. Restyle le shell et les surfaces dans `DataExportOnboarding` + panneaux finish / consent. Ne pas retoucher l’arbre mobile (10b).

```text
[Préambule]

Étape 10a — Crystal onboarding desktop (wizard import). Composer OverviewHeroFrame + DASHBOARD_SECTION_TITLE + DASHBOARD_LIST_ROW + DASHBOARD_BTN_* . Pas de refonte mobile (10b). Pas d’APIs / parsers / Prisma.

Contrat :
- Route : /dashboard/onboarding (+ ?addData=1, consent genre AI query existante). Page : app/[locale]/dashboard/onboarding/page.tsx — LIRE, ne pas changer gates redirect.
- Phases : welcome | pick | guide | import | finish. Progress % + stepIndex / provider inchangés.
- Auth-only. Skip / complete / import / genre backfill / Spotify connect : comportement inchangé.
- Dual tree : desktop visible lg+ ; ne pas fusionner avec onboarding-mobile.tsx.

Aujourd’hui (à remplacer) :
- ONBOARDING_SHELL_CLASS = DASHBOARD_CINEMATIC_HERO_SHELL + DashboardCinematicHeroBg (always-dark).
- ONBOARDING_SURFACE_CLASS = DASHBOARD_GLASS_CARD_SHELL autour des phases.
- DashboardHeroTitle variant="hero" (welcome / pick / finish).
- Dropzone / guide figures / Spotify connect / Genre AI : rounded-2xl + border + shadow-card / ring marketing ; CTAs hover:-translate-y + shadow-brand-glow (onboarding-finish-invites).
- Progress bar variant="hero" pensé pour fond sombre.

Fichiers :
- lib/components/data-export-onboarding.tsx (principale — ~2k lignes : chrome seulement, ne pas réécrire l’upload)
- lib/components/onboarding-finish-invites.tsx (GenreAiPanelChrome, consent CTAs, invites finish)
- Réutiliser : overview-hero.tsx (OverviewHeroFrame), dashboard-ui.tsx (LIST_ROW, SECTION_TITLE, BTN_*), éventuellement empty-state patterns 7g
- i18n : namespace onboarding — copy OK ; ne pas inventer de nouvelles clés sauf aria si manquant
- Tests : ne pas casser e2e mobile-dashboard onboarding (10b) ; unit finish-invites / import parsers hors scope sauf snapshot classes si assertées

HORS SCOPE : app/api/user/onboarding/**, prepare-onboarding-import-rows, onboarding-import-* services, onboarding-mobile.tsx, onboarding-mobile-sticky-actions.tsx, musical-profile-cinematic.tsx (ne pas supprimer), landing auth, cookies.

Objectif desktop lg+ :
- Masthead canvas : large title + body / eyebrow 13px sur le fond de page — plus de OnboardingShell cinématique ni DashboardCinematicHeroBg.
- Progress : barre fine + label step sur canvas (trough light/dark), pas dans un hero sombre.
- Pick : deux rows provider (logo + titre + hint + chevron) en groupe hairline / DASHBOARD_LIST_ROW — pas une carte glass parent.
- Guide : titre + body canvas ; screenshots en <figure> calmes (border soft OK) — pas mega DASHBOARD_GLASS_CARD_SHELL autour du step entier.
- Import : dropzone dashed sur canvas ; états progress / erreurs typo Crystal ; pas shadow-card.
- Finish + Genre AI : panel canvas (hairline / spacing) ; CTAs DASHBOARD_BTN_GRADIENT / OUTLINE / GHOST sans hover-lift ni shadow-brand-glow ; invites Duet en list rows si présentes.
- Interdit : DASHBOARD_CINEMATIC_HERO_SHELL, DASHBOARD_GLASS_CARD_SHELL comme shell de phase, CARD_SHELL, orbs/grain, badges mono tracking large marketing.

Contraintes : 44px, EN+FR (+ ES si copy touchée), light/dark, prefers-reduced-transparency. Gemini modify_frontend 1 surface max si utile (ex. pick rows), puis adaptation manuelle.

Livre : welcome → pick → guide (Spotify + Apple) → import → finish lisibles light/dark EN/FR ; plus de hero always-dark desktop ; flux import / skip / complete verts manuellement.
```

---

### Étape 10b — Mobile onboarding dual tree + sticky actions

Session **mobile ~390×844**. Aligner `OnboardingMobile` + barre sticky sur Crystal après 10a. Ne pas rouvrir le chrome desktop sauf tokens partagés (finish-invites déjà Crystal en 10a).

```text
[Préambule]

Étape 10b — Crystal onboarding mobile. Composer masthead canvas compact + DASHBOARD_LIST_ROW + sticky glass bas. Ne pas retoucher le flux desktop data-export-onboarding (10a) sauf props déjà partagées. Pas d’APIs.

Contrat :
- Même phases welcome | pick | guide | import | finish via props depuis DataExportOnboarding.
- Pas de bottom nav dashboard sur /dashboard/onboarding (e2e existant).
- Dual tree : lg:hidden only. Ne pas compresser le desktop avec sm:.
- Query addData / consent / skip / import inchangés.

Aujourd’hui (à remplacer) :
- HERO_SHELL always-dark + CinematicFloatingOrbs / FilmGrain / LightSweep (musical-profile-cinematic) sur welcome / pick / guide / import / finish.
- GROUP_SHELL = rounded-2xl border + bg-card-surface (pick rows en carte).
- Import dropzone / finish Genre AI : rounded-2xl card surfaces.
- Sticky : déjà glass — calmer shadow lourde si encore marketing.

Fichiers :
- lib/components/onboarding-mobile.tsx
- lib/components/onboarding-mobile-sticky-actions.tsx
- Imports cinematic : débrancher de l’onboarding ; NE PAS supprimer musical-profile-cinematic.tsx (autres usages / legacy)
- Réutiliser patterns 10a / OverviewMobileHero compact / DASHBOARD_LIST_ROW
- e2e : __tests__/e2e/mobile-dashboard.spec.ts — « onboarding mobile has no bottom nav and continue opens pick » + « usable in French »

HORS SCOPE : APIs import, data-export-onboarding logique métier, landing, 9a–9d Duet.

Objectif mobile < lg :
- Plus de hero cinématique bleed / orbs / grain / always-dark. Masthead compact canvas (suit light/dark) + progress + step label.
- Pick : list rows hairline (pas GROUP_SHELL carte).
- Guide : titre + body + image(s) sur canvas ; compteur step discret.
- Import : dropzone / progress calmes ; cibles 44px.
- Finish : consent / CTA sans carte marketing ; sticky primary/secondary Crystal.
- Sticky bar : DASHBOARD_GLASS_CHROME ou équivalent bas d’écran ; hairline ; pas shadow violette / lift.

Contraintes : 44px, EN+FR, light/dark, prefers-reduced-transparency / reduced-motion. Gemini 1 surface si utile.

Livre : e2e onboarding mobile verts ; continue → pick ; FR OK ; light/dark sans hero always-dark.
```

---

## Gemini Design MCP

Après l’étape 0. **Pas** de `create_frontend` Overview (casserait hooks / i18n / tabs).

| Outil | Usage |
| --- | --- |
| `modify_frontend` | 1 surface : segmented, **tuile Replay** (portrait + frost), metric strip, list row **non-média** |
| `snippet_frontend` | Grille de tuiles + pager si tu insères dans un widget existant |
| `create_frontend` | Interdit pour Overview. Bac à sable vibe OK puis extraire vers `docs/dashboard-design-system.md` |

Surface média = tuile Replay. **Pas** featured #1 + list. Coller `docs/dashboard-design-system.md` (section Replay tiles) + pointer [`replay-ranking-grid.tsx`](../lib/components/replay-ranking-grid.tsx). Rejeter toute carte / `CARD_SHELL` / hover overlay réintroduite.

Scale : **`refined`**.  
`designSystem` : `docs/dashboard-design-system.md` — **pas** le landing `design-system.md`.

---

## Critères de done (Overview)

Desktop `lg+`, light et dark, EN et FR :

- [x] C’est toujours un **dashboard à onglets** (`view=`, un panneau à la fois)
- [x] Masthead Overview : large title + insight sur le canvas, plus de `DASHBOARD_CINEMATIC_HERO_SHELL` ni insight-carte
- [x] Le switcher ressemble à un sélecteur Replay / iOS, plus à une barre de chips-cartes
- [x] Spotlight : tuiles Replay « Your Top Artists » — titre canvas + 4-up frost + pager, **sans** mega-carte ni `CARD_SHELL`
- [x] Stats : metric strip, plus de `STATS_SHELL_CLASS` / hover-lift
- [x] Tops : `ReplayRankingGrid` (tracks / artists / genres), plus de `TopLibraryCard` autour de la section
- [x] Trends : `OverviewTrendsChart` sur le canvas
- [x] Sidebar + header verre ; pied frost **sur les tuiles média** ; pas de carte verre autour d’une section
- [x] Demo `?userId=` et filtres dates OK
- [x] `prefers-reduced-transparency` (tokens + frost)
- [x] Mobile : mêmes vues `view=`, masthead canvas, tuiles Replay 2×2, metric strip, pas de hero cinématique ni rows-cartes
- [x] e2e overview mobile + pas de régression bottom nav

---

## Critères de done (7a–7c)

Desktop `lg+` **et** mobile ~390×844, light et dark, EN et FR — par page, après sa session :

- [ ] Toujours un dashboard à onglets (`view=`, un panneau à la fois) — **y compris mobile** (plus de scroll unique MOBILE_UX)
- [ ] **4 items** artists / tracks (et genres en 7c) : Top artistes|titres → Top 20 (chart) → ranking → trends **lien** vers `*/trends` (pas un 4ᵉ panneau, pas de tuiles dans l’onglet chart)
- [ ] Masthead canvas (light/dark), plus de `*_HERO_SHELL` always-dark ; plus de CTA trends dupliqué dans le masthead une fois l’onglet en place
- [ ] KPI = metric strip, pas des mini-cartes
- [ ] Top-N média = `ReplayRankingGrid` importé (pas `CARD_SHELL` / `GENRE_SPOTLIGHT_CARD_SHELL` / tuile recopiée)
- [ ] Catalogue ranking = un-card + search pill, pas des posters 3:4
- [ ] Chart (leaderboard / distribution) sur le canvas, plus de `DASHBOARD_SPOTLIGHT_SHELL`
- [ ] e2e mobile : tablist désormais **attendu** ; insights / trends / dates / `userId` OK

---

## Critères de done (7d)

- [ ] Hub empilé (pas de `view=` / tablist) ; masthead canvas + metric strip + Replay top 4 + destinations list rows
- [ ] Plus de hero always-dark / FeaturePillarCard / DestinationRow cartes
- [ ] Dual tree ; e2e hub (h1 + 3 liens, tablist count 0)

---

## Critères de done (7e)

Desktop `lg+` **et** mobile ~390×844, light et dark, EN et FR :

- [x] Timeline + heatmap + `/artists|tracks|genres/trends` : masthead canvas, plus de `*_HERO_SHELL` always-dark
- [x] KPI = metric strip ; plots **sans** `DASHBOARD_SPOTLIGHT_SHELL`
- [x] Timeline + `*/trends` : `OverviewTrendsChart` / `crystal-chart.ts` — plus de `DASHBOARD_CHART_THEME` + `Legend` sur ces pages
- [x] Mobile : plus de `TRENDS_MOBILE_HERO` / cinematic / SignalTile dark ; dual tree
- [x] Overview + `*-trends-summary-widget` **non** retouchés
- [x] e2e timeline / heatmap day sheet / trends mobiles OK

---

## Critères de done (7f)

- [ ] Ask : presets / empty chrome sans mini-cartes `shadow-sm` marketing ; composer + e2e presets / sheet OK
- [ ] Duet friends + compare : plus de hero always-dark ni mega `DASHBOARD_SPOTLIGHT_SHELL` ; strip + list rows
- [ ] Compare dual-series : plot Crystal si encore legacy ; auth redirect e2e vert
- [ ] Friend-music `TopLibraryCard` → **reporté à 9a** (hors scope 7f volontaire)
- [ ] Light/dark EN/FR desktop + mobile

---

## Critères de done (7g)

- [x] Empty states (dont « Empty library ») sans shell carte marketing ; copy + CTA Crystal lisibles
- [x] `/dashboard/ai-insights` : sections et insights un-card, sans hero always-dark ni card stacks
- [x] `/dashboard/temporal-analysis` : plots/insights sortis des wrappers spotlight/card legacy
- [x] `/dashboard/genres/palette` : palette, légende, détails en layout canvas/list rows plutôt qu’en cartes empilées
- [x] `/dashboard/settings` : groupes/actions harmonisés Crystal (rows, separators, cibles 44px), sans conteneurs carte lourds
- [x] Light/dark EN/FR (et ES si copy touchée) desktop + mobile, sans régression de logique produit

---

## Critères de done (8a–8b)

Desktop `lg+` **et** mobile header (~390×844), light et dark, EN et FR :

- [x] 8a : trigger cloche calme (pas mini-carte border+shadow) ; panneau `DASHBOARD_GLASS_FLOATING_PANE` / glass ; rows hairline ; IA notifications inchangée
- [x] 8b : avatar sans hover-lift ; menu glass floating ; items list rows, pas `shadow-card` / `primary/10`
- [x] Cluster `headerActions` intact (ordre cloche → avatar) ; masquage démo notifications inchangé
- [x] Escape / click outside / focus ring / cibles 44px ; `prefers-reduced-transparency`

---

## Critères de done (9a–9d)

Desktop `lg+` **et** mobile ~390×844, light et dark, EN et FR :

- [ ] **9a** `/dashboard/duet/music?friendUserId&view=tops` : plus de `TopLibraryCard` ; artistes = carrousel / grille Replay comme Overview ; tracks + genres = `ReplayRankingGrid` ; clic artiste → `ArtistUserInsightsPanel` avec `userId=friendUserId`
- [x] **9b** Friend-music : picker / gated / skeleton sans `MUSIC_HERO_SHELL` / `DASHBOARD_SPOTLIGHT_SHELL` ; mobile sans `HERO_SHELL` always-dark ; `view=trends` = `OverviewTrendsChart` (1 série)
- [ ] **9c** Compare : `section=overview|shared|target` sans mega-shells ; dual timeline Crystal ; picker sans `friendUserId` en list rows ; deep-links OK ; e2e auth redirect vert
- [x] **9d** Friends : rows + invite canvas ; sub-nav Music / Compare / Friends cohérent sur les 3 routes ; empty gated Crystal
- [ ] Auth-only Duet (pas de démo `?userId=`) ; `view=` music et `section=` compare/friends inchangés sémantiquement
- [ ] `prefers-reduced-transparency` sur frost / glass

---

## Critères de done (10a–10b)

Desktop `lg+` **et** mobile ~390×844, light et dark, EN et FR :

- [ ] **10a** `/dashboard/onboarding` desktop : plus de `DASHBOARD_CINEMATIC_HERO_SHELL` / `DashboardCinematicHeroBg` / `DASHBOARD_GLASS_CARD_SHELL` comme shell de phase ; masthead canvas ; pick / guide / import / finish + Genre AI sans cartes marketing ni CTAs hover-lift
- [ ] **10b** Mobile : plus de `HERO_SHELL` cinematic / orbs / grain ; pick en list rows ; sticky glass calme ; **pas** de bottom nav
- [ ] Phases `welcome → pick → guide → import → finish` et query `addData` / consent / skip / complete / import **inchangés**
- [ ] e2e `mobile-dashboard` onboarding (continue → pick, FR) verts
- [ ] `prefers-reduced-transparency` ; cibles 44px

---

## Hors scope Crystal

- Transformer Overview (ou l’app) en **story Replay** (scroll unique, tuer les tabs)
- Cloner Apple Music pixel-perfect (marque, rouge produit, wordmark)
- SF Pro — `Inter` + `system-ui` / `-apple-system`
- Nouvelle page `/dashboard/replay` — [Encore](./ENCORE_REPLAY_PLAYBOOK.md)
- Refonte landing (`design-system.md`)
- Changer le graphe de nav sans décision produit
- APIs / parsers onboarding (Étape 10 = **chrome UI** seulement)

---

## Voir aussi

- [`APP_FLOW.md`](./APP_FLOW.md) — rôle de Your Music
- [`MOBILE_UX_PLAN_PROMPTS.md`](./MOBILE_UX_PLAN_PROMPTS.md) — arbre mobile (chrome / bottom nav) ; le look média Overview = Crystal, pas ce playbook
- [`ENCORE_REPLAY_PLAYBOOK.md`](./ENCORE_REPLAY_PLAYBOOK.md) — Replay **données / page annuelle**, pas ce restyle
- [`dashboard-design-system.md`](./dashboard-design-system.md) — tokens + tuile Replay + charts
- `lib/components/dashboard-ui.tsx` — shells legacy (cinématique, widget card) ; interdits sur Overview Crystal
- `lib/components/overview-hero.tsx` — `OverviewHeroFrame` + `OverviewMobileHero` compact **faits**
- `lib/components/dashboard-section-switcher.tsx` — segmented **fait** (étape 3)
- `lib/components/replay-ranking-grid.tsx` — **fait** étape 5, recette à composer (6+)
- `lib/components/spotlight-artists-featured-list.tsx` — **fait** étape 4
- `lib/components/charts/overview-trends-chart.tsx` — **fait** étape 5
- `lib/components/top-three-artists-cards.tsx` — legacy `CARD_SHELL` ; **7a** l’a débranché de `/artists`
- [`lib/components/artists-mobile.tsx`](../lib/components/artists-mobile.tsx) / `tracks-mobile.tsx` / `genres-mobile.tsx` / `musical-profile-mobile.tsx` — dual tree Crystal 7a–7d
- `lib/components/trends-mobile-hub.tsx` / `timeline-mobile.tsx` / `heatmap-mobile.tsx` — **7e**
- `lib/components/ask-soundprint-*.tsx` / `lib/components/duet/*-hero.tsx` — **7f** (chrome)
- `ai-insights` / `temporal-analysis` / `palette/*` / settings — **7g** (chrome + empty partagés)
- `notification-center.tsx` / `dashboard-user-menu.tsx` — **étape 8** (header actions)
- `duet-friend-music-*.tsx` / `duet-compare-*.tsx` / `duet-friends-*.tsx` — **étape 9** (Duet produit)
- `data-export-onboarding.tsx` / `onboarding-mobile.tsx` / `onboarding-finish-invites.tsx` / `onboarding-mobile-sticky-actions.tsx` — **étape 10** (wizard import Crystal)
