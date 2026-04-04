# Playbook : faire monter l’app en charge (IA Groq + produit)

Ce document décompose la stratégie **étape par étape**, avec des **prompts Cursor** prêts à coller quand une étape est ambiguë ou technique. Pour le détail du limiteur TPM déjà en place, voir [`GROQ_RATE_LIMITING.md`](./GROQ_RATE_LIMITING.md).

### Ce que ces docs font — et ce qu’elles ne font pas

| Rôle | `GROQ_RATE_LIMITING.md` | `GROQ_SCALING_PLAYBOOK.md` (ce fichier) |
|------|-------------------------|----------------------------------------|
| **Aident à améliorer le système ?** | Oui, en expliquant **comment** le limiteur + retries **réduisent les 429** et quoi configurer (`GROQ_TPM_*`, Redis). | Oui, en priorisant **moins d’appels**, quotas, flags, infra. |
| **« Résolvent » seules les 429/413 ?** | **Non.** Elles ne modifient pas le runtime : les **429** restent possibles si la charge dépasse encore TPM ; les **413** ne sont **pas** corrigées par le limiteur (requête **trop grosse en un seul appel**). | **Non.** C’est une feuille de route ; le **code** pour « réduire le prompt et réessayer » après un 413 n’existe pas encore (voir [`GROQ_RATE_LIMITING.md`](./GROQ_RATE_LIMITING.md) § *429 vs 413* et [`GROQ_LOGS_ANALYSIS_SAMPLE.md`](./GROQ_LOGS_ANALYSIS_SAMPLE.md) § *Comportement HTTP par route*). |

En pratique : **`GROQ_RATE_LIMITING`** + **`GROQ_SCALING_PLAYBOOK`** = **documentation et processus** pour **moins** de problèmes ; pour **éliminer** les 413 ou unifier le comportement des routes, il faut des **changements de code** (référencés dans les prompts ci-dessous et dans l’autre doc).

