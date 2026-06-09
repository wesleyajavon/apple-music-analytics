import type { NextRequest } from "next/server";
import {
  AI_MASTER_DISABLED_COOKIE,
  isAiMasterEnvEnabled,
} from "@/lib/services/ai/ai-master";
import { hasGroqGenreConsent } from "@/lib/services/user/privacy-preferences";

export type GroqAiUnavailableReason = "env" | "client" | "consent";

export async function getGroqAiUnavailableReason(
  request: NextRequest,
  userId: string
): Promise<GroqAiUnavailableReason | null> {
  if (!isAiMasterEnvEnabled()) return "env";
  if (request.cookies.get(AI_MASTER_DISABLED_COOKIE)?.value === "1") return "client";
  if (!(await hasGroqGenreConsent(userId))) return "consent";
  return null;
}

export async function isGroqAiEnabledForRequest(
  request: NextRequest,
  userId: string
): Promise<boolean> {
  return (await getGroqAiUnavailableReason(request, userId)) === null;
}
