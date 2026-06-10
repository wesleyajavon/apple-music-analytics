export type DuetBattleShareImageInput = {
  arenaLabel: string;
  entityName: string;
  entitySubtitle?: string;
  viewerName: string;
  friendName: string;
  selfCount: number;
  friendCount: number;
  winner: "self" | "friend" | "tie";
  winnerHeadline: string;
  selfLabel: string;
  friendLabel: string;
  brandName: string;
  brandTagline: string;
};

const SIZE = 1080;

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
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

function drawRoundedRect(
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

export function renderDuetBattleShareImage(input: DuetBattleShareImageInput): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bg.addColorStop(0, "#0b0618");
  bg.addColorStop(0.45, "#1e1140");
  bg.addColorStop(1, "#0a1628");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const glowViolet = ctx.createRadialGradient(180, 140, 20, 180, 140, 320);
  glowViolet.addColorStop(0, "rgba(139,92,246,0.35)");
  glowViolet.addColorStop(1, "rgba(139,92,246,0)");
  ctx.fillStyle = glowViolet;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const glowCyan = ctx.createRadialGradient(900, 860, 20, 900, 860, 300);
  glowCyan.addColorStop(0, "rgba(34,211,238,0.22)");
  glowCyan.addColorStop(1, "rgba(34,211,238,0)");
  ctx.fillStyle = glowCyan;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  drawRoundedRect(ctx, 72, 72, SIZE - 144, SIZE - 144, 48);
  ctx.fill();

  ctx.font = "700 28px system-ui, -apple-system, Segoe UI, sans-serif";
  const arenaWidth = ctx.measureText(input.arenaLabel).width + 64;
  ctx.fillStyle = "rgba(244,114,182,0.18)";
  drawRoundedRect(ctx, (SIZE - arenaWidth) / 2, 118, arenaWidth, 52, 26);
  ctx.fill();
  ctx.fillStyle = "#fbcfe8";
  ctx.textAlign = "center";
  ctx.fillText(input.arenaLabel.toUpperCase(), SIZE / 2, 152);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 64px system-ui, -apple-system, Segoe UI, sans-serif";
  const titleLines = wrapLines(ctx, input.entityName, SIZE - 200, 2);
  let titleY = 250;
  for (const line of titleLines) {
    ctx.fillText(line, SIZE / 2, titleY);
    titleY += 72;
  }

  if (input.entitySubtitle) {
    ctx.font = "500 32px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillStyle = "rgba(226,232,240,0.85)";
    ctx.fillText(truncateText(ctx, input.entitySubtitle, SIZE - 220), SIZE / 2, titleY + 8);
  }

  const cardY = 430;
  ctx.fillStyle = "rgba(15,23,42,0.72)";
  drawRoundedRect(ctx, 96, cardY, SIZE - 192, 360, 36);
  ctx.fill();

  const colWidth = (SIZE - 192) / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(167,139,250,0.95)";
  ctx.font = "700 24px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(truncateText(ctx, input.viewerName, colWidth - 40), 96 + colWidth / 2, cardY + 58);
  ctx.fillStyle = "rgba(34,211,238,0.95)";
  ctx.fillText(truncateText(ctx, input.friendName, colWidth - 40), 96 + colWidth + colWidth / 2, cardY + 58);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 88px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(input.selfCount.toLocaleString(), 96 + colWidth / 2, cardY + 170);
  ctx.fillText(input.friendCount.toLocaleString(), 96 + colWidth + colWidth / 2, cardY + 170);

  ctx.font = "600 22px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(148,163,184,0.95)";
  ctx.fillText(input.selfLabel, 96 + colWidth / 2, cardY + 210);
  ctx.fillText(input.friendLabel, 96 + colWidth + colWidth / 2, cardY + 210);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(96 + colWidth - 1, cardY + 36, 2, 288);

  ctx.font = "900 34px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "#f9a8d4";
  ctx.fillText("VS", SIZE / 2, cardY + 165);

  const total = input.selfCount + input.friendCount;
  const selfPct = total > 0 ? input.selfCount / total : 0.5;
  const barX = 132;
  const barY = cardY + 250;
  const barW = SIZE - 264;
  const barH = 28;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  drawRoundedRect(ctx, barX, barY, barW, barH, 14);
  ctx.fill();
  if (selfPct > 0) {
    const selfGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    selfGrad.addColorStop(0, "#8b5cf6");
    selfGrad.addColorStop(Math.min(selfPct, 0.98), "#a78bfa");
    ctx.fillStyle = selfGrad;
    drawRoundedRect(ctx, barX, barY, Math.max(barW * selfPct, 14), barH, 14);
    ctx.fill();
  }
  if (selfPct < 1) {
    const friendGrad = ctx.createLinearGradient(barX + barW * selfPct, barY, barX + barW, barY);
    friendGrad.addColorStop(0, "#22d3ee");
    friendGrad.addColorStop(1, "#67e8f9");
    ctx.fillStyle = friendGrad;
    drawRoundedRect(ctx, barX + barW * selfPct, barY, barW * (1 - selfPct), barH, 14);
    ctx.fill();
  }

  ctx.font = "700 36px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = input.winner === "tie" ? "#e2e8f0" : "#fde68a";
  ctx.fillText(truncateText(ctx, input.winnerHeadline, SIZE - 180), SIZE / 2, cardY + 330);

  ctx.font = "800 42px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(input.brandName, SIZE / 2, 920);
  ctx.font = "500 26px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(148,163,184,0.9)";
  ctx.fillText(input.brandTagline, SIZE / 2, 968);

  return canvas;
}

export async function generateDuetBattleSharePng(input: DuetBattleShareImageInput): Promise<Blob> {
  const canvas = renderDuetBattleShareImage(input);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode share image"));
          return;
        }
        resolve(blob);
      },
      "image/png",
      1
    );
  });
}
