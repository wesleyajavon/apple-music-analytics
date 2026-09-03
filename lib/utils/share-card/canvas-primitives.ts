import { getUserAvatarInitials } from "@/lib/components/user-avatar";
import {
  SHARE_CARD_COLORS,
  SHARE_CARD_FONT,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_LAYOUT,
  SHARE_CARD_MONO_FONT,
} from "@/lib/utils/share-card/constants";

export function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = candidate;
    }
  }

  if (lines.length < maxLines && line) {
    lines.push(line);
  } else if (lines.length >= maxLines && line) {
    lines[maxLines - 1] = truncateText(ctx, lines[maxLines - 1] ?? line, maxWidth);
  }

  return lines.slice(0, maxLines);
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function measureSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  spacing: number
): number {
  if (text.length <= 1) return ctx.measureText(text).width;
  let width = 0;
  for (const ch of text) width += ctx.measureText(ch).width;
  return width + spacing * (text.length - 1);
}

export function fillTextSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number
) {
  const total = measureSpacedText(ctx, text, spacing);
  let cursor = x;
  if (ctx.textAlign === "center") cursor = x - total / 2;
  else if (ctx.textAlign === "right") cursor = x - total;

  const previousAlign = ctx.textAlign;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = previousAlign;
}

export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  align: "center" | "top" = "center"
) {
  if (!image.width || !image.height || width <= 0 || height <= 0) return;
  const scale = Math.max(width / image.width, height / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const drawX = x + (width - drawW) / 2;
  const drawY = align === "top" ? y : y + (height - drawH) / 2;
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
}

export function drawShareCardBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  entityImage?: HTMLImageElement | null
) {
  ctx.fillStyle = SHARE_CARD_COLORS.canvas;
  ctx.fillRect(0, 0, width, height);

  if (entityImage) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    drawCoverImage(ctx, entityImage, 0, 0, width, height * 0.62, "top");
    ctx.restore();

    const wash = ctx.createLinearGradient(0, 0, 0, height);
    wash.addColorStop(0, "rgba(8,9,19,0.5)");
    wash.addColorStop(0.38, "rgba(8,9,19,0.82)");
    wash.addColorStop(1, SHARE_CARD_COLORS.canvas);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
  }

  const glowViolet = ctx.createRadialGradient(80, 280, 20, 80, 280, 420);
  glowViolet.addColorStop(0, SHARE_CARD_COLORS.violetGlow);
  glowViolet.addColorStop(1, "rgba(139,92,246,0)");
  ctx.fillStyle = glowViolet;
  ctx.fillRect(0, 0, width, height);

  const glowCyan = ctx.createRadialGradient(1000, height - 280, 20, 1000, height - 280, 420);
  glowCyan.addColorStop(0, SHARE_CARD_COLORS.cyanGlow);
  glowCyan.addColorStop(1, "rgba(34,211,238,0)");
  ctx.fillStyle = glowCyan;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = SHARE_CARD_COLORS.vsWatermark;
  ctx.font = `900 280px ${SHARE_CARD_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VS", width / 2, height * 0.46);
  ctx.textBaseline = "alphabetic";
}

export function drawShareCardMetaRow(
  ctx: CanvasRenderingContext2D,
  width: number,
  periodLabel: string | undefined
) {
  const { padX, metaBaselineY, eyebrowTracking } = SHARE_CARD_LAYOUT;
  ctx.font = `600 24px ${SHARE_CARD_MONO_FONT}`;
  ctx.textBaseline = "alphabetic";

  if (!periodLabel) return;

  ctx.fillStyle = SHARE_CARD_COLORS.meta;
  ctx.textAlign = "center";
  fillTextSpaced(
    ctx,
    truncateText(ctx, periodLabel.toUpperCase(), width - padX * 2),
    width / 2,
    metaBaselineY,
    eyebrowTracking
  );
}

export function drawShareCardEyebrow(
  ctx: CanvasRenderingContext2D,
  size: number,
  eyebrowLabel: string,
  y: number
) {
  ctx.font = `600 ${SHARE_CARD_LAYOUT.eyebrowFontSize}px ${SHARE_CARD_MONO_FONT}`;
  ctx.fillStyle = SHARE_CARD_COLORS.eyebrow;
  ctx.textAlign = "center";
  fillTextSpaced(
    ctx,
    eyebrowLabel.toUpperCase(),
    size / 2,
    y,
    SHARE_CARD_LAYOUT.eyebrowTracking
  );
}

export function drawShareCardEntityImage(
  ctx: CanvasRenderingContext2D,
  size: number,
  image: HTMLImageElement,
  centerY: number,
  imageSize: number,
  cornerRadius: number
) {
  const x = (size - imageSize) / 2;
  const y = centerY - imageSize / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#10111c";
  drawRoundedRect(ctx, x, y, imageSize, imageSize, cornerRadius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, x, y, imageSize, imageSize, cornerRadius);
  ctx.clip();
  drawCoverImage(ctx, image, x, y, imageSize, imageSize);
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, x, y, imageSize, imageSize, cornerRadius);
  ctx.stroke();
}

export function drawShareCardTitleBlock(
  ctx: CanvasRenderingContext2D,
  size: number,
  title: string,
  options?: { titleStartY?: number }
): number {
  ctx.fillStyle = SHARE_CARD_COLORS.title;
  ctx.font = `600 ${SHARE_CARD_LAYOUT.titleFontSize}px ${SHARE_CARD_FONT}`;
  ctx.textAlign = "center";
  const titleLines = wrapLines(ctx, title, size - 200, 2);
  let titleY = options?.titleStartY ?? 250;
  for (const line of titleLines) {
    ctx.fillText(line, size / 2, titleY);
    titleY += SHARE_CARD_LAYOUT.titleLineHeight;
  }
  return titleY;
}

export function drawRoundedShareCardLogo(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  size: number,
  radius = 10
) {
  const x = centerX - size / 2;
  const y = centerY - size / 2;

  ctx.save();
  drawRoundedRect(ctx, x, y, size, size, radius);
  ctx.clip();
  ctx.drawImage(image, x, y, size, size);
  ctx.restore();
}

export function drawShareCardBrandFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  brandName: string,
  brandTagline: string,
  logo?: HTMLImageElement | null
) {
  const { brandLogoSize, brandLogoGap, brandLogoRadius, footerBottomInset } =
    SHARE_CARD_LAYOUT;
  const taglineBaselineY = SHARE_CARD_HEIGHT - footerBottomInset;
  const nameBaselineY = taglineBaselineY - 44;
  const nameFontSize = 34;

  ctx.font = `800 ${nameFontSize}px ${SHARE_CARD_FONT}`;
  ctx.fillStyle = "#ffffff";

  if (logo) {
    const textWidth = ctx.measureText(brandName).width;
    const totalWidth = brandLogoSize + brandLogoGap + textWidth;
    const startX = (width - totalWidth) / 2;
    const iconCenterX = startX + brandLogoSize / 2;
    const iconCenterY = nameBaselineY - nameFontSize * 0.35;

    drawRoundedShareCardLogo(
      ctx,
      logo,
      iconCenterX,
      iconCenterY,
      brandLogoSize,
      brandLogoRadius
    );

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(brandName, startX + brandLogoSize + brandLogoGap, nameBaselineY);
  } else {
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(brandName, width / 2, nameBaselineY);
  }

  ctx.textAlign = "center";
  ctx.font = `500 24px ${SHARE_CARD_FONT}`;
  ctx.fillStyle = "rgba(148,163,184,0.85)";
  ctx.fillText(brandTagline, width / 2, taglineBaselineY);
}

export function drawCircularAvatar(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  centerX: number,
  centerY: number,
  radius: number,
  options?: { borderColor?: string; borderWidth?: number }
) {
  const diameter = radius * 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const aspect = image.width / image.height;
  let drawW: number;
  let drawH: number;
  let drawX: number;
  let drawY: number;

  if (aspect >= 1) {
    drawH = diameter;
    drawW = diameter * aspect;
    drawX = centerX - drawW / 2;
    drawY = centerY - radius;
  } else {
    drawW = diameter;
    drawH = diameter / aspect;
    drawX = centerX - radius;
    drawY = centerY - drawH / 2;
  }

  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  ctx.restore();

  if (options?.borderColor) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = options.borderColor;
    ctx.lineWidth = options.borderWidth ?? 3;
    ctx.stroke();
  }
}

function drawCrownIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
) {
  const w = size;
  const h = size;
  const x = cx - w / 2;
  const y = cy - h / 2;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.14, y + h * 0.78);
  ctx.lineTo(x + w * 0.14, y + h * 0.4);
  ctx.lineTo(x + w * 0.34, y + h * 0.56);
  ctx.lineTo(x + w * 0.5, y + h * 0.2);
  ctx.lineTo(x + w * 0.66, y + h * 0.56);
  ctx.lineTo(x + w * 0.86, y + h * 0.4);
  ctx.lineTo(x + w * 0.86, y + h * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x + w * 0.14, y + h * 0.7, w * 0.72, h * 0.12);
}

function drawCrownBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.shadowColor = "rgba(251,191,36,0.55)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = SHARE_CARD_COLORS.crownFill;
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(253,230,138,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = SHARE_CARD_COLORS.crownInk;
  drawCrownIcon(ctx, cx, cy + 1, 22);
}

function drawDuelAvatar(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  name: string,
  tone: "self" | "friend",
  image: HTMLImageElement | null | undefined,
  winner: boolean
) {
  const fill = tone === "self" ? SHARE_CARD_COLORS.selfFill : SHARE_CARD_COLORS.friendFill;
  const border = tone === "self" ? SHARE_CARD_COLORS.selfBorder : SHARE_CARD_COLORS.friendBorder;
  const text = tone === "self" ? SHARE_CARD_COLORS.selfText : SHARE_CARD_COLORS.friendText;

  if (winner) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = SHARE_CARD_COLORS.canvas;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 12, 0, Math.PI * 2);
    ctx.strokeStyle = SHARE_CARD_COLORS.winnerRing;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  if (image) {
    drawCircularAvatar(ctx, image, centerX, centerY, radius, {
      borderColor: border,
      borderWidth: 4,
    });
  } else {
    ctx.strokeStyle = border;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = text;
    ctx.font = `700 ${Math.round(radius * 0.62)}px ${SHARE_CARD_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(getUserAvatarInitials(name), centerX, centerY + radius * 0.04);
    ctx.textBaseline = "alphabetic";
  }

  if (winner) {
    drawCrownBadge(ctx, centerX + radius * 0.78, centerY - radius * 0.78);
  }
}

function drawSplitShareBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  selfPct: number
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, height / 2);
  ctx.clip();
  ctx.fillStyle = SHARE_CARD_COLORS.barTrack;
  ctx.fillRect(x, y, width, height);

  const selfW = width * selfPct;
  const violet = ctx.createLinearGradient(x, y, x + Math.max(selfW, 1), y);
  violet.addColorStop(0, "#8b5cf6");
  violet.addColorStop(1, "#a78bfa");
  ctx.fillStyle = violet;
  ctx.fillRect(x, y, selfW, height);

  const cyan = ctx.createLinearGradient(x + selfW, y, x + width, y);
  cyan.addColorStop(0, "#22d3ee");
  cyan.addColorStop(1, "#67e8f9");
  ctx.fillStyle = cyan;
  ctx.fillRect(x + selfW, y, width - selfW, height);
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, x, y, width, height, height / 2);
  ctx.stroke();
}

export type HeadToHeadCardInput = {
  size: number;
  cardY?: number;
  viewerName: string;
  friendName: string;
  viewerAvatar?: HTMLImageElement | null;
  friendAvatar?: HTMLImageElement | null;
  selfCount: number;
  friendCount: number;
  selfLabel: string;
  friendLabel: string;
  winnerHeadline: string;
  winner: "self" | "friend" | "tie";
  vsLabel?: string;
  leadLabel?: string;
  marginCaption?: string;
};

