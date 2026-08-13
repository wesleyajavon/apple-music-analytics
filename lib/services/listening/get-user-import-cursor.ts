import { prisma } from "@/lib/prisma";
import type { OnboardingImportProvider } from "./onboarding-import-mode";
import {
  listenSourceForOnboardingProvider,
  onboardingImportSourcesForProvider,
} from "./onboarding-import-cursor-utils";

export type UserImportCursor = {
  listenCount: number;
  lastPlayedAt: Date | null;
  lastTrackLabel: string | null;
  /** Répartition par source (diagnostic / UI). */
  sources: Array<{ source: string; count: number }>;
};

export { listenSourceForOnboardingProvider, playedAtToDateKey } from "./onboarding-import-cursor-utils";
export {
  onboardingImportSourcesForProvider,
  ONBOARDING_APPLE_IMPORT_SOURCES,
  ONBOARDING_SPOTIFY_IMPORT_SOURCES,
} from "./onboarding-import-cursor-utils";

export async function getUserImportCursor(
  userId: string,
  provider: OnboardingImportProvider
): Promise<UserImportCursor> {
  const sources = onboardingImportSourcesForProvider(provider);

  const [grouped, lastListen] = await Promise.all([
    prisma.listen.groupBy({
      by: ["source"],
      where: { userId, source: { in: [...sources] } },
      _count: { _all: true },
    }),
    prisma.listen.findFirst({
      where: { userId, source: { in: [...sources] } },
      orderBy: { playedAt: "desc" },
      select: {
        playedAt: true,
        source: true,
        track: {
          select: {
            title: true,
            artist: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const sourcesBreakdown = grouped
    .map((row) => ({ source: row.source, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
  const listenCount = sourcesBreakdown.reduce((sum, row) => sum + row.count, 0);

  return {
    listenCount,
    lastPlayedAt: lastListen?.playedAt ?? null,
    lastTrackLabel: lastListen
      ? `${lastListen.track.artist.name} — ${lastListen.track.title}`
      : null,
    sources: sourcesBreakdown,
  };
}
