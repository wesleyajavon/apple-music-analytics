# Maestro Upgrade Playbook — Ask your Soundprint

**Statut** : playbook d'evolution — a utiliser apres le MVP `Ask your Soundprint`.

**But** : ameliorer le chat IA sans perdre le principe central de Maestro : le LLM ne devine pas et ne genere pas de SQL libre. Il orchestre des **tools analytics allowlistes**, testes et bornes.

---

## Situation actuelle

Le MVP expose deja un chat dans le dashboard et une route `POST /api/ai/music-chat`.

Capacites actuelles :

- resolution simple de periodes (`summer 2022`, `last year`, dates explicites) ;
- tops morceaux / artistes / genres sur une periode ;
- comparaison de deux periodes ;
- tendances annuelles ;
- artistes les plus reguliers ;
- habitudes par heure exacte et jour de semaine ;
- mode public/demo limite aux questions predefinies ;
- historique client-only.

Limites importantes :

- pas de deep dive artiste ;
- pas de detection de changements de gout riche ;
- pas de detection "obsession track" ;
- pas de stats album exposees au chat ;
- reponse principalement textuelle, sans rendu structure riche ;
- pas de streaming ;
- observability limitee sur les tool calls.

---

## Ordre d'upgrade recommande

### 1. Ameliorer les tools avant l'UI

Le chat est seulement aussi bon que les fonctions qu'il peut appeler. Priorite : ajouter des tools plus proches des questions naturelles des utilisateurs.

Ordre conseille :

1. `getArtistDeepDive`
2. `getTasteShiftSummary`
3. `getTrackObsessionWindows`
4. rendu UI structure des resultats
5. observability des tool calls
6. streaming
7. memoire persistante, seulement si besoin produit clair

### 2. Garder l'agent borne

Chaque nouveau tool doit respecter les memes invariants :

- input valide par schema ;
- filtre obligatoire par `userId` resolu cote serveur ;
- `LIMIT` strict ;
- pas d'ecriture ;
- pas de SQL genere par le LLM ;
- payload retourne compact, utile au raisonnement ;
- tests unitaires sans LLM ;
- test API si le tool change la surface de `POST /api/ai/music-chat`.

---

## Tool 1 — `getArtistDeepDive`

**Priorite** : tres haute.

**Pourquoi** : les utilisateurs posent naturellement des questions autour d'un artiste precis : "raconte-moi mon historique avec Frank Ocean", "depuis quand j'ecoute Rosalia ?", "quelles chansons de Drake j'ai le plus rejouees ?"

### Questions cible

- "Raconte-moi mon historique avec Radiohead."
- "Depuis quand j'ecoute SZA ?"
- "Quels sont mes morceaux les plus ecoutes de Kendrick Lamar ?"
- "Est-ce que j'ecoute encore Bad Bunny autant qu'avant ?"

### Input propose

```ts
{
  artistName: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}
```

### Sortie proposee

```ts
{
  artist: {
    artistId: string;
    artistName: string;
  };
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  totalListens: number;
  uniqueTracks: number;
  firstListenAt: string;
  lastListenAt: string;
  topTracks: Array<{
    trackId: string;
    title: string;
    listenCount: number;
    firstListenAt: string;
    lastListenAt: string;
  }>;
  yearlyBreakdown: Array<{
    year: number;
    listens: number;
  }>;
  peakYear: {
    year: number;
    listens: number;
  } | null;
}
```

### Points techniques

- Commencer par une recherche case-insensitive sur `Artist.nameLower`.
- Si plusieurs artistes matchent partiellement, retourner les meilleurs candidats ou demander clarification via le LLM.
- Ne pas accepter un `artistId` venant du client comme source d'autorite si l'utilisateur n'a pas d'abord cherche l'artiste dans ses propres donnees.
- Attention au probleme Headliner : les featuring peuvent fragmenter les stats. Le tool peut mentionner cette limite tant que Headliner n'est pas resolu.

