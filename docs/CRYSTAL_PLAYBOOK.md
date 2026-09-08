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

**Source de vérité visuel (étape 4, faite) :** tuiles portrait Replay — `aspect-[3/4]`, `rounded-[22px]`, rang grand, pied frost plein cadre (`.dashboard-replay-card-frost`), nom + métrique + sous-titre **toujours visibles**, pager 4-up + flèches circulaires. Recette : [`spotlight-artists-featured-list.tsx`](../lib/components/spotlight-artists-featured-list.tsx).

Le plus gros écart **restant** n’est pas l’architecture d’onglets. C’est encore la **matière carte** sur les autres vues : stats (`STATS_SHELL_CLASS`), library (`TopLibraryCard` + gradients), momentum / further. Spotlight n’est plus le modèle à corriger : c’est le modèle à **copier**.

---

## Faut-il activer le mode Plan ?

**Oui, pour chaque étape d’implémentation. Non, pas pour ce fichier.**

| Moment | Mode | Pourquoi |
| --- | --- | --- |
| Lire / ajuster ce playbook | Agent (ou rien) | Document uniquement |
| Étape 0 (tokens + primitives sans-carte) | **Plan** | Décisions light/dark, contraste verre |
| Étape 1 (sidebar verre) | **Plan** | Touche tout le dashboard desktop |
| Étape 2 (header + sélecteur période) | **Plan** | Chrome partagé |
| Étape 2.5 (masthead Overview) | **Plan** | Hero cinématique → titre + insight sur canvas, avant le sélecteur |
| Étapes 3–5 (Overview visuel) | **Plan** | Sélecteur d’onglets + Spotlight + un-card des autres vues |
| Étapes suivantes | **Plan**, une session = un prompt | Même règle que [`MOBILE_UX_PLAN_PROMPTS.md`](./MOBILE_UX_PLAN_PROMPTS.md) |

Règle d’or : **une conversation Plan = un prompt numéroté**. Après implémentation : EN + FR, light + dark, desktop `lg+` **et** mobile ~390×844.

Crystal commence par le **desktop**. Mobile = arbre `lg:hidden` dédié. Ne pas fusionner avec des `sm:`.

---

## Comment utiliser ce fichier

1. Ouvre une **nouvelle conversation en mode Plan**.
2. Colle le **préambule**.
3. Colle **un seul** prompt numéroté.
4. Valide le plan, implémente, vérifie au navigateur, commit.
5. Passe au numéro suivant.

Hors scope de chaque prompt sauf mention contraire : landing marketing, e-mail, cookies, auth pages, onboarding wizard, APIs, Prisma.

---

## Préambule (à coller au début de CHAQUE prompt)

