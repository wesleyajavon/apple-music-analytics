"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { HOME_PREVIEW_ALBUMS } from "@/lib/constants/home-album-preview";

type HomeAlbum = (typeof HOME_PREVIEW_ALBUMS)[number];

type HomeHeroAlbumFieldProps = {
  className?: string;
  variant: "stage" | "backdrop";
  overlayClassName?: string;
};

const STAGE_SLOTS: Array<{
  top: number;
  left: number;
  size: number;
  rotate: string;
  delay: string;
  z: number;
}> = [
  { top: 10, left: 16, size: 40, rotate: "-8deg", delay: "0s", z: 6 },
  { top: 5, left: 52, size: 30, rotate: "12deg", delay: "0.45s", z: 4 },
  { top: 26, left: 4, size: 28, rotate: "-14deg", delay: "1.1s", z: 5 },
  { top: 27, left: 48, size: 36, rotate: "7deg", delay: "0.8s", z: 7 },
  { top: 38, left: 22, size: 34, rotate: "4deg", delay: "1.7s", z: 8 },
  { top: 50, left: 60, size: 28, rotate: "-10deg", delay: "1.3s", z: 4 },
  { top: 54, left: 6, size: 30, rotate: "9deg", delay: "0.25s", z: 5 },
  { top: 56, left: 36, size: 32, rotate: "-6deg", delay: "1.95s", z: 6 },
  { top: 5, left: 6, size: 20, rotate: "8deg", delay: "2.15s", z: 2 },
  { top: 68, left: 22, size: 22, rotate: "-8deg", delay: "0.95s", z: 3 },
  { top: 66, left: 64, size: 22, rotate: "13deg", delay: "1.4s", z: 3 },
];

/** Mobile backdrop only needs a short strip — fewer requests on LCP path. */
const BACKDROP_ALBUMS = HOME_PREVIEW_ALBUMS.slice(0, 6);

/**
 * Covers that sit in the first viewport of the mobile marquee.
 * Midnights is the measured LCP element on PageSpeed mobile.
 */
const BACKDROP_LCP_PRIORITY_SRCS = new Set<string>([
  HOME_PREVIEW_ALBUMS[0]!.imageSrc,
  HOME_PREVIEW_ALBUMS[2]!.imageSrc, // midnights.webp
]);

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function AlbumCover({
  album,
  sizes,
  className = "",
  priority = false,
  quality = 70,
}: {
  album: HomeAlbum;
  sizes: string;
  className?: string;
  priority?: boolean;
  quality?: number;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={[
        "relative overflow-hidden rounded-[12px] bg-[#10111c] shadow-[0_22px_50px_-18px_rgba(0,0,0,0.85)] ring-1 ring-white/10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {failed ? (
        <div className="absolute inset-0 bg-brand-gradient" aria-hidden />
      ) : (
        <Image
          src={album.imageSrc}
          alt=""
          fill
          sizes={sizes}
          quality={quality}
          priority={priority}
          // Next sets fetchPriority=high when priority is true; keep lazy off the LCP path.
          loading={priority ? undefined : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function MarqueeColumn({
  albums,
  direction,
  reducedMotion,
  prioritySrcs,
}: {
  albums: readonly HomeAlbum[];
  direction: "up" | "down";
  reducedMotion: boolean;
  /** First-copy covers that may be LCP on mobile — eager + high fetch priority. */
  prioritySrcs?: ReadonlySet<string>;
}) {
  const loop = [...albums, ...albums];
  const animationClass = reducedMotion
    ? ""
    : direction === "up"
      ? "animate-home-hero-marquee-up"
      : "animate-home-hero-marquee-down";

  return (
    <div className="relative h-full overflow-hidden">
      <div className={["flex flex-col gap-3 py-1", animationClass].filter(Boolean).join(" ")}>
        {loop.map((album, index) => {
          const isFirstCopy = index < albums.length;
          const priority =
            isFirstCopy && Boolean(prioritySrcs?.has(album.imageSrc));

          return (
            <AlbumCover
              key={`${album.imageSrc}-${index}`}
              album={album}
              sizes="(max-width: 640px) 42vw, 28vw"
              quality={60}
              priority={priority}
              className="aspect-square w-full"
            />
          );
        })}
      </div>
    </div>
  );
}

export function HomeHeroAlbumField({
  className = "",
  variant,
  overlayClassName,
}: HomeHeroAlbumFieldProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (variant === "backdrop") {
    const leftColumn = BACKDROP_ALBUMS.filter((_, i) => i % 2 === 0);
    const rightColumn = BACKDROP_ALBUMS.filter((_, i) => i % 2 === 1);

    return (
      <div
        className={["pointer-events-none absolute inset-0 overflow-hidden", className]
          .filter(Boolean)
          .join(" ")}
        aria-hidden
      >
        <div className="absolute inset-0 grid grid-cols-2 gap-3 px-4 opacity-[0.38] sm:gap-4 sm:px-8">
          <MarqueeColumn
            albums={leftColumn}
            direction="up"
            reducedMotion={reducedMotion}
            prioritySrcs={BACKDROP_LCP_PRIORITY_SRCS}
          />
          <MarqueeColumn
            albums={rightColumn}
            direction="down"
            reducedMotion={reducedMotion}
            prioritySrcs={BACKDROP_LCP_PRIORITY_SRCS}
          />
        </div>
        <div
          className={[
            "absolute inset-0",
            overlayClassName ?? "bg-gradient-to-b from-[#050508]/80 via-[#050508]/55 to-[#050508]",
          ].join(" ")}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div
      className={[
        "relative mx-auto aspect-square w-full max-w-[38rem] overflow-visible",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-[12%] rounded-full bg-[radial-gradient(ellipse_at_center,rgb(152_80_208_/_0.22),transparent_68%)] blur-3xl"
        aria-hidden
      />
      <div className="absolute inset-0" aria-hidden>
        {HOME_PREVIEW_ALBUMS.map((album, index) => {
          const slot = STAGE_SLOTS[index];
          if (!slot) return null;

          return (
            <div
              key={album.imageSrc}
              className="absolute"
              style={{
                top: `${slot.top}%`,
                left: `${slot.left}%`,
                width: `${slot.size}%`,
                height: `${slot.size}%`,
                zIndex: slot.z,
                transform: `rotate(${slot.rotate})`,
              }}
            >
              <div
                className={reducedMotion ? "h-full w-full" : "animate-home-hero-album-float h-full w-full"}
                style={{ animationDelay: slot.delay, animationDuration: `${7 + (index % 4)}s` }}
              >
                <AlbumCover
                  album={album}
                  sizes="(min-width: 1024px) 16vw, 220px"
                  quality={70}
                  // Never priority here: this tree is CSS-hidden on mobile but still
                  // mounts, and priority would steal bandwidth from the mobile LCP.
                  className="h-full w-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
