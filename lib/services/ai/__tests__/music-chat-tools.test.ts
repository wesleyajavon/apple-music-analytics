import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import {
  getArtistDeepDive,
  getLateNightListeningProfile,
  getLateNightPresetDateRange,
  getTasteShiftSummary,
  getTrackObsessionWindows,
  isMusicChatPresetQuestionId,
  resolveDateRange,
} from "@/lib/services/ai/music-chat-tools";
import { prisma } from "@/lib/prisma";

describe("music-chat-tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves summer 2022 to June through August", () => {
    expect(resolveDateRange({ expression: "summer 2022" })).toEqual({
      startDate: "2022-06-01",
      endDate: "2022-08-31",
      label: "summer 2022",
    });
  });

  it("accepts explicit ISO date ranges", () => {
    expect(
      resolveDateRange({ startDate: "2024-01-01", endDate: "2024-01-31" })
    ).toEqual({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      label: "2024-01-01 to 2024-01-31",
    });
  });

  it("recognizes allowlisted demo preset ids only", () => {
    expect(isMusicChatPresetQuestionId("summer-2022-top-tracks")).toBe(true);
    expect(isMusicChatPresetQuestionId("summer-2022-top-artists")).toBe(true);
    expect(isMusicChatPresetQuestionId("artist-deep-dive")).toBe(true);
    expect(isMusicChatPresetQuestionId("taste-shift-2020-2024")).toBe(true);
    expect(isMusicChatPresetQuestionId("track-obsessions-2022")).toBe(true);
    expect(isMusicChatPresetQuestionId("late-night-habits")).toBe(true);
    expect(isMusicChatPresetQuestionId("free-text")).toBe(false);
    expect(isMusicChatPresetQuestionId(undefined)).toBe(false);
  });

  it("returns track obsession windows with strict limits and a user filter", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([
      {
        track_id: "track-1",
        track_title: "One More Time",
        artist_name: "Daft Punk",
        window_start_date: new Date("2024-02-03T00:00:00.000Z"),
        window_end_date: new Date("2024-02-09T00:00:00.000Z"),
        listens_in_window: BigInt(8),
        total_listens_in_period: BigInt(24),
      },
    ]);

    const result = await getTrackObsessionWindows("user-123", {
      startDate: "2024-01-01",
      endDate: "2024-03-31",
      windowDays: 999,
      limit: 99,
      minListensInWindow: 1,
    });

    expect(result).toEqual({
      period: { startDate: "2024-01-01", endDate: "2024-03-31" },
      windowDays: 7,
      minListensInWindow: 1,
      limits: {
        limit: 10,
        maxLimit: 10,
        maxCandidateTracks: 200,
      },
      obsessionWindows: [
        {
          trackId: "track-1",
          title: "One More Time",
          artistName: "Daft Punk",
          window: {
            startDate: "2024-02-03",
            endDate: "2024-02-09",
          },
          listensInWindow: 8,
          totalListensInPeriod: 24,
        },
      ],
    });

    const query = vi.mocked(prisma.$queryRaw).mock.calls[0]?.[0] as {
      strings: readonly string[];
      values: readonly unknown[];
    };
    expect(query.strings.join("")).toContain('WHERE l."userId" =');
    expect(query.values).toContain("user-123");
    expect(query.values).toContain(7);
    expect(query.values).toContain(10);
  });

  it("aggregates late-night window listens with tops and share", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ total_listens: BigInt(1000) }])
      .mockResolvedValueOnce([
        {
          listen_count: BigInt(100),
          unique_tracks: BigInt(40),
          unique_artists: BigInt(15),
        },
      ])
      .mockResolvedValueOnce([
        { hour: 23, listen_count: BigInt(60) },
        { hour: 22, listen_count: BigInt(40) },
      ])
      .mockResolvedValueOnce([
        {
          track_id: "t1",
          track_title: "Night Track",
          artist_name: "Night Artist",
          listen_count: BigInt(25),
        },
      ])
      .mockResolvedValueOnce([
        {
          artist_id: "a1",
          artist_name: "Night Artist",
          listen_count: BigInt(50),
          unique_tracks: BigInt(5),
        },
      ])
      .mockResolvedValueOnce([
        { genre_label: "Electronic", listen_count: BigInt(30) },
      ]);

    const result = await getLateNightListeningProfile("user-456", {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      limit: 5,
    });

    expect(result.period).toEqual({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });
    expect(result.periodTotalListens).toBe(1000);
    expect(result.lateNight.listens).toBe(100);
    expect(result.lateNight.shareOfPeriodListensPct).toBe(10);
    expect(result.lateNight.peakHourWithinWindow).toEqual({
      hour: 23,
      listens: 60,
    });
    expect(result.lateNight.listensByHour).toEqual([
      { hour: 22, listens: 40 },
      { hour: 23, listens: 60 },
    ]);
    expect(result.topTracks[0]).toMatchObject({
      title: "Night Track",
      listenCount: 25,
    });
    expect(result.topGenres[0]).toMatchObject({
      genre: "Electronic",
      listenCount: 30,
      percentage: 30,
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(6);
  });

  it("computes inclusive rolling UTC window for late-night preset", () => {
    expect(
      getLateNightPresetDateRange(new Date("2026-05-15T18:30:00.000Z"))
    ).toEqual({
      startDate: "2026-02-15",
      endDate: "2026-05-15",
    });
  });

  it("returns an artist deep dive for an exact artist match", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([
        {
          primary_artist_id: "artist-1",
          primary_artist_name: "Daft Punk",
          matched_artist_names: ["Daft Punk"],
          selected_artist_ids: ["artist-1"],
          total_listens: BigInt(12),
          unique_tracks: BigInt(2),
          first_listen_at: new Date("2023-01-02T03:04:05.000Z"),
          last_listen_at: new Date("2024-05-06T07:08:09.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          track_id: "track-1",
          track_title: "One More Time",
          genre: "Electronic",
          listen_count: BigInt(8),
          first_listen_at: new Date("2023-01-02T03:04:05.000Z"),
          last_listen_at: new Date("2024-05-06T07:08:09.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        { year: 2023, listen_count: BigInt(5), unique_tracks: BigInt(2) },
        { year: 2024, listen_count: BigInt(7), unique_tracks: BigInt(1) },
      ]);

    await expect(
      getArtistDeepDive("user-123", {
        artistName: "Daft Punk",
        startDate: "2023-01-01",
        endDate: "2024-12-31",
        limit: 5,
      })
    ).resolves.toEqual({
      found: true,
      requestedArtistName: "Daft Punk",
      period: { startDate: "2023-01-01", endDate: "2024-12-31" },
      artist: { artistId: "artist-1", artistName: "Daft Punk" },
      matchedArtistNames: ["Daft Punk"],
      totalListens: 12,
      uniqueTracks: 2,
      firstListenAt: "2023-01-02T03:04:05.000Z",
      lastListenAt: "2024-05-06T07:08:09.000Z",
      topTracks: [
        {
          trackId: "track-1",
          title: "One More Time",
          genre: "Electronic",
          listenCount: 8,
          firstListenAt: "2023-01-02T03:04:05.000Z",
          lastListenAt: "2024-05-06T07:08:09.000Z",
        },
      ],
      yearlyBreakdown: [
        { year: 2023, listenCount: 5, uniqueTracks: 2 },
        { year: 2024, listenCount: 7, uniqueTracks: 1 },
      ],
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
  });

  it("resolves artist deep dives case-insensitively", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([
        {
          primary_artist_id: "artist-2",
          primary_artist_name: "Beyonce",
          matched_artist_names: ["Beyonce"],
          selected_artist_ids: ["artist-2"],
          total_listens: BigInt(3),
          unique_tracks: BigInt(1),
          first_listen_at: new Date("2024-01-01T00:00:00.000Z"),
          last_listen_at: new Date("2024-01-03T00:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getArtistDeepDive("user-123", {
      artistName: "beyonce",
    });

    expect(result).toMatchObject({
      found: true,
      requestedArtistName: "beyonce",
      artist: { artistId: "artist-2", artistName: "Beyonce" },
      matchedArtistNames: ["Beyonce"],
      totalListens: 3,
      uniqueTracks: 1,
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
  });

  it("falls back to partial artist matches when no exact artist exists", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([
        {
          primary_artist_id: "artist-3",
          primary_artist_name: "Radiohead / Thom Yorke",
          matched_artist_names: ["Radiohead / Thom Yorke"],
          selected_artist_ids: ["artist-3"],
          total_listens: BigInt(4),
          unique_tracks: BigInt(2),
          first_listen_at: new Date("2022-02-01T00:00:00.000Z"),
          last_listen_at: new Date("2022-02-04T00:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getArtistDeepDive("user-123", {
      artistName: "Radiohead",
    });

    expect(result).toMatchObject({
      found: true,
      requestedArtistName: "Radiohead",
      artist: { artistId: "artist-3", artistName: "Radiohead / Thom Yorke" },
      matchedArtistNames: ["Radiohead / Thom Yorke"],
      totalListens: 4,
      uniqueTracks: 2,
    });

    const query = vi.mocked(prisma.$queryRaw).mock.calls[0]?.[0] as {
      strings: readonly string[];
      values: readonly unknown[];
    };
    expect(query.strings.join("")).toContain("ILIKE");
    expect(query.values).toContain("%Radiohead%");
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
  });

  it("returns an empty artist deep dive when the artist is absent", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

    await expect(
      getArtistDeepDive("user-123", { artistName: "Missing Artist" })
    ).resolves.toEqual({
      found: false,
      requestedArtistName: "Missing Artist",
      period: { startDate: null, endDate: null },
      totalListens: 0,
      uniqueTracks: 0,
      firstListenAt: null,
      lastListenAt: null,
      topTracks: [],
      yearlyBreakdown: [],
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("compares explicit periods for taste shifts with strict limits and data quality", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([
        {
          total_listens: BigInt(4),
          unique_tracks: BigInt(3),
          unique_artists: BigInt(2),
          total_play_time: BigInt(900),
        },
      ])
      .mockResolvedValueOnce([
        {
          total_listens: BigInt(12),
          unique_tracks: BigInt(7),
          unique_artists: BigInt(4),
          total_play_time: BigInt(2400),
        },
      ])
      .mockResolvedValueOnce([
        {
          artist_id: "artist-1",
          artist_name: "Daft Punk",
          listen_count: BigInt(3),
          unique_tracks: BigInt(2),
          first_listen_at: new Date("2023-01-02T00:00:00.000Z"),
          last_listen_at: new Date("2023-01-04T00:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          artist_id: "artist-2",
          artist_name: "Justice",
          listen_count: BigInt(8),
          unique_tracks: BigInt(3),
          first_listen_at: new Date("2024-01-02T00:00:00.000Z"),
          last_listen_at: new Date("2024-01-08T00:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([{ genre: "Electronic", count: BigInt(3) }])
      .mockResolvedValueOnce([{ genre: "Dance", count: BigInt(9) }])
      .mockResolvedValueOnce([
        {
          artist_id: "artist-2",
          artist_name: "Justice",
          first_listen_count: BigInt(1),
          second_listen_count: BigInt(8),
        },
        {
          artist_id: "artist-1",
          artist_name: "Daft Punk",
          first_listen_count: BigInt(3),
          second_listen_count: BigInt(0),
        },
      ])
      .mockResolvedValueOnce([
        {
          genre: "Dance",
          first_listen_count: BigInt(0),
          second_listen_count: BigInt(9),
        },
        {
          genre: "Electronic",
          first_listen_count: BigInt(3),
          second_listen_count: BigInt(1),
        },
      ]);

    const result = await getTasteShiftSummary("user-123", {
      firstStartDate: "2023-01-01",
      firstEndDate: "2023-01-31",
      secondStartDate: "2024-01-01",
      secondEndDate: "2024-01-31",
      topLimit: 99,
      deltaLimit: 99,
    });

    expect(result).toMatchObject({
      periods: {
        first: {
          startDate: "2023-01-01",
          endDate: "2023-01-31",
          overview: { totalListens: 4, uniqueTracks: 3, uniqueArtists: 2 },
          topArtists: [{ artistName: "Daft Punk", listenCount: 3 }],
          topGenres: [{ genre: "Electronic", count: 3, percentage: 100 }],
        },
        second: {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          overview: { totalListens: 12, uniqueTracks: 7, uniqueArtists: 4 },
          topArtists: [{ artistName: "Justice", listenCount: 8 }],
          topGenres: [{ genre: "Dance", count: 9, percentage: 100 }],
        },
      },
      deltas: {
        artists: {
          rising: [
            {
              artistName: "Justice",
              firstListenCount: 1,
              secondListenCount: 8,
              delta: 7,
            },
          ],
          declining: [
            {
              artistName: "Daft Punk",
              firstListenCount: 3,
              secondListenCount: 0,
              delta: -3,
            },
          ],
        },
        genres: {
          rising: [
            {
              genre: "Dance",
              firstListenCount: 0,
              secondListenCount: 9,
              delta: 9,
              deltaPercent: null,
            },
          ],
          declining: [
            {
              genre: "Electronic",
              firstListenCount: 3,
              secondListenCount: 1,
              delta: -2,
            },
          ],
        },
      },
      limits: {
        topLimit: 10,
        deltaLimit: 10,
        candidateLimit: 40,
      },
      dataQuality: {
        minimumListensPerPeriod: 5,
        insufficientData: true,
        periods: {
          first: { totalListens: 4, insufficientData: true },
          second: { totalListens: 12, insufficientData: false },
        },
      },
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(8);
  });
});
