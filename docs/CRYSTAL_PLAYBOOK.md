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

Le plus gros écart **restant** n’est plus Overview ni artists / tracks / genres. **7a–7c livrées.** Restant : musical-profile (7d), `*/trends` + timeline/heatmap (7e), Ask / Duet (7f).

---

## Faut-il activer le mode Plan ?

**Oui, pour chaque étape d’implémentation. Non, pas pour ce fichier.**

| Moment | Mode | Pourquoi |
| --- | --- | --- |
| Lire / ajuster ce playbook | Agent (ou rien) | Document uniquement |
| Étapes 0–5 (desktop Crystal) | — | **Livrées.** Ne pas rejouer. |
| Étape 6 (Overview mobile) | — | **Livrée.** Dual tree `lg:hidden` ; mêmes onglets que le desktop |
| Étape 7a–7d (artists / tracks / genres / musical-profile) | **Plan**, une session = un prompt **complet** | Pas les one-liners. 7e–7f : étendre avant de lancer |

Règle d’or : **une conversation Plan = un prompt numéroté**. Après implémentation : EN + FR, light + dark, desktop `lg+` **et** mobile ~390×844.

Crystal **desktop Overview est livré**. Mobile = arbre `lg:hidden` dédié. Ne pas fusionner avec des `sm:`.

---

## Comment utiliser ce fichier

1. Ouvre une **nouvelle conversation en mode Plan**.
2. Colle le **préambule**.
3. Colle **un seul** prompt numéroté.
4. Valide le plan, implémente, vérifie au navigateur, commit.
5. Passe au numéro suivant.

Étapes **7a–7d** : coller le **bloc complet** (sections Étape 7a / 7b / 7c / 7d), pas la cellule du tableau d’ordre. Le tableau n’est qu’un index.

Hors scope de chaque prompt sauf mention contraire : landing marketing, e-mail, cookies, auth pages, onboarding wizard, APIs, Prisma.

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
| `TopLibraryCard` | `overview-library-rankings.tsx` | Legacy ; encore Duet friend-music |

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

Les plots Overview + widgets `*-trends-summary-widget.tsx` utilisent **déjà** `OverviewTrendsChart`. Ne pas les restyler. Le **corps** de `/artists/trends` `/tracks/trends` `/genres/trends` = **7e**. Le **4ᵉ onglet** du listing (lien vers ces routes) = 7b / 7c, pas 7e.

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

Ordre (index). **7a–7d = blocs complets plus bas.** 7e–7f = encore trop courts : les étendre avant ces sessions.

| # | Route | Session |
| --- | --- | --- |
| **7a** | `/dashboard/artists` | **Faite** (visuel). Recette : masthead + strip + `ReplayRankingGrid` + un-card chart/table. Dual tree. 4ᵉ onglet trends = 7b. |
| **7b** | `/dashboard/tracks` | Même **4 onglets** que la cible artists. 1er = tuiles Top tracks (pas le bar chart). + parité trends sur `/artists`. |
| **7c** | `/dashboard/genres` | Même contrat 4 onglets (top / chart / ranking / lien trends). `GENRE_SPOTLIGHT_CARD_SHELL` → `ReplayRankingGrid` `kind: "fill"`. |
| **7d** | `/dashboard/musical-profile` | **Hub empilé** (pas de `view=`). Masthead canvas + strip + tuiles Replay (top 4) + list rows destinations. Dual tree. |
| 7e | Timeline, heatmap, `*/trends` | Chrome de page sur canvas (plus de hero `rounded-[2rem]`). Plot : `OverviewTrendsChart` / `crystal-chart.ts` s’il reste du `DASHBOARD_CHART_THEME`. Pas de blur sur le SVG. |
| 7f | Ask / Duet | Chrome seulement. `TopLibraryCard` sur `duet-friend-music-desktop.tsx` hors scope sauf session friend-music. |

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

7e–7f : ne pas coller les one-liners du tableau. Avant chaque session, écrire un bloc du calibre 7a (fichiers, aujourd’hui, compose X, interdit Y, dual tree, e2e).

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

## Hors scope Crystal

- Transformer Overview (ou l’app) en **story Replay** (scroll unique, tuer les tabs)
- Cloner Apple Music pixel-perfect (marque, rouge produit, wordmark)
- SF Pro — `Inter` + `system-ui` / `-apple-system`
- Nouvelle page `/dashboard/replay` — [Encore](./ENCORE_REPLAY_PLAYBOOK.md)
- Refonte landing (`design-system.md`)
- Changer le graphe de nav sans décision produit

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
