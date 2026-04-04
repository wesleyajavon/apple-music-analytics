# Groq rate limiting (TPM)

This app calls Groq for several features (insights, genre trends commentary, taste profile, etc.). Groq enforces **per-model limits** (tokens per minute, requests per minute) shown in the [Groq Cloud console — Limits](https://console.groq.com/settings/limits).

To reduce **429 rate limit** errors under load, we implement a **client-side sliding-window budget** that approximates TPM before each chat completion.

## How it works

| Piece | Role |
|--------|------|
| [`lib/services/ai/groq-config.ts`](../lib/services/ai/groq-config.ts) | Default model name, `GROQ_TPM_LIMIT`, safety factor, kill switch |
| [`lib/services/ai/groq-rate-limiter.ts`](../lib/services/ai/groq-rate-limiter.ts) | `estimateGroqChatTokens`, `acquireGroqTokens`; Redis ZSET + Lua (distributed) or in-memory sliding window (fallback) |
| [`lib/services/ai/groq-chat.ts`](../lib/services/ai/groq-chat.ts) | `createGroqChatCompletion` — **only** entry used by services: acquire budget, then Groq SDK (`maxRetries: 8`) |

**Rough token estimate:** `ceil(chars_in_messages / 4) + max_tokens`. This is conservative; real usage depends on tokenization.

**Sliding window:** 60 seconds. We only allow a **fraction** of your configured TPM (`GROQ_TPM_SAFETY`, default `0.72`) so parallel routes (e.g. genre trends technical + light) are less likely to burst past Groq’s limit.

## Environment variables

| Variable | Default | Meaning |
|----------|---------|---------|
| `GROQ_TPM_LIMIT` | `6000` | Align with **your** org limit for `llama-3.1-8b-instant` from the console |
| `GROQ_TPM_SAFETY` | `0.72` | Fraction of TPM budget to use (0–1) |
| `GROQ_RATE_LIMIT_ENABLED` | enabled | Set to `false` to disable our limiter (not recommended in production) |
| `REDIS_URL` | — | When set, limits are **shared** across serverless instances via Redis keys `groq:tpm:window` and `groq:tpm:seq` |

After changing org limits or upgrading tier, update `GROQ_TPM_LIMIT` to match [console limits](https://console.groq.com/settings/limits).

## Retries vs limiter

- **Limiter:** avoids sending too many requests at once (proactive).
- **Groq SDK retries + genre-trends outer retry:** handle **429** after a request is sent (reactive).

Both complement each other.

---

## HTTP 429 vs 413 (Groq) — what this doc addresses

| Situation | What helps | What this repo does **not** do automatically |
|-----------|------------|-----------------------------------------------|
| **429** — Too many tokens **per minute** (TPM window) | Limiter + SDK retries + (genre trends) extra retries | Does **not** guarantee zero 429 under heavy parallel load. |
| **413** — Single request **too large** vs org limit (e.g. “Requested 6879” vs 6000 TPM cap for one shot) | Smaller prompt, split calls, or higher tier | **No** “shrink prompt and retry” path in code yet; see route matrix in [`GROQ_LOGS_ANALYSIS_SAMPLE.md`](./GROQ_LOGS_ANALYSIS_SAMPLE.md). |

**Important:** `GROQ_RATE_LIMITING.md` and [`GROQ_SCALING_PLAYBOOK.md`](./GROQ_SCALING_PLAYBOOK.md) are **guides**; they improve outcomes when you follow them and add code where gaps remain. They do **not** replace implementing 413 recovery or unifying API error responses.

---

## Prompts for step-by-step implementation (Cursor / AI)

Use these in order when adding or changing Groq usage.

### 1. Discover current limits and call sites

> Read the Groq docs and this repo’s `lib/services/ai/` folder. List every file that calls Groq chat completions, the model id, and whether calls are parallel (same request). Quote env vars related to `GROQ_`.

### 2. Centralize chat completions

> Introduce a single helper `createGroqChatCompletion` that wraps `groq.chat.completions.create` with a shared `Groq` client config (`maxRetries`). Replace direct `Groq` usage in all AI services so no file calls the SDK except this helper.

### 3. Add TPM estimation

> Add `estimateGroqChatTokens(params)` that sums a rough input token count from `messages` (chars/4) plus `max_tokens`. Handle `content` as string; if array parts exist, sum text parts only.

### 4. Add sliding-window limiter

> Implement `acquireGroqTokens(estimatedTokens)` using a 60s sliding window and a budget of `floor(GROQ_TPM_LIMIT * GROQ_TPM_SAFETY)`. Use Redis (`getRedisClient`) with an atomic Lua script: ZSET scores = request time, members encode cost; prune entries older than 60s; if sum + cost > budget, return suggested wait from oldest entry. If Redis is null or errors, fall back to an in-memory window; serialize memory acquires with a promise chain to avoid races in dev.

### 5. Wire limiter before each API call

> In `createGroqChatCompletion`, `await acquireGroqTokens(estimateGroqChatTokens(params))` before calling Groq.

### 6. Configuration and docs

> Add `lib/services/ai/groq-config.ts` for defaults and env parsing. Document env vars and link to https://console.groq.com/settings/limits in `docs/GROQ_RATE_LIMITING.md`.

### 7. Tests

> Mock `@/lib/services/ai/groq-chat` (not `groq-sdk`) in unit tests so the in-memory limiter state does not leak between tests. Add unit tests for `estimateGroqChatTokens`.

### 8. Verify

> Run `npx tsc --noEmit` and `npm run test:run -- lib/services/ai`. Manually hit a page that triggers two Groq calls in parallel and confirm fewer 429s in server logs.

---

## Operational notes

- **Single-instance dev without Redis:** the in-memory limiter only applies to **one** Node process; multiple tabs still multiply load until Redis is used in staging/production.
- **Tuning:** If you still see 429s, lower `GROQ_TPM_SAFETY` (e.g. `0.6`) or reduce parallel AI features on one page.
- **Cost:** The limiter does not add billed tokens; it **spaces out** successful calls. Failed 429 responses are generally not charged like successful completions (confirm on Groq’s current billing terms).

## See also

- [`GROQ_SCALING_PLAYBOOK.md`](./GROQ_SCALING_PLAYBOOK.md) — scaling produit (réduire les appels, quotas, flags, infra, coûts) ; **what docs do / don’t fix** (429/413)  
- [`GROQ_LOGS_ANALYSIS_SAMPLE.md`](./GROQ_LOGS_ANALYSIS_SAMPLE.md) — sample log analysis + **per-route HTTP behavior** (200 vs 500)
