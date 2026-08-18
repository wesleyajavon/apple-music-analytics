import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getArtistStats,
  getArtistOverview,
  getArtistTrends,
  searchArtistsByName,
} from "../artist/artist-service";
import { prisma } from "../../prisma";

vi.mock("../../prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe("artist-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getArtistStats", () => {
    it("should return artist stats correctly transformed", async () => {
      const mockRows = [
        {
          artist_id: "artist-1",
          artist_name: "Artist One",
          image_url: "https://example.com/img.jpg",
          listen_count: BigInt(150),
          unique_tracks: BigInt(45),
          first_listen_date: new Date("2024-01-01T00:00:00.000Z"),
          last_listen_date: new Date("2024-01-31T23:59:59.000Z"),
          total_play_time: BigInt(3600),
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRows);

      const result = await getArtistStats();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        artistId: "artist-1",
        artistName: "Artist One",
        imageUrl: "https://example.com/img.jpg",
        listenCount: 150,
        uniqueTracks: 45,
        firstListenDate: "2024-01-01T00:00:00.000Z",
        lastListenDate: "2024-01-31T23:59:59.000Z",
        totalPlayTime: 3600,
      });
    });

    it("should handle null imageUrl", async () => {
      const mockRows = [
        {
          artist_id: "artist-2",
          artist_name: "Artist Two",
          image_url: null,
          listen_count: BigInt(50),
          unique_tracks: BigInt(10),
          first_listen_date: new Date("2024-01-05"),
          last_listen_date: new Date("2024-01-20"),
          total_play_time: BigInt(1200),
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRows);

      const result = await getArtistStats();

      expect(result[0].imageUrl).toBeNull();
      expect(result[0].listenCount).toBe(50);
      expect(result[0].totalPlayTime).toBe(1200);
    });

    it("should pass date range and userId to query", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");
      const userId = "user-123";

      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      await getArtistStats(startDate, endDate, userId, 10);

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    });

    it("should use default limit of 20 when not provided", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      await getArtistStats(undefined, undefined, undefined);

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    });

    it("should keep global rank when filtering by name", async () => {
      const mockRows = [
        {
          artist_id: "artist-9",
          artist_name: "Drake",
          image_url: null,
          listen_count: BigInt(80),
          unique_tracks: BigInt(12),
          first_listen_date: new Date("2024-01-01T00:00:00.000Z"),
          last_listen_date: new Date("2024-01-20T00:00:00.000Z"),
          total_play_time: BigInt(900),
          rank: BigInt(4),
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRows);

      const result = await getArtistStats(undefined, undefined, "user-123", 20, 0, "dra");

      expect(result).toHaveLength(1);
      expect(result[0].artistName).toBe("Drake");
      expect(result[0].rank).toBe(4);
    });
  });

  describe("getArtistOverview", () => {
    it("should return overview stats correctly", async () => {
      const mockRows = [
        {
          total_artists: 50,
          total_listens: BigInt(1200),
          avg_listens_per_artist: 24.5,
          top_artist_listen_count: 150,
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockRows);

      const result = await getArtistOverview();

      expect(result).toEqual({
        totalArtists: 50,
        totalListens: 1200,
        averageListensPerArtist: 25, // Math.round(24.5)
        topArtistListenCount: 150,
      });
    });

    it("should return zeros when no rows", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      const result = await getArtistOverview();

      expect(result).toEqual({
        totalArtists: 0,
        totalListens: 0,
        averageListensPerArtist: 0,
        topArtistListenCount: 0,
      });
    });

    it("should pass date range and userId to query", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-06-30");
      const userId = "user-456";

      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        {
          total_artists: 0,
          total_listens: BigInt(0),
          avg_listens_per_artist: 0,
          top_artist_listen_count: 0,
        },
      ]);

      await getArtistOverview(startDate, endDate, userId);

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    });
  });

  describe("getArtistTrends", () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-31");

    it("should return trend data correctly", async () => {
      const mockTopArtists = [
        { artist_id: "artist-1", artist_name: "Artist One" },
        { artist_id: "artist-2", artist_name: "Artist Two" },
      ];
      const mockTrends = [
        {
          date: "2024-01-01",
          artist_name: "Artist One",
          listen_count: BigInt(25),
        },
        {
          date: "2024-01-02",
          artist_name: "Artist One",
          listen_count: BigInt(30),
        },
      ];

      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce(mockTopArtists)
        .mockResolvedValueOnce(mockTrends);

      const result = await getArtistTrends(
        startDate,
        endDate,
        "day",
        undefined,
        5
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: "2024-01-01",
        artistName: "Artist One",
        listenCount: 25,
      });
      expect(result[1]).toEqual({
        date: "2024-01-02",
        artistName: "Artist One",
        listenCount: 30,
      });
    });

    it("should return empty array when no top artists", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

      const result = await getArtistTrends(
        startDate,
        endDate,
        "day",
        undefined,
        5
      );

      expect(result).toEqual([]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should pass userId and topN to queries", async () => {
      const mockTopArtists = [{ artist_id: "artist-1", artist_name: "Artist One" }];
      const mockTrends: Array<{ date: string; artist_name: string; listen_count: bigint }> = [];

      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce(mockTopArtists)
        .mockResolvedValueOnce(mockTrends);

      await getArtistTrends(
        startDate,
        endDate,
        "week",
        "user-789",
        10
      );

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("should normalize date for month period", async () => {
      const mockTopArtists = [{ artist_id: "artist-1", artist_name: "Artist One" }];
      const mockTrends = [
        {
          date: new Date("2024-01-15"),
          artist_name: "Artist One",
          listen_count: BigInt(100),
        },
      ];

      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce(mockTopArtists)
        .mockResolvedValueOnce(mockTrends);

      const result = await getArtistTrends(
        startDate,
        endDate,
        "month",
        undefined,
        5
      );

      expect(result).toHaveLength(1);
      expect(result[0].date).toMatch(/^\d{4}-\d{2}$/);
      expect(result[0].listenCount).toBe(100);
    });
  });

  describe("searchArtistsByName", () => {
    it("returns an empty list for queries shorter than 2 characters", async () => {
      const result = await searchArtistsByName("d");
      expect(result).toEqual([]);
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it("maps ranked catalog rows", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { id: "drake", name: "Drake" },
        { id: "drake-future", name: "Drake & Future" },
        { id: "feat", name: "21 Savage, Drake" },
      ]);

      const result = await searchArtistsByName("Drake", 100);

      expect(result).toEqual([
        { id: "drake", name: "Drake" },
        { id: "drake-future", name: "Drake & Future" },
        { id: "feat", name: "21 Savage, Drake" },
      ]);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