```text
Contexte Soundprint : dashboard Next.js App Router, i18n en/fr/es, thèmes light + dark (class `html.dark`).
Breakpoint desktop sidebar = lg (1024px). Mobile = arbre dédié `lg:hidden`, pas du desktop compressé.

Projet Crystal : UI « produit Apple » sur un DASHBOARD À ONGLETS. On restyle la matière, on ne change pas le modèle d’information.
Garder : OverviewSectionSwitcher + DashboardSectionPanel + query param `view=` (spotlight / tops / trends / context / summary / friends / further). Un panneau visible à la fois.
Interdit : convertir Overview en story Replay (tout le contenu dans un seul scroll, onglets → ancres, tuer le switcher).

Inspiration visuelle (pas le branding) :
- Apple Music Home (music.apple.com/be/home) : sidebar verre.
- Apple Music Replay (music.apple.com/be/replay) : sélecteur (pills / segmented, pas une rangée de chips-cartes) ; tuiles « Your Top Artists » = portrait 3:4, coins ~22px, rang gros, pied frost plein cadre (nom + métrique toujours visibles). Copier spotlight Overview (étape 4, faite) — pas une liste iOS à la place des tuiles.

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

Chez nous, aujourd’hui : [`overview-hero.tsx`](../lib/components/overview-hero.tsx) (`DASHBOARD_CINEMATIC_HERO_SHELL`, always-dark, wordmark, avatar XL, badge période, insight en sous-carte). Cible = **étape 2.5**, avant le restyle du tablist — sinon l’étape 3 se juge sous le glow.

### Sélecteur

Replay : une piste compacte, un item actif évident, le reste discret. Pas d’icône obligatoire, pas de carte qui encapsule chaque onglet.

Chez nous, deux sélecteurs à aligner sur cette famille :

1. **Période** — `date-range-filter.tsx` (7d / 30d / YTD / All / Custom)
2. **Vue Overview** — `overview-section-switcher.tsx` / `dashboard-section-switcher.tsx` (déjà un `role="tablist"`, aujourd’hui chips dans une barre `rounded-[1.5rem] border shadow-sm`)

Cible : **segmented control iOS** — piste verre, pill actif opaque/contraste, labels seuls (les icônes Lucide peuvent rester en `sm+` ou disparaître si ça fait « toolbar Bootstrap »).

### « Your Top Artists » (tuiles Replay — **fait**, étape 4)

Replay : le titre vit **sur le fond de page**. Quatre tuiles portrait. Photo plein cadre. Rang gros en haut à gauche. Pied **frost** (blur + dégradé, pas une pastille inset) : nom centré, métrique muted, toujours visibles. Flèches circulaires givrées + pager 1–4 / 5–8 / ….

Chez nous, c’est **livré** sur Overview `view=spotlight` :

- [`top-three-artists-overview-widget.tsx`](../lib/components/top-three-artists-overview-widget.tsx) — section canvas (eyebrow + titre + See all ghost)
- [`spotlight-artists-featured-list.tsx`](../lib/components/spotlight-artists-featured-list.tsx) — tuiles + pager
- [`top-three-artists-cards.tsx`](../lib/components/top-three-artists-cards.tsx) — **legacy** `CARD_SHELL` (page `/artists` seulement, jusqu’à 7a)

Recette à recopier (étapes 5+) :

1. Pas de mega-carte autour de la section.
2. Grille 4-up (desktop) de tuiles `aspect-[3/4] rounded-[22px]`.
3. Pied `.dashboard-replay-card-frost` + texte blanc centré (nom, count, sous-titre). `prefers-reduced-transparency` : fond opaque, blur 0.
4. Pager si > 4 items : labels `{start}–{end}` au-dessus + flèches circulaires `bg-white/15 backdrop-blur-xl`.
5. Nom visible sans hover. Clic tuile = insight / navigation, pas un chrome de carte.
6. CTA See all = lien ghost, pas un footer de widget.

Les vues **tops** (tracks / artistes / genres) et les fiches des pages Artistes / Tracks / Genres **reprennent ces tuiles**, pas trois `TopLibraryCard` ni un featured + list rows.

### Anti-carte — inventaire Overview

À faire disparaître (classes / shells), pas à « adoucir » :

| Surface | Fichier | Pattern actuel |
| --- | --- | --- |
| Hero | `overview-hero.tsx` + `DASHBOARD_CINEMATIC_HERO_SHELL` | Carte glow violette |
| Stats | `overview-stats-section.tsx` `STATS_SHELL_CLASS` | 4 cartes dark hover-lift |
| Spotlight | `spotlight-artists-featured-list.tsx` | **Fait** — tuiles Replay |
| Tops | `overview-library-rankings.tsx` | Widget gradient + rows-cartes |
| Switcher | `dashboard-section-switcher.tsx` | Barre-carte + chips-cartes |
| Momentum / go further | widgets + `overview-go-further.tsx` | Cartes promo |

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
| Masthead Overview | `overview-hero.tsx` (étape 2.5) |
| Onglets Overview | `dashboard-section-switcher.tsx`, `overview-section-switcher.tsx` |
| Overview | `overview/page.tsx`, `overview-desktop-flow.tsx`, `overview-hero.tsx`, `overview-stats-section.tsx`, `overview-library-rankings.tsx`, `top-three-artists-overview-widget.tsx`, `spotlight-artists-featured-list.tsx` |

---

## Étape 0 — Tokens verre + primitives sans-carte

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

## Étape 1 — Sidebar verre (Apple Music Home)

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

## Étape 2 — Header + sélecteur de période (Replay selector, chrome)

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

## Étape 2.5 — Overview masthead (sortir de la carte glow)

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

## Étape 3 — Overview : sélecteur d’onglets (Replay selector)

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

Recette livrée (à copier aux étapes 5+) :

- Section canvas : eyebrow + titre + See all ghost. Pas de `rounded-[2rem]` / `shadow-card` autour de la section.
- Grille 4-up, `SPOTLIGHT_PAGE_SIZE = 4`, jusqu’à 10 artistes. Labels pager `{start}–{end}` au-dessus de la grille.
- Tuile : `aspect-[3/4] rounded-[22px]`, photo plein cadre, rang gros en haut à gauche, pied `.dashboard-replay-card-frost` (blur + mask, pas une pastille inset). Nom + streams + signature **toujours visibles**, centrés, texte blanc.
- Flèches circulaires `bg-white/15 backdrop-blur-xl`. Clavier flèches sur le tablist pager.
- Clic tuile → `onOpenArtistInsights`. Noms dans le document (a11y).
- Page `/dashboard/artists` : encore `CARD_SHELL` 3-up jusqu’à **7a**.

Fichiers : `top-three-artists-overview-widget.tsx`, `spotlight-artists-featured-list.tsx`, `.dashboard-replay-card-frost` dans `globals.css`. i18n `overview.artistSpotlight.pageRange` / `pagesNav` / `previousPage` / `nextPage`.

---

## Étape 5 — Overview desktop : un-card le reste des onglets

Même **vibe Spotlight** (tuiles Replay + frost + pager) sur les panneaux média. Les onglets restent. Spotlight **hors scope** (déjà fait).

KPI ≠ artwork : **summary** reste un metric strip, pas des tuiles 3:4. Amis / settings = list rows. Tracks / artistes / genres = tuiles Replay.

```text
[Préambule]

