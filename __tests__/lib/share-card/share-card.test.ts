import { describe, it, expect } from "vitest";
import { wrapLines, truncateText, measureSpacedText } from "@/lib/utils/share-card/canvas-primitives";
import { computeShareCardVerticalLayout } from "@/lib/utils/share-card/layout";
import { SHARE_CARD_HEIGHT, SHARE_CARD_LAYOUT, SHARE_CARD_WIDTH } from "@/lib/utils/share-card/constants";
import { resolveDuetTimelineWinner } from "@/lib/utils/duet-timeline-share-image";
import { duetShareHeadlineKey, duetShareLeadKey } from "@/lib/utils/duet-share-headline";

function mockCtx(initialWidth: number): CanvasRenderingContext2D {
  return {
    measureText(text: string) {
      return { width: text.length * initialWidth };
    },
  } as unknown as CanvasRenderingContext2D;
}

describe("share-card canvas-primitives", () => {
  it("wrapLines respects max line count", () => {
    const ctx = mockCtx(4);
    const lines = wrapLines(ctx, "one two three four five six", 12, 2);
    expect(lines).toHaveLength(2);
  });

  it("truncateText adds ellipsis when text overflows", () => {
    const ctx = mockCtx(10);
    const result = truncateText(ctx, "abcdefghij", 50);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThan("abcdefghij".length + 1);
  });

  it("measureSpacedText includes tracking between characters", () => {
    const ctx = mockCtx(10);
    expect(measureSpacedText(ctx, "AB", 4)).toBe(24);
  });
});

describe("computeShareCardVerticalLayout", () => {
  it("keeps duel card below artist image and title block", () => {
    const ctx = mockCtx(8);
    const layout = computeShareCardVerticalLayout(ctx, "Radiohead", true);

    const entityBottom =
      (layout.entityImageCenterY ?? 0) + layout.entityImageSize / 2;
    expect(layout.eyebrowY).toBeGreaterThan(entityBottom);
    expect(layout.titleStartY).toBeGreaterThan(layout.eyebrowY);
    expect(layout.cardY).toBeGreaterThan(layout.titleStartY);
    expect(layout.cardY + SHARE_CARD_LAYOUT.duelCardHeight).toBeLessThanOrEqual(
      SHARE_CARD_LAYOUT.footerTop
    );
  });

  it("skips the artist tile when no entity image", () => {
    const ctx = mockCtx(8);
    const layout = computeShareCardVerticalLayout(ctx, "Timeline", false);

    expect(layout.entityImageCenterY).toBeNull();
    expect(layout.titleStartY).toBeGreaterThan(layout.eyebrowY);
    expect(layout.cardY).toBeGreaterThan(layout.titleStartY);
    expect(layout.cardY + SHARE_CARD_LAYOUT.duelCardHeight).toBeLessThanOrEqual(
      SHARE_CARD_LAYOUT.footerTop
    );
  });
});

describe("share-card story format", () => {
  it("uses a 9:16 canvas so the image fills an Instagram story", () => {
    expect(SHARE_CARD_WIDTH).toBe(1080);
    expect(SHARE_CARD_HEIGHT).toBe(1920);
    expect(SHARE_CARD_HEIGHT / SHARE_CARD_WIDTH).toBeCloseTo(16 / 9);
  });

  it("keeps the brand footer above Instagram story chrome", () => {
    expect(SHARE_CARD_LAYOUT.footerBottomInset).toBeGreaterThanOrEqual(360);
    expect(SHARE_CARD_LAYOUT.footerTop).toBe(
      SHARE_CARD_HEIGHT -
        SHARE_CARD_LAYOUT.footerBottomInset -
        SHARE_CARD_LAYOUT.brandBlockHeight
    );
  });
});

describe("resolveDuetTimelineWinner", () => {
  it("returns tie when totals match", () => {
    expect(resolveDuetTimelineWinner(100, 100)).toBe("tie");
  });

  it("returns self when viewer leads", () => {
    expect(resolveDuetTimelineWinner(120, 80)).toBe("self");
  });

  it("returns friend when friend leads", () => {
    expect(resolveDuetTimelineWinner(40, 90)).toBe("friend");
  });
});

describe("duetShareHeadlineKey", () => {
  it("maps timeline outcomes to music-first copy keys", () => {
    expect(duetShareHeadlineKey("timeline", "self")).toBe("shareHeadlineTimelineSelf");
    expect(duetShareHeadlineKey("timeline", "friend")).toBe("shareHeadlineTimelineFriend");
    expect(duetShareHeadlineKey("timeline", "tie")).toBe("shareHeadlineTimelineTie");
  });

  it("maps entity duels to subject-specific copy keys", () => {
    expect(duetShareHeadlineKey("artist", "self")).toBe("shareHeadlineArtistSelf");
    expect(duetShareHeadlineKey("track", "friend")).toBe("shareHeadlineTrackFriend");
    expect(duetShareHeadlineKey("genre", "tie")).toBe("shareHeadlineGenreTie");
  });
});

describe("duetShareLeadKey", () => {
  it("maps winners to scoreboard lead copy", () => {
    expect(duetShareLeadKey("self")).toBe("scoreboardLeadsSelf");
    expect(duetShareLeadKey("friend")).toBe("scoreboardLeadsFriend");
    expect(duetShareLeadKey("tie")).toBe("scoreboardTie");
  });
});

describe("share-card headline wrapping", () => {
  it("keeps a long duel sentence to two lines", () => {
    const ctx = mockCtx(10);
    const lines = wrapLines(
      ctx,
      "You've streamed Radiohead more than Alex",
      220,
      2
    );
    expect(lines).toHaveLength(2);
    expect(lines.join(" ")).toContain("Radiohead");
  });
});
