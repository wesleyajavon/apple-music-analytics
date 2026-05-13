import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { prisma } from "@/lib/prisma";
import { AppError, ErrorCodes } from "@/lib/utils/error-handler";

/**
 * True when a Groq post-import genre job is actively queued or running for this user.
 * Paused / terminal jobs do not block interactive AI (user freed capacity by pausing).
 */
export async function hasPendingOrRunningGroqImportGenreBackfillForUser(
  userId: string
): Promise<boolean> {
  const row = await prisma.importGenreBackfillJob.findFirst({
    where: {
      userId,
      provider: "groq",
      status: { in: ["pending", "running"] },
    },
    select: { id: true },
  });
  return row != null;
}

export async function assertInteractiveGroqNotBlockedByImportGenreBackfill(
  userId: string
): Promise<void> {
  if (await hasPendingOrRunningGroqImportGenreBackfillForUser(userId)) {
    throw new AppError(
      423,
      "AI features are paused while your music genres are being classified. Pause classification from the dashboard banner to use AI features again.",
      ErrorCodes.GROQ_GENRE_CLASSIFICATION_ACTIVE
    );
  }
}

/**
 * POST /api/ai/* bodies may carry optional `userId` (data owner); falls back to session.
 */
export async function resolveUserIdForGroqGenreBackfillGuard(
  bodyUserId?: string | null
): Promise<string | null> {
  const trimmed = bodyUserId?.trim();
  if (trimmed) return trimmed;
  return (await getCurrentUserId()) ?? null;
}
