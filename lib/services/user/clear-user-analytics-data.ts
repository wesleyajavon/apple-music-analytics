import { prisma } from "@/lib/prisma";

export type ClearUserAnalyticsResult = {
  listensDeleted: number;
  replayYearsDeleted: number;
  paletteArtistDecisionsDeleted: number;
  paletteTrackDecisionsDeleted: number;
  paletteSuggestionsDeleted: number;
  paletteSuggestionDecisionsDeleted: number;
  importJobsCancelled: number;
};

/**
 * Supprime tout l'historique d'écoute, les imports Replay, les décisions palette
 * et annule les jobs Groq en cours. Réinitialise l'onboarding.
 * Ne supprime pas le compte Supabase, l'avatar ni la connexion Spotify.
 */
export async function clearUserAnalyticsData(
  userId: string
): Promise<ClearUserAnalyticsResult> {
  return prisma.$transaction(async (tx) => {
    const listens = await tx.listen.deleteMany({ where: { userId } });
    const replay = await tx.replayYearly.deleteMany({ where: { userId } });
    const paletteArtist = await tx.paletteArtistDecision.deleteMany({ where: { userId } });
    const paletteTrack = await tx.paletteTrackDecision.deleteMany({ where: { userId } });
    const paletteSuggestionDecisions = await tx.paletteSuggestionDecision.deleteMany({
      where: { userId },
    });
    const paletteSuggestions = await tx.paletteSuggestion.deleteMany({ where: { userId } });
    const importJobs = await tx.importGenreBackfillJob.updateMany({
      where: {
        userId,
        status: { in: ["pending", "running", "paused"] },
      },
      data: { status: "cancelled", finishedAt: new Date() },
    });

    await tx.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: null },
    });

    return {
      listensDeleted: listens.count,
      replayYearsDeleted: replay.count,
      paletteArtistDecisionsDeleted: paletteArtist.count,
      paletteTrackDecisionsDeleted: paletteTrack.count,
      paletteSuggestionsDeleted: paletteSuggestions.count,
      paletteSuggestionDecisionsDeleted: paletteSuggestionDecisions.count,
      importJobsCancelled: importJobs.count,
    };
  });
}
