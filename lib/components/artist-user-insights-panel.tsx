"use client";

import { memo, useEffect, useId, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { X } from "lucide-react";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { useArtistUserInsights } from "@/lib/hooks/use-artists";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { ErrorState } from "@/lib/components/error-state";

const PANEL_SHELL =
  "flex h-full min-h-0 flex-col border-l border-cyan-300/20 bg-[radial-gradient(circle_at_12%_0%,_rgba(139,92,246,0.18),_transparent_38%),radial-gradient(circle_at_88%_88%,_rgba(6,182,212,0.12),_transparent_32%),rgb(var(--card-rgb)/0.98)] shadow-[-12px_0_48px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:bg-[radial-gradient(circle_at_12%_0%,_rgba(139,92,246,0.22),_transparent_38%),radial-gradient(circle_at_88%_88%,_rgba(132,204,22,0.1),_transparent_32%),rgb(var(--card-rgb)/0.96)]";

function formatPlaySeconds(seconds: number, notAvailable: string): string {
  if (seconds <= 0) return notAvailable;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

/** Libellés des champs Listen.source pour l’historique agrégé. */
function localizedListenSource(source: string, t: ReturnType<typeof useTranslations>): string {
  switch (source) {
    case "lastfm":
      return t("sourceLastfm");
    case "apple_music_replay":
      return t("sourceAppleReplay");
    case "spotify_export":
      return t("sourceSpotifyExport");
    case "spotify_web_api":
      return t("sourceSpotifyWebApi");
    case "apple_music_export":
      return t("sourceAppleMusicExport");
    default:
      return source.replace(/_/g, " ");
  }
}

/** Lundi premier : index 0 = lundi … 6 = dimanche (2024-01-08 = lundi UTC). */
function weekdayShortMonFirst(index: number, locale: string): string {
  const base = Date.UTC(2024, 0, 8 + index);
  return new Date(base).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" });
}

export const ArtistUserInsightsPanel = memo(
  ({
    open,
    artistId,
    previewArtist,
    startDate,
    endDate,
    userId,
    locale,
    onClose,
    colorIndex,
  }: {
    open: boolean;
    artistId: string | null;
    previewArtist: ArtistStatsDto | null;
    startDate?: string;
    endDate?: string;
    userId?: string;
    locale: string;
    onClose: () => void;
    /** Index pour teinte d’avatar fallback (liste « All your artists »). */
    colorIndex: number;
  }) => {
    const t = useTranslations("artists");
    const headingId = useId();
    const chartNs = useId().replace(/:/g, "");
    const closeRef = useRef<HTMLButtonElement>(null);

    const query = useArtistUserInsights(open ? artistId : null, startDate, endDate, userId, {
      enabled: open && !!artistId,
    });

    useEffect(() => {
      if (!open) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
      if (open) {
        queueMicrotask(() => closeRef.current?.focus());
      }
    }, [open, artistId]);

    const displayArtist = query.data?.artist ?? previewArtist;
    const firstLast = query.data?.artist ?? previewArtist;

    const weekdayChartData = useMemo(() => {
      const rows = query.data?.listensByWeekday;
      if (!rows) return [];
      return rows.map((w) => ({
        label: weekdayShortMonFirst(w.weekdayIndexMondayFirst, locale),
        listens: w.listens,
      }));
    }, [query.data?.listensByWeekday, locale]);

    const hourChartData = useMemo(() => {
      const rows = query.data?.listensByHour;
      if (!rows) return [];
      return rows.map((h) => ({
        label: `${String(h.hour).padStart(2, "0")}:00`,
        listens: h.listens,
      }));
    }, [query.data?.listensByHour]);

    const peakHourLabel =
      query.data?.peakListenHour != null
        ? `${String(query.data.peakListenHour.hour).padStart(2, "0")}:00 · ${query.data.peakListenHour.listens.toLocaleString(locale)} ${t("listensCount")}`
        : null;

    const peakWeekdayLabel =
      query.data?.peakWeekday != null
        ? `${weekdayShortMonFirst(query.data.peakWeekday.weekdayIndexMondayFirst, locale)} · ${query.data.peakWeekday.listens.toLocaleString(locale)} ${t("listensCount")}`
        : null;

    const busiestLine =
      query.data?.busiestDay != null
        ? t("insightsBusiestMeta", {
            date: new Date(query.data.busiestDay.date + "T12:00:00.000Z").toLocaleDateString(locale, {
              weekday: "long",
              month: "short",
              day: "numeric",
            }),
            listens: query.data.busiestDay.listens.toLocaleString(locale),
          })
        : null;

    if (!open || !previewArtist || !artistId) return null;

    return (
      <div className="fixed inset-0 z-[80] flex justify-end">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
          aria-label={t("insightsCloseAria")}
          onClick={onClose}
        />

        <aside
          className={`relative z-[81] flex w-full max-w-lg flex-col ${PANEL_SHELL}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
        >
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-violet-400 via-cyan-300 to-lime-300 opacity-90`} />

          <div className="flex items-start justify-between gap-3 border-b border-cyan-300/15 px-5 py-4 sm:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="relative shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/50 dark:ring-white/15">
                {displayArtist ? (
                  <ArtistAvatarHydrated
                    artistId={artistId}
                    artistName={displayArtist.artistName}
                    imageUrl={displayArtist.imageUrl}
                    avatarApiSize={128}
                    colorIndex={colorIndex}
                    alt=""
                    width={76}
                    height={76}
                    className="h-[76px] w-[76px] object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700/90 dark:text-cyan-100/75">
                  {t("insightsEyebrow")}
                </p>
                <h2 id={headingId} className="mt-1 truncate text-xl font-bold text-gray-900 dark:text-white">
                  {displayArtist?.artistName ?? previewArtist.artistName}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-300/12 dark:text-violet-100">
                    {(displayArtist?.listenCount ?? previewArtist.listenCount).toLocaleString(locale)} {t("listensCount")}
                  </span>
                  <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-300/12 dark:text-cyan-100">
                    {(displayArtist?.uniqueTracks ?? previewArtist.uniqueTracks).toLocaleString(locale)}{" "}
                    {t("insightsUniqueTracksShort")}
                  </span>
                  {displayArtist?.totalPlayTime != null ? (
                    <span className="rounded-full bg-lime-500/10 px-2.5 py-1 text-xs font-semibold text-lime-800 dark:bg-lime-300/12 dark:text-lime-100">
                      ≈{" "}
                      {formatPlaySeconds(displayArtist.totalPlayTime, t("insightsEstPlayTimeUnavailable"))}{" "}
                      {t("insightsEstPlayTimeHint")}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-white/90 text-cyan-950 shadow-lg transition hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:border-cyan-400/20 dark:bg-slate-900/80 dark:text-cyan-100 dark:hover:bg-slate-800"
              aria-label={t("insightsCloseAria")}
            >
              <X className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {firstLast ? (
              <p className="mb-5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                {t("insightsTimelineHint", {
                  first: new Date(firstLast.firstListenDate).toLocaleDateString(locale, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                  last: new Date(firstLast.lastListenDate).toLocaleDateString(locale, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                })}
              </p>
            ) : null}

            {query.isLoading ? (
              <div className="space-y-4" aria-busy="true">
                <div className="h-24 animate-pulse rounded-2xl bg-gradient-to-br from-gray-200/70 to-gray-100/70 dark:from-gray-700/70 dark:to-gray-800/50" />
                <div className="h-40 animate-pulse rounded-2xl bg-gradient-to-br from-gray-200/70 to-gray-100/70 dark:from-gray-700/70 dark:to-gray-800/50" />
                <div className="h-36 animate-pulse rounded-2xl bg-gradient-to-br from-gray-200/70 to-gray-100/70 dark:from-gray-700/70 dark:to-gray-800/50" />
              </div>
            ) : null}

            {query.error ? (
              <ErrorState error={query.error} message={t("insightsLoadError")} onRetry={() => query.refetch()} />
            ) : null}

            {query.data ? (
              <div className="space-y-8">
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("insightsPeaksTitle")}</h3>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-violet-300/18 bg-white/55 px-3 py-2.5 shadow-inner dark:border-violet-400/14 dark:bg-slate-950/25">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-800/85 dark:text-violet-100/75">
                        {t("insightsPeakHour")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {peakHourLabel ?? t("insightsNoSignal")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-cyan-300/18 bg-white/55 px-3 py-2.5 shadow-inner dark:border-cyan-400/14 dark:bg-slate-950/25">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-800/85 dark:text-cyan-100/75">
                        {t("insightsPeakWeekday")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {peakWeekdayLabel ?? t("insightsNoSignal")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-lime-300/22 bg-white/55 px-3 py-2.5 shadow-inner dark:border-lime-400/14 dark:bg-slate-950/25 sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-lime-800/90 dark:text-lime-100/75">
                        {t("insightsBusiestCalendarDay")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {busiestLine ?? t("insightsNoSignal")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/40 bg-white/40 px-3 py-2 text-center dark:border-white/10 dark:bg-white/5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t("insightsActiveDays")}
                      </p>
                      <p className="mt-0.5 text-lg font-black tabular-nums text-gray-900 dark:text-white">
                        {query.data.activeListeningDays.toLocaleString(locale)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/40 bg-white/40 px-3 py-2 text-center dark:border-white/10 dark:bg-white/5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {t("insightsSpanDays")}
                      </p>
                      <p className="mt-0.5 text-lg font-black tabular-nums text-gray-900 dark:text-white">
                        {query.data.listeningSpanDays.toLocaleString(locale)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-cyan-300/14 bg-white/35 p-4 shadow-inner dark:border-cyan-300/12 dark:bg-slate-950/20">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t("insightsByHour")}</h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourChartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`insHourBar-${chartNs}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#67e8f9" strokeOpacity={0.15} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "rgb(var(--muted-rgb))", fontSize: 9 }}
                          interval={3}
                          axisLine={false}
                          tickLine={false}
                          height={32}
                        />
                        <YAxis
                          tick={{ fill: "rgb(var(--muted-rgb))", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={36}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                          labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                          itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                          formatter={(v: number) => [`${v.toLocaleString(locale)} ${t("listensCount")}`, t("listensLabel")]}
                        />
                        <Bar dataKey="listens" fill={`url(#insHourBar-${chartNs})`} radius={[4, 4, 0, 0]} maxBarSize={10} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="rounded-2xl border border-violet-300/14 bg-white/35 p-4 shadow-inner dark:border-violet-400/14 dark:bg-slate-950/20">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t("insightsByWeekday")}</h3>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdayChartData} margin={{ top: 4, right: 4, left: -18, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#c4b5fd" strokeOpacity={0.2} vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "rgb(var(--muted-rgb))", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "rgb(var(--muted-rgb))", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={36}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                          labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                          itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                          formatter={(v: number) => [`${v.toLocaleString(locale)} ${t("listensCount")}`, t("listensLabel")]}
                        />
                        <Bar dataKey="listens" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("insightsTopTracks")}</h3>
                  <ol className="mt-3 space-y-2">
                    {query.data.topTracks.slice(0, 12).map((tr, idx) => (
                      <li
                        key={tr.trackId}
                        className="flex items-baseline gap-3 rounded-xl border border-cyan-300/12 bg-white/40 px-3 py-2 dark:border-white/10 dark:bg-slate-950/15"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-xs font-bold text-violet-800 dark:text-violet-100">
                          {idx + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-gray-50">
                          {tr.title}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-cyan-700 dark:text-cyan-200">
                          {tr.listenCount.toLocaleString(locale)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>

                {query.data.listensBySource.length > 1 ? (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("insightsSources")}</h3>
                    <ul className="mt-3 space-y-2">
                      {query.data.listensBySource.map((row) => (
                        <li
                          key={row.source}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/30 bg-white/35 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                        >
                          <span className="min-w-0 truncate font-medium text-gray-800 dark:text-gray-200">
                            {localizedListenSource(row.source, t)}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-gray-900 dark:text-white">
                            {row.listens.toLocaleString(locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-500">{t("insightsFootnoteTz")}</p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    );
  }
);

ArtistUserInsightsPanel.displayName = "ArtistUserInsightsPanel";
