/**
 * Kill-switch produit pour toutes les fonctionnalités IA (Groq).
 *
 * - `AI_MASTER_ENABLED` (défaut : activé) : lu côté serveur uniquement. Mettre `false`
 *   pour couper l’IA globalement (déploiement / incident).
 * - Cookie `ai_master_disabled=1` : désactive l’IA pour ce navigateur lorsque l’env
 *   n’est pas `false` (toggle UI). Ne peut pas réactiver l’IA si l’env est `false`.
 */

import type { NextRequest } from "next/server";

export const AI_MASTER_DISABLED_COOKIE = "ai_master_disabled";

/** `false` uniquement si la variable d’environnement est explicitement `"false"`. */
export function isAiMasterEnvEnabled(): boolean {
  return process.env.AI_MASTER_ENABLED !== "false";
}

/** IA autorisée pour cette requête (env + cookie toggle). */
export function isAiMasterEnabledForRequest(request: NextRequest): boolean {
  if (!isAiMasterEnvEnabled()) return false;
  return request.cookies.get(AI_MASTER_DISABLED_COOKIE)?.value !== "1";
}
