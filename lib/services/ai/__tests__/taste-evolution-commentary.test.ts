import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTasteEvolutionCommentary } from "../taste-evolution-commentary";
import type { WeekToWeekTrend } from "@/lib/dto/taste-evolution";

const { mockChatCompletionsCreate } = vi.hoisted(() => ({
  mockChatCompletionsCreate: vi.fn(),
}));

vi.mock("@/lib/services/ai/groq-chat", () => ({
  createGroqChatCompletion: mockChatCompletionsCreate,
  GROQ_DEFAULT_MODEL: "openai/gpt-oss-20b",
}));

describe("taste-evolution-commentary", () => {
  const mockTrend: WeekToWeekTrend = {
    timeRange: {
      weekStart: "2024-01-15",
      weekEnd: "2024-01-21",
      label: "Semaine du 15 jan.",
    },
    previousWeekRange: {
      weekStart: "2024-01-08",
      weekEnd: "2024-01-14",
      label: "Semaine du 8 jan.",
    },
    volumeDelta: 50,
    volumeDeltaPct: 12.5,
    diversityDelta: 0.4,
    genreCountPrevious: 5,
    genreCountCurrent: 7,
    emergingGenres: [
      {
        genre: "Jazz",
        previousPct: 5,
        currentPct: 12,
        deltaPct: 7,
        previousCount: 10,
        currentCount: 24,
      },
    ],
    decliningGenres: [
      {
        genre: "Pop",
        previousPct: 30,
        currentPct: 22,
        deltaPct: -8,
        previousCount: 60,
        currentCount: 44,
      },
    ],
    artistRankMovements: [
      {
        artistName: "Artist A",
        previousRank: 2,
        currentRank: 1,
        rankChange: -1,
        previousCount: 50,
        currentCount: 65,
      },
    ],
    dominantShifts: [],
    classification: "expansion",
    previousWeekListens: 400,
    currentWeekListens: 450,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GROQ_API_KEY;
  });

  it("returns empty string for empty trends", async () => {
    const result = await generateTasteEvolutionCommentary([]);
    expect(result).toBe("");
    expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("returns empty string when GROQ_API_KEY is not set", async () => {
    const result = await generateTasteEvolutionCommentary([mockTrend]);
    expect(result).toBe("");
    expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("returns commentary when LLM responds", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const expectedCommentary =
      "La semaine du 15 jan. montre une expansion de vos goûts.";
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: expectedCommentary } }],
    });

    const result = await generateTasteEvolutionCommentary([mockTrend]);

    expect(result).toBe(expectedCommentary);
    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-oss-20b",
        messages: expect.any(Array),
      })
    );
  });

  it("returns empty string when LLM returns null/undefined content", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const result = await generateTasteEvolutionCommentary([mockTrend]);
    expect(result).toBe("");
  });
});
