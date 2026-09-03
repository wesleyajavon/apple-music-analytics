# Project Overture — restructuration narrative de la landing

**Codename** — refonte **progressive** de la page d'accueil (`app/[locale]/page.tsx`) autour d'un **parcours en 3 mouvements** : **Importer → Explorer → Interagir**. L'objectif n'est pas un redesign visuel complet d'un coup, mais de faire de ce cadre le **fil rouge** de la promo produit (home, nav, CTAs, i18n, puis déclinaisons hors site).

« Overture » = l'ouverture d'une œuvre musicale : première impression, structure du récit, promesse tenue par la suite du dashboard.

---

## Statut

| Élément | État |
|---------|------|
| Cadrage produit & message | ✅ Ce document |
| Implémentation home | 🚧 Phases 3+ (voir §8) |
| i18n `fr` / `en` / `es` | ✅ Phase 1 — `home.journey.*`, pitch, closing highlights |
| Nav & ancres home | ✅ Phase 2 — `Importer · Explorer · Interagir` |
| Hero journey steps | ✅ Phase 3 — `HomeJourneySteps` |
| Section `#import` | ✅ Phase 4 — `HomeJourneyImportSection` |
| Section `#explore` | ✅ Phase 5 — `HomeJourneyExploreSection` |
| Section `#interact` | ✅ Phase 6 — `HomeJourneyInteractSection` |
| Onboarding in-app (emails / empty states) | ⏳ Hors scope v1 |
| Posts réseaux / assets carrousel | ⏳ Hors scope code |

---

## Documents liés

| Document | Rôle |
|----------|------|
| [IDEAS_BAG.md](../IDEAS_BAG.md) | Index des codenames produit |
| [APP_FLOW.md](./APP_FLOW.md) | Parcours auth, onboarding, démo publique |
| [DUET.md](./DUET.md) | Feature sociale — mouvement 3 |
| [MAESTRO.md](./MAESTRO.md) | Agent conversationnel — base du Chat Soundprint (mouvement 3) |
| [BREAKWATER.md](./BREAKWATER.md) | Démo publique — CTAs et sections visibles anonymement |
| [PUBLIC_DEMO_ROUTES_ADVISORY.md](./PUBLIC_DEMO_ROUTES_ADVISORY.md) | Routes autorisées en mode démo |

---

## 1. Problème actuel

La home **contient déjà** les bons ingrédients (sous-titre proche du pitch, closing CTA en 3 cartes, sections Chat et Duet), mais la **structure raconte un catalogue de features**, pas un parcours :

| Aujourd'hui | Limite |
|-------------|--------|
| Nav : `Produit · Insights · Démo · Chat IA` | Organisé par feature, pas par étape utilisateur |
| Hero + `HomeDuetPreview` côte à côte | Duet apparaît avant le cadre global ; le visiteur ne sait pas « où il en est » |
| `HomeDashboardPreviewsSection` | = mouvement 2, mais sans label « Explorer » |
| Section `#soundprint-ai-chat` isolée | = moitié du mouvement 3, séparée de Duet |
| Section `#demo` (artistes / tendances) | Recoupe le mouvement 2 sans hiérarchie claire |
| `closingCta.highlights` (import / patterns / ai) | **Déjà les 3 mouvements** — mais en bas de page, libellés différents du hero |

**Sous-titre actuel** (`home.subtitle`) — 4 idées en une phrase :

> Importez une fois depuis Apple Music ou Spotify — explorez les tendances, dialoguez avec vos données d'écoute et comparez vos lectures avec vos amis sur n'importe quel artiste.

→ Dense, difficile à scanner, ne nomme pas explicitement les 3 temps.

---

## 2. Solution : le parcours Soundprint (3 mouvements)

### Nom du cadre (usage interne + marketing)

**Le parcours Soundprint** — ou **Soundprint en 3 temps**.

### Tableau de référence (source de vérité)

