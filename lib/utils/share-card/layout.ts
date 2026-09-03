import {
  SHARE_CARD_FONT,
  SHARE_CARD_LAYOUT,
  SHARE_CARD_SIZE,
} from "@/lib/utils/share-card/constants";
import { wrapLines } from "@/lib/utils/share-card/canvas-primitives";

export type ShareCardVerticalLayout = {
  entityImageCenterY: number | null;
  entityImageSize: number;
  entityImageCornerRadius: number;
  eyebrowY: number;
  titleStartY: number;
  cardY: number;
};

export function computeShareCardVerticalLayout(
  ctx: CanvasRenderingContext2D,
  title: string,
  hasEntityImage: boolean
): ShareCardVerticalLayout {
  const {
    metaBaselineY,
    entityImageSize,
    entityImageCornerRadius,
    entityImageGapBelow,
    titleFontSize,
    titleLineHeight,
    titleAscent,
    sectionGap,
    duelCardHeight,
    footerTop,
  } = SHARE_CARD_LAYOUT;

  const metaBottom = metaBaselineY + 24;
  const entityTop = hasEntityImage ? metaBottom + 18 : null;
  const entityImageCenterY =
    entityTop === null ? null : entityTop + entityImageSize / 2;
  const eyebrowY =
    entityTop === null
      ? metaBottom + 28
      : entityTop + entityImageSize + entityImageGapBelow;
  const titleStartY = eyebrowY + 14 + titleAscent;

  ctx.font = `600 ${titleFontSize}px ${SHARE_CARD_FONT}`;
  const titleLines = wrapLines(ctx, title, SHARE_CARD_SIZE - 200, 2);
  const titleBlockBottom =
    titleStartY + (titleLines.length - 1) * titleLineHeight;

  const cardY = Math.min(
    titleBlockBottom + sectionGap,
    footerTop - duelCardHeight
  );

  return {
    entityImageCenterY,
    entityImageSize,
    entityImageCornerRadius,
    eyebrowY,
    titleStartY,
    cardY,
  };
}