Étape 5 — Crystal Overview desktop : même matière que spotlight (tuiles Replay) sur summary, tops, trends, context, friends, further.
Masthead (2.5), switcher (3) et spotlight (4) déjà Crystal — NE PAS retoucher spotlight-artists-featured-list.tsx ni le widget spotlight.

Fichiers : overview-stats-section.tsx, overview-library-rankings.tsx, overview-section.tsx, overview-momentum-tabs.tsx, overview-go-further.tsx, overview-friends-section.tsx, heatmap/AI shells seulement si carte.
overview-desktop-flow.tsx : wrappers uniquement. overview-hero.tsx hors scope (fait en 2.5).
Mobile HORS SCOPE.
Hooks / view= / startDate / endDate / userId inchangés.

Source de vérité visuel : lib/components/spotlight-artists-featured-list.tsx + .dashboard-replay-card-frost (globals.css).
Copier : section canvas (eyebrow + titre + See all ghost) ; grille 4-up aspect-[3/4] rounded-[22px] ; rang gros ; pied frost plein cadre ; nom+métrique toujours visibles ; pager labels {start}–{end} + flèches circulaires givrées si > 4 items.
Ne PAS faire : featured #1 + DASHBOARD_LIST_ROW pour du média ; 3 TopLibraryCard ; STATS_SHELL_CLASS ; rounded-[2rem] shadow-card autour d’une section ; overlay hover qui cache le nom.

