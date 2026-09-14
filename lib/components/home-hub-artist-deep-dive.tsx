"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { HomeHubArtistDeepDive } from "@/lib/utils/home-music-hub";

type HomeHubArtistDeepDiveOverlayProps = {
  deepDive: HomeHubArtistDeepDive;
  locale: string;
  onClose: () => void;
};

function formatStreamDate(isoDate: string, locale: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function weekdayShortMonFirst(index: number, locale: string): string {
  const base = Date.UTC(2024, 0, 8 + index);
  return new Date(base).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" });
}

function trackSharePercent(trackStreams: number, artistStreams: number): number | null {
  if (artistStreams <= 0 || trackStreams <= 0) return null;
  const raw = (trackStreams / artistStreams) * 100;
  if (raw < 1) return 1;
  return Math.min(100, Math.round(raw));
}

/**
 * Fake in-hub artist insights drawer — mirrors the real dashboard overlay UX.
 */
export function HomeHubArtistDeepDiveOverlay({
  deepDive,
  locale,
  onClose,
}: HomeHubArtistDeepDiveOverlayProps) {
  const t = useTranslations("home.musicHub.deepDive");
  const tArtists = useTranslations("artists");
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const featuredTrack = deepDive.topTracks[0] ?? null;
  const restTracks = deepDive.topTracks.slice(1);
  const featuredShare = featuredTrack
    ? trackSharePercent(featuredTrack.streamCount, deepDive.streams)
    : null;

  const peakHourLabel = `${String(deepDive.peakHour).padStart(2, "0")}:00`;
  const peakWeekdayLabel = weekdayShortMonFirst(deepDive.peakWeekdayIndex, locale);
  const busiestDayLabel = formatStreamDate(deepDive.busiestDay, locale);

  const hourBars = useMemo(() => {
    const peak = deepDive.peakHour;
    return Array.from({ length: 12 }, (_, index) => {
      const hour = index * 2;
      const distance = Math.min(Math.abs(hour - peak), 24 - Math.abs(hour - peak));
      const height = Math.max(18, 100 - distance * 18);
      return { hour, height };
    });
  }, [deepDive.peakHour]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    queueMicrotask(() => closeRef.current?.focus());
  }, [deepDive.name]);

  return (
    <motion.div
      className="absolute inset-0 z-40 flex flex-col justify-end sm:justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
        aria-label={t("dismissAria")}
        onClick={onClose}
      />

      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92%] min-h-0 w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-[#0a0c14] text-white shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.85)] sm:ml-auto sm:max-w-md sm:rounded-l-[1.75rem] sm:rounded-tr-none sm:border-r-0"
        initial={reducedMotion ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.85 }}
      >
        <div className="relative h-[9.5rem] shrink-0 overflow-hidden sm:h-[11rem]">
          <div
            className="absolute left-1/2 top-2 z-20 h-1 w-10 -translate-x-1/2 rounded-full bg-white/55 sm:hidden"
            aria-hidden
          />
          <Image
            src={deepDive.imageSrc}
            alt=""
            fill
            className="object-cover object-top"
            sizes="(max-width: 640px) 100vw, 28rem"
            priority
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0c14] via-[#0a0c14]/50 to-black/20"
            aria-hidden
          />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-black/55"
            aria-label={t("closeAria")}
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-4 pt-10">
            <p className="text-[13px] font-medium text-white/80">{tArtists("insightsEyebrow")}</p>
            <h3
              id={titleId}
              className="truncate text-xl font-semibold tracking-tight text-white sm:text-2xl"
            >
              {deepDive.name}
            </h3>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white/80">
              {deepDive.streams.toLocaleString(locale)} {tArtists("listensCount")}
              <span className="font-medium text-white/45">
                {" · "}
                {t("rank", { rank: deepDive.rank })}
              </span>
            </p>
          </div>
        </div>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-gutter:stable]">
          <div className="space-y-7">
            <section aria-label={tArtists("insightsTopTracks")}>
              <h4 className="text-sm font-semibold text-white">{tArtists("insightsTopTracks")}</h4>

              {featuredTrack ? (
                <div className="mt-3 flex items-start gap-3 border-b border-white/[0.08] pb-3">
                  <span className="w-6 shrink-0 text-[13px] font-semibold tabular-nums text-white/45">
                    1
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-white/45">{tArtists("insightsTopTrackLabel")}</p>
                    <p className="truncate text-[15px] font-semibold text-white">
                      {featuredTrack.title}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-white">
                      {featuredTrack.streamCount.toLocaleString(locale)} {tArtists("listensCount")}
                      {featuredShare != null ? (
                        <span className="font-medium text-white/45">
                          {" · "}
                          {tArtists("insightsTopTrackShare", { share: featuredShare })}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              ) : null}

              {restTracks.length > 0 ? (
                <ol>
                  {restTracks.map((track, index) => (
                    <li
                      key={track.title}
                      className="flex items-center gap-3 border-b border-white/[0.06] py-2.5 last:border-b-0"
                    >
                      <span className="w-6 shrink-0 text-[13px] font-semibold tabular-nums text-white/45">
                        {index + 2}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">
                        {track.title}
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-white">
                        {track.streamCount.toLocaleString(locale)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>

            <section aria-label={tArtists("insightsTimelineTitle")}>
              <div className="flex flex-wrap gap-x-5 gap-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <div className="min-w-[6.5rem]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                    {tArtists("insightsFirstListenLabel")}
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize text-white">
                    {formatStreamDate(deepDive.firstStreamAt, locale)}
                  </p>
                </div>
                <div className="min-w-[6.5rem]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                    {tArtists("insightsMostRecentListenLabel")}
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize text-white">
                    {formatStreamDate(deepDive.lastStreamAt, locale)}
                  </p>
                </div>
                <div className="min-w-[6.5rem]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                    {tArtists("insightsUniqueTracksShort")}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-white">
                    {deepDive.uniqueTracks.toLocaleString(locale)}
                  </p>
                </div>
                <div className="min-w-[6.5rem]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                    {tArtists("insightsEstPlayTimeShort")}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-white">
                    ≈ {deepDive.estHours}h
                  </p>
                </div>
              </div>
            </section>

            <section aria-labelledby={`${titleId}-when`}>
              <h4 id={`${titleId}-when`} className="mb-3 text-sm font-semibold text-white">
                {t("whenYouStream")}
              </h4>
              <div className="flex flex-wrap gap-x-5 gap-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <div className="min-w-[6.5rem]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                    {tArtists("insightsBusiestCalendarDay")}
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize text-white">{busiestDayLabel}</p>
                </div>
                <div className="min-w-[6.5rem]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                    {tArtists("insightsPeakHour")}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-white">{peakHourLabel}</p>
                </div>
                <div className="min-w-[6.5rem]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                    {tArtists("insightsPeakWeekday")}
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize text-white">{peakWeekdayLabel}</p>
                </div>
                <div className="min-w-[6.5rem]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                    {tArtists("insightsActiveDays")}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-white">
                    {tArtists("insightsDaysValue", { count: deepDive.activeDays })}
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/25 p-3">
                <p className="mb-3 text-sm font-semibold text-white">{tArtists("insightsByHour")}</p>
                <div className="flex h-20 items-end gap-1.5" aria-hidden>
                  {hourBars.map((bar) => (
                    <div
                      key={bar.hour}
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-violet-500/80 to-cyan-300/80"
                      style={{ height: `${bar.height}%`, opacity: 0.55 + bar.height / 250 }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-white/35">
                  <span>00</span>
                  <span>06</span>
                  <span>12</span>
                  <span>18</span>
                  <span>22</span>
                </div>
              </div>
            </section>

            <p className="text-center text-[0.65rem] leading-5 text-white/35">{t("footnote")}</p>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}
