import { describe, expect, it } from "vitest";
import { removeDuplicateSourcesWithinWindow } from "@/lib/utils/notification-dedupe";

const iso = (ms: number) => new Date(ms).toISOString();

describe("removeDuplicateSourcesWithinWindow", () => {
  it("does not remove other sources; removes matching source inside the window", () => {
    const now = 1_000_000;
    const items = [
      { id: "a", source: "a", createdAt: iso(now - 1000) },
      { id: "b", source: "b", createdAt: iso(now - 2000) },
    ];
    const next = removeDuplicateSourcesWithinWindow(items, "a", now, 60_000);
    expect(next.map((n) => n.id)).toEqual(["b"]);
  });

  it("keeps same-source rows older than the window", () => {
    const now = 10_000_000;
    const items = [
      { id: "1", source: "export-csv", createdAt: iso(now - 5000) },
      { id: "2", source: "export-csv", createdAt: iso(now - 130_000) },
    ];
    const next = removeDuplicateSourcesWithinWindow(items, "export-csv", now, 120_000);
    expect(next.map((n) => n.id)).toEqual(["2"]);
  });

  it("keeps same-source rows when all are outside the window", () => {
    const now = 10_000_000;
    const items = [{ id: "1", source: "x", createdAt: iso(now - 130_000) }];
    const next = removeDuplicateSourcesWithinWindow(items, "x", now, 120_000);
    expect(next).toHaveLength(1);
  });

  it("keeps items with invalid createdAt for that source", () => {
    const now = 10_000_000;
    const items = [{ id: "1", source: "x", createdAt: "not-a-date" }];
    const next = removeDuplicateSourcesWithinWindow(items, "x", now, 120_000);
    expect(next).toHaveLength(1);
  });
});