Objectif par vue :
- summary : metric strip 4 colonnes (DASHBOARD_METRIC_STRIP), hairline, PAS STATS_SHELL_CLASS ni hover-lift par KPI. Les KPI ne sont pas des tuiles Replay.
- tops : 3 sections (tracks / artists / genres) = 3 blocs type spotlight (titre sur canvas + tuiles Replay 4-up + pager si besoin). PAS 3 widgets TopLibraryCard gradient. PAS featured + list rows. Pochette track / artiste / genre dans la tuile ; rang + nom + count dans le frost. Clic tuile = insight / navigation existante.
- trends : sous-onglets = même segmented que étape 3. Chart sans carte-widget autour (axe + plot sur canvas). Si une entité a une pochette (top track du jour, etc.), c’est une tuile Replay, pas une mini-carte.
- context : titres de section sur canvas. Média (si présent) = tuiles Replay. List rows seulement pour du non-média.
- friends : list rows iOS grouped (pas des tuiles 3:4 — ce n’est pas de l’artwork ranking).
- further : plus de cartes promo. Titre + liens / rows, pas rounded-[2rem] marketing.

Contraintes : toutes les vues restent ; i18n EN/FR (+ ES si clés existantes) ; demo ?userId= ; ArtistUserInsightsPanel fonctionnel. Gemini modify_frontend 1 surface à la fois — surface = tuile Replay (pas featured+list). Light + dark.

Livre : checklist anti-carte (grep rounded-[2rem] / shadow-card / STATS_SHELL / CARD_SHELL / TopLibraryCard shell dans les fichiers Overview, hors page /artists). Empty/error/skeleton alignés sur canvas (skeletons de tuiles 3:4 pour les tops, pas 3 fake cards). e2e overview.
```

---

## Étape 6 — Overview mobile : même dashboard, même matière

Pas un récit différent. Garder le flow mobile existant. **Même vibe Spotlight** : tuiles Replay, pas featured + rows. Ne pas fusionner desktop avec des `sm:`.

```text
[Préambule]

Étape 6 — Crystal Overview mobile. Référence native : musical-profile-mobile.tsx + MOBILE_UX_PLAN_PROMPTS.md.
Référence visuel média : spotlight desktop (spotlight-artists-featured-list.tsx) — tuiles Replay, pas featured #1 + list rows.

Fichiers : overview-mobile-flow.tsx, parties mobile overview-hero.tsx, switcher mobile s’il existe, spotlight / tops / summary mobile s’ils fourchent le desktop.
Desktop HORS SCOPE. Dual tree : lg:hidden dédié, pas des sm: sur le JSX desktop.

Objectif : dashboard téléphone — insight, métriques en rail (metric strip / scroll-x, pas des tuiles KPI), média = tuiles Replay.
- Spotlight + tops (tracks / artists / genres) : grille 2 colonnes de tuiles aspect-[3/4] rounded-[22px] + frost + pager (2-up, mêmes labels {start}–{end} + flèches 44px si > 2 items). Pas de mega-cards rounded-3xl. Pas de CARD_SHELL. Pas de liste iOS à la place des pochettes.
- Summary : rail de métriques, pas 4 cartes.
- Friends : list rows. Further : pas de cartes promo.
- Bottom nav déjà verre. Tabs : DASHBOARD_SEGMENTED_* (scroll-x sur la piste).

Contraintes : 44px, FR, withFilters, empty mobile dédié. ~390×844 + grand iPhone, EN+FR. prefers-reduced-transparency sur le frost.

