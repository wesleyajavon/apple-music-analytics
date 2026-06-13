import { describe, it, expect } from "vitest";
import { wrapLines, truncateText } from "@/lib/utils/share-card/canvas-primitives";
import { computeShareCardVerticalLayout } from "@/lib/utils/share-card/layout";
import { SHARE_CARD_LAYOUT } from "@/lib/utils/share-card/constants";
import { resolveDuetTimelineWinner } from "@/lib/utils/duet-timeline-share-image";

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
});

describe("computeShareCardVerticalLayout", () => {
  it("keeps duel card below artist image and title block", () => {
    const ctx = mockCtx(8);
    const layout = computeShareCardVerticalLayout(
      ctx,
      "Radiohead",
      undefined,
      true
    );

    const entityBottom =
      (layout.entityImageCenterY ?? 0) + layout.entityImageRadius;
    expect(layout.titleStartY).toBeGreaterThan(entityBottom + 20);
    expect(layout.cardY).toBeGreaterThan(layout.titleStartY);
    expect(layout.cardY + SHARE_CARD_LAYOUT.duelCardHeight).toBeLessThanOrEqual(
      SHARE_CARD_LAYOUT.footerTop
    );
  });

  it("preserves legacy layout when no entity image", () => {
    const ctx = mockCtx(8);
    const layout = computeShareCardVerticalLayout(ctx, "Timeline", "May 2026", false);

    expect(layout.entityImageCenterY).toBeNull();
    expect(layout.titleStartY).toBe(250);
    expect(layout.cardY).toBe(430);
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
