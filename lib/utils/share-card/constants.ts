/** Square PNG size for social share cards (Duet, future Encore). */
export const SHARE_CARD_SIZE = 1080;

export const SHARE_CARD_FONT =
  "system-ui, -apple-system, Segoe UI, sans-serif";

export const SHARE_CARD_MONO_FONT =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

/** Same-origin favicon used in share card footers. */
export const SHARE_CARD_BRAND_LOGO_URL = "/brand/favicon.png";

/** Landing-duet-preview palette, scaled to the 1080 share canvas. */
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
  badgeBorder: "rgba(249,168,212,0.28)",
  badgeFill: "rgba(244,114,182,0.12)",
  badgeText: "#fce7f3",
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

/** Vertical layout tokens for share card composition. */
export const SHARE_CARD_LAYOUT = {
  padX: 72,
  metaBaselineY: 108,
  badgeHeight: 44,
  entityImageSize: 160,
  entityImageCornerRadius: 36,
  entityImageGapBelow: 24,
  eyebrowFontSize: 22,
  eyebrowTracking: 4.4,
  titleFontSize: 54,
  titleLineHeight: 60,
  titleAscent: 44,
  sectionGap: 36,
  duelAvatarRadius: 72,
  duelCardHeight: 440,
  barHeight: 20,
  footerTop: 1008,
  brandLogoSize: 44,
  brandLogoGap: 12,
  brandLogoRadius: 12,
} as const;