| # | Mouvement | Verbe émotionnel | Promesse (une ligne) | Preuves produit | CTA type |
|---|-----------|------------------|----------------------|-----------------|----------|
| **1** | **Importer** | *Connecter* | Votre historique Apple Music ou Spotify, en quelques minutes. | Onboarding guidé, logos providers, wizard CSV/ZIP | Créer un compte · Importer |
| **2** | **Explorer** | *Décoder* | Voyez ce que vos écoutes racontent vraiment. | Profil musical, overview, tendances, heatmap, timeline, analyse artiste | Voir la démo publique |
| **3** | **Interagir** | *Dialoguer* | Posez des questions. Défiez vos amis. | Soundprint Chat, Duet (amis + comparer + scorecard) | Essayer le chat · Lancer un duel |

### Hiérarchie du message

| Niveau | Rôle | Copie recommandée (FR) |
|--------|------|------------------------|
| **L1 — Tagline** | Partout (hero, OG, bio) | **Tout sur vos streams.** |
| **L2 — Pitch** | Sous-titre hero, README, posts | Importez une fois depuis Apple Music ou Spotify. Explorez vos tendances. Dialoguez avec vos données — et défier vos amis. |
| **L3 — 3 blocs** | Corps de la home, carrousels | Un bloc par mouvement (titre + 2 lignes + visuel + CTA) |
| **L4 — Features** | Sous chaque bloc | Heatmap, timeline, AI insights, etc. = **preuves**, jamais lead |

### Les 3 blocs (copy détaillée FR)

**① Importer**  
Connectez Apple Music ou Spotify. Votre historique d'écoute devient votre Soundprint — en quelques minutes, sans API payante côté utilisateur.

**② Explorer**  
Tendances, heatmap, profil musical : voyez les phases, rituels et obsessions cachés dans vos écoutes. Bien au-delà d'un Spotify Wrapped ou d'un Apple Music Replay annuel.

**③ Interagir**  
Posez n'importe quelle question à vos données. Ajoutez vos amis et tranchez : qui est le plus grand fan de cet artiste ?

---

## 3. Structure cible de la home

### Schéma de page (ordre des sections)

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER — nav ancrée : Importer · Explorer · Interagir      │
├─────────────────────────────────────────────────────────────┤
│  HERO                                                        │
│  · H1 existant (welcome + heroGradient)                      │
│  · Pitch L2 (raccourci)                                      │
│  · 3 puces / steps : Importer · Explorer · Interagir         │
│  · CTA principal : « Révéler votre Soundprint »              │
│  · (optionnel v1) retirer Duet du hero → mouvement 3        │
├─────────────────────────────────────────────────────────────┤
│  #import — MOUVEMENT 1 : IMPORTER                            │
│  · Logos Apple Music + Spotify                               │
│  · Visuel onboarding / import                                │
│  · CTA : sign-up ou onboarding                               │
├─────────────────────────────────────────────────────────────┤
│  #explore — MOUVEMENT 2 : EXPLORER                           │
│  · Sous-titre section + profil musical en tête (v2)          │
│  · Fusion logique : dashboard-previews + demo highlights     │
│  · CTA : démo publique                                       │
├─────────────────────────────────────────────────────────────┤
│  #interact — MOUVEMENT 3 : INTERAGIR                         │
│  · Chat Soundprint (vidéo / terminal demo)                   │
│  · Duet (aperçu duel + workflow 3 steps)                     │
│  · CTAs : chat démo · (connecté) duet friends                │
├─────────────────────────────────────────────────────────────┤
│  CLOSING CTA                                                 │
│  · Répète L1 ou pitch court                                  │
│  · 3 cartes alignées sur les mouvements (renommer clés i18n) │
│  · CTAs : sign-up + démo publique                            │
└─────────────────────────────────────────────────────────────┘
```

### Nav header (remplacement)

| Avant (`home.nav`) | Après (`home.journey.nav`) |
|--------------------|----------------------------|
| `product` → `#product` | `import` → `#import` |
| `insights` → `#dashboard-widgets` | `explore` → `#explore` |
| `demo` → `#demo` | *(intégré dans Explorer)* |
| `aiChat` → `#soundprint-ai-chat` | `interact` → `#interact` |

Fichiers impactés : `app/[locale]/page.tsx`, `lib/components/home-mobile-nav.tsx`.

### Ancres HTML (`id`)

