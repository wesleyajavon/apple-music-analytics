import type { DuetShareScope } from "@prisma/client";
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

export const FRIEND_OVERVIEW_TOP_LIMIT = 6;

export type GetFriendOverviewArgs = {
  friendUserId: string;
  shareScope: DuetShareScope;
  startDate?: Date;
  endDate?: Date;
};

function toResponseShareScope(shareScope: DuetShareScope): "aggregates" | "full" {
  return shareScope === "full" ? "full" : "aggregates";
}

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
  const { friendUserId, shareScope, startDate, endDate } = args;
  const includeTracks = shareScope === "full";

  const [stats, topArtists, genreCounts, timeline, subject, topTracks] =
    await Promise.all([
      getOverviewStats(startDate, endDate, friendUserId),
      getTopArtists(startDate, endDate, friendUserId, FRIEND_OVERVIEW_TOP_LIMIT),
      getGenreDistribution(startDate, endDate, friendUserId),
      loadFriendTimeline(friendUserId, startDate, endDate),
      loadFriendSubject(friendUserId),
      includeTracks
        ? getTrackStats(
            startDate,
            endDate,
            friendUserId,
            FRIEND_OVERVIEW_TOP_LIMIT,
            0
          )
        : Promise.resolve(undefined),
    ]);

  const totalListens = genreCounts.reduce((sum, item) => sum + item.count, 0);
  const topGenres = genreCounts.slice(0, FRIEND_OVERVIEW_TOP_LIMIT).map((item) => ({
    genre: item.genre,
    count: item.count,
    percentage: totalListens > 0 ? (item.count / totalListens) * 100 : 0,
  }));

  const payload: FriendOverviewResponse = {
    friendUserId,
    shareScope: toResponseShareScope(shareScope),
    subject,
    stats,
    topArtists,
    topGenres,
    timeline,
  };

  if (includeTracks) {
    payload.topTracks = topTracks ?? [];
  }

  return payload;
}
