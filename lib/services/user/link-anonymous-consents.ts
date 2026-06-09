import { prisma } from "@/lib/prisma";

/**
 * Attaches anonymous consent audit rows to the authenticated user after sign-in.
 */
export async function linkAnonymousConsentsToUser(
  userId: string,
  anonymousId: string
): Promise<number> {
  const trimmed = anonymousId.trim();
  if (!trimmed) return 0;

  const result = await prisma.userConsent.updateMany({
    where: {
      anonymousId: trimmed,
      userId: null,
    },
    data: { userId },
  });

  return result.count;
}
