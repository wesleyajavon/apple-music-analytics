/**
 * API tests for GET /api/predictions/listening-habit
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/predictions/listening-habit/route";

vi.mock("@/lib/services/predictions/listening-habit-service", () => ({
  getListeningHabitPrediction: vi.fn(),
}));

vi.mock("@/lib/services/predictions/prediction-cache", () => ({
  getCachedPrediction: vi.fn(),
  setCachedPrediction: vi.fn(),
  getCachedExplanation: vi.fn(),
  setCachedExplanation: vi.fn(),
  getExplanationCacheKey: vi.fn(() => "test-cache-key"),
}));

vi.mock("@/lib/services/ai/listening-habit-explainer", () => ({
  explainListeningHabitPrediction: vi.fn(),
}));
vi.mock("@/lib/auth/require-auth-user-id", () => ({
  requireAuthenticatedUserId: vi.fn(),
  unauthorizedResponse: vi.fn(),
}));

import { getListeningHabitPrediction } from "@/lib/services/predictions/listening-habit-service";
import {
  getCachedPrediction,
  getCachedExplanation,
} from "@/lib/services/predictions/prediction-cache";
import { explainListeningHabitPrediction } from "@/lib/services/ai/listening-habit-explainer";
import { requireAuthenticatedUserId } from "@/lib/auth/require-auth-user-id";

describe("GET /api/predictions/listening-habit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue("user-1");
    vi.mocked(getCachedPrediction).mockResolvedValue(null);
    vi.mocked(getCachedExplanation).mockResolvedValue(null);
  });

  it("returns 200 with prediction when data is sufficient", async () => {
    const mockPrediction = {
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

    vi.mocked(getListeningHabitPrediction).mockResolvedValue(mockPrediction);

    const request = new NextRequest("http://localhost/api/predictions/listening-habit");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.timeWindow).toEqual(mockPrediction.timeWindow);
    expect(data.confidenceScore).toBe(65);
    expect(data.predictedGenre).toBe("Rock");
    expect(data.fromCache).toBe(false);
  });

  it("returns 200 with insufficient data when listens < 30", async () => {
    vi.mocked(getListeningHabitPrediction).mockResolvedValue({
      insufficientData: true,
      minListensRecommended: 30,
      actualListens: 15,
      message: "Données insuffisantes pour une prédiction fiable.",
    });

    const request = new NextRequest("http://localhost/api/predictions/listening-habit");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.insufficientData).toBe(true);
    expect(data.actualListens).toBe(15);
    expect(data.minListensRecommended).toBe(30);
  });

  it("returns cached prediction when available", async () => {
    const mockPrediction = {
      timeWindow: { startHour: 21, endHour: 23, label: "21h–23h" },
      confidenceScore: 70,
      predictedGenre: "Pop",
    };

    vi.mocked(getCachedPrediction).mockResolvedValue(mockPrediction);

    const request = new NextRequest("http://localhost/api/predictions/listening-habit");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.fromCache).toBe(true);
    expect(data.timeWindow.label).toBe("21h–23h");
    expect(getListeningHabitPrediction).not.toHaveBeenCalled();
  });

  it("includes AI explanation when explain=true", async () => {
    const mockPrediction = {
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

    vi.mocked(getListeningHabitPrediction).mockResolvedValue(mockPrediction);
    vi.mocked(explainListeningHabitPrediction).mockResolvedValue(
      "D'après vos habitudes, vous écoutez souvent du rock en soirée."
    );

    const request = new NextRequest(
      "http://localhost/api/predictions/listening-habit?explain=true"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.aiExplanation).toBe(
      "D'après vos habitudes, vous écoutez souvent du rock en soirée."
    );
  });

  it("ignores userId query param and uses authenticated user", async () => {
    vi.mocked(getListeningHabitPrediction).mockResolvedValue({
      insufficientData: true,
      minListensRecommended: 30,
      actualListens: 0,
      message: "Données insuffisantes.",
    });

    const request = new NextRequest(
      "http://localhost/api/predictions/listening-habit?userId=user-123"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getListeningHabitPrediction).toHaveBeenCalledWith("user-1");
  });
});
