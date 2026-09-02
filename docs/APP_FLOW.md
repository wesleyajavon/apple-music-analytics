# Flux de l'application — Soundprint-AI

Diagrammes Mermaid décrivant l'architecture et les parcours principaux de **Apple Music Analytics** (Soundprint-AI).

## 1. Parcours utilisateur (auth & onboarding)

```mermaid
flowchart TD
    subgraph Entry["Entrée"]
        A[Visiteur] --> B["/ → redirect locale<br/>fr / en / es"]
        B --> C[Page d'accueil]
    end

    subgraph Auth["Authentification — Supabase Auth"]
        C --> D{Connecté ?}
        D -->|Non| E["/sign-up ou /sign-in"]
        E --> F[Supabase Auth<br/>email + mot de passe]
        F --> G[Session cookie SSR]
        D -->|Oui| H["/dashboard"]
    end

    subgraph Demo["Démo publique (anonyme)"]
        C --> I["/dashboard?userId=…"]
        I --> J{Middleware}
        J -->|Profil public actif| K[Dashboard en lecture seule]
        J -->|Duet / palette privée| L[Redirect sign-in ou accueil]
    end

    subgraph Onboarding["Onboarding — 1ère connexion"]
        G --> M{onboardingCompletedAt ?}
        M -->|Non| N["/dashboard/onboarding"]
        N --> O["Wizard d'import<br/>Apple Music CSV ou Spotify ZIP"]
        O --> P["POST /api/user/onboarding/import"]
        P --> Q[(PostgreSQL<br/>Listens, Artists, Tracks)]
        Q --> R{Genres inconnus ?}
        R -->|Oui| S["Écran finish : backfill Groq (optionnel)"]
        R -->|Non| S2["Écran finish : activer Groq AI (optionnel)"]
        S -->|Refuse backfill| S2
        S -->|Accepte| T
        S2 --> T["POST /api/user/onboarding/complete"]
        T --> U[Dashboard principal]
        M -->|Oui| U
    end

    K --> V[Pages analytics<br/>données du profil démo]
    U --> W[Pages analytics<br/>données utilisateur]
```

## 2. Pipeline de données (sources → base)

```mermaid
flowchart LR
    subgraph Sources["Sources d'écoute"]
        AM[Apple Music<br/>app mobile]
        SP[Spotify]
    end

    subgraph Ingestion["Ingestion"]
        AM -->|Export CSV| CSV[Apple Play History CSV]
        SP -->|Export ZIP| ZIP[Spotify Streaming History]
        SP -->|OAuth optionnel| SPOAuth["Spotify Web API<br/>/api/spotify/sync"]
        CSV --> IMP["POST /api/user/onboarding/import<br/>ou scripts apple-music:import"]
        ZIP --> IMP
        SPOAuth --> IMP
    end

    subgraph Processing["Traitement"]
        IMP --> PARSE[Parse & normalise<br/>artistes, titres, timestamps]
        PARSE --> DB[(PostgreSQL via Prisma)]
        PARSE --> GENRE[Enrichissement genres<br/>Spotify / Groq / consensus]
        GENRE --> DB
    end

    subgraph Storage["Modèle principal"]
        DB --> LISTEN[Listen]
        DB --> ARTIST[Artist]
        DB --> TRACK[Track]
        DB --> USER[User]
    end
```

## 3. Architecture runtime (dashboard → API → services)

```mermaid
flowchart TB
    subgraph Client["Frontend — Next.js App Router"]
        PAGES["Pages dashboard<br/>overview · timeline · heatmap<br/>genres · artists · tracks<br/>temporal-analysis · taste-evolution<br/>ai-insights · ask-your-soundprint · duet"]
        HOOKS[React hooks<br/>use-ai-insights, use-artists…]
        PAGES --> HOOKS
        HOOKS --> FETCH["fetch /api/*"]
    end

    subgraph Middleware["Middleware Next.js"]
        MW[i18n next-intl]
        MW --> SESS[Supabase updateSession]
        SESS --> GUARD{Route /dashboard ?}
        GUARD -->|Non auth + pas démo| REDIR[Redirect accueil / sign-in]
        GUARD -->|OK| NEXT[Suite requête]
    end

    FETCH --> MW

    subgraph API["API Routes"]
        NEXT --> ANALYTICS["/api/overview · timeline · genres<br/>artists · tracks · temporal-analysis<br/>predictions/listening-habit"]
        NEXT --> AI["/api/ai/*<br/>insights · taste-profile · music-chat"]
        NEXT --> DUET["/api/duet/*<br/>friends · compare · friend-overview"]
        NEXT --> USERAPI["/api/user/*<br/>me · consent · export · settings"]
    end

    subgraph Services["Couche service lib/services/"]
        ANALYTICS --> LS[listening-stats]
        ANALYTICS --> AS[artist-service]
        AI --> GROQ[Groq LLM<br/>quota + cache Redis]
        DUET --> FS[friendship-service]
    end

    LS --> PRISMA[Prisma ORM]
    AS --> PRISMA
    FS --> PRISMA
    GROQ --> PRISMA

    PRISMA --> PG[(PostgreSQL)]
    GROQ --> REDIS[(Redis — cache optionnel)]

    subgraph External["Services externes"]
        SUPA[Supabase Auth]
        GROQAPI[Groq API]
        SPAPI[Spotify API]
    end

    SESS --> SUPA
    GROQ --> GROQAPI
    SPOAuth2[spotify/sync] --> SPAPI
```

