import type { ArtistStatsDto } from "@/lib/dto/artist";

const AVATAR_BG_COLORS = [
  "6d28d9", "059669", "d97706", "be123c", "7c2d12", "4d7c0f", "9333ea", "64748b",
];

/** URL avatar initiales (ui-avatars) — `size` sert aussi pour la définition retina (ex. 72 → passer 144). */
export function getAvatarUrl(
  artistName: string,
  size: number,
  colorIndex: number = 0
): string {
  const bg = AVATAR_BG_COLORS[colorIndex % AVATAR_BG_COLORS.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(artistName)}&size=${size}&background=${bg}&color=fff&bold=true`;
}

/** URL d’affichage sans appel Spotify : image en base si présente, sinon avatar initiales. */
export function getArtistImageUrl(
  artist: Pick<ArtistStatsDto, "artistName" | "imageUrl">,
  avatarApiSize: number,
  colorIndex: number = 0
): string {
  if (artist.imageUrl?.trim()) return artist.imageUrl;
  return getAvatarUrl(artist.artistName, avatarApiSize, colorIndex);
}
