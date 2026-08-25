/** Dashboard date filters kept when opening a friend's read-only music hub. */
const FRIEND_MUSIC_PRESERVED_KEYS = ["startDate", "endDate", "preset", "period"] as const;

export const FRIEND_MUSIC_PATH = "/dashboard/duet/music";

/** Clone current compare query (dates + deep-link entity keys) and set the friend. */
export function buildCompareFriendHref(
  pathname: string,
  currentParams: URLSearchParams,
  friendId: string
): string {
  const params = new URLSearchParams(currentParams.toString());
  params.set("friendUserId", friendId);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Opens `/dashboard/duet/music` for a friend, keeping dashboard date filters
 * and dropping compare entity deep-link keys (`section`, `arenaMode`, `entityId`, …).
 */
export function buildFriendMusicHref(
  currentParams: URLSearchParams,
  friendId: string
): string {
  const params = new URLSearchParams();
  for (const key of FRIEND_MUSIC_PRESERVED_KEYS) {
    const value = currentParams.get(key);
    if (value) params.set(key, value);
  }
  params.set("friendUserId", friendId);
  return `${FRIEND_MUSIC_PATH}?${params.toString()}`;
}
