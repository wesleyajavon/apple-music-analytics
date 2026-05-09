# Maestro — agent conversationnel pour les donnees musicales

**Statut** : idee documentee — **pas d'implementation** pour l'instant.

**Probleme** : le dashboard expose deja beaucoup de vues utiles, mais l'utilisateur doit savoir ou cliquer et comment interpreter les graphiques. Certaines questions naturelles traversent plusieurs dimensions a la fois : periode, saison, artiste, morceau, regularite, evolution dans le temps.

**Objectif** : permettre a l'utilisateur de poser des questions en langage naturel a un agent IA qui interroge ses propres donnees d'ecoute, puis repond avec une synthese claire, sourcée par des agregats serveur verifies.

**Playbook upgrade** : [MAESTRO_UPGRADE_PLAYBOOK.md](./MAESTRO_UPGRADE_PLAYBOOK.md) documente l'ordre conseille pour enrichir le chat apres le MVP : deep dive artiste, taste shifts, obsessions, UI structuree, observability et streaming.

Exemples de questions cible :

- "What are the songs I listened to the most over summer 2022?"
- "Who's the artist I've been listening to the most consistently over the years?"
- "How did my taste change between 2020 and 2024?"
- "What do I usually listen to late at night?"

---

## Principe produit

Maestro ne doit pas etre un chatbot generique branche directement sur la base. C'est un **agent analytics controle** :

1. L'utilisateur pose une question libre.
2. Le modele comprend l'intention et extrait les parametres utiles : periode, granularite, limite, entite musicale, comparaison.
3. Le serveur execute uniquement des **tools allowlistes** avec schemas valides.
4. Les tools retournent des resultats structures, limites et filtres par `userId`.
5. Le modele transforme ces resultats en reponse conversationnelle, en indiquant les hypotheses prises.

Le modele peut interpreter une phrase comme "summer 2022", mais la reponse doit expliciter l'interpretation : "J'ai interprete summer 2022 comme du 1er juin au 31 aout 2022."

---

## MVP recommande

### Surface utilisateur

- Ajouter une experience "Ask your music data" dans le dashboard authentifie.
- Commencer par une page ou un panneau lateral simple, pas une refonte du dashboard.
- Garder un historique court de conversation cote client.
- Afficher les reponses avec :
  - une synthese courte ;
  - les chiffres cles ;
  - la periode utilisee ;
  - les limites ou hypotheses de calcul.

### Capacites MVP

Le MVP doit couvrir les questions les plus frequentes, sans chercher a tout comprendre :

- top morceaux sur une periode ;
- top artistes sur une periode ;
- top genres sur une periode ;
- comparaison entre deux periodes ;
- tendances annuelles ;
- artistes les plus reguliers ;
- habitudes par heure / jour / saison.

### Hors MVP

- Generation libre de SQL par le LLM.
- Actions d'ecriture ou de modification de donnees.
- Connexion a des sources externes en temps reel.
- Memoire longue conversationnelle persistante.
- Agent autonome multi-etapes non borne.
- Reponses basees sur les ecoutes brutes completes dans le prompt.

---

## Architecture technique

### Route API

Point d'entree propose :

- `POST /api/ai/music-chat`

Responsabilites :

- authentifier l'utilisateur ;
- appliquer rate limit et quota IA ;
- respecter le master toggle IA existant ;
- valider le payload conversationnel ;
- appeler le modele avec tool calling local ;
- executer les tools serveur autorises ;
- retourner une reponse textuelle et, si utile, des donnees structurees pour l'UI.

Le projet utilise deja Groq via `lib/services/ai/groq-chat.ts`. Pour une premiere version, reutiliser ce point d'entree est le chemin le plus simple. Les APIs de tool calling evoluent vite : avant implementation, verifier les docs officielles Groq et/ou Vercel AI SDK.

### Pattern d'execution

```txt
Question utilisateur
  -> /api/ai/music-chat
  -> LLM avec definitions de tools
  -> tool call valide par schema
  -> fonction analytics serveur
  -> Prisma/Postgres filtre par userId
  -> resultat structure
  -> LLM formule la reponse finale
```

### Donnees disponibles aujourd'hui

Le schema actuel supporte deja une grande partie du MVP :