### Criteres d'acceptation

- Une question sur un artiste existant retourne first listen, last listen, total listens, top tracks, evolution annuelle.
- Une question sur un artiste absent retourne une reponse honnete et eventuellement des artistes proches.
- Les resultats sont limites par defaut a 10 top tracks.
- Tests sur match exact, match case-insensitive, artiste absent.

---

## Tool 2 — `getTasteShiftSummary`

**Priorite** : haute.

**Pourquoi** : c'est le tool qui rend le chat plus narratif. Il permet de repondre a "comment mes gouts ont change ?" sans forcer l'utilisateur a comparer manuellement plusieurs pages.

### Questions cible

- "Comment mes gouts ont change entre 2020 et 2024 ?"
- "Quels genres ai-je delaisse recemment ?"
- "Quels artistes ont monte dans mon ecoute cette annee ?"
- "Qu'est-ce qui est nouveau dans mes ecoutes depuis 6 mois ?"

### Input propose

```ts
{
  baselineStartDate: string;
  baselineEndDate: string;
  comparisonStartDate: string;
  comparisonEndDate: string;
  limit?: number;
}
```

### Sortie proposee

```ts
{
  baseline: {
    startDate: string;
    endDate: string;
    totalListens: number;
    topArtists: Array<{ artistName: string; listenCount: number }>;
    topGenres: Array<{ genre: string; count: number; percentage: number }>;
  };
  comparison: {
    startDate: string;
    endDate: string;
    totalListens: number;
    topArtists: Array<{ artistName: string; listenCount: number }>;
    topGenres: Array<{ genre: string; count: number; percentage: number }>;
  };
  risingArtists: Array<{ artistName: string; delta: number }>;
  fadingArtists: Array<{ artistName: string; delta: number }>;
  risingGenres: Array<{ genre: string; deltaPercentage: number }>;
  fadingGenres: Array<{ genre: string; deltaPercentage: number }>;
}
```

### Points techniques

- Utiliser des agregations SQL, pas un chargement brut de listens.
- Gerer les divisions par zero quand une entite n'existait pas dans la baseline.
- Retourner deltas absolus et pourcentages, mais laisser le LLM formuler la narration.
- Pour "recently", utiliser une periode par defaut explicite, ex. 90 jours, ou demander clarification.

### Criteres d'acceptation

- Le tool compare deux periodes et identifie au moins artistes / genres en hausse et baisse.
- Les deltas sont stables et comprehensibles.
- La reponse finale mentionne les periodes utilisees.

---

## Tool 3 — `getTrackObsessionWindows`

**Priorite** : haute pour l'effet produit/fun.

**Pourquoi** : les utilisateurs aiment decouvrir les morceaux qu'ils ont "ponces" sur une courte periode. C'est plus emotionnel qu'un simple top annuel.

### Questions cible

- "Quelles chansons m'ont obsede en 2022 ?"
- "Quels morceaux ai-je le plus rejoues sur une courte periode ?"
- "Quelle a ete ma plus grosse obsession musicale ?"

### Input propose

```ts
{
  startDate?: string;
  endDate?: string;
  windowDays?: 7 | 14 | 30;
  limit?: number;
}
```

### Sortie proposee

```ts
{
  windowDays: number;
  obsessions: Array<{
    trackId: string;
    title: string;
    artistName: string;
    windowStartDate: string;
    windowEndDate: string;
    listensInWindow: number;
    totalListensInPeriod: number;
  }>;
}
```

### Approche technique

- Version simple : agreger par track + semaine/mois calendaire.
- Version plus precise : fenetre glissante SQL sur `playedAt`.
- Pour le MVP upgrade, commencer par semaine calendaire ou bucket de 14/30 jours si la fenetre glissante devient trop couteuse.

### Criteres d'acceptation

