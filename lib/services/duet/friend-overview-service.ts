import type { FriendOverviewResponse } from "@/lib/dto/duet";
import { prisma } from "@/lib/prisma";
import { getMonthlyAggregatedListens } from "@/lib/services/listening/listening-aggregation";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import {
  getGenreDistribution,
  getOverviewStats,
  getTopArtists,
} from "@/lib/services/listening/listening-stats";
import { getTrackStats } from "@/lib/services/track/track-service";

/** Align with /dashboard/artists spotlight (`ARTISTS_SPOTLIGHT_LIMIT`). */
export const FRIEND_OVERVIEW_TOP_LIMIT = 20;

export type GetFriendOverviewArgs = {
  friendUserId: string;
  startDate?: Date;
  endDate?: Date;
};

async function loadFriendTimeline(
  friendUserId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FriendOverviewResponse["timeline"]> {
  let rangeStart = startDate;
  let rangeEnd = endDate;

  if (!rangeStart || !rangeEnd) {
    const fullRange = await getListenDateRange(friendUserId);
    if (!fullRange) {
      return [];
    }
    rangeStart = rangeStart ?? fullRange.minDate;
    rangeEnd = rangeEnd ?? fullRange.maxDate;
  }

  const monthly = await getMonthlyAggregatedListens(
    rangeStart,
    rangeEnd,
    friendUserId
  );

  return monthly.map((row) => ({
    date: row.month,
    listens: row.listens,
    uniqueTracks: row.uniqueTracks,
    uniqueArtists: row.uniqueArtists,
  }));
}

async function loadFriendSubject(
  friendUserId: string
): Promise<FriendOverviewResponse["subject"]> {
  const user = await prisma.user.findUnique({
    where: { id: friendUserId },
    select: { name: true, avatarUrl: true },
  });

  return {
    name: user?.name ?? null,
    avatarUrl: user?.avatarUrl ?? null,
  };
}

export async function getFriendOverview(
  args: GetFriendOverviewArgs
): Promise<FriendOverviewResponse> {
  const { friendUserId, startDate, endDate } = args;

  const [stats, topArtists, genreCounts, timeline, subject, topTracks] =
    await Promise.all([
      getOverviewStats(startDate, endDate, friendUserId),
      getTopArtists(startDate, endDate, friendUserId, FRIEND_OVERVIEW_TOP_LIMIT),
      getGenreDistribution(startDate, endDate, friendUserId),
      loadFriendTimeline(friendUserId, startDate, endDate),
      loadFriendSubject(friendUserId),
      getTrackStats(
        startDate,
        endDate,
        friendUserId,
        FRIEND_OVERVIEW_TOP_LIMIT,
        0
      ),
    ]);

  const totalListens = genreCounts.reduce((sum, item) => sum + item.count, 0);
  const topGenres = genreCounts.slice(0, FRIEND_OVERVIEW_TOP_LIMIT).map((item) => ({
    genre: item.genre,
    count: item.count,
    percentage: totalListens > 0 ? (item.count / totalListens) * 100 : 0,
  }));

  return {
    friendUserId,
    shareScope: "full",
    subject,
    stats,
    topArtists,
    topGenres,
    timeline,
    topTracks: topTracks ?? [],
  };
}
