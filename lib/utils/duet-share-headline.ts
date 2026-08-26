export type DuetShareHeadlineKind = "timeline" | "artist" | "track" | "genre";

const HEADLINE_KEYS = {
  timeline: {
    self: "shareHeadlineTimelineSelf",
    friend: "shareHeadlineTimelineFriend",
    tie: "shareHeadlineTimelineTie",
  },
  artist: {
    self: "shareHeadlineArtistSelf",
    friend: "shareHeadlineArtistFriend",
    tie: "shareHeadlineArtistTie",
  },
  track: {
    self: "shareHeadlineTrackSelf",
    friend: "shareHeadlineTrackFriend",
    tie: "shareHeadlineTrackTie",
  },
  genre: {
    self: "shareHeadlineGenreSelf",
    friend: "shareHeadlineGenreFriend",
    tie: "shareHeadlineGenreTie",
  },
} as const;

export function duetShareHeadlineKey(
  kind: DuetShareHeadlineKind,
  winner: "self" | "friend" | "tie"
): (typeof HEADLINE_KEYS)[DuetShareHeadlineKind]["self" | "friend" | "tie"] {
  return HEADLINE_KEYS[kind][winner];
}