- Le tool trouve les pics concentres, pas seulement les morceaux les plus ecoutes globalement.
- Le resultat indique la fenetre exacte.
- Les requetes restent bornees par periode et `LIMIT`.

---

## Tool 4 — `getAlbumStats`

**Priorite** : moyenne, depend des donnees disponibles.

**Pourquoi** : utile si les imports contiennent une information album fiable. Sinon, le tool risque de donner une fausse impression de precision.

### Questions cible

- "Quels albums ai-je le plus ecoutes ?"
- "Quel etait mon album dominant en 2021 ?"
- "Quels albums reviennent le plus souvent au fil des annees ?"

### Decision avant implementation

Verifier si le modele actuel stocke l'album pour les listens ou tracks. Si l'album n'est disponible que dans `ReplayTopAlbum`, alors le chat peut seulement repondre sur les donnees Replay importees, pas sur tout l'historique.

### Options

- **Option A** : exposer uniquement `ReplayTopAlbum` via un tool clair : `getReplayTopAlbumsByYear`.
- **Option B** : ajouter un champ album au modele `Track` ou une table `Album`, puis backfill/import.
- **Option C** : repousser album stats jusqu'a stabilisation du modele de donnees.

Recommandation initiale : ne pas promettre les albums tant que la source n'est pas fiable.

---

## Intent router leger

**Priorite** : moyenne, apres les 2-3 premiers tools.

Objectif : detecter les questions non supportees avant de laisser le LLM bricoler une reponse.

Exemples a intercepter :

- recommandations externes : "recommande-moi des artistes similaires" ;
- lyrics / sens des paroles ;
- BPM, key, audio features ;
- modifications de donnees : "supprime", "merge", "renomme" ;
- questions demandant une API live Spotify / Apple Music.

Comportement recommande :

- repondre clairement que ce n'est pas encore supporte ;
- proposer une question supportee proche ;
- ne pas appeler Groq si l'intent est clairement hors perimetre.

---

## Rendu UI structure

**Priorite** : moyenne-haute apres les tools.

Aujourd'hui, la reponse est surtout textuelle. L'upgrade utile serait de retourner aussi un payload UI compact :

```ts
{
  answer: string;
  sources: MusicChatToolResult[];
  display?: {
    type: "top_tracks" | "top_artists" | "comparison" | "artist_deep_dive";
    title: string;
    rows: Array<Record<string, string | number>>;
  };
}
```

Usages :

- top tracks sous forme de mini-table ;
- artist deep dive sous forme de carte ;
- comparison sous forme de deux colonnes ;
- consistency sous forme de leaderboard.

Garder le rendu optionnel : le texte reste la source principale, l'UI enrichit quand le type est connu.

---

## Observability

**Priorite** : moyenne, avant streaming si le trafic augmente.

Mesurer sans exposer les donnees sensibles completes :

- route appelee ;
- userId hash ou userId interne selon politique de logs existante ;
- tool name ;
- duree par tool ;
- nombre de tool calls ;
- erreurs ;
- quota/rate-limit ;
- mode public vs authentifie ;
- taille approximative des payloads.

Ne pas logger :

- question complete si elle peut contenir des donnees personnelles ;
- liste complete des titres/artistes retournes ;
- contenu final complet de la reponse, sauf mode debug local explicite.

---

## Streaming

**Priorite** : apres stabilisation des tools et de l'UI.

Le streaming ameliore la sensation de vitesse, mais il complique la route API et l'UI.

Pattern recommande pour Maestro :

```txt
Question utilisateur
  -> LLM choisit les tools
  -> serveur execute les tools analytics
  -> LLM genere seulement la reponse finale en streaming
  -> UI affiche le texte progressivement
```

Ne pas streamer la phase tool calling au debut. Garder cette phase controlee et observable.

Impacts :

