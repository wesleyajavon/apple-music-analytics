import { prisma } from "@/lib/prisma";

export const USER_DATA_EXPORT_VERSION = "1.0";

export async function exportAllUserData(userId: string) {
  const [
    user,
    listens,
    replayYearly,
    paletteArtistDecisions,
    paletteTrackDecisions,
    paletteSuggestions,
    paletteSuggestionDecisions,
    spotifyConnection,
    importJobs,
    consents,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        onboardingCompletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.listen.findMany({
      where: { userId },
      include: {
        track: {
          select: {
            title: true,
            genre: true,
            artist: { select: { name: true } },
          },
        },
      },
      orderBy: { playedAt: "desc" },
    }),
    prisma.replayYearly.findMany({
      where: { userId },
      include: { topArtists: true, topTracks: true, topAlbums: true },
    }),
    prisma.paletteArtistDecision.findMany({ where: { userId } }),
    prisma.paletteTrackDecision.findMany({ where: { userId } }),
    prisma.paletteSuggestion.findMany({ where: { userId } }),
    prisma.paletteSuggestionDecision.findMany({ where: { userId } }),
    prisma.spotifyConnection.findUnique({
      where: { userId },
      select: {
        spotifyUserId: true,
        spotifyDisplayName: true,
        spotifyEmail: true,
        scope: true,
        lastSyncedAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.importGenreBackfillJob.findMany({ where: { userId } }),
    prisma.userConsent.findMany({
      where: { userId },
      select: {
        consentType: true,
        consentVersion: true,
        granted: true,
        categories: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    formatVersion: USER_DATA_EXPORT_VERSION,
    profile: user,
    listens: listens.map((listen) => ({
      playedAt: listen.playedAt.toISOString(),
      source: listen.source,
      artistName: listen.track.artist.name,
      trackTitle: listen.track.title,
      genre: listen.track.genre,
    })),
    replayYearly,
    palette: {
      artistDecisions: paletteArtistDecisions,
      trackDecisions: paletteTrackDecisions,
      suggestions: paletteSuggestions,
      suggestionDecisions: paletteSuggestionDecisions,
    },
    spotifyConnection,
    importGenreBackfillJobs: importJobs,
    consents,
  };
}
