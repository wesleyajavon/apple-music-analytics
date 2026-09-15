export const GUIDE_SLUGS = [
  "apple-music-streaming-stats",
  "spotify-listening-history",
  "soundprint-vs-replay",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

/** Maps URL slug → messages.guides.pages.* key */
export const GUIDE_MESSAGE_KEYS = {
  "apple-music-streaming-stats": "appleMusic",
  "spotify-listening-history": "spotify",
  "soundprint-vs-replay": "vsReplay",
} as const satisfies Record<GuideSlug, string>;

export function isGuideSlug(value: string): value is GuideSlug {
  return (GUIDE_SLUGS as readonly string[]).includes(value);
}

export function guidePath(slug: GuideSlug): `/guides/${GuideSlug}` {
  return `/guides/${slug}`;
}

export const GUIDE_INDEXABLE_PATHS = GUIDE_SLUGS.map(guidePath);