**Liens utiles (Groq)**  
- [Modèles et tarifs](https://console.groq.com/docs/models)  
- [Rate limits (RPM, TPM, etc.)](https://console.groq.com/docs/rate-limits)  
- [Limites de ton organisation](https://console.groq.com/settings/limits)

---

## Vue d’ensemble des phases

| Phase | Objectif |
|-------|----------|
| A | Réduire le **nombre** d’appels Groq (cache, pas de doublons, async si besoin) |
| B | **Limiter côté produit** (quotas utilisateur/jour, feature flags) |
| C | **Aligner config** (`GROQ_TPM_LIMIT`, Redis, limiteur) |
| D | **Scaler l’appli** (DB, auth, horizontal scaling) + **surveiller les coûts** |
| E | **Long terme** (batch, autres tiers, self-host si nécessaire) |

Travaille les phases **dans l’ordre** : gagner des appels (A) coûte moins cher que monter les quotas seuls.

---

## Phase A — Réduire les appels Groq

### Étape A1 — Inventaire des appels IA

**Action :** Lister chaque feature qui appelle Groq (route API, hook, cache existant).

**Prompt Cursor :**

```text
Dans ce repo Next.js, liste tous les fichiers qui invoquent createGroqChatCompletion ou le service Groq, les routes API concernées, et si un cache Redis existe déjà pour chaque feature. Présente un tableau : feature | fichier | cache oui/non | clé de cache si applicable.
```

### Étape A2 — Vérifier que le cache Redis couvre les cas chers

**Action :** Pour chaque réponse IA coûteuse à regénérer, confirmer que la clé de cache inclut **tous** les paramètres qui changent le résultat (utilisateur, plage de dates, genres, locale, mode light/technical).

**Prompt Cursor :**

```text
Pour le cache des commentaires / insights IA dans ce projet, vérifie que les clés incluent userId, locale, et tous les filtres qui influencent le prompt. Signale tout oubli et propose un correctif minimal.
```

### Étape A3 — Supprimer les doublons inutiles

**Action :** Exemple connu : deux variantes de texte (technical + light) = **2×** appels pour un même écran. Décider si les deux sont nécessaires au chargement, ou si l’une peut être chargée **à la demande** (onglet, bouton « version simple »).

**Prompt Cursor :**

```text
Sur la page des tendances par genre, analyse comment commentary et commentaryLight sont chargés. Propose une option UX pour n’appeler l’API qu’une fois au chargement (ou différer la seconde variante au clic) sans casser les traductions ni le cache serveur.
```

### Étape A4 — Génération asynchrone (optionnel, plus tard)

**Action :** Pour les usages non bloquants (ex. « générer un rapport PDF avec résumé IA »), mettre le travail dans une **file** (job) et notifier l’utilisateur quand c’est prêt — **0** appel Groq dans le chemin critique de la requête HTTP.

**Prompt Cursor (quand tu ajoutes une file) :**

```text
Je veux une génération IA asynchrone dans ce projet Next.js : propose une approche compatible avec Vercel/serverless (sans imposer un worker séparé si possible), ou les prérequis si un worker est nécessaire. Ne code pas encore ; liste les options et risques.
```

---

## Phase B — Limiter côté produit

### Étape B1 — Définir une politique

**Action :** Écrire en une phrase : ex. « Max **N** requêtes IA par utilisateur et par **jour** » ou « par heure » pour les routes coûteuses.

**Livrable :** Chaque utilisateur authentifié peut déclencher au plus **40** appels à l’API Groq par jour (fenêtre jour civil UTC ou fuseau du serveur) ; comptent tous les parcours IA listés dans `GROQ_FEATURES_INVENTORY`, en excluant les réponses entièrement servies depuis le cache. *Note : l’authentification n’est pas encore implémentée dans ce projet ; le quota par utilisateur suppose une session ou identifiant stable une fois l’auth en place.*

### Étape B2 — Implémenter un quota (Redis ou DB)

**Action :** Incrémenter un compteur par `userId` + fenêtre (jour), refuser ou mettre en file avec message clair si dépassement.

**Prompt Cursor :**

```text
Implémente un quota serveur : maximum X appels Groq par utilisateur et par jour pour les routes sous /api/ai/*. Utilise Redis (getRedisClient) si disponible, sinon une table Prisma ou un fallback en mémoire documenté. Retourne 429 avec un code d’erreur stable et un message i18n côté client. Touche uniquement les fichiers nécessaires.
```

### Étape B3 — Feature flag IA

**Action :** Variable d’environnement du type `AI_FEATURES_ENABLED=false` ou flags par feature (`AI_GENRE_TRENDS_ENABLED`) pour couper l’IA en incident ou sous charge.

**Prompt Cursor :**

```text
Ajoute une variable d’environnement AI_MASTER_ENABLED (default true) lue côté serveur dans les routes /api qui appellent Groq. Si false, retourne une réponse dégradée sans appeler Groq (commentaire null, message cohérent avec l’API existante). Documente la variable en commentaire dans groq-config ou un fichier env d’exemple.
```

---

## Phase C — Config et infra (Groq + limiteur)

### Étape C1 — Aligner `GROQ_TPM_LIMIT`

**Action :** Ouvre [console.groq.com → Settings → Limits](https://console.groq.com/settings/limits), note le **TPM** pour `llama-3.1-8b-instant` (ou le modèle choisi), mets la même valeur dans `GROQ_TPM_LIMIT` (staging puis production).

**Référence code :** `lib/services/ai/groq-config.ts`.

### Étape C2 — Confirmer Redis en production

**Action :** Sans `REDIS_URL`, le limiteur TPM est **local à l’instance** : plusieurs instances Next = plusieurs budgets parallèles → risque de 429. Vérifie que la prod a Redis (Upstash ou autre).

### Étape C3 — Ajuster `GROQ_TPM_SAFETY`

**Action :** Si tu as encore des 429 avec Redis, baisse progressivement (ex. `0.72` → `0.6`). Si tout est fluide et margeuse, tu peux remonter légèrement.

**Prompt Cursor :**

```text
Explique comment GROQ_TPM_SAFETY interagit avec GROQ_TPM_LIMIT dans groq-rate-limiter.ts et propose une valeur de départ pour un plan Groq Developer avec llama-3.1-8b-instant si mes limites console sont X TPM.
```

---

## Phase D — Scale applicatif et coûts

### Étape D1 — Base de données et connexions

**Action :** Sous charge, le goulot est souvent **Postgres** (pool, index, requêtes lentes). Planifie monitoring des requêtes lentes et taille du pool Prisma selon l’hébergeur.

**Prompt Cursor :**

```text
Analyse prisma/schema.prisma et les requêtes les plus lourdes liées aux pages dashboard dans ce repo. Liste 3 optimisations concrètes (index, select, pagination) sans refactor massif.
```

### Étape D2 — Horizontal scaling Next.js

**Action :** Plusieurs instances = OK si **sessions** et **cache** sont partagés ou stateless ; Redis aide pour le limiteur et le cache IA.

### Étape D3 — Surveiller le coût Groq

**Action :**  
- Console Groq : usage / facturation.  
- Formule mentale : **coût ≈ (tokens input + tokens output) × prix au million** — voir [Models](https://console.groq.com/docs/models).  
- Grille d’estimation **MAU / appels / cache** : [`GROQ_COST_ESTIMATE.md`](./GROQ_COST_ESTIMATE.md).  
- Option : logger `usage` dans les réponses API Groq (si exposé par le SDK) pour estimer par feature.

**Prompt Cursor :**

```text
Vérifie si groq-sdk renvoie usage (prompt_tokens, completion_tokens) sur chat.completions.create et propose où ajouter un log structuré optionnel (derrière DEBUG_GROQ_USAGE=true) sans spammer les logs en production.
```

---

## Phase E — Long terme

| Option | Quand y penser |
|--------|----------------|
| Plan Groq supérieur / limites négociées | Trafic public régulier, marge sur le produit |
| [Batch / Flex](https://console.groq.com/docs) (doc Groq) | Tâches non temps réel |
| Plusieurs projets / clés Groq | Uniquement si conforme aux [conditions Groq](https://console.groq.com/docs) — vérifier les règles actuelles |
| Self-host d’un modèle | Coût infra + ops ; pour très gros volume ou indépendance fournisseur |

**Prompt Cursor :**

```text
Résume les options Groq documentées (Batch, Flex, Performance tier) et dis lesquelles s’appliquent à une app Next.js avec surtout des résumés courts synchrones — sans implémenter.
```

---

## Checklist rapide avant ouverture au public

- [ ] `GROQ_TPM_LIMIT` = valeur réelle de la console pour ton modèle  
- [ ] `REDIS_URL` en prod pour cache IA + limiteur distribué  
- [ ] Quotas utilisateur ou garde-fou produit sur les routes `/api/ai/*`  
- [ ] Feature flag global ou par feature pour incidents  
- [ ] Monitoring erreurs 429 côté serveur (logs / Sentry)  
- [ ] Budget mensuel Groq + alerte spend dans la console  

---

## Piste explicite — erreur HTTP 413 (payload trop grand)

**Problème actuel :** pas de logique « réduire le prompt (timeline, contexte) puis réessayer » ; voir le tableau dans [`GROQ_LOGS_ANALYSIS_SAMPLE.md`](./GROQ_LOGS_ANALYSIS_SAMPLE.md).

**Prompt Cursor :**

```text
Après un 413 de Groq sur createGroqChatCompletion, implémente un retry métier : pour genre-trends uniquement, si APIError.status === 413, reconstruire un GenreTrendsCompactPayload avec MAX_TIMELINE_BUCKETS réduit ou timeline plus agressive, puis rappeler createGroqChatCompletion une fois. Limiter à 1 retry. Ne pas changer les autres features dans ce PR.
```

---

## Liens internes

- [`GROQ_RATE_LIMITING.md`](./GROQ_RATE_LIMITING.md) — limiteur TPM, variables d’env, **429 vs 413**, prompts d’implémentation du rate limiter  
- [`GROQ_COST_ESTIMATE.md`](./GROQ_COST_ESTIMATE.md) — estimation prix selon usage, utilisateurs, cache  
- [`GROQ_LOGS_ANALYSIS_SAMPLE.md`](./GROQ_LOGS_ANALYSIS_SAMPLE.md) — logs réels, **comportement par route** (200 vs 500)  