| Ancre | Section |
|-------|---------|
| `#import` | Mouvement 1 |
| `#explore` | Mouvement 2 (remplace / englobe `#dashboard-widgets` et `#demo`) |
| `#interact` | Mouvement 3 (remplace `#soundprint-ai-chat` comme ancre principale ; garder alias si liens externes existent) |

---

## 4. Cartographie contenu → mouvement

**Règle :** si un élément ne rentre pas dans un des 3 mouvements, il ne mérite pas une section promo dédiée sur la home.

| Contenu existant | Mouvement | Action restructuration |
|------------------|-----------|------------------------|
| `StreamingProviderLogos` | 1 | Monter dans section `#import` |
| Onboarding wizard (screenshot / future capture) | 1 | Visuel principal M1 |
| Démo publique (`publicDemoPath`) | 1 → 2 | Pont : « essayer sans importer » |
| `HomeDashboardPreviewsSection` | 2 | Corps de `#explore` |
| `demoHighlights` (artist analysis, trends) | 2 | Sous-parties de `#explore` |
| Profil musical (capture à ajouter) | 2 | **Hero du mouvement 2** (priorité visuelle v2) |
| `DemoTerminalHero` (Chat) | 3 | Moitié gauche / premier bloc de `#interact` |
| `HomeDuetPreview` | 3 | Moitié droite / second bloc de `#interact` |
| `closingCta.highlights` | 1+2+3 | Renommer labels : Importer / Explorer / Interagir |
| `home.features` (timeline, genres…) | 2 | Déprécier ou fusionner — ne pas dupliquer |
| Last.fm workflow | — | **Ne pas promouvoir** sur la home publique |
| Palette, playground Spotify | — | Hors home |

---

## 5. Entonnoir CTAs

| Mouvement | Visiteur | CTA primaire | CTA secondaire |
|-----------|----------|--------------|----------------|
| Hero | Tous | `heroPrimaryCta` — Révéler votre Soundprint | `accessDashboard` — Démo publique |
| 1 — Importer | Non connecté | `/sign-up` | `/sign-in` |
| 1 — Importer | Connecté sans données | `/dashboard/onboarding` | — |
| 2 — Explorer | Anonyme | `publicDemoPath` | — |
| 2 — Explorer | Connecté | `/dashboard/musical-profile` ou `/dashboard/overview` | — |
| 3 — Interagir | Anonyme | Chat démo (`withPublicDemoUserId`) | Duet → sign-in (Duet non dispo démo) |
| 3 — Interagir | Connecté | `/dashboard/ask-your-soundprint` | `/dashboard/duet/friends` |
| Closing | Tous | Même que hero | Démo publique |

**CTA parapluie** à conserver : `heroPrimaryCta` (« Révéler votre Soundprint ») — couvre les 3 mouvements sans en privilégier un.

---

## 6. État actuel du code (inventaire)

### Fichiers principaux

| Fichier | Rôle actuel |
|---------|-------------|
| `app/[locale]/page.tsx` | Composition de toutes les sections home |
| `lib/components/home-mobile-nav.tsx` | Nav mobile 4 liens feature-centric |
| `lib/components/home-dashboard-previews.tsx` | Previews statiques dashboard (M2) |
| `lib/components/home-duet-preview.tsx` | Aperçu Duet (M3) |
| `lib/components/demo-terminal-hero.tsx` | Démo vidéo Chat (M3) |
| `lib/components/home-mobile-sticky-cta.tsx` | CTA sticky mobile |
| `messages/fr.json` (et `en`, `es`) | Clés `home.*` |

### Clés i18n existantes à réaligner

| Clé actuelle | Alignement Overture |
|--------------|---------------------|
| `home.subtitle` | Raccourcir → pitch L2 |
| `home.nav.*` | Remplacer par `home.journey.nav.*` |
| `home.closingCta.highlights.import` | Label → « Importer » (déjà proche) |
| `home.closingCta.highlights.patterns` | Label → « Explorer » |
| `home.closingCta.highlights.ai` | Label → « Interagir » (élargir copy : chat + duet) |
| `home.heroGradient` | Conserver — compatible L1 |
| `home.soundprintAiChatDemo.*` | Préfixer ou référencer sous `home.journey.interact.chat.*` (migration progressive) |
| `home.duetPreview.*` | Idem `home.journey.interact.duet.*` |

