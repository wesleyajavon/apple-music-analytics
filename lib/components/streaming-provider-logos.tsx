import Image from "next/image";

const SPOTIFY_LOGO_SRC = "/brand/providers/spotify-icon.svg";
const APPLE_MUSIC_LOGO_SRC = "/brand/providers/apple-music-icon.svg";

export type StreamingProviderLogosProps = {
  caption: string;
  spotifyLogoAlt: string;
  appleMusicLogoAlt: string;
  className?: string;
};

/**
 * Static brand marks for supported listening sources (export / history).
 * Keep sizes modest; pairing copy should name the services for a11y.
 */
export function StreamingProviderLogos({
  caption,
  spotifyLogoAlt,
  appleMusicLogoAlt,
  className,
}: StreamingProviderLogosProps) {
  return (
    <div
      className={[
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted">
        {caption}
      </p>
      <div className="flex items-center gap-5">
        <Image
          src={SPOTIFY_LOGO_SRC}
          alt={spotifyLogoAlt}
          width={36}
          height={36}
          className="h-9 w-9 object-contain"
          unoptimized
        />
        <Image
          src={APPLE_MUSIC_LOGO_SRC}
          alt={appleMusicLogoAlt}
          width={36}
          height={36}
          className="h-9 w-9 object-contain"
          unoptimized
        />
      </div>
    </div>
  );
}
