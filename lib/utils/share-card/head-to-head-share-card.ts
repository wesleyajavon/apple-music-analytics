import { SHARE_CARD_SIZE } from "@/lib/utils/share-card/constants";
import {
  drawHeadToHeadCard,
  drawShareCardBackground,
  drawShareCardBrandFooter,
  drawShareCardEyebrow,
  drawShareCardTitleBlock,
} from "@/lib/utils/share-card/canvas-primitives";
import {
  createShareCardCanvas,
  encodeCanvasToPngBlob,
  getShareCardContext,
} from "@/lib/utils/share-card/encode";
import { loadShareCardAvatar } from "@/lib/utils/share-card/load-image";

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
};

export async function renderHeadToHeadShareCard(
  input: HeadToHeadShareCardInput
): Promise<HTMLCanvasElement> {
  const [viewerAvatar, friendAvatar] = await Promise.all([
    loadShareCardAvatar(input.viewerAvatarUrl, input.viewerName, 0),
    loadShareCardAvatar(input.friendAvatarUrl, input.friendName, 1),
  ]);

  const canvas = createShareCardCanvas();
  canvas.width = SHARE_CARD_SIZE;
  canvas.height = SHARE_CARD_SIZE;
  const ctx = getShareCardContext(canvas);

  drawShareCardBackground(ctx, SHARE_CARD_SIZE);
  drawShareCardEyebrow(ctx, SHARE_CARD_SIZE, input.eyebrowLabel);
  drawShareCardTitleBlock(ctx, SHARE_CARD_SIZE, input.title, input.subtitle);
  drawHeadToHeadCard(ctx, {
    size: SHARE_CARD_SIZE,
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
    input.brandTagline
  );

  return canvas;
}

export async function generateHeadToHeadSharePng(
  input: HeadToHeadShareCardInput
): Promise<Blob> {
  return encodeCanvasToPngBlob(await renderHeadToHeadShareCard(input));
}
