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

    let retryTimer: ReturnType<typeof setInterval> | null = null;

    const stopRetry = () => {
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
    };

    const startRetryWhileVisible = () => {
      stopRetry();
      retryTimer = setInterval(() => {
        const currentVideo = videoRef.current;
        if (!currentVideo) return;
        if (!currentVideo.paused) {
          stopRetry();
          return;
        }
        attemptPlay();
      }, 400);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          attemptPlay();
          startRetryWhileVisible();
        } else {
          stopRetry();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px 120px 0px" },
    );
    observer.observe(container);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") attemptPlay();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const mediaEvents = ["loadedmetadata", "loadeddata", "canplay"] as const;
    for (const event of mediaEvents) {
      video.addEventListener(event, attemptPlay);
    }

    return () => {
      observer.disconnect();
      stopRetry();
      document.removeEventListener("visibilitychange", onVisibilityChange);
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
