export type TopArtistListenRow = {
  artistId: string;
  artistName: string;
  listenCount: number;
  rank: number;
};

export type SharedArtistRow = {
  artistId: string;
  artistName: string;
  selfCount: number;
  friendCount: number;
  selfRank: number;
  friendRank: number;
  combinedCount: number;
  winner: "self" | "friend" | "tie";
};

/**
 * Intersection of two users' top-N artist lists (by artistId).
 * Sorted by combined listens descending.
 */
export function intersectTopArtists(
  selfTop: TopArtistListenRow[],
  friendTop: TopArtistListenRow[],
  limit: number
): SharedArtistRow[] {
  const friendById = new Map(friendTop.map((row) => [row.artistId, row]));

  const shared: SharedArtistRow[] = [];
  for (const selfRow of selfTop) {
    const friendRow = friendById.get(selfRow.artistId);
    if (!friendRow) continue;

    const selfCount = selfRow.listenCount;
    const friendCount = friendRow.listenCount;
    let winner: SharedArtistRow["winner"] = "tie";
    if (selfCount > friendCount) winner = "self";
    else if (friendCount > selfCount) winner = "friend";

    shared.push({
      artistId: selfRow.artistId,
      artistName: selfRow.artistName,
      selfCount,
      friendCount,
      selfRank: selfRow.rank,
      friendRank: friendRow.rank,
      combinedCount: selfCount + friendCount,
      winner,
    });
  }

  return shared
    .sort((a, b) => b.combinedCount - a.combinedCount || a.artistName.localeCompare(b.artistName))
    .slice(0, limit);
}
