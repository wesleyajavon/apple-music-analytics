/**
 * Central Groq model defaults and rate-limit env knobs (TPM + RPM).
 * Published baselines (Developer plan table): https://console.groq.com/docs/rate-limits
 * Org-specific values: https://console.groq.com/settings/limits
 *
 * Quota produit (routes /api/ai/*) : `GROQ_USER_DAILY_QUOTA` (défaut 40, 0 = illimité),
 * `GROQ_USER_QUOTA_ENABLED=false` pour désactiver.
 *
 * Kill-switch IA (toutes les routes qui appellent Groq) :
 * - `AI_MASTER_ENABLED` — défaut : activé (toute valeur autre que la chaîne `false`).
 *   Mettre `false` pour désactiver l’IA côté serveur sans redéploiement de code.
 *   Le toggle dashboard pose le cookie `ai_master_disabled` seulement si l’env n’est pas `false`.
 *   Voir `lib/services/ai/ai-master.ts`.
 */

/**
 * Groq production replacement for `llama-3.1-8b-instant` (shutdown 2026-08-16).
 * @see https://console.groq.com/docs/deprecations
 */
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b";

/** Retired developer/free model IDs → current Groq replacements. */
const DEPRECATED_GROQ_MODELS: Record<string, string> = {
  "llama-3.1-8b-instant": "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
};

/** Resolves env/caller model IDs, remapping models Groq shut down on 2026-08-16. */
export function resolveGroqModel(model?: string | null): string {
  const requested = (model ?? "").trim() || GROQ_DEFAULT_MODEL;
  return DEPRECATED_GROQ_MODELS[requested] ?? requested;
}

/** Conservative local TPM (gpt-oss-20b free table is 8K; align `GROQ_TPM_LIMIT` with your console). */
const DEFAULT_GROQ_TPM = 6000;

/** Default RPM for the same model (Groq may enforce RPM before TPM on small requests). */
const DEFAULT_GROQ_RPM = 30;

/**
 * Fraction of TPM and RPM budgets to use locally (parallel routes / serverless cold starts).
 * Same factor applies to both dimensions so one knob tracks “burst headroom”.
 */
const DEFAULT_GROQ_TPM_SAFETY = 0.72;

export function getGroqTpmLimit(): number {
  const raw = process.env.GROQ_TPM_LIMIT;
  if (raw === undefined || raw === "") return DEFAULT_GROQ_TPM;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_GROQ_TPM;
}

export function getGroqRpmLimit(): number {
  const raw = process.env.GROQ_RPM_LIMIT;
  if (raw === undefined || raw === "") return DEFAULT_GROQ_RPM;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_GROQ_RPM;
}

export function getGroqTpmSafetyFactor(): number {
  const raw = process.env.GROQ_TPM_SAFETY;
  if (raw === undefined || raw === "") return DEFAULT_GROQ_TPM_SAFETY;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 1) return DEFAULT_GROQ_TPM_SAFETY;
  return n;
}

export function getGroqEffectiveTpmBudget(): number {
  return Math.max(1, Math.floor(getGroqTpmLimit() * getGroqTpmSafetyFactor()));
}

export function getGroqEffectiveRpmBudget(): number {
  return Math.max(1, Math.floor(getGroqRpmLimit() * getGroqTpmSafetyFactor()));
}

export function isGroqRateLimitEnabled(): boolean {
  return process.env.GROQ_RATE_LIMIT_ENABLED !== "false";
}
