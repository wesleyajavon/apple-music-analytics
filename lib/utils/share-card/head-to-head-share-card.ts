import { SHARE_CARD_BRAND_LOGO_URL, SHARE_CARD_SIZE } from "@/lib/utils/share-card/constants";
import {
  drawHeadToHeadCard,
  drawShareCardBackground,
  drawShareCardBrandFooter,
  drawShareCardEntityImage,
  drawShareCardEyebrow,
  drawShareCardTitleBlock,
} from "@/lib/utils/share-card/canvas-primitives";
import {
  createShareCardCanvas,
  encodeCanvasToPngBlob,
  getShareCardContext,
} from "@/lib/utils/share-card/encode";
import { loadCanvasImage, loadShareCardAvatar } from "@/lib/utils/share-card/load-image";
import { computeShareCardVerticalLayout } from "@/lib/utils/share-card/layout";

/** Shared layout for Duet duels and future Encore comparative cards. */
export type HeadToHeadShareCardInput = {
  eyebrowLabel: string;
  title: string;
  subtitle?: string;
  viewerName: string;
  friendName: string;
  viewerAvatarUrl?: string | null;
  friendAvatarUrl?: string | null;
  selfCount: number;
  friendCount: number;
  winner: "self" | "friend" | "tie";
  winnerHeadline: string;
  selfLabel: string;
  friendLabel: string;
  brandName: string;
  brandTagline: string;
  /** Artist portrait shown above the title when available (e.g. artist duel). */
  entityImageUrl?: string | null;
};

export async function renderHeadToHeadShareCard(
  input: HeadToHeadShareCardInput
): Promise<HTMLCanvasElement> {
  const entityImageUrl = input.entityImageUrl?.trim();
  const [viewerAvatar, friendAvatar, entityImage, brandLogo] = await Promise.all([
    loadShareCardAvatar(input.viewerAvatarUrl, input.viewerName, 0),
    loadShareCardAvatar(input.friendAvatarUrl, input.friendName, 1),
    entityImageUrl
      ? loadCanvasImage(entityImageUrl)
      : Promise.resolve(null),
    loadCanvasImage(SHARE_CARD_BRAND_LOGO_URL),
  ]);

  const canvas = createShareCardCanvas();
  canvas.width = SHARE_CARD_SIZE;
  canvas.height = SHARE_CARD_SIZE;
  const ctx = getShareCardContext(canvas);

  const layout = computeShareCardVerticalLayout(
    ctx,
    input.title,
    input.subtitle,
    Boolean(entityImage)
  );

  drawShareCardBackground(ctx, SHARE_CARD_SIZE);
  drawShareCardEyebrow(ctx, SHARE_CARD_SIZE, input.eyebrowLabel);
  if (entityImage && layout.entityImageCenterY !== null) {
    drawShareCardEntityImage(
      ctx,
      SHARE_CARD_SIZE,
      entityImage,
      layout.entityImageCenterY,
      layout.entityImageRadius
    );
  }
  drawShareCardTitleBlock(ctx, SHARE_CARD_SIZE, input.title, input.subtitle, {
    titleStartY: layout.titleStartY,
  });
  drawHeadToHeadCard(ctx, {
    size: SHARE_CARD_SIZE,
    cardY: layout.cardY,
    viewerName: input.viewerName,
    friendName: input.friendName,
    viewerAvatar,
    friendAvatar,
    selfCount: input.selfCount,
    friendCount: input.friendCount,
    selfLabel: input.selfLabel,
    friendLabel: input.friendLabel,
    winnerHeadline: input.winnerHeadline,
    winner: input.winner,
  });
  drawShareCardBrandFooter(
    ctx,
    SHARE_CARD_SIZE,
    input.brandName,
    input.brandTagline,
    brandLogo
  );

  return canvas;
}

export async function generateHeadToHeadSharePng(
  input: HeadToHeadShareCardInput
): Promise<Blob> {
  return encodeCanvasToPngBlob(await renderHeadToHeadShareCard(input));
}
