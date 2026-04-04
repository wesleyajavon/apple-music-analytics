# Inventaire Groq : services, routes API et cache Redis

Ce document liste les usages de **`createGroqChatCompletion`** (point d’entrée unique dans `lib/services/ai/groq-chat.ts`), les appels directs au **SDK Groq** hors ce helper, les **routes API** associées, et l’existence d’un **cache Redis** par fonctionnalité (hors fallback mémoire).

**Prérequis Redis :** la plupart des caches utilisent `getRedisClient()` (`lib/redis.ts`) lorsque `REDIS_URL` est défini ; sinon le cache en mémoire prend le relais.

---

## Tableau principal (features produit)

| Feature | Fichier(s) invoquant Groq | Route API | Cache Redis | Clé(s) de cache (si applicable) |
|--------|---------------------------|-----------|-------------|----------------------------------|
| **AI Insights** (bullets analytics) | `lib/services/ai/llm-service.ts` | `POST /api/ai/insights` | Oui | `ai:insights:` + SHA-256 du résumé structuré + locale (`computeCacheKey` dans `insights-cache.ts`) |
| **Profil de goût** (texte) | `lib/services/ai/taste-profile-service.ts` | `POST /api/ai/taste-profile` | Oui | `ai:taste-profile:` + `{hash résumé}:{tone}:{locale}` (`computeTasteProfileCacheKey` dans `taste-profile-cache.ts`) |
| **Explication « When Will I Listen? »** | `lib/services/ai/listening-habit-explainer.ts` | `GET /api/predictions/listening-habit` (`?explain=true`) | Oui (explication uniquement ; la prédiction a son propre cache) | `predictions:listening-habit:explanation:` + SHA-256(payload prédiction + locale) (`getExplanationCacheKey` dans `prediction-cache.ts`) |
| **Commentaire évolution du goût** (tech + light) | `lib/services/ai/taste-evolution-commentary.ts` | `GET /api/analytics/taste-evolution` | Oui | `taste-evolution:commentary:` / `taste-evolution:commentary-light:` + SHA-256 des tendances + locale + mode (`taste-evolution-cache.ts`). Les **tendances** hebdomadaires sont aussi cachées sous `taste-evolution:trends:` + hash plage + user (pas d’appel Groq pour ce volet). |
| **Commentaire tendances par genre** (tech + light) | `lib/services/ai/genre-trends-commentary.ts` (import `RateLimitError` depuis `groq-sdk`) | `GET /api/ai/genre-trends-commentary` | Oui | `genre-trends:commentary:` / `genre-trends:commentary-light:` + hash stable du payload compact + locale + mode (`genre-trends-commentary-cache.ts`) |
| **Point d’entrée Groq + TPM** | `lib/services/ai/groq-chat.ts` | *(aucune route directe)* | Oui (limitation TPM, pas cache réponse) | `groq:tpm:window`, `groq:tpm:seq` (`groq-rate-limiter.ts`, script Lua Redis) |

---

## Hors `createGroqChatCompletion` (SDK Groq direct)

| Contexte | Fichier | Route API | Cache Redis |
|----------|---------|-----------|-------------|
| Backfill genres via LLM (script CLI) | `scripts/backfill-track-genres-llm.js` (`groq-sdk`, `groq.chat.completions.create`) | Aucune | Non (pas de cache Redis dans ce script) |

---

## Fichiers de tests (mocks)

Ces fichiers **mockent** `createGroqChatCompletion` et ne appellent pas Groq en conditions réelles :

- `lib/services/ai/__tests__/llm-service.test.ts`
- `lib/services/ai/__tests__/listening-habit-explainer.test.ts`
- `lib/services/ai/__tests__/taste-evolution-commentary.test.ts`
- `lib/services/ai/__tests__/taste-profile-service.test.ts`

Tests liés aux routes / caches : `__tests__/api/ai-insights.test.ts`, `__tests__/api/taste-profile.test.ts`, `__tests__/api/taste-evolution.test.ts`, `__tests__/api/listening-habit-prediction.test.ts`, `lib/services/ai/__tests__/insights-cache.test.ts`, `lib/services/ai/__tests__/taste-profile-cache.test.ts`, `lib/services/ai/__tests__/groq-rate-limiter.test.ts` (estimate tokens uniquement).

---

## Références rapides

| Rôle | Chemin |
|------|--------|
| Client Groq unique + `createGroqChatCompletion` | `lib/services/ai/groq-chat.ts` |
| Modèle par défaut & TPM (env) | `lib/services/ai/groq-config.ts` |
| Fenêtre glissante TPM (Redis) | `lib/services/ai/groq-rate-limiter.ts` |

*Document généré à partir de l’état du dépôt ; en cas de divergence, se fier au code source.*
