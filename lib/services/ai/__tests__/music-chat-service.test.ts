import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateGroqChatCompletion, mockExecuteMusicChatTool } = vi.hoisted(() => ({
  mockCreateGroqChatCompletion: vi.fn(),
  mockExecuteMusicChatTool: vi.fn(),
}));

vi.mock("@/lib/services/ai/groq-chat", () => ({
  createGroqChatCompletion: mockCreateGroqChatCompletion,
  GROQ_DEFAULT_MODEL: "openai/gpt-oss-20b",
}));

vi.mock("@/lib/services/ai/music-chat-tools", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/services/ai/music-chat-tools")>();

  return {
    ...actual,
    executeMusicChatTool: mockExecuteMusicChatTool,
  };
});

import { generateMusicChatAnswer } from "@/lib/services/ai/music-chat-service";
import { getLateNightPresetDateRange } from "@/lib/services/ai/music-chat-tools";

describe("music-chat-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("formats top-tracks preset without calling Groq", async () => {
    mockExecuteMusicChatTool.mockResolvedValue({
      period: { startDate: "2026-01-01", endDate: "2026-12-31" },
      tracks: [
        {
          trackId: "t1",
          title: "Hit",
          artistName: "Band",
          genre: null,
          listenCount: 40,
          firstListenAt: "2026-02-01T00:00:00.000Z",
          lastListenAt: "2026-03-01T00:00:00.000Z",
        },
      ],
    });

    const response = await generateMusicChatAnswer({
      userId: "user-123",
      locale: "en",
      messages: [
        {
          role: "user",
          content: "What were my top tracks in 2026?",
        },
      ],
      presetQuestionId: "summer-2022-top-tracks",
    });

    expect(mockExecuteMusicChatTool).toHaveBeenCalledTimes(1);
    expect(mockExecuteMusicChatTool).toHaveBeenCalledWith(
      "user-123",
      "getTopTracksForPeriod",
      {
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        limit: 10,
      }
    );
    expect(mockCreateGroqChatCompletion).not.toHaveBeenCalled();
    expect(response.answer).toContain("Hit — Band (40 streams)");
    expect(response.sources).toHaveLength(1);
  });

  it("formats top-artists preset without calling Groq", async () => {
    mockExecuteMusicChatTool.mockResolvedValue({
      period: { startDate: "2025-01-01", endDate: "2025-12-31" },
      artists: [
        {
          artistId: "a1",
          artistName: "Daft Punk",
          listenCount: 100,
          uniqueTracks: 12,
          firstListenAt: "2025-01-10T00:00:00.000Z",
          lastListenAt: "2025-11-20T00:00:00.000Z",
        },
      ],
    });

    const response = await generateMusicChatAnswer({
      userId: "user-456",
      locale: "en",
      messages: [
        {
          role: "user",
          content: "Who were my top artists in 2025?",
        },
      ],
      presetQuestionId: "summer-2022-top-artists",
    });

    expect(mockExecuteMusicChatTool).toHaveBeenCalledTimes(1);
    expect(mockExecuteMusicChatTool).toHaveBeenCalledWith(
      "user-456",
      "getTopArtistsForPeriod",
      {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        limit: 10,
      }
    );
    expect(mockCreateGroqChatCompletion).not.toHaveBeenCalled();
    expect(response.answer).toContain("- Daft Punk");
    expect(response.answer).toContain("100 streams");
    expect(response.answer).toContain("12 unique tracks");
    expect(response.sources).toHaveLength(1);
  });

  it("formats artist deep-dive preset without calling Groq", async () => {
    mockExecuteMusicChatTool.mockResolvedValue({
      found: true,
      requestedArtistName: "Radiohead",
      period: { startDate: null, endDate: null },
      artist: { artistId: "a1", artistName: "Radiohead" },
      totalListens: 25,
      uniqueTracks: 6,
      firstListenAt: "2021-01-01T00:00:00.000Z",
      lastListenAt: "2025-01-01T00:00:00.000Z",
      matchedArtistNames: ["Radiohead"],
      topTracks: [
        {
          trackId: "t1",
          title: "Paranoid Android",
          genre: "Alternative",
          listenCount: 10,
          firstListenAt: "2021-01-01T00:00:00.000Z",
          lastListenAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      yearlyBreakdown: [{ year: 2023, listenCount: 12, uniqueTracks: 4 }],
    });

    const response = await generateMusicChatAnswer({
      userId: "user-789",
      locale: "en",
      messages: [
        {
          role: "user",
          content: "Tell me my listening history with Radiohead.",
        },
      ],
      presetQuestionId: "artist-deep-dive",
      presetArgs: { artistName: "Radiohead" },
    });

    expect(mockExecuteMusicChatTool).toHaveBeenCalledTimes(1);
    expect(mockExecuteMusicChatTool).toHaveBeenCalledWith(
      "user-789",
      "getArtistDeepDive",
      {
        artistName: "Radiohead",
        limit: 10,
      }
    );
    expect(mockCreateGroqChatCompletion).not.toHaveBeenCalled();
    expect(response.answer).toContain("Radiohead");
    expect(response.answer).toContain("Paranoid Android");
    expect(response.sources).toHaveLength(1);
  });

  it("short-circuits the 2020 to 2024 taste shift preset to its known tool", async () => {
    mockExecuteMusicChatTool.mockResolvedValue({
      periods: {
        first: {
          startDate: "2020-01-01",
          endDate: "2020-12-31",
          overview: { totalListens: 10 },
          topArtists: [],
          topGenres: [],
        },
        second: {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          overview: { totalListens: 20 },
          topArtists: [],
          topGenres: [],
        },
      },
      deltas: { artists: { rising: [], declining: [] }, genres: { rising: [], declining: [] } },
      dataQuality: { insufficientData: false },
    });

    const response = await generateMusicChatAnswer({
      userId: "user-123",
      locale: "en",
      messages: [
        {
          role: "user",
          content: "How did my taste change between 2020 and 2024?",
        },
      ],
      presetQuestionId: "taste-shift-2020-2024",
    });

    expect(mockExecuteMusicChatTool).toHaveBeenCalledTimes(1);
    expect(mockExecuteMusicChatTool).toHaveBeenCalledWith(
      "user-123",
      "getTasteShiftSummary",
      {
        firstStartDate: "2020-01-01",
        firstEndDate: "2020-12-31",
        secondStartDate: "2024-01-01",
        secondEndDate: "2024-12-31",
        topLimit: 5,
        deltaLimit: 5,
      }
    );
    expect(mockCreateGroqChatCompletion).not.toHaveBeenCalled();
    expect(response.sources).toHaveLength(1);
    expect(response.answer).toContain("Taste shift between 2020 and 2024");
    expect(response.answer).not.toContain("2020-01-01");
  });

  it("short-circuits the weekly taste evolution preset to getWeeklyTasteEvolution", async () => {
    mockExecuteMusicChatTool.mockResolvedValue({
      period: { startDate: "2026-04-24", endDate: "2026-06-18" },
      trends: [
        {
          weekLabel: "Week of Jun 9",
          previousWeekLabel: "Week of Jun 2",
          classification: "exploration",
          volumeDeltaPct: 12,
          diversityDelta: 0.1,
          currentWeekListens: 50,
          previousWeekListens: 44,
          emergingGenres: [{ genre: "Electronic", deltaPct: 5 }],
          decliningGenres: [],
          artistMovements: [
            { artistName: "Daft Punk", previousRank: 4, currentRank: 2, rankChange: 2 },
          ],
        },
      ],
      skippedWeeks: [],
      dataQuality: { insufficientData: false },
    });

    const response = await generateMusicChatAnswer({
      userId: "user-123",
      locale: "fr",
      messages: [
        {
          role: "user",
          content:
            "Comment mes goûts ont-ils évolué semaine après semaine ces dernières semaines ?",
        },
      ],
      presetQuestionId: "weekly-taste-evolution",
    });

    expect(mockExecuteMusicChatTool).toHaveBeenCalledTimes(1);
    expect(mockExecuteMusicChatTool).toHaveBeenCalledWith(
      "user-123",
      "getWeeklyTasteEvolution",
      expect.objectContaining({
        maxTrends: 4,
        locale: "fr",
        startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    );
    expect(mockCreateGroqChatCompletion).not.toHaveBeenCalled();
    expect(response.answer).toContain("semaine après semaine");
    expect(response.answer).toContain("Exploration");
    expect(response.answer).toContain("Daft Punk: #4 → #2");
  });

  it("short-circuits track obsessions preset to getTrackObsessionWindows for the calendar year in the user message", async () => {
    mockExecuteMusicChatTool.mockResolvedValue({
      period: { startDate: "2023-01-01", endDate: "2023-12-31" },
      windowDays: 7,
      minListensInWindow: 2,
      limits: { limit: 5, maxLimit: 10, maxCandidateTracks: 200 },
      obsessionWindows: [],
    });

    const response = await generateMusicChatAnswer({
      userId: "user-123",
      locale: "en",
      messages: [
        { role: "user", content: "Which songs obsessed me in 2023?" },
      ],
      presetQuestionId: "track-obsessions-2022",
    });

    expect(mockExecuteMusicChatTool).toHaveBeenCalledTimes(1);
    expect(mockExecuteMusicChatTool).toHaveBeenCalledWith(
      "user-123",
      "getTrackObsessionWindows",
      {
        startDate: "2023-01-01",
        endDate: "2023-12-31",
        windowDays: 7,
        limit: 5,
        minListensInWindow: 2,
      }
    );
    expect(mockCreateGroqChatCompletion).not.toHaveBeenCalled();
    expect(response.sources).toHaveLength(1);
    expect(response.answer).toContain("2023");
  });

  it("short-circuits late-night preset with rolling UTC recent window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
    mockExecuteMusicChatTool.mockResolvedValue({
      definition: {
        lateNightHours: [22, 23, 0, 1, 2, 3],
        description: "Late night window.",
      },
      period: { startDate: "2026-02-15", endDate: "2026-05-15" },
      periodTotalListens: 500,
      lateNight: {
        listens: 50,
        uniqueTracks: 30,
        uniqueArtists: 12,
        shareOfPeriodListensPct: 10,
        peakHourWithinWindow: { hour: 23, listens: 20 },
        listensByHour: [{ hour: 23, listens: 20 }],
      },
      topTracks: [{ title: "X", artistName: "Y", listenCount: 3 }],
      topArtists: [{ artistName: "Z", listenCount: 5 }],
      topGenres: [],
      limits: { topLimit: 10 },
    });

    const { startDate, endDate } = getLateNightPresetDateRange(
      new Date("2026-05-15T12:00:00.000Z")
    );

    await generateMusicChatAnswer({
      userId: "user-123",
      locale: "en",
      messages: [
        {
          role: "user",
          content:
            "What have I been listening to late at night recently?",
        },
      ],
      presetQuestionId: "late-night-habits",
      dateRange: {
        startDate: "2019-01-01",
        endDate: "2026-01-01",
        isAll: true,
      },
    });

    expect(mockExecuteMusicChatTool).toHaveBeenCalledTimes(1);
    expect(mockExecuteMusicChatTool).toHaveBeenCalledWith(
      "user-123",
      "getLateNightListeningProfile",
      {
        limit: 10,
        startDate,
        endDate,
      }
    );
    expect(mockCreateGroqChatCompletion).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("removes raw data-quality metadata before the final answer prompt", async () => {
    mockExecuteMusicChatTool.mockResolvedValue({
      periods: {
        first: {
          startDate: "2023-01-01",
          endDate: "2023-12-31",
          overview: { totalListens: 100 },
          topArtists: [],
          topGenres: [],
        },
        second: {
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          overview: { totalListens: 120 },
          topArtists: [],
          topGenres: [],
        },
      },
      deltas: { artists: { rising: [], declining: [] }, genres: { rising: [], declining: [] } },
      dataQuality: { insufficientData: false },
    });
    mockCreateGroqChatCompletion
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "",
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: {
                    name: "getTasteShiftSummary",
                    arguments: JSON.stringify({
                      firstStartDate: "2023-01-01",
                      firstEndDate: "2023-12-31",
                      secondStartDate: "2026-01-01",
                      secondEndDate: "2026-12-31",
                    }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "Between 2023 and 2026, your taste shifted.",
            },
          },
        ],
      });

    await generateMusicChatAnswer({
      userId: "user-123",
      locale: "en",
      messages: [
        {
          role: "user",
          content: "How did my taste change between 2023 and 2026?",
        },
      ],
    });

    const finalParams = mockCreateGroqChatCompletion.mock.calls[1]?.[0];
    const finalMessages = JSON.stringify(finalParams.messages);
    expect(finalMessages).not.toContain("dataQuality");
    expect(finalMessages).not.toContain("insufficientData");
  });

  it("strips raw data-quality metadata from model answers and chat history", async () => {
    mockExecuteMusicChatTool.mockResolvedValue({
      years: [{ year: 2023, listenCount: 100 }],
    });
    mockCreateGroqChatCompletion
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "",
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: {
                    name: "getListeningTrendsByYear",
                    arguments: JSON.stringify({ limit: 10 }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                "Between 2023 and 2026, your taste shifted toward newer artists. Note that dataQuality.insufficientData is false, indicating that the data is sufficient for analysis.",
            },
          },
        ],
      });

    const response = await generateMusicChatAnswer({
      userId: "user-123",
      locale: "en",
      messages: [
        {
          role: "assistant",
          content:
            "Previous answer. Note that dataQuality.insufficientData is false, indicating that the data is sufficient for analysis.",
        },
        {
          role: "user",
          content: "How did my taste change between 2023 and 2026?",
        },
      ],
    });

    const params = mockCreateGroqChatCompletion.mock.calls[0]?.[0];
    const promptMessages = JSON.stringify(params.messages);
    expect(promptMessages).not.toContain("dataQuality");
    expect(promptMessages).not.toContain("insufficientData");
    expect(response.answer).toBe(
      "Between 2023 and 2026, your taste shifted toward newer artists."
    );
  });

  it("uses a controlled unsupported-task fallback when the model does not call tools", async () => {
    mockCreateGroqChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: "Sure, I can create a playlist for you.",
          },
        },
      ],
    });

    const response = await generateMusicChatAnswer({
      userId: "user-123",
      locale: "en",
      messages: [
        {
          role: "user",
          content: "Create a playlist from my favorite tracks.",
        },
      ],
    });

    expect(mockExecuteMusicChatTool).not.toHaveBeenCalled();
    expect(response.sources).toEqual([]);
    expect(response.answer).toContain("I can't do that task");
    expect(response.answer).toContain("top tracks");
    expect(response.answer).not.toContain("Sure, I can create a playlist");
  });

  it("exposes the track obsession windows tool with strict windows and limits", async () => {
    mockCreateGroqChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              "Your sharpest track obsession was in a 7-day window inside the selected period.",
          },
        },
      ],
    });

    await generateMusicChatAnswer({
      userId: "user-123",
      locale: "en",
      messages: [
        {
          role: "user",
          content: "Which tracks was I obsessed with in short bursts this year?",
        },
      ],
      dateRange: {
        startDate: "2020-01-01",
        endDate: "2024-12-31",
        isAll: true,
      },
    });

    const params = mockCreateGroqChatCompletion.mock.calls[0]?.[0];
    const obsessionTool = params.tools.find(
      (tool: { function: { name: string } }) =>
        tool.function.name === "getTrackObsessionWindows"
    );

    expect(obsessionTool).toMatchObject({
      function: {
        parameters: {
          required: ["startDate", "endDate"],
          properties: {
            windowDays: { enum: [7, 14, 30] },
            limit: { maximum: 10 },
            minListensInWindow: { maximum: 20 },
          },
        },
      },
    });
    expect(params.messages[0].content).toContain(
      "For track obsession windows, always mention the exact short window"
    );
    expect(params.messages[0].content).toContain(
      "The active dashboard date filter is all time."
    );
    expect(params.messages[0].content).toContain(
      "For artist deep dives, omit startDate and endDate"
    );
  });

  it("exposes the taste shift summary tool to Groq with strict limits", async () => {
    mockCreateGroqChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              "Between 2023-01-01 and 2023-01-31 versus 2024-01-01 and 2024-01-31, there was enough data to compare.",
          },
        },
      ],
    });

    await generateMusicChatAnswer({
      userId: "user-123",
      locale: "en",
      messages: [
        {
          role: "user",
          content: "How did my taste shift from Jan 2023 to Jan 2024?",
        },
      ],
    });

    const params = mockCreateGroqChatCompletion.mock.calls[0]?.[0];
    const tasteShiftTool = params.tools.find(
      (tool: { function: { name: string } }) =>
        tool.function.name === "getTasteShiftSummary"
    );

    expect(tasteShiftTool).toMatchObject({
      function: {
        parameters: {
          required: [
            "firstStartDate",
            "firstEndDate",
            "secondStartDate",
            "secondEndDate",
          ],
          properties: {
            topLimit: { maximum: 10 },
            deltaLimit: { maximum: 10 },
          },
        },
      },
    });
    expect(params.messages[0].content).toContain(
      "For taste-shift comparisons, always name both periods"
    );
    expect(params.messages[0].content).toContain(
      "If the tool result includes a caution about sparse data"
    );
    expect(params.messages[0].content).toContain(
      "If there is no caution, do not mention data quality."
    );
    expect(params.messages[0].content).toContain(
      "Never expose raw tool field names or metadata labels"
    );
  });
});
