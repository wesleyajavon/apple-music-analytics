import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DUET_CLAMP_LISTEN_THRESHOLD,
  DUET_MAX_COMPARE_RANGE_MS,
} from "@/lib/constants/duet-compare";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
} from "@/lib/middleware/validation";
import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from "@/lib/services/listening/listening-aggregation";
import {
  getArtistTrendsChartRowsForArtistIds,
} from "@/lib/services/artist/artist-service";
import { getListenDateRange } from "@/lib/services/listening/listening-service";

export type CompareTimelinePoint = {
  date: string;
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
};

export type CompareMergedPoint = {
  date: string;
  self: number;
  friend: number;
};

export type CompareTimelineResult = {
  period: "day" | "week" | "month";
  startDate: string;
  endDate: string;
  rangeClamped: boolean;
  self: CompareTimelinePoint[];
  friend: CompareTimelinePoint[];
  merged: CompareMergedPoint[];
};

export type CompareEntityResult = {
  type: "artist";
  entityId: string;
  artistName: string | null;
  period: "day" | "week" | "month";
  startDate: string;
  endDate: string;
  rangeClamped: boolean;
  selfCount: number;
  friendCount: number;
  winner: "self" | "friend" | "tie";
  merged: CompareMergedPoint[];
};

export type CompareUserMetadata = {
  minDate: string | null;
  maxDate: string | null;
  totalListens: number;
  sources: string[];
};

export type CompareMetadataResult = {
  self: CompareUserMetadata;
  friend: CompareUserMetadata;
};

async function countListensInRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  return prisma.listen.count({
    where: {
      userId,
      playedAt: { gte: startDate, lte: endDate },
    },
  });
}

async function resolveAllTimeCompareRange(
  viewerId: string,
  friendUserId: string
): Promise<{ startDate: Date; endDate: Date }> {
  const [viewerRange, friendRange] = await Promise.all([
    getListenDateRange(viewerId),
    getListenDateRange(friendUserId),
  ]);

  const ranges = [viewerRange, friendRange].filter(
    (range): range is NonNullable<typeof range> => range !== null
  );

  if (ranges.length === 0) {
    const now = new Date();
    return { startDate: now, endDate: now };
  }

  return {
    startDate: new Date(Math.min(...ranges.map((range) => range.minDate.getTime()))),
    endDate: new Date(Math.max(...ranges.map((range) => range.maxDate.getTime()))),
  };
}

/**
 * When the requested span exceeds 2 years and either user has >50k listens
 * in that span, clamp to the most recent 2 years — but only for daily
 * granularity, where point count would be prohibitive. Weekly/monthly
 * series stay on the full requested range.
 */
export async function resolveCompareDateRange(
  request: NextRequest,
  viewerId: string,
  friendUserId: string,
  options?: { period?: "day" | "week" | "month" }
): Promise<{ startDate: Date; endDate: Date; rangeClamped: boolean }> {
  const { searchParams } = request.nextUrl;
  const hasStartDate = searchParams.has("startDate");
  const hasEndDate = searchParams.has("endDate");

  let startDate: Date;
  let endDate: Date;

  if (!hasStartDate && !hasEndDate) {
    ({ startDate, endDate } = await resolveAllTimeCompareRange(viewerId, friendUserId));
  } else {
    const defaultEndDate = new Date();
    const defaultStartDate = new Date(defaultEndDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const extracted = extractDateRangeWithDefaults(
      request,
      defaultStartDate,
      defaultEndDate
    );
    startDate = extracted.startDate;
    endDate = extracted.endDate;
  }

  const spanMs = endDate.getTime() - startDate.getTime();
  if (options?.period !== "day" || spanMs <= DUET_MAX_COMPARE_RANGE_MS) {
    return { startDate, endDate, rangeClamped: false };
  }

  const [viewerCount, friendCount] = await Promise.all([
    countListensInRange(viewerId, startDate, endDate),
    countListensInRange(friendUserId, startDate, endDate),
  ]);

  if (
    viewerCount <= DUET_CLAMP_LISTEN_THRESHOLD &&
    friendCount <= DUET_CLAMP_LISTEN_THRESHOLD
  ) {
    return { startDate, endDate, rangeClamped: false };
  }

  const clampedStart = new Date(endDate.getTime() - DUET_MAX_COMPARE_RANGE_MS);
  return { startDate: clampedStart, endDate, rangeClamped: true };
}

async function fetchTimelineSeries(
  userId: string,
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month"
): Promise<CompareTimelinePoint[]> {
  switch (period) {
    case "day": {
      const daily = await getDailyAggregatedListens(startDate, endDate, userId);
      return daily.map((row) => ({
        date: row.date,
        listens: row.listens,
        uniqueTracks: row.uniqueTracks,
        uniqueArtists: row.uniqueArtists,
      }));
    }
    case "week": {
      const weekly = await getWeeklyAggregatedListens(startDate, endDate, userId);
      return weekly.map((row) => ({
        date: row.weekStart,
        listens: row.listens,
        uniqueTracks: row.uniqueTracks,
        uniqueArtists: row.uniqueArtists,
      }));
    }
    case "month": {
      const monthly = await getMonthlyAggregatedListens(startDate, endDate, userId);
      return monthly.map((row) => ({
        date: row.month,
        listens: row.listens,
        uniqueTracks: row.uniqueTracks,
        uniqueArtists: row.uniqueArtists,
      }));
    }
  }
}

function mergeTimelineSeries(
  self: CompareTimelinePoint[],
  friend: CompareTimelinePoint[]
): CompareMergedPoint[] {
  const dates = new Set([
    ...self.map((row) => row.date),
    ...friend.map((row) => row.date),
  ]);
  const selfMap = new Map(self.map((row) => [row.date, row.listens]));
  const friendMap = new Map(friend.map((row) => [row.date, row.listens]));

  return [...dates].sort().map((date) => ({
    date,
    self: selfMap.get(date) ?? 0,
    friend: friendMap.get(date) ?? 0,
  }));
}

export async function getCompareTimeline(
  request: NextRequest,
  viewerId: string,
  friendUserId: string
): Promise<CompareTimelineResult> {
  const period = extractPeriod(request, "day");
  const { startDate, endDate, rangeClamped } = await resolveCompareDateRange(
    request,
    viewerId,
    friendUserId,
    { period }
  );

  const [self, friend] = await Promise.all([
    fetchTimelineSeries(viewerId, startDate, endDate, period),
    fetchTimelineSeries(friendUserId, startDate, endDate, period),
  ]);

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    rangeClamped,
    self,
    friend,
    merged: mergeTimelineSeries(self, friend),
  };
}

