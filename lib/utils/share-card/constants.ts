/** Square PNG size for social share cards (Duet, future Encore). */
export const SHARE_CARD_SIZE = 1080;

export const SHARE_CARD_FONT =
  "system-ui, -apple-system, Segoe UI, sans-serif";

/** Same-origin favicon used in share card footers. */
export const SHARE_CARD_BRAND_LOGO_URL = "/brand/favicon.png";

/** Vertical layout tokens for share card composition. */
export const SHARE_CARD_LAYOUT = {
  eyebrowBottom: 170,
  entityImageRadius: 48,
  entityImageGapBelow: 32,
  titleFontSize: 64,
  titleLineHeight: 72,
  titleAscent: 52,
  subtitleBlockHeight: 48,
  sectionGap: 44,
  duelCardHeight: 380,
  footerTop: 872,
  brandLogoSize: 76,
  brandLogoGap: 18,
  brandLogoRadius: 16,
} as const;
