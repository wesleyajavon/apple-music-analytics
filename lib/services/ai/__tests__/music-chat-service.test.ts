import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateGroqChatCompletion, mockExecuteMusicChatTool } = vi.hoisted(() => ({
  mockCreateGroqChatCompletion: vi.fn(),
  mockExecuteMusicChatTool: vi.fn(),
}));

vi.mock("@/lib/services/ai/groq-chat", () => ({
  createGroqChatCompletion: mockCreateGroqChatCompletion,
  GROQ_DEFAULT_MODEL: "llama-3.1-8b-instant",
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

describe("music-chat-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockCreateGroqChatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              "Between 2020 and 2024, your listening shifted based on the preset summary.",
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
    expect(mockCreateGroqChatCompletion).toHaveBeenCalledTimes(1);
    const finalParams = mockCreateGroqChatCompletion.mock.calls[0]?.[0];
    expect(JSON.stringify(finalParams.messages)).not.toContain("dataQuality");
    expect(JSON.stringify(finalParams.messages)).not.toContain("insufficientData");
    expect(response.sources).toHaveLength(1);
    expect(response.answer).toContain("Between 2020 and 2024");
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
