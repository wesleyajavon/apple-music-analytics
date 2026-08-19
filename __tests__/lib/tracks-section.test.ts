import { describe, expect, it } from "vitest";
import {
  buildTracksSectionHref,
  isTracksLocalView,
} from "@/lib/utils/tracks-section";

describe("isTracksLocalView", () => {
  it("accepts ranking views on /dashboard/tracks", () => {
    expect(isTracksLocalView("leaderboard")).toBe(true);
    expect(isTracksLocalView("ranking")).toBe(true);
    expect(isTracksLocalView("trends")).toBe(false);
  });
});

describe("buildTracksSectionHref", () => {
  it("keeps dashboard filters and drops ranking-only params on trends", () => {
    const params = new URLSearchParams(
      "startDate=2024-01-01&endDate=2024-01-31&userId=u1&view=ranking&page=3&pageSize=50&q=hello&period=week"
    );

    expect(buildTracksSectionHref("trends", params)).toBe(
      "/dashboard/tracks/trends?startDate=2024-01-01&endDate=2024-01-31&period=week&userId=u1"
    );
  });

  it("opens the full ranking without carrying trends-only noise", () => {
    const params = new URLSearchParams("startDate=2024-02-01&period=month&preset=30d");

    expect(buildTracksSectionHref("ranking", params)).toBe(
      "/dashboard/tracks?view=ranking&startDate=2024-02-01&preset=30d&period=month"
    );
  });

  it("opens the top 20 without a view param", () => {
    const params = new URLSearchParams("endDate=2024-03-01&view=ranking");

    expect(buildTracksSectionHref("leaderboard", params)).toBe(
      "/dashboard/tracks?endDate=2024-03-01"
    );
  });
});
