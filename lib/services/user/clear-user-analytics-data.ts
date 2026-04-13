import { prisma } from "@/lib/prisma";

export type ClearUserAnalyticsResult = {
  listensDeleted: number;
  replayYearsDeleted: number;
};

/**
 * Supprime tout l’historique d’écoute et les imports Replay pour un utilisateur,
 * et réinitialise l’onboarding (l’utilisateur devra refaire l’import).
 * Ne supprime pas le compte Supabase ni la ligne User (email / nom).
 */
export async function clearUserAnalyticsData(
  userId: string
): Promise<ClearUserAnalyticsResult> {
  return prisma.$transaction(async (tx) => {
    const listens = await tx.listen.deleteMany({ where: { userId } });
    const replay = await tx.replayYearly.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: null },
    });
    return {
      listensDeleted: listens.count,
      replayYearsDeleted: replay.count,
    };
  });
}
