import { describe, it, expect, beforeEach, vi } from "vitest";
import { getFriendOverview } from "@/lib/services/duet/friend-overview-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/services/listening/listening-stats", () => ({
  getOverviewStats: vi.fn(),
  getTopArtists: vi.fn(),
  getGenreDistribution: vi.fn(),
}));

vi.mock("@/lib/services/listening/listening-aggregation", () => ({
  getMonthlyAggregatedListens: vi.fn(),
}));

vi.mock("@/lib/services/listening/listening-service", () => ({
  getListenDateRange: vi.fn(),
}));

vi.mock("@/lib/services/track/track-service", () => ({
  getTrackStats: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import {
  getGenreDistribution,
  getOverviewStats,
  getTopArtists,
} from "@/lib/services/listening/listening-stats";
import { getMonthlyAggregatedListens } from "@/lib/services/listening/listening-aggregation";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import { getTrackStats } from "@/lib/services/track/track-service";

const VIEWER_ID = "11111111-1111-4111-8111-111111111111";
const FRIEND_ID = "22222222-2222-4222-8222-222222222222";

const statsStub = {
  totalListens: 40,
  uniqueArtists: 8,
  uniqueTracks: 12,
  totalPlayTime: 3600,
};

const artistsStub = [
  { artistId: "a1", artistName: "Radiohead", listenCount: 20 },
];

const genresStub = [
  { genre: "Rock", count: 30 },
  { genre: "Jazz", count: 10 },
];

const monthlyStub = [
  {
    month: "2026-05",
    listens: 12,
    uniqueTracks: 6,
    uniqueArtists: 3,
    dailyBreakdown: [],
  },
];

const tracksStub = [
  {
    trackId: "t1",
    trackTitle: "Karma Police",
    artistId: "a1",
    artistName: "Radiohead",
    genre: "Rock",
    listenCount: 9,
    firstListenDate: "2026-05-01T00:00:00.000Z",
    lastListenDate: "2026-05-20T00:00:00.000Z",
    totalPlayTime: 200,
  },
];

describe("getFriendOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOverviewStats).mockResolvedValue(statsStub);
    vi.mocked(getTopArtists).mockResolvedValue(artistsStub);
    vi.mocked(getGenreDistribution).mockResolvedValue(genresStub);
    vi.mocked(getListenDateRange).mockResolvedValue({
      minDate: new Date("2026-01-01T00:00:00.000Z"),
      maxDate: new Date("2026-06-01T00:00:00.000Z"),
    });
    vi.mocked(getMonthlyAggregatedListens).mockResolvedValue(monthlyStub);
    vi.mocked(getTrackStats).mockResolvedValue(tracksStub);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "Ada",
      avatarUrl: "https://example.com/ada.png",
    } as never);
  });

  it("omits topTracks and does not query titles when shareScope is aggregates", async () => {
    const result = await getFriendOverview({
      friendUserId: FRIEND_ID,
      shareScope: "aggregates",
    });

    expect(getTrackStats).not.toHaveBeenCalled();
    expect(result.topTracks).toBeUndefined();
    expect(result.shareScope).toBe("aggregates");
    expect(result.stats.uniqueTracks).toBe(12);
  });

  it("includes populated topTracks when shareScope is full", async () => {
    const result = await getFriendOverview({
      friendUserId: FRIEND_ID,
      shareScope: "full",
    });

    expect(getTrackStats).toHaveBeenCalledWith(
      undefined,
      undefined,
      FRIEND_ID,
      6,
      0
    );
    expect(result.topTracks).toEqual(tracksStub);
    expect(result.shareScope).toBe("full");
  });

  it("calls listening services with the friend user id, never the viewer", async () => {
    await getFriendOverview({
      friendUserId: FRIEND_ID,
      shareScope: "full",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-06-01T00:00:00.000Z"),
    });

    expect(getOverviewStats).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      FRIEND_ID
    );
    expect(getTopArtists).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      FRIEND_ID,
      6
    );
    expect(getGenreDistribution).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      FRIEND_ID
    );
    expect(getMonthlyAggregatedListens).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      FRIEND_ID
    );
    expect(getTrackStats).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      FRIEND_ID,
      6,
      0
    );
    expect(getListenDateRange).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: FRIEND_ID },
      select: { name: true, avatarUrl: true },
    });

    const listeningUserIds = [
      vi.mocked(getOverviewStats).mock.calls[0]?.[2],
      vi.mocked(getTopArtists).mock.calls[0]?.[2],
      vi.mocked(getGenreDistribution).mock.calls[0]?.[2],
      vi.mocked(getMonthlyAggregatedListens).mock.calls[0]?.[2],
      vi.mocked(getTrackStats).mock.calls[0]?.[2],
    ];
    expect(listeningUserIds.every((id) => id === FRIEND_ID)).toBe(true);
    expect(listeningUserIds).not.toContain(VIEWER_ID);
  });

  it("maps top genres with percentages and a hub limit of 6", async () => {
    vi.mocked(getGenreDistribution).mockResolvedValue([
      { genre: "Rock", count: 50 },
      { genre: "Jazz", count: 30 },
      { genre: "Pop", count: 20 },
    ]);

    const result = await getFriendOverview({
      friendUserId: FRIEND_ID,
      shareScope: "aggregates",
    });

    expect(result.topGenres).toEqual([
      { genre: "Rock", count: 50, percentage: 50 },
      { genre: "Jazz", count: 30, percentage: 30 },
      { genre: "Pop", count: 20, percentage: 20 },
    ]);
    expect(result.subject).toEqual({
      name: "Ada",
      avatarUrl: "https://example.com/ada.png",
    });
    expect(result.timeline).toEqual([
      {
        date: "2026-05",
        listens: 12,
        uniqueTracks: 6,
        uniqueArtists: 3,
      },
    ]);
  });

  it("returns an empty timeline when the friend has no listen range", async () => {
    vi.mocked(getListenDateRange).mockResolvedValue(null);

    const result = await getFriendOverview({
      friendUserId: FRIEND_ID,
      shareScope: "aggregates",
    });

    expect(result.timeline).toEqual([]);
    expect(getMonthlyAggregatedListens).not.toHaveBeenCalled();
  });
});
