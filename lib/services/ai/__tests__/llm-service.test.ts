import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateInsights } from "../llm-service";
import type { AnalyticsSummary } from "../analytics-summarizer";

const { mockChatCompletionsCreate } = vi.hoisted(() => ({
  mockChatCompletionsCreate: vi.fn(),
}));

vi.mock("groq-sdk", () => ({
  default: class MockGroq {
    constructor() {
      return {
        chat: {
          completions: {
            create: mockChatCompletionsCreate,
          },
        },
      };
    }
  },
}));

describe("llm-service", () => {
  const mockSummary: AnalyticsSummary = {
    text: "Période: 2024-01-01 à 2024-01-31. Rock: 100 écoutes (40%).",
    structured: '{"dateRange":{"start":"2024-01-01","end":"2024-01-31"}}',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GROQ_API_KEY;
  });

  it("throws when GROQ_API_KEY is not set", async () => {
    await expect(generateInsights(mockSummary)).rejects.toThrow(
      "GROQ_API_KEY is not configured"
    );
    expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("returns parsed insights when LLM responds with numbered list", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: `1. Le rock représente 40% de vos écoutes.
2. Vous écoutez surtout en soirée (18h-19h).
3. Artist A est votre artiste le plus écouté.`,
          },
        },
      ],
    });

    const result = await generateInsights(mockSummary);

    expect(result).toHaveLength(3);
    expect(result[0]).toContain("rock");
    expect(result[1]).toContain("soirée");
    expect(result[2]).toContain("Artist A");
    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "llama-3.1-8b-instant",
        messages: expect.any(Array),
      })
    );
  });

  it("throws when LLM returns empty content", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });

    await expect(generateInsights(mockSummary)).rejects.toThrow(
      "Empty response from LLM"
    );
  });

  it("throws when LLM returns content that parses to no insights", async () => {
    process.env.GROQ_API_KEY = "test-key";
    // Content is non-empty but numbered lines become empty after stripping numbers
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "1. \n2. \n3. " } }],
    });

    await expect(generateInsights(mockSummary)).rejects.toThrow(
      "Failed to parse insights"
    );
  });

  it("caps insights at 5", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: `1. Insight one
2. Insight two
3. Insight three
4. Insight four
5. Insight five
6. Insight six`,
          },
        },
      ],
    });

    const result = await generateInsights(mockSummary);
    expect(result).toHaveLength(5);
  });
});
