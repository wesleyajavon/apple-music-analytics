# Crystal — Apple-product UI playbook

Playbook pour faire **ressembler** Soundprint à un produit Apple : calme, lisible, tactile, chrome en **verre** — tout en restant un **dashboard à onglets**.

Ce n’est **pas** une conversion Replay → récit / story. [Apple Music Replay](https://music.apple.com/be/replay) sert de **référence visuelle** (sélecteur, section « Your Top Artist », listes sans cartes). [Apple Music Home](https://music.apple.com/be/home) sert pour la **sidebar verre**.

**Première page métier : `/dashboard/overview` (Your Music).**  
Le chrome (sidebar + header) se fait **avant** Overview, sinon chaque section sera restylée deux fois.

---

## Correction produit (à ne plus rater)

| On veut | On ne veut pas |
| --- | --- |
| Dashboard. Onglets. Un panneau à la fois (`view=`). | Remplacer les onglets par un scroll-histoire Replay |
| Le **look** du sélecteur Replay + de « Your Top Artist » | Cloner le wordmark / le rouge Apple Music |
| Sections **sans boîte** : titre + média + liste | `rounded-[2rem]` + `shadow-card` + hover lift autour de chaque bloc |
| Verre sur le **chrome** (sidebar, header, sélecteur) | Une carte verre autour de chaque KPI / top / widget |

Le plus gros écart actuel n’est pas l’architecture d’onglets. C’est la **matière carte** : spotlight (`top-three-artists-cards.tsx`, `CARD_SHELL`), stats (`STATS_SHELL_CLASS`), library (`TopLibraryCard` + gradients), hero (`DASHBOARD_CINEMATIC_HERO_SHELL`).

---

## Faut-il activer le mode Plan ?

**Oui, pour chaque étape d’implémentation. Non, pas pour ce fichier.**

| Moment | Mode | Pourquoi |
| --- | --- | --- |
| Lire / ajuster ce playbook | Agent (ou rien) | Document uniquement |
| Étape 0 (tokens + primitives sans-carte) | **Plan** | Décisions light/dark, contraste verre |
| Étape 1 (sidebar verre) | **Plan** | Touche tout le dashboard desktop |
| Étape 2 (header + sélecteur période) | **Plan** | Chrome partagé |
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
- Apple Music Replay (music.apple.com/be/replay) : sélecteur (pills / segmented, pas une rangée de chips-cartes) ; section « Your Top Artist » = titre de section à même le canvas + grande pochette + nom + métrique, SANS carte autour. Listes numérotées ensuite, pas des widgets.

Inspirer, ne pas cloner : pas de logo Apple, pas de rouge Apple Music comme marque, pas de SF Pro sous licence. Accent Soundprint (violet / rose / cyan) en touches, pas en glow de carte.

Anti-carte (non négociable sur Overview) :
Interdit autour d’une section : rounded-[2rem], shadow-card, ring-1, hover:-translate-y, border+gradient « widget », carte dans la carte.
Autorisé : titre de section (large title / eyebrow 13px) collé au canvas ; pochette 1:1 radius ~12px (carré) ou ronde (artiste) ; liste iOS grouped (séparateurs hairline, pas une boîte par row) ; verre UNIQUEMENT chrome (sidebar, header, piste du sélecteur).

Scale : refined. Tracking négatif titres, labels 13px, cibles 44px.
Accessibilité verre : WCAG AA ; prefers-reduced-transparency → opaque ; prefers-reduced-motion.
design-system.md racine = LANDING dark. Ne pas le coller sur le dashboard. Source = globals.css + dashboard-ui.tsx + ce playbook.

Avant de proposer un plan : lis les fichiers du prompt. Pose 1 question si besoin. Ne change pas hooks / APIs / query params (startDate, endDate, userId, view).
```

---

## Nord visuel Replay → Overview

Référence : [Apple Music Replay](https://music.apple.com/be/replay) — surtout le **sélecteur** et **Your Top Artist**.

### Sélecteur

Replay : une piste compacte, un item actif évident, le reste discret. Pas d’icône obligatoire, pas de carte qui encapsule chaque onglet.

Chez nous, deux sélecteurs à aligner sur cette famille :

1. **Période** — `date-range-filter.tsx` (7d / 30d / YTD / All / Custom)
2. **Vue Overview** — `overview-section-switcher.tsx` / `dashboard-section-switcher.tsx` (déjà un `role="tablist"`, aujourd’hui chips dans une barre `rounded-[1.5rem] border shadow-sm`)

Cible : **segmented control iOS** — piste verre, pill actif opaque/contraste, labels seuls (les icônes Lucide peuvent rester en `sm+` ou disparaître si ça fait « toolbar Bootstrap »).

### « Your Top Artist » (section, pas une carte)

Replay : le titre vit **sur le fond de page**. La pochette / photo **est** le visuel. Nom en large. Compteur en tabular-nums muted. Pas de header de widget, pas de `See all` dans une barre de carte.

Chez nous, l’équivalent immédiat est la vue **spotlight** :

- [`top-three-artists-overview-widget.tsx`](../lib/components/top-three-artists-overview-widget.tsx) — encore une mega-carte `rounded-[2rem] shadow-card`
- [`top-three-artists-cards.tsx`](../lib/components/top-three-artists-cards.tsx) — `CARD_SHELL` + hover lift + overlay

Cible spotlight :

1. Eyebrow / titre de section type « Your Top Artist » (i18n existant `overview` / `artists`, pas de copy marketing)
2. **Featured** = artiste #1 : grande image, nom, écoutes — canvas, pas de boîte
3. **Suite** = 2…n en liste ou rail d’artworks **sans** carte par item
4. CTA « voir tous les artistes » en lien texte / bouton ghost, pas un footer de carte

Les vues **tops** reprennent le même langage : un featured + une liste, plus trois `TopLibraryCard` côte à côte.

### Anti-carte — inventaire Overview

À faire disparaître (classes / shells), pas à « adoucir » :

| Surface | Fichier | Pattern actuel |
| --- | --- | --- |
| Hero | `overview-hero.tsx` + `DASHBOARD_CINEMATIC_HERO_SHELL` | Carte glow violette |
| Stats | `overview-stats-section.tsx` `STATS_SHELL_CLASS` | 4 cartes dark hover-lift |
| Spotlight | `top-three-artists-*.tsx` | Carte + sous-cartes |
| Tops | `overview-library-rankings.tsx` | Widget gradient + rows-cartes |
| Switcher | `dashboard-section-switcher.tsx` | Barre-carte + chips-cartes |
| Momentum / go further | widgets + `overview-go-further.tsx` | Cartes promo |

Remplacement type Apple :

| Au lieu de | Utiliser |
| --- | --- |
| Widget card | Section : `h2` + contenu |
| Carte KPI | Strip : label 13px au-dessus, chiffre large, hairline entre colonnes |
| Carte artiste | Featured media + meta |
| Row dans une mini-carte | List row : pochette 40–48px, titre, subtitle, count à droite, séparateur |
| Chip onglet | Segmented pill |

Le verre n’est **pas** une carte de contenu. C’est sidebar / header / piste du tablist.

---

## Règles d’architecture (pour toi, pas pour le modèle)

| Faire | Éviter |
| --- | --- |
| Tokens + primitives `dashboard-ui.tsx` d’abord | Restyler Overview avec des `bg-white/10` one-off |
| Sidebar verre **avant** la page | Peindre Overview sur un chrome encore opaque |
| Dual tree desktop / mobile | Un seul JSX `lg:` |
| Primitives : `DASHBOARD_GLASS_CHROME`, `DASHBOARD_SEGMENTED`, `DASHBOARD_SECTION_TITLE`, `DASHBOARD_FEATURED_MEDIA`, `DASHBOARD_LIST_ROW` | Réutiliser `DASHBOARD_WIDGET_CARD_SHELL` / `DASHBOARD_CINEMATIC_HERO_SHELL` sur Overview |
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
| Onglets Overview | `dashboard-section-switcher.tsx`, `overview-section-switcher.tsx` |
| Overview | `overview/page.tsx`, `overview-desktop-flow.tsx`, `overview-hero.tsx`, `overview-stats-section.tsx`, `overview-library-rankings.tsx`, `top-three-artists-overview-widget.tsx`, `top-three-artists-cards.tsx` |

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

## Étape 4 — Overview spotlight : « Your Top Artist » (sans carte)

**Première section métier.** C’est le bloc que tu as cité. Vue `spotlight` uniquement.

```text
[Préambule]

Étape 4 — Crystal Overview spotlight = Replay « Your Top Artist », pas une grille de cartes.

Fichiers : top-three-artists-overview-widget.tsx, top-three-artists-cards.tsx (ou extraire un featured + list si CARD_SHELL est trop lié au nom).
Flow : overview-desktop-flow.tsx ne change que si le wrapper mega-carte disparaît (enlever le shell, garder le widget).
Mobile HORS SCOPE.
Data : useArtistStats inchangé.

Référence : section Your Top Artist sur music.apple.com/be/replay — titre sur le canvas, grande visuel artiste #1, nom, métrique ; le reste n’est pas 3 cartes hover-lift.

Objectif :
- Plus de rounded-[2rem] shadow-card autour du widget.
- Plus de CARD_SHELL / overlay hover qui révèle le nom (le nom et les écoutes sont visibles sans hover — dashboard, pas dribble shot).
- Featured #1 : DASHBOARD_FEATURED_MEDIA + DASHBOARD_SECTION_TITLE.
- #2…n : DASHBOARD_LIST_ROW ou rail d’artworks sans boîte. Rank discret (chiffre, pas bubble glass lourde).
- Loading / error / empty : même langage sans-carte (skeleton pochette + lignes, pas 3 fake cards).
- onOpenArtistInsights : clic sur featured ou row, pas un chrome de carte.

Contraintes : limite carrousel / count inchangée sauf si le carrousel-cartes n’a plus de sens — alors liste ou rail, même data. i18n. Demo publique. Light/dark.

Livre : structure featured + list, a11y (nom visible, pas seulement sur l’image), tests top-three / overview à adapter si le DOM de carte disparaît.
```

---

## Étape 5 — Overview desktop : un-card le reste des onglets

Même langage que spotlight, appliqué aux **autres** panneaux. Les onglets restent.

```text
[Préambule]

Étape 5 — Crystal Overview desktop : sortir des cartes sur hero, summary, tops, trends, context, friends, further. Switcher et spotlight déjà Crystal.

Fichiers : overview-hero.tsx, overview-stats-section.tsx, overview-library-rankings.tsx, overview-section.tsx, overview-momentum-tabs.tsx, overview-go-further.tsx, overview-friends-section.tsx, heatmap/AI shells seulement si carte.
overview-desktop-flow.tsx : wrappers uniquement.
Mobile HORS SCOPE.
Hooks inchangés.

Objectif par vue :
- (hero au-dessus du switcher) : large title + insight, PAS DASHBOARD_CINEMATIC_HERO_SHELL. Artwork optionnel type featured, pas une carte glow.
- summary : metric strip 4 colonnes, hairline, PAS STATS_SHELL_CLASS ni hover-lift par KPI.
- tops : 3 sections (tracks / artists / genres) en featured + list rows, PAS 3 TopLibraryCard widgets gradient. Grille 3 colonnes OK si ce sont 3 listes nues, pas 3 cartes.
- trends : sous-onglets = même segmented que étape 3. Chart sans carte-widget autour (axe + plot sur canvas).
- context / friends / further : titres de section + list rows ; further n’est plus des cartes promo.

Contraintes : toutes les vues restent ; view= ; i18n ; demo ; ArtistUserInsightsPanel fonctionnel. Gemini modify_frontend 1 surface à la fois.

Livre : checklist anti-carte (grep rounded-[2rem] / shadow-card / STATS_SHELL / CARD_SHELL / TopLibraryCard shell dans les fichiers Overview). Empty/error/skeleton alignés. e2e overview.
```

---

## Étape 6 — Overview mobile : même dashboard, même matière

Pas un récit différent. Garder le flow mobile existant ; retirer les cartes et aligner spotlight / sélecteurs si le mobile a des tabs.

```text
[Préambule]

Étape 6 — Crystal Overview mobile. Référence native : musical-profile-mobile.tsx + MOBILE_UX_PLAN_PROMPTS.md.

Fichiers : overview-mobile-flow.tsx, parties mobile overview-hero.tsx, switcher mobile s’il existe.
Desktop HORS SCOPE.

Objectif : dashboard téléphone — insight, métriques en rail, rangées, spotlight type Top Artist (featured + rows). Pas de mega-cards rounded-3xl. Bottom nav déjà verre. Si des tabs existent, DASHBOARD_SEGMENTED_*.

Contraintes : 44px, FR, withFilters, empty mobile dédié. ~390×844 + grand iPhone, EN+FR.

Livre : dettes cartes vs desktop Crystal, patchs ciblés, pas de rewrite du flow.
```

---

## Étape 7 — Pages suivantes (après Overview)

Un écran par session. **Garder leurs onglets / panneaux.** Un-card + segmented + featured/list. Ordre :

| # | Route | Prompt court |
| --- | --- | --- |
| 7a | `/dashboard/artists` | `[Préambule]` Crystal : switcher déjà restylé (étape 3). Un-card fiches / Top 20. Featured artiste si pertinent. |
| 7b | `/dashboard/tracks` | Idem. |
| 7c | `/dashboard/genres` | Idem, y compris répartition sans carte-widget. |
| 7d | `/dashboard/musical-profile` | Matière Crystal, **garder** arbre mobile. Toujours un hub, pas un Replay story. |
| 7e | Timeline, heatmap, temporal-analysis | Graphiques sur canvas, pas blur sur le SVG. |
| 7f | Ask / Duet | Chrome seulement. |

---

## Gemini Design MCP

Après l’étape 0. **Pas** de `create_frontend` Overview (casserait hooks / i18n / tabs).

| Outil | Usage |
| --- | --- |
| `modify_frontend` | 1 surface : segmented, featured Top Artist, metric strip, list row |
| `snippet_frontend` | Featured + list si tu insères dans le widget existant |
| `create_frontend` | Interdit pour Overview. Bac à sable vibe OK puis extraire vers `docs/dashboard-design-system.md` |

Scale : **`refined`**.  
`designSystem` : `docs/dashboard-design-system.md` après étape 0, sinon primitives `dashboard-ui.tsx` + tokens — **pas** le landing `design-system.md`.

---

## Critères de done (Overview)

Desktop `lg+`, light et dark, EN et FR :

- [ ] C’est toujours un **dashboard à onglets** (`view=`, un panneau à la fois)
- [ ] Le switcher ressemble à un sélecteur Replay / iOS, plus à une barre de chips-cartes
- [ ] Spotlight : « Your Top Artist » — titre + featured + suite, **sans** mega-carte ni `CARD_SHELL`
- [ ] Stats / tops / hero : plus de `shadow-card` / `rounded-[2rem]` widget autour de la section
- [ ] Sidebar + header verre ; contenu des onglets mat et lisible
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
- `lib/components/dashboard-ui.tsx` — shells legacy (cinématique, widget card)
- `lib/components/dashboard-section-switcher.tsx` — tablist à passer en segmented
- `lib/components/top-three-artists-cards.tsx` — cible étape 4
