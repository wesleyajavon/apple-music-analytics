"use client";

import { memo } from "react";
import type { ImgHTMLAttributes } from "react";
import { useArtistSpotifyImageResolution } from "@/lib/hooks/use-artist-spotify-image-resolution";
import { getAvatarUrl } from "@/lib/components/artist-avatar-utils";

export type ArtistAvatarHydratedProps = {
  artistId: string;
  artistName: string;
  imageUrl: string | null | undefined;
  /** Taille passée à `getAvatarUrl` (souvent 2× la taille CSS pour le retina). */
  avatarApiSize: number;
  colorIndex?: number;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  decoding?: ImgHTMLAttributes<HTMLImageElement>["decoding"];
  referrerPolicy?: ImgHTMLAttributes<HTMLImageElement>["referrerPolicy"];
};

/**
 * Portrait artiste : `imageUrl` serveur puis, si vide, hydrate via `POST /api/artists/[id]/image`
 * (dédoublonnage par hook / onglet). Fallback initiales ui-avatars.
 */
export const ArtistAvatarHydrated = memo(function ArtistAvatarHydrated({
  artistId,
  artistName,
  imageUrl,
  avatarApiSize,
  colorIndex = 0,
  alt = "",
  className = "",
  width,
  height,
  loading = "lazy",
  decoding = "async",
  referrerPolicy = "no-referrer",
}: ArtistAvatarHydratedProps) {
  const hydrated = useArtistSpotifyImageResolution(artistId, imageUrl);
  const fallbackAvatar = getAvatarUrl(artistName, avatarApiSize, colorIndex);
  const src = hydrated?.trim() || fallbackAvatar;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      referrerPolicy={referrerPolicy}
      onError={(e) => {
        e.currentTarget.src = fallbackAvatar;
      }}
    />
  );
});
ArtistAvatarHydrated.displayName = "ArtistAvatarHydrated";
