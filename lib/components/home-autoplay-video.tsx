"use client";

import { useCallback, useEffect, useRef } from "react";

type HomeAutoplayVideoProps = {
  src: string;
  poster?: string;
  label: string;
  className?: string;
};

/**
 * Vidéo autoplay fiable : hors arbre Motion, muted forcé en JS,
 * retry sur intersection + événements média.
 */
export function HomeAutoplayVideo({
  src,
  poster,
  label,
  className = "",
}: HomeAutoplayVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

    void video.play().catch(() => {
      // Safari/iOS peut bloquer jusqu'à ce que l'élément soit visible.
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    video.load();
    attemptPlay();

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) attemptPlay();
      },
      { threshold: 0.1, rootMargin: "0px 0px 120px 0px" },
    );
    observer.observe(container);

    const mediaEvents = ["loadedmetadata", "loadeddata", "canplay"] as const;
    for (const event of mediaEvents) {
      video.addEventListener(event, attemptPlay);
    }

    return () => {
      observer.disconnect();
      for (const event of mediaEvents) {
        video.removeEventListener(event, attemptPlay);
      }
    };
  }, [attemptPlay, src]);

  return (
    <div ref={containerRef} className={className}>
      <video
        ref={videoRef}
        src={src}
        aria-label={label}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={poster}
        onLoadedData={attemptPlay}
        onCanPlay={attemptPlay}
        className="aspect-video w-full rounded-2xl object-cover ring-1 ring-white/10"
      />
    </div>
  );
}
