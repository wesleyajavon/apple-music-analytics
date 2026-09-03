/** Instagram story / phone portrait share card (9:16). */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;
/** Horizontal size used by wrap and centering math. */
export const SHARE_CARD_SIZE = SHARE_CARD_WIDTH;

export const SHARE_CARD_FONT =
  "system-ui, -apple-system, Segoe UI, sans-serif";

export const SHARE_CARD_MONO_FONT =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

/** Same-origin favicon used in share card footers. */
export const SHARE_CARD_BRAND_LOGO_URL = "/brand/favicon.png";

/** Landing-duet-preview palette, scaled to the portrait share canvas. */
export const SHARE_CARD_COLORS = {
  canvas: "#080913",
  violetGlow: "rgba(139,92,246,0.28)",
  cyanGlow: "rgba(34,211,238,0.2)",
  vsWatermark: "rgba(255,255,255,0.045)",
  meta: "rgba(255,255,255,0.55)",
  eyebrow: "rgba(255,255,255,0.7)",
  title: "#ffffff",
  playsLabel: "rgba(255,255,255,0.45)",
  headline: "#ffffff",
  caption: "rgba(255,255,255,0.55)",
  lead: "#6ee7b7",
  leadTie: "rgba(226,232,240,0.85)",
  vsBorder: "rgba(249,168,212,0.4)",
  vsFill: "rgba(244,114,182,0.16)",
  vsText: "#fce7f3",
  selfFill: "rgba(139,92,246,0.28)",
  selfBorder: "rgba(196,181,253,0.4)",
  selfText: "#ede9fe",
  selfName: "#ede9fe",
  friendFill: "rgba(34,211,238,0.22)",
  friendBorder: "rgba(103,232,249,0.4)",
  friendText: "#cffafe",
  friendName: "#cffafe",
  winnerRing: "rgba(252,211,77,0.72)",
  crownFill: "#fbbf24",
  crownInk: "#3b2a08",
  barTrack: "rgba(255,255,255,0.1)",
} as const;

/**
 * Vertical layout tokens for a 1080×1920 story card.
 * Top/bottom insets keep type out of Instagram story chrome.
 */
export const SHARE_CARD_LAYOUT = {
  padX: 72,
  metaBaselineY: 300,
  entityImageSize: 220,
  entityImageCornerRadius: 48,
  entityImageGapBelow: 32,
  eyebrowFontSize: 24,
  eyebrowTracking: 4.8,
  titleFontSize: 62,
  titleLineHeight: 70,
  titleAscent: 50,
  sectionGap: 56,
  duelAvatarRadius: 92,
  duelCardHeight: 640,
  barHeight: 24,
  /** Space below the tagline so IG story UI does not cover the brand. */
  footerBottomInset: 400,
  brandBlockHeight: 96,
  footerTop: 1920 - 400 - 96,
  brandLogoSize: 48,
  brandLogoGap: 14,
  brandLogoRadius: 12,
} as const;
