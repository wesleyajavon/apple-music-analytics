import { describe, expect, it } from "vitest";
import {
  buildArtistsSectionHref,
  isArtistsLocalView,
} from "@/lib/utils/artists-section";

describe("isArtistsLocalView", () => {
  it("accepts local listing views on /dashboard/artists", () => {
    expect(isArtistsLocalView("spotlight")).toBe(true);
    expect(isArtistsLocalView("leaderboard")).toBe(true);
    expect(isArtistsLocalView("ranking")).toBe(true);
    expect(isArtistsLocalView("trends")).toBe(false);
  });
});

describe("buildArtistsSectionHref", () => {
  it("keeps dashboard filters and drops ranking-only params on trends", () => {
    const params = new URLSearchParams(
      "startDate=2024-01-01&endDate=2024-01-31&userId=u1&view=ranking&page=3&pageSize=50&q=hello&period=week"
    );

    expect(buildArtistsSectionHref("trends", params)).toBe(
      "/dashboard/artists/trends?startDate=2024-01-01&endDate=2024-01-31&period=week&userId=u1"
    );
  });

  it("opens the full ranking without carrying trends-only noise", () => {
    const params = new URLSearchParams("startDate=2024-02-01&period=month&preset=30d");

    expect(buildArtistsSectionHref("ranking", params)).toBe(
      "/dashboard/artists?view=ranking&startDate=2024-02-01&preset=30d&period=month"
    );
  });

  it("opens the top 20 with an explicit view param", () => {
    const params = new URLSearchParams("endDate=2024-03-01&view=ranking");

    expect(buildArtistsSectionHref("leaderboard", params)).toBe(
      "/dashboard/artists?view=leaderboard&endDate=2024-03-01"
    );
  });

  it("opens spotlight without a view param", () => {
    const params = new URLSearchParams("endDate=2024-03-01&view=ranking");

    expect(buildArtistsSectionHref("spotlight", params)).toBe(
      "/dashboard/artists?endDate=2024-03-01"
    );
  });
});
