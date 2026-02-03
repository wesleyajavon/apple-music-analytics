import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTasteProfile } from "../taste-profile-service";
import type { TasteSummary } from "../taste-summary-builder";

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

describe("taste-profile-service", () => {
  const mockSummary: TasteSummary = {
    text: "Période: 2024-01-01 à 2024-01-31. Rock: 40%.",
    structured: '{"dateRange":{"start":"2024-01-01","end":"2024-01-31"}}',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GROQ_API_KEY;
  });

  it("throws when GROQ_API_KEY is not set", async () => {
    await expect(
      generateTasteProfile(mockSummary, "casual")
    ).rejects.toThrow("GROQ_API_KEY is not configured");
    expect(mockChatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("returns parsed profile when LLM responds with valid JSON", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const profileJson = {
      description: "Votre goût musical est centré sur le rock.",
      influences: "Rock, Pop, Jazz",
      coreGenres: "1. Rock 2. Pop 3. Jazz",
      uniqueAspect: "Concentration sur quelques genres majeurs.",
    };
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(profileJson) } }],
    });

    const result = await generateTasteProfile(mockSummary, "casual");

    expect(result).toEqual(profileJson);
    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "llama-3.1-8b-instant",
        messages: expect.any(Array),
      })
    );
  });

  it("parses JSON from markdown code block", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const profileJson = {
      description: "Votre profil musical.",
      influences: "Divers",
      coreGenres: "1. Rock",
      uniqueAspect: "Éclectique.",
    };
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "```json\n" + JSON.stringify(profileJson) + "\n```",
          },
        },
      ],
    });

    const result = await generateTasteProfile(mockSummary, "analytical");
    expect(result).toEqual(profileJson);
  });

  it("throws when LLM returns empty content", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });

    await expect(
      generateTasteProfile(mockSummary, "casual")
    ).rejects.toThrow("Empty response from LLM");
  });

  it("throws when LLM returns invalid JSON", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: "not valid json {" } }],
    });

    await expect(
      generateTasteProfile(mockSummary, "casual")
    ).rejects.toThrow("Failed to parse taste profile");
  });

  it("throws when JSON is missing required fields", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mockChatCompletionsCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              description: "Only description",
              influences: "",
              coreGenres: "",
              uniqueAspect: "",
            }),
          },
        },
      ],
    });

    await expect(
      generateTasteProfile(mockSummary, "casual")
    ).rejects.toThrow("Failed to parse taste profile");
  });
});
