import { describe, expect, it } from "vitest";
import {
  buildGenresSectionHref,
  isGenresLocalView,
} from "@/lib/utils/genres-section";

describe("isGenresLocalView", () => {
  it("accepts local listing views on /dashboard/genres", () => {
    expect(isGenresLocalView("spotlight")).toBe(true);
    expect(isGenresLocalView("distribution")).toBe(true);
    expect(isGenresLocalView("ranking")).toBe(true);
    expect(isGenresLocalView("trends")).toBe(false);
  });
});

describe("buildGenresSectionHref", () => {
  it("keeps dashboard filters and drops ranking-only params on trends", () => {
    const params = new URLSearchParams(
      "startDate=2024-01-01&endDate=2024-01-31&userId=u1&view=ranking&genresPage=3&genresPageSize=50&q=hello&period=week"
    );

    expect(buildGenresSectionHref("trends", params)).toBe(
      "/dashboard/genres/trends?startDate=2024-01-01&endDate=2024-01-31&period=week&userId=u1"
    );
  });

  it("opens the full ranking without carrying trends-only noise", () => {
    const params = new URLSearchParams("startDate=2024-02-01&period=month&preset=30d");

    expect(buildGenresSectionHref("ranking", params)).toBe(
      "/dashboard/genres?view=ranking&startDate=2024-02-01&preset=30d&period=month"
    );
  });

  it("opens the distribution with an explicit view param", () => {
    const params = new URLSearchParams("endDate=2024-03-01&view=ranking");

    expect(buildGenresSectionHref("distribution", params)).toBe(
      "/dashboard/genres?view=distribution&endDate=2024-03-01"
    );
  });

  it("opens spotlight without a view param", () => {
    const params = new URLSearchParams("endDate=2024-03-01&view=ranking");

    expect(buildGenresSectionHref("spotlight", params)).toBe(
      "/dashboard/genres?endDate=2024-03-01"
    );
  });
});
