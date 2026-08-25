import { describe, expect, it } from "vitest";
import { shouldNotifyGenreBackfillTransition } from "@/lib/utils/genre-backfill-result-notification";

describe("shouldNotifyGenreBackfillTransition", () => {
  it("does not notify on the first snapshot (undefined previous)", () => {
    expect(shouldNotifyGenreBackfillTransition(undefined, "completed")).toBe(false);
    expect(shouldNotifyGenreBackfillTransition(null, "failed")).toBe(false);
  });

  it("does not notify when a job is already terminal on hydrate", () => {
    expect(shouldNotifyGenreBackfillTransition("completed", "completed")).toBe(false);
    expect(shouldNotifyGenreBackfillTransition("failed", "failed")).toBe(false);
  });

  it("notifies running or paused to completed or failed", () => {
    expect(shouldNotifyGenreBackfillTransition("running", "completed")).toBe(true);
    expect(shouldNotifyGenreBackfillTransition("pending", "failed")).toBe(true);
    expect(shouldNotifyGenreBackfillTransition("paused", "completed")).toBe(true);
  });

  it("does not notify cancelled or same-status polls", () => {
    expect(shouldNotifyGenreBackfillTransition("running", "cancelled")).toBe(false);
    expect(shouldNotifyGenreBackfillTransition("running", "running")).toBe(false);
    expect(shouldNotifyGenreBackfillTransition("running", "paused")).toBe(false);
  });
});
