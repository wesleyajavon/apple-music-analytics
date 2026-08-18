import { describe, it, expect, vi, beforeEach } from "vitest";
import { explainListeningHabitPrediction } from "../listening-habit-explainer";
import type { ListeningHabitPrediction } from "@/lib/dto/predictions";

const { mockChatCompletionsCreate } = vi.hoisted(() => ({
  mockChatCompletionsCreate: vi.fn(),
}));

vi.mock("@/lib/services/ai/groq-chat", () => ({
  createGroqChatCompletion: mockChatCompletionsCreate,
  GROQ_DEFAULT_MODEL: "openai/gpt-oss-20b",
}));

describe("listening-habit-explainer", () => {
  const mockPrediction: ListeningHabitPrediction = {
    timeWindow: { startHour: 21, endHour: 23, label: "21h–23h" },
    confidenceScore: 65,
    predictedGenre: "Rock",
    supportingMetrics: {
      totalListensAnalyzed: 500,
      daysOfData: 90,
      listensInWindow: 325,
      peakHour: 22,
      dayOfWeek: 1,
      dayName: "Lundi",
      genreDistributionInWindow: { Rock: 200, Pop: 125 },
      assumptions: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GROQ_API_KEY;
  });

  it("throws when GROQ_API_KEY is not set", async () => {
    await expect(
      explainListeningHabitPrediction(mockPrediction)
    ).rejects.toThrow("GROQ_API_KEY is not configured");
    expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("returns explanation when LLM responds", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const expectedExplanation =
      "D'après vos habitudes, vous écoutez souvent du rock en soirée (21h–23h).";
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: expectedExplanation } }],
    });

    const result = await explainListeningHabitPrediction(mockPrediction);

    expect(result).toBe(expectedExplanation);
    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-oss-20b",
        messages: expect.any(Array),
      })
    );
  });

  it("works without supportingMetrics", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const predictionWithoutMetrics: ListeningHabitPrediction = {
      ...mockPrediction,
      supportingMetrics: undefined,
    };
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "Prédiction basée sur vos habitudes d'écoute.",
          },
        },
      ],
    });

    const result = await explainListeningHabitPrediction(
      predictionWithoutMetrics
    );

    expect(result).toBe("Prédiction basée sur vos habitudes d'écoute.");
  });

  it("throws when LLM returns empty content", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });

    await expect(
      explainListeningHabitPrediction(mockPrediction)
    ).rejects.toThrow("Empty response from LLM");
  });
});