export function drawHeadToHeadCard(
  ctx: CanvasRenderingContext2D,
  input: HeadToHeadCardInput
) {
  const { size } = input;
  const cardY = input.cardY ?? 430;
  const { padX, duelAvatarRadius, barHeight } = SHARE_CARD_LAYOUT;
  const colWidth = (size - padX * 2) / 2;
  const selfCenterX = padX + colWidth / 2;
  const friendCenterX = padX + colWidth + colWidth / 2;
  const avatarCenterY = cardY + duelAvatarRadius;
  const vsLabel = (input.vsLabel ?? "VS").toUpperCase();

  drawDuelAvatar(
    ctx,
    selfCenterX,
    avatarCenterY,
    duelAvatarRadius,
    input.viewerName,
    "self",
    input.viewerAvatar,
    input.winner === "self"
  );
  drawDuelAvatar(
    ctx,
    friendCenterX,
    avatarCenterY,
    duelAvatarRadius,
    input.friendName,
    "friend",
    input.friendAvatar,
    input.winner === "friend"
  );

  ctx.font = `800 22px ${SHARE_CARD_FONT}`;
  const vsTextWidth = measureSpacedText(ctx, vsLabel, 4.4);
  const vsW = Math.max(vsTextWidth + 40, 88);
  const vsH = 44;
  const vsX = size / 2 - vsW / 2;
  const vsY = avatarCenterY - vsH / 2 - 10;
  ctx.fillStyle = SHARE_CARD_COLORS.vsFill;
  drawRoundedRect(ctx, vsX, vsY, vsW, vsH, vsH / 2);
  ctx.fill();
  ctx.strokeStyle = SHARE_CARD_COLORS.vsBorder;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = SHARE_CARD_COLORS.vsText;
  ctx.textAlign = "center";
  fillTextSpaced(ctx, vsLabel, size / 2, vsY + 30, 4.4);

  if (input.leadLabel) {
    ctx.font = `700 18px ${SHARE_CARD_FONT}`;
    ctx.fillStyle =
      input.winner === "tie" ? SHARE_CARD_COLORS.leadTie : SHARE_CARD_COLORS.lead;
    ctx.textAlign = "center";
    const lead = wrapLines(ctx, input.leadLabel.toUpperCase(), 200, 2);
    let leadY = vsY + vsH + 28;
    for (const line of lead) {
      fillTextSpaced(ctx, line, size / 2, leadY, 2.6);
      leadY += 22;
    }
  }

  const nameY = avatarCenterY + duelAvatarRadius + 48;
  ctx.font = `600 28px ${SHARE_CARD_FONT}`;
  ctx.textAlign = "center";
  ctx.fillStyle = SHARE_CARD_COLORS.selfName;
  ctx.fillText(truncateText(ctx, input.viewerName, colWidth - 36), selfCenterX, nameY);
  ctx.fillStyle = SHARE_CARD_COLORS.friendName;
  ctx.fillText(truncateText(ctx, input.friendName, colWidth - 36), friendCenterX, nameY);

  ctx.fillStyle = "#ffffff";
  ctx.font = `600 80px ${SHARE_CARD_FONT}`;
  ctx.fillText(input.selfCount.toLocaleString(), selfCenterX, nameY + 80);
  ctx.fillText(input.friendCount.toLocaleString(), friendCenterX, nameY + 80);

  ctx.font = `600 20px ${SHARE_CARD_FONT}`;
  ctx.fillStyle = SHARE_CARD_COLORS.playsLabel;
  fillTextSpaced(ctx, input.selfLabel.toUpperCase(), selfCenterX, nameY + 112, 3.2);
  fillTextSpaced(ctx, input.friendLabel.toUpperCase(), friendCenterX, nameY + 112, 3.2);

  const total = input.selfCount + input.friendCount;
  const selfPct = total > 0 ? input.selfCount / total : 0.5;
  const barX = padX;
  const barY = nameY + 152;
  const barW = size - padX * 2;
  drawSplitShareBar(ctx, barX, barY, barW, barHeight, selfPct);

  ctx.font = `600 36px ${SHARE_CARD_FONT}`;
  ctx.fillStyle = SHARE_CARD_COLORS.headline;
  ctx.textAlign = "center";
  const headlineLines = wrapLines(ctx, input.winnerHeadline, size - 160, 2);
  const headlineStartY = barY + barHeight + 48;
  for (let i = 0; i < headlineLines.length; i++) {
    ctx.fillText(headlineLines[i] ?? "", size / 2, headlineStartY + i * 42);
  }

  if (input.marginCaption) {
    ctx.font = `500 24px ${SHARE_CARD_FONT}`;
    ctx.fillStyle = SHARE_CARD_COLORS.caption;
    ctx.fillText(
      truncateText(ctx, input.marginCaption, size - 180),
      size / 2,
      headlineStartY + headlineLines.length * 42 + 10
    );
  }
}
