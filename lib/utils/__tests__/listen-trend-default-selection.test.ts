import { describe, expect, it } from "vitest";
import {
  nextDefaultTrendSelection,
  sliceDefaultTrendSelection,
} from "@/lib/utils/listen-trend-default-selection";

describe("sliceDefaultTrendSelection", () => {
  it("takes the first five catalog ids", () => {
    expect(sliceDefaultTrendSelection(["a", "b", "c", "d", "e", "f"])).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });
});

describe("nextDefaultTrendSelection", () => {
  const catalog = ["ytd-1", "ytd-2", "ytd-3", "ytd-4", "ytd-5", "ytd-6"];

  it("reseeds the auto top 5 after a range fetch completes", () => {
    expect(
      nextDefaultTrendSelection({
        selectionTouched: false,
        chartFetching: false,
        catalogIds: catalog,
        currentIds: ["all-1", "all-2", "all-3", "all-4", "all-5"],
      }),
    ).toEqual(["ytd-1", "ytd-2", "ytd-3", "ytd-4", "ytd-5"]);
  });

  it("keeps a curated selection", () => {
    expect(
      nextDefaultTrendSelection({
        selectionTouched: true,
        chartFetching: false,
        catalogIds: catalog,
        currentIds: ["all-1", "all-2"],
      }),
    ).toBeNull();
  });

  it("waits until the new range has loaded", () => {
    expect(
      nextDefaultTrendSelection({
        selectionTouched: false,
        chartFetching: true,
        catalogIds: ["stale-1", "stale-2", "stale-3", "stale-4", "stale-5"],
        currentIds: ["stale-1", "stale-2", "stale-3", "stale-4", "stale-5"],
      }),
    ).toBeNull();
  });
});