- `Listen.playedAt` pour les periodes, saisons, heures, annees ;
- `Listen.userId` pour isoler les donnees utilisateur ;
- `Listen.trackId` vers `Track` ;
- `Track.title`, `Track.genre`, `Track.duration` ;
- `Track.artistId` vers `Artist` ;
- `Artist.name` ;
- `ReplayYearly`, `ReplayTopArtist`, `ReplayTopTrack`, `ReplayTopAlbum` pour certaines vues annuelles importees.

Les index existants utiles incluent notamment `Listen.userId`, `Listen.playedAt`, `Listen.userId + playedAt`, `Track.artistId`, `Track.genre`.

---

## Tools analytics proposes

Chaque tool doit avoir un schema d'entree strict, une limite de resultat, et une implementation serveur testable sans LLM.

| Tool | Role |
|------|------|
| `resolveDateRange` | Convertit une expression controlee (`summer 2022`, `last year`, `Q1 2024`) en dates explicites. |
| `getTopTracksForPeriod` | Top morceaux par nombre d'ecoutes sur une periode. |
| `getTopArtistsForPeriod` | Top artistes sur une periode. |
| `getGenreBreakdownForPeriod` | Repartition des genres sur une periode. |
| `compareListeningPeriods` | Compare deux periodes : volume, artistes, morceaux, genres, deltas. |
| `getListeningTrendsByYear` | Evolution annuelle des ecoutes, artistes, titres, genres. |
| `getMostConsistentArtistsOverTime` | Classe les artistes par regularite sur plusieurs annees ou mois. |
| `getSeasonalListeningPatterns` | Detecte les artistes, titres ou genres associes aux saisons. |
| `getListeningHabitsByTimeOfDay` | Analyse matin / apres-midi / soir / nuit ou repartition horaire. |
| `getRepeatObsessionTracks` | Repere les morceaux ecoutes tres souvent sur une courte fenetre. |

---

## Definition de "consistence"

La question "most consistently over the years" demande une definition produit explicite. Recommandation initiale :

Un artiste est "consistent" s'il apparait regulierement dans l'historique, pas seulement s'il a un pic massif une seule annee.

Score possible :

```txt
consistencyScore =
  activeYearCount * 3
  + activeMonthCount * 0.5
  + topYearPresenceCount * 2
  - variancePenalty
```

Champs de sortie utiles :

- `artistName`
- `totalListens`
- `activeYears`
- `activeMonths`
- `firstListenAt`
- `lastListenAt`
- `yearlyBreakdown`
- `consistencyScore`

La reponse doit expliquer la metrique : "I ranked consistency by number of active years and months, with a penalty for one-year spikes."

---

## Securite, confidentialite et cout IA

### Regles obligatoires

- Ne jamais accepter un `userId` libre du client pour interroger des donnees privees ; resoudre l'utilisateur via la session.
- Ne jamais exposer de cle serveur ou `service_role` cote client.
- Ne jamais laisser le LLM generer ou executer du SQL arbitraire.
- Limiter les resultats retournes aux tools : top 10 / top 20 par defaut.
- Ne pas envoyer l'historique brut complet des ecoutes au modele.
- Journaliser les erreurs sans logguer des donnees musicales completes si ce n'est pas necessaire.
- Garder les ecritures hors perimetre MVP.

### Politique demo publique

Recommandation initiale : **fermer Maestro au public anonyme**.

Raisons :

- cout IA potentiellement eleve ;
- questions libres difficiles a borner en demo publique ;
- contenu tres personnel, meme quand les donnees source sont deja visibles partiellement ;
- risque d'exploration indirecte de titres, horaires ou habitudes fines.

Si Maestro est un jour ouvert sur le profil public, prevoir un mode degrade :

- questions predefinies uniquement ;
- pas de texte libre ;
- quota tres bas ;
- reponses basees sur agregats publics seulement ;
- pas d'acces aux ecoutes detaillees.

---

## UX et garde-fous conversationnels

### Ton de reponse

- Clair, concis, analytique.
- Mentionner les periodes et filtres utilises.
- Dire quand les donnees sont insuffisantes.
- Proposer une seule question de suivi utile, pas une liste interminable.

### Ambiguite

Quand une question est ambigue, l'agent peut :

- faire une hypothese raisonnable et l'annoncer ;
- ou demander une clarification si plusieurs interpretations changent vraiment la reponse.