### Nouvelles clés proposées (`home.journey`)

```json
{
  "home": {
    "journey": {
      "tagline": "Tout sur vos streams.",
      "pitch": "Importez une fois depuis Apple Music ou Spotify. Explorez vos tendances. Dialoguez avec vos données — et défier vos amis.",
      "nav": {
        "import": "Importer",
        "explore": "Explorer",
        "interact": "Interagir"
      },
      "steps": {
        "import": {
          "eyebrow": "Mouvement 1",
          "title": "Importer",
          "verb": "Connecter",
          "description": "...",
          "cta": "Créer mon compte",
          "ctaDemo": "Essayer la démo d'abord"
        },
        "explore": { "...": "..." },
        "interact": { "...": "..." }
      }
    }
  }
}
```

Les 3 locales (`fr`, `en`, `es`) doivent rester synchrones.

---

## 7. Principes & anti-patterns

### À faire

- Un mouvement = une section = une ancre = un visuel fort
- Chat + Duet **dans le même mouvement** (solo vs social)
- Réutiliser les composants existants avant d'en créer
- Implémenter **par phases** testables (i18n seul, puis nav, puis sections)
- Garder la démo publique comme pont M1→M2 pour les visiteurs froids

### À ne pas faire

- Lister 8+ features dans le hero
- Traiter Chat et Duet comme deux produits séparés dans la nav
- Promouvoir Last.fm sur la landing (friction sync manuelle)
- Ajouter un 4ᵉ mouvement (« Partager », « Prédire »…) — le partage est une **conséquence** de M3 (scorecard Duet)
- Big-bang redesign visuel (3D hero, animations) en même temps que la restructuration narrative

---

## 8. Roadmap d'implémentation (petit à petit)

Chaque phase = une PR ou un commit logique, vérifiable en local sur `/fr`.

### Phase 0 — Documentation ✅

- [x] Rédiger ce fichier (`docs/OVERTURE.md`)
- [x] Entrée dans `IDEAS_BAG.md`

### Phase 1 — Fondation i18n & message ✅

- [x] Ajouter `home.journey.*` dans `messages/fr.json`, `en.json`, `es.json`
- [x] Raccourcir `home.subtitle` → pitch L2 ; hero utilise `home.journey.pitch`
- [x] Aligner `closingCta.highlights.*` sur Importer / Explorer / Interagir
- [x] Pas de changement layout — copy seulement

**Critère done :** textes cohérents si on lit la page de haut en bas.

### Phase 2 — Nav & ancres ✅

- [x] Remplacer `home.nav` par `home.journey.nav` (desktop header + `HomeMobileNav`)
- [x] Ajouter `id="import"`, `id="explore"`, `id="interact"` sur les sections existantes (relabel provisoire)
- [x] Mettre à jour `scroll-mt-*` pour le header sticky (`HOME_JOURNEY_SECTION_SCROLL_MT` dans `lib/constants/home-journey-nav.ts`)
- [x] Source de vérité nav : `HOME_JOURNEY_NAV_ITEMS` (partagé desktop + mobile)

**Note provisoire :** `#explore` englobe previews dashboard + `#demo` + CTA démo. `#interact` englobe Chat + Duet.

**Critère done :** les 3 liens de nav scrollent vers les bonnes zones.

### Phase 3 — Hero : les 3 puces ✅

- [x] Nouveau composant `HomeJourneySteps` (`lib/components/home-journey-steps.tsx`) — 3 puces Importer / Explorer / Interagir sous le pitch, liens vers `#import` / `#explore` / `#interact`
- [x] Option : retirer `HomeDuetPreview` du hero → fait en Phase 6

**Critère done :** le hero annonce explicitement le parcours avant le scroll.

### Phase 4 — Section `#import` ✅

