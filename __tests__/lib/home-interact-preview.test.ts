/** @vitest-environment node */

import { describe, expect, it } from "vitest";
import {
  HOME_DUET_PREVIEW_FRIEND_LISTENS,
  HOME_DUET_PREVIEW_MARGIN,
  HOME_DUET_PREVIEW_SELF_LISTENS,
} from "@/lib/constants/home-interact-preview";

describe("home interact preview constants", () => {
  it("keeps the duel margin in sync with the two stream counts", () => {
    expect(HOME_DUET_PREVIEW_MARGIN).toBe(
      HOME_DUET_PREVIEW_SELF_LISTENS - HOME_DUET_PREVIEW_FRIEND_LISTENS,
    );
    expect(HOME_DUET_PREVIEW_SELF_LISTENS).toBeGreaterThan(HOME_DUET_PREVIEW_FRIEND_LISTENS);
  });
});