async function fetchArtistTimelineSeries(
  userId: string,
  artistId: string,
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month"
): Promise<CompareTimelinePoint[]> {
  const rows = await getArtistTrendsChartRowsForArtistIds(
    startDate,
    endDate,
    period,
    userId,
    [artistId]
  );
  return rows.map((row) => ({
    date: row.date,
    listens: row.count,
    uniqueTracks: 0,
    uniqueArtists: 0,
  }));
}

async function countArtistListens(
  userId: string,
  artistId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const result = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM "Listen" l
    INNER JOIN "Track" t ON t.id = l."trackId"
    WHERE l."userId" = ${userId}
      AND t."artistId" = ${artistId}
      AND l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
  `);
  return Number(result[0]?.count ?? 0);
}

export async function getCompareEntity(
  request: NextRequest,
  viewerId: string,
  friendUserId: string,
  entityId: string
): Promise<CompareEntityResult> {
  const period = extractPeriod(request, "month");
  const { startDate, endDate, rangeClamped } = await resolveCompareDateRange(
    request,
    viewerId,
    friendUserId,
    { period }
  );

  const [selfCount, friendCount, self, friend, artist] = await Promise.all([
    countArtistListens(viewerId, entityId, startDate, endDate),
    countArtistListens(friendUserId, entityId, startDate, endDate),
    fetchArtistTimelineSeries(viewerId, entityId, startDate, endDate, period),
    fetchArtistTimelineSeries(friendUserId, entityId, startDate, endDate, period),
    prisma.artist.findUnique({
      where: { id: entityId },
      select: { name: true },
    }),
  ]);

  let winner: CompareEntityResult["winner"] = "tie";
  if (selfCount > friendCount) winner = "self";
  else if (friendCount > selfCount) winner = "friend";

  return {
    type: "artist",
    entityId,
    artistName: artist?.name ?? null,
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    rangeClamped,
    selfCount,
    friendCount,
    winner,
    merged: mergeTimelineSeries(self, friend),
  };
}

async function getUserMetadata(userId: string): Promise<CompareUserMetadata> {
  const [range, totalListens, sourceRows] = await Promise.all([
    getListenDateRange(userId),
    prisma.listen.count({ where: { userId } }),
    prisma.listen.groupBy({
      by: ["source"],
      where: { userId },
      _count: { source: true },
    }),
  ]);

  return {
    minDate: range?.minDate.toISOString() ?? null,
    maxDate: range?.maxDate.toISOString() ?? null,
    totalListens,
    sources: sourceRows
      .map((row) => row.source)
      .filter(Boolean)
      .sort(),
  };
}

export async function getCompareMetadata(
  viewerId: string,
  friendUserId: string
): Promise<CompareMetadataResult> {
  const [self, friend] = await Promise.all([
    getUserMetadata(viewerId),
    getUserMetadata(friendUserId),
  ]);
  return { self, friend };
}
