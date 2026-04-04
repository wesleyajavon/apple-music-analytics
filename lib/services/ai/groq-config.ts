/**
 * Central Groq model defaults and TPM-related env knobs.
 * Org limits: https://console.groq.com/settings/limits
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

export const GROQ_DEFAULT_MODEL = "llama-3.1-8b-instant";

/** Default TPM limit for llama-3.1-8b-instant on free tier (see Groq console). */
const DEFAULT_GROQ_TPM = 6000;

/** Use only a fraction of TPM to avoid bursts with parallel requests. */
const DEFAULT_GROQ_TPM_SAFETY = 0.72;

export function getGroqTpmLimit(): number {
  const raw = process.env.GROQ_TPM_LIMIT;
  if (raw === undefined || raw === "") return DEFAULT_GROQ_TPM;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_GROQ_TPM;
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

export function isGroqRateLimitEnabled(): boolean {
  return process.env.GROQ_RATE_LIMIT_ENABLED !== "false";
}