- route API en `ReadableStream` ou Server-Sent Events ;
- appel Groq final avec `stream: true` ;
- UI avec `fetch()` manuel et `ReadableStreamDefaultReader` ;
- gestion "Stop generating" ;
- erreurs mid-stream ;
- tests de flux.

---

## Memoire persistante

**Priorite** : basse.

Pour le MVP, l'historique client-only est le bon choix. Persister les conversations demande des decisions supplementaires :

- duree de retention ;
- suppression par l'utilisateur ;
- chiffrement ou non ;
- visibilite support/admin ;
- impact RGPD/privacy ;
- cout de stockage ;
- migration schema.

Ne pas ajouter de memoire persistante tant que le produit n'a pas besoin de reprendre une conversation entre sessions.

---

## Plan d'implementation conseille

### Phase 1 — Deep dive artiste

1. Ajouter `getArtistDeepDive` dans `lib/services/ai/music-chat-tools.ts`.
2. Ajouter la definition tool dans `lib/services/ai/music-chat-service.ts`.
3. Ajouter tests unitaires sur le service.
4. Ajouter questions preset optionnelles si utile.
5. Tester via `/dashboard/ask-your-soundprint`.

### Phase 2 — Taste shift

1. Ajouter `getTasteShiftSummary`.
2. Reutiliser les services existants de genres/artistes si possible.
3. Ajouter cas "periode vide" et "baseline zero".
4. Ajuster le prompt system pour forcer les periodes explicites.

### Phase 3 — Obsessions

1. Ajouter `getTrackObsessionWindows`.
2. Commencer par une approche bucket hebdomadaire ou 30 jours.
3. Optimiser seulement si les requetes deviennent couteuses.

### Phase 4 — UI structure

1. Etendre `MusicChatResponse` avec `display`.
2. Mapper les principaux tool results vers cartes/tables.
3. Garder un fallback texte.

### Phase 5 — Streaming

1. Ajouter une route separee ou un mode `stream=true`.
2. Streamer seulement la reponse finale.
3. Ajouter bouton d'annulation.

---

## Prompt agent — Phase 1

> Upgrade `Ask your Soundprint` avec un tool `getArtistDeepDive`. Lis d'abord `lib/services/ai/music-chat-tools.ts`, `lib/services/ai/music-chat-service.ts`, le schema Prisma `Artist`/`Track`/`Listen`, et les tests existants `music-chat`. Ajoute un tool allowliste qui prend `artistName`, `startDate?`, `endDate?`, `limit?`, resout l'artiste dans les donnees de l'utilisateur, puis retourne total listens, unique tracks, first/last listen, top tracks et breakdown annuel. Ne genere aucun SQL via le LLM. Filtre toujours par `userId`. Ajoute tests pour match exact, case-insensitive et artiste absent. Lance les tests cibles et le type-check.

## Prompt agent — Phase 2

> Ajoute `getTasteShiftSummary` a `Ask your Soundprint`. Le tool compare deux periodes explicites et retourne top artistes/genres, deltas montants et descendants, avec limites strictes. Reutilise les services analytics existants quand possible, sinon ajoute des requetes SQL agregees bornees. Mets a jour la definition tool Groq, les types DTO si necessaire, et les tests. La reponse finale doit mentionner les periodes et signaler les donnees insuffisantes.

## Prompt agent — Phase 3

> Ajoute `getTrackObsessionWindows` a `Ask your Soundprint`. Le tool doit identifier les morceaux avec un pic d'ecoutes sur une courte fenetre (`7`, `14` ou `30` jours), retourner track, artiste, fenetre exacte, listens in window et total listens in period. Commence par une implementation SQL simple et testable, avec limites strictes et filtre `userId`. Ajoute tests et garde la route demo publique limitee aux presets.

---

## Recherche dans le repo

Pour te retrouver : cherche `MAESTRO_UPGRADE_PLAYBOOK`, `getArtistDeepDive`, `getTasteShiftSummary`, `getTrackObsessionWindows`, `Ask your Soundprint`.