Exemples :

- "summer 2022" : hypothese acceptable, dates explicitees.
- "recently" : demander ou utiliser une valeur par defaut configurable, ex. 90 jours.
- "best artist" : clarifier si "best" signifie nombre d'ecoutes, temps d'ecoute, regularite ou progression.

### Reponses sans donnees

Si aucune ecoute n'existe pour la periode :

- ne pas inventer ;
- expliquer que la periode ne contient pas de donnees ;
- proposer une periode voisine si l'historique le permet.

---

## Performance et cache

Les questions conversationnelles peuvent produire beaucoup de combinaisons. Le cache doit donc etre cible :

- cacher les agregats couteux par `userId + tool + params normalises` ;
- TTL court a moyen selon le type de donnee ;
- eviter de cacher les reponses finales si elles dependent fortement du fil de conversation ;
- reutiliser Redis quand `REDIS_URL` est disponible, avec fallback memoire si le pattern existe deja localement.

Les requetes principales doivent rester centrees sur `Listen.userId` et `Listen.playedAt`, avec `LIMIT` strict. Pour les analyses multi-annees, preferer des agregations SQL plutot que charger les ecoutes en memoire.

---

## Plan d'implementation recommande

1. **Inventaire code existant** : routes IA, services analytics, rate limits, caches, guards auth.
2. **Contrat de chat** : definir DTO request/response et format des messages.
3. **Tool layer** : creer les fonctions analytics pures et les tester sans LLM.
4. **Orchestrateur IA** : brancher Groq tool calling local via `createGroqChatCompletion`.
5. **Route API** : ajouter auth, validation Zod, quotas, master toggle IA, erreurs degradees.
6. **UI MVP** : champ de chat, historique court, et rendu des chiffres cles.
7. **Tests** : tools analytics, route API, auth, rate limit, cas sans donnees.
8. **Docs API** : documenter `/api/ai/music-chat` une fois le contrat stabilise.
9. **Breakwater** : ajouter la route et les APIs Maestro a la cartographie public/demo si implementation.

---

## Criteres d'acceptation MVP

- Un utilisateur connecte peut poser une question simple sur ses tops tracks/artists pour une periode.
- Les reponses sont basees sur des tools serveur, pas sur des donnees inventees.
- Les donnees sont toujours filtrees par l'utilisateur authentifie.
- Une question sur une periode vide retourne une explication honnete.
- Les tools ne retournent jamais un volume non borne de lignes.
- Les appels anonymes sont refuses.
- Les erreurs Groq ou quota retournent un etat degrade comprehensible.
- Les tests couvrent au moins deux tools analytics et la route API principale.

---

## Decisions produit MVP

- **Nom final affiche** : `Ask your Soundprint`.
- **Langue des reponses** : suivre la locale `next-intl`.
- **Historique de conversation** : client-only pour le MVP.
- **Streaming** : seconde phase. MVP = reponse complete retournee en une fois.
- **Mode demo publique** : questions predefinies uniquement.
- **Niveau de detail autorise** : horaires exacts autorises quand la question le justifie.

---

## Prompt agent (brouillon)

> Implemente Maestro, un agent conversationnel pour interroger les donnees musicales de l'utilisateur. Commence par lire les routes IA existantes, `lib/services/ai/groq-chat.ts`, les services analytics sous `lib/services/listening`, et les guards auth. Ajoute une route `POST /api/ai/music-chat` authentifiee, rate-limitee, avec validation Zod et master toggle IA. N'autorise aucun SQL genere par le LLM : expose uniquement des tools analytics allowlistes (`getTopTracksForPeriod`, `getTopArtistsForPeriod`, `compareListeningPeriods`, `getMostConsistentArtistsOverTime`, etc.) qui filtrent toujours par l'utilisateur courant. Ajoute tests unitaires pour les tools et tests API pour auth / periode vide / succes. Garde l'UI MVP simple : champ de chat dans le dashboard, reponse texte, chiffres cles, periode utilisee. Ne pas ouvrir Maestro au mode public/demo pour la premiere version.

---

## Recherche dans le repo

Pour te retrouver : cherche `Maestro`, `music-chat`, `getTopTracksForPeriod`, `getMostConsistentArtistsOverTime`, ou `Ask your music data`.