## 4. Fonctionnalités avancées (IA & Duet)

```mermaid
flowchart TD
    subgraph DashboardFeatures["Fonctionnalités dashboard"]
        MP["/dashboard/musical-profile<br/>(page d'accueil par défaut)"]
    MP --> OV[Overview / Your Music]
    MP --> TL[Timeline & heatmap]
        MP --> GN[Genres & tendances]
        MP --> AR[Artistes & tracks]
        MP --> TA[Analyse temporelle]
        MP --> WH["When will I listen?<br/>prédictions"]
    end

    subgraph AI_Features["IA optionnelle — Groq"]
        CONSENT{Consentement IA<br/>+ GROQ_API_KEY}
        CONSENT -->|Oui| TP[Taste Profile]
        CONSENT -->|Oui| TE[Taste Evolution]
        CONSENT -->|Oui| INS[AI Insights]
        CONSENT -->|Oui| CHAT["Ask your Soundprint<br/>music-chat"]
        TP --> SUM[summarizeAnalytics]
        TE --> SUM
        INS --> SUM
        CHAT --> SUM
        SUM --> LLM[Groq chat completion]
        LLM --> CACHE[Cache Redis / hash]
    end

    OV --> API1["/api/overview"]
    TA --> API2["/api/temporal-analysis"]
    WH --> API3["/api/predictions/listening-habit"]
    INS --> API4["/api/ai/insights"]
    CHAT --> API5["/api/ai/music-chat"]

    subgraph Duet["Duet — comparaison sociale"]
        FR["/dashboard/duet/friends"]
        FR --> INV[Invite link / ami]
        INV --> CMP["/dashboard/duet/compare"]
        FR --> MUSIC["/dashboard/duet/music"]
        CMP --> MUSIC
        MUSIC --> CMP
        CMP --> DC["/api/duet/compare/*<br/>metadata · timeline · shared-artists"]
        MUSIC --> FO["GET /api/duet/friend-overview"]
        DC --> AUTHZ[assert-friend-data-access]
        FO --> AUTHZ
        AUTHZ --> PG2[(PostgreSQL)]
    end
```

## Résumé

Un visiteur arrive sur la **landing i18n**, s'**authentifie via Supabase** (ou consulte la **démo publique**), passe par l'**onboarding d'import** (CSV Apple Music / ZIP Spotify), les écoutes sont **normalisées en PostgreSQL**, puis l'**écran final d'import** propose le **backfill genres Groq** et l'**opt-in IA** avant le dashboard — avec **Groq** en option pour l'IA et **Duet** pour comparer avec des amis.

**Accueil dashboard.** `/dashboard` et la fin d'onboarding mènent à `/dashboard/musical-profile` (hub narratif). Your Music (`/dashboard/overview`) est le hub analytique : faits d'abord, features ensuite. Mobile et laptop racontent la même histoire — période, insight concret (top titre / artiste), KPIs, un seul bloc de tops, tendances en onglets, calendrier + extraits IA, teaser vers le profil musical, puis Chat et Duet en « aller plus loin ». Tracks (`/dashboard/tracks`), Artists (`/dashboard/artists`) et Genres (`/dashboard/genres`) reprennent le même pattern de boutons de section : un panneau à la fois (fiches / Top 20 ou répartition / classement complet). La sidebar desktop liste Profil musical puis Your Music ; la barre mobile liste Profil, Your Music, Artistes, Titres, puis Plus (genres, timeline, heatmap, chat, Duet, réglages).

## Fichiers clés

| Zone | Fichiers |
|------|----------|
| Middleware & auth | `middleware.ts`, `lib/supabase/middleware.ts` |
| Onboarding | `app/[locale]/dashboard/onboarding/page.tsx`, `app/api/user/onboarding/import/route.ts` |
| Dashboard | `app/[locale]/dashboard/(main)/` |
| API analytics | `app/api/overview/`, `app/api/timeline/`, etc. |
| Schéma DB | `prisma/schema.prisma` |

## Voir aussi

- [`README.md`](../README.md) — setup et scripts
- [`docs/API.md`](API.md) — référence des endpoints
- [`docs/SUPABASE_AUTH_IMPLEMENTATION.md`](SUPABASE_AUTH_IMPLEMENTATION.md) — auth Supabase
