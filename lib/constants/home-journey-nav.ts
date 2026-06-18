/** Sticky header offset for in-page anchors on the marketing home. */
export const HOME_JOURNEY_SECTION_SCROLL_MT = "scroll-mt-28";

export const HOME_JOURNEY_NAV_ITEMS = [
  { href: "#import", labelKey: "import" },
  { href: "#explore", labelKey: "explore" },
  { href: "#interact", labelKey: "interact" },
] as const;

export type HomeJourneyNavLabelKey = (typeof HOME_JOURNEY_NAV_ITEMS)[number]["labelKey"];