Livre : dettes cartes vs desktop Crystal, patchs ciblés, pas de rewrite du flow. Ne pas réintroduire featured+list.
```

---

## Étape 7 — Pages suivantes (après Overview)

Un écran par session. **Garder leurs onglets / panneaux.** Un-card + segmented + **tuiles Replay** pour tout ranking média (même recette que spotlight Overview). List rows seulement pour du non-média. Ordre :

| # | Route | Prompt court |
| --- | --- | --- |
| 7a | `/dashboard/artists` | `[Préambule]` Crystal : switcher déjà restylé (étape 3). Retirer `CARD_SHELL` / `TopThreeArtists` 3-up. Spotlight / Top 20 = tuiles Replay 4-up (desktop) + pager, comme `spotlight-artists-featured-list.tsx`. Fiches artiste : pochette + meta sur canvas, pas une mega-carte. |
| 7b | `/dashboard/tracks` | Idem : tuiles Replay (pochette track 3:4 ou 1:1 dans le même frame `rounded-[22px]` + frost), pas featured+list ni widgets library. |
| 7c | `/dashboard/genres` | Idem. Répartition / charts sur canvas (pas une carte-widget). Genres avec visuel = tuiles Replay, pas des chips-cartes. |
| 7d | `/dashboard/musical-profile` | Matière Crystal, **garder** arbre mobile. Toujours un hub à onglets, pas un Replay story. Média = tuiles ; hub chrome = verre. |
| 7e | Timeline, heatmap, temporal-analysis | Graphiques sur canvas, pas blur sur le SVG. Entités cliquables avec pochette = tuile Replay, pas une row-carte. |
| 7f | Ask / Duet | Chrome seulement. |

---

## Gemini Design MCP

Après l’étape 0. **Pas** de `create_frontend` Overview (casserait hooks / i18n / tabs).

| Outil | Usage |
| --- | --- |
| `modify_frontend` | 1 surface : segmented, **tuile Replay** (portrait + frost, comme spotlight), metric strip, list row **non-média** |
| `snippet_frontend` | Grille de tuiles + pager si tu insères dans un widget existant |
| `create_frontend` | Interdit pour Overview. Bac à sable vibe OK puis extraire vers `docs/dashboard-design-system.md` |

Surface média = tuile Replay. **Pas** featured #1 + list. Coller `docs/dashboard-design-system.md` (section Replay tiles) + pointer `spotlight-artists-featured-list.tsx`. Rejeter toute carte / `CARD_SHELL` / hover overlay réintroduite.

Scale : **`refined`**.  
`designSystem` : `docs/dashboard-design-system.md` après étape 0, sinon primitives `dashboard-ui.tsx` + tokens — **pas** le landing `design-system.md`.

---

## Critères de done (Overview)

Desktop `lg+`, light et dark, EN et FR :

- [ ] C’est toujours un **dashboard à onglets** (`view=`, un panneau à la fois)
- [ ] Masthead Overview : large title + insight sur le canvas, plus de `DASHBOARD_CINEMATIC_HERO_SHELL` ni insight-carte
- [ ] Le switcher ressemble à un sélecteur Replay / iOS, plus à une barre de chips-cartes
- [x] Spotlight : tuiles Replay « Your Top Artists » — titre canvas + 4-up frost + pager, **sans** mega-carte ni `CARD_SHELL` (desktop Overview)
- [ ] Stats : metric strip, plus de `STATS_SHELL_CLASS` / hover-lift
- [ ] Tops : mêmes tuiles Replay que spotlight (tracks / artists / genres), plus de `TopLibraryCard` / `shadow-card` / `rounded-[2rem]` autour de la section
- [ ] Sidebar + header verre ; pied frost **sur les tuiles média** ; pas de carte verre autour d’une section
- [ ] Demo `?userId=` et filtres dates OK
- [ ] `prefers-reduced-transparency`
- [ ] Mobile : même modèle dashboard, pas de régression bottom nav
- [ ] e2e overview + sidebar theme switcher

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
- [`MOBILE_UX_PLAN_PROMPTS.md`](./MOBILE_UX_PLAN_PROMPTS.md) — arbre mobile
- [`ENCORE_REPLAY_PLAYBOOK.md`](./ENCORE_REPLAY_PLAYBOOK.md) — Replay **données / page annuelle**, pas ce restyle
- [`dashboard-design-system.md`](./dashboard-design-system.md) — tokens + tuile Replay
- `lib/components/dashboard-ui.tsx` — shells legacy (cinématique, widget card)
- `lib/components/overview-hero.tsx` — cible étape 2.5 (masthead)
- `lib/components/dashboard-section-switcher.tsx` — tablist à passer en segmented
- `lib/components/spotlight-artists-featured-list.tsx` — **fait** étape 4, recette à copier
- `lib/components/top-three-artists-cards.tsx` — legacy `CARD_SHELL`, page `/artists` jusqu’à 7a