- [x] Composant `HomeJourneyImportSection` — titre + copy `home.journey.steps.import`
- [x] `StreamingProviderLogos` + CTAs (sign-up / onboarding / démo) déplacés depuis le hero
- [x] Panneau visuel onboarding (3 étapes, sans capture — images `/onboarding/` absentes du repo)
- [x] Hero allégé : pitch + puces + CTA parapluie ; `#import` = section dédiée sous le hero

### Phase 5 — Regrouper `#explore` ✅

- [x] Composant `HomeJourneyExploreSection` — header M2 (`journey.steps.explore`)
- [x] `HomeDashboardPreviewsSection` mode `embedded` (grille sans header dupliqué)
- [x] `HomeDemoHighlights` intégré sous `#explore` (vidéos artistes/tendances) ; ancre `#demo` conservée
- [x] CTA unique « Voir la démo publique » en bas de section
- [x] Ordre page : Import → **Explore** (previews + demo) → Interact → Closing

### Phase 6 — Regrouper `#interact` ✅

- [x] Composant `HomeJourneyInteractSection` — header M3 (`journey.steps.interact`)
- [x] Chat (`#soundprint-ai-chat`) + Duet (`#duet`) sous le même bloc ; `HomeDuetPreview` retiré du hero
- [x] Hero simplifié (une colonne, focus pitch + puces)
- [x] Deux CTAs côte à côte : `ctaChat` · `ctaDuet`

### Phase 7 — Closing & polish

- [ ] Aligner closing CTA sur L1 (`home.journey.tagline`)
- [ ] Vérifier `HomeMobileStickyCta` (libellé cohérent ?)
- [ ] Pass SEO : `metadata` / Open Graph si titre/description home externalisés
- [ ] Tests visuels mobile (safe areas, ordre des sections)

### Phase 8 — Hors scope immédiat (backlog)

- [ ] Onboarding in-app : empty states référencent le mouvement en cours
- [ ] Carrousel export réseaux (3 slides)
- [ ] Capture profil musical pour M2
- [ ] Mise à jour `README.md` / `README_FR.md` avec le pitch 3 mouvements
- [ ] Section `APP_FLOW.md` : ajouter diagramme parcours marketing

---

## 9. Déclinaisons hors site (référence)

Structure identique partout pour ancrer la marque :

**Bio / linktree**

```
Soundprint-AI — votre historique musical en 3 temps
Importer · Explorer · Interagir
→ https://apple-music-analytics.vercel.app/fr
```

**Carrousel social (4 slides)**

1. Tout sur vos streams.
2. ① IMPORTER — Apple Music ou Spotify en minutes
3. ② EXPLORER — tendances, heatmap, profil musical
4. ③ INTERAGIR — chat IA + duels entre amis → lien démo

---

## 10. Dépendances avec autres codenames

| Codename | Lien avec Overture |
|----------|-------------------|
| **Breakwater** | CTAs démo publique ; Duet masqué en démo — le copy M3 doit le mentionner honnêtement |
| **Maestro** | Chat Soundprint = vitrine principale du mouvement 3 |
| **Duet** | Moitié sociale du mouvement 3 ; `HomeDuetPreview` déjà sur la home |
| **Encore** | Futur : pourrait devenir sous-bloc M2 (« votre année ») — ne pas anticiper en v1 |
| **CurtainCall** | Sans impact direct sur la home |

---

## 11. Recherche dans le repo

Mots-clés : `Overture`, `overture`, `journey`, `3 mouvements`, `3 temps`, `home.journey`, `parcours Soundprint`.

Fichier principal : [docs/OVERTURE.md](./OVERTURE.md)

---

## 12. Prompt agent (implémentation)

Lors d'une session d'implémentation, donner à l'agent :

```
Contexte : Project Overture — restructuration narrative de la landing.
Lire docs/OVERTURE.md en entier.
Phase cible : [1 | 2 | 3 | …] (une seule phase par PR).
Contraintes :
- Ne pas toucher aux phases suivantes.
- Réutiliser les composants existants.
- Mettre à jour fr/en/es pour toute nouvelle clé i18n.
- Pas de redesign visuel lourd (pas de refonte 3D hero).
- Respecter Breakwater (Duet indisponible en démo publique).
Cocher la phase dans docs/OVERTURE.md §8 quand terminée.
```
