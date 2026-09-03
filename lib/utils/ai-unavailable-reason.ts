import type { AiUnavailableReason } from "@/lib/dto/ai-insights";

export function resolveClientAiUnavailableReason(status: {
  enabled: boolean;
  envLocked: boolean;
  consentRequired?: boolean;
}): AiUnavailableReason | null {
  if (status.envLocked) return "env";
  if (status.consentRequired) return "consent";
  if (!status.enabled) return "client";
  return null;
}
