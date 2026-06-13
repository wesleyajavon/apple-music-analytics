import {
  SHARE_CARD_FONT,
  SHARE_CARD_LAYOUT,
  SHARE_CARD_SIZE,
} from "@/lib/utils/share-card/constants";
import { wrapLines } from "@/lib/utils/share-card/canvas-primitives";

export type ShareCardVerticalLayout = {
  entityImageCenterY: number | null;
  entityImageRadius: number;
  titleStartY: number;
  cardY: number;
};

export function computeShareCardVerticalLayout(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string | undefined,
  hasEntityImage: boolean
): ShareCardVerticalLayout {
  const {
    eyebrowBottom,
    entityImageRadius,
    entityImageGapBelow,
    titleFontSize,
    titleLineHeight,
    titleAscent,
    subtitleBlockHeight,
    sectionGap,
    duelCardHeight,
    footerTop,
  } = SHARE_CARD_LAYOUT;

  if (!hasEntityImage) {
    return {
      entityImageCenterY: null,
      entityImageRadius,
      titleStartY: 250,
      cardY: 430,
    };
  }

  const entityImageCenterY = eyebrowBottom + entityImageRadius;
  const entityImageBottom = entityImageCenterY + entityImageRadius;
  const titleStartY = entityImageBottom + entityImageGapBelow + titleAscent;

  ctx.font = `800 ${titleFontSize}px ${SHARE_CARD_FONT}`;
  const titleLines = wrapLines(ctx, title, SHARE_CARD_SIZE - 200, 2);
  const titleBlockBottom =
    titleStartY + (titleLines.length - 1) * titleLineHeight + titleFontSize * 0.15;
  const titleEndY = subtitle ? titleBlockBottom + subtitleBlockHeight : titleBlockBottom;

  const cardY = Math.min(
    Math.max(titleEndY + sectionGap, titleStartY + sectionGap),
    footerTop - duelCardHeight
  );

  return {
    entityImageCenterY,
    entityImageRadius,
    titleStartY,
    cardY,
  };
}
