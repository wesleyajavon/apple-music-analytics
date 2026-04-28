"use client";

import { memo, useMemo, useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { useGenreTrends } from "@/lib/hooks/use-listening";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { clearGenreBackfillBannerBlockingPrefs } from "@/lib/utils/genre-backfill-banner-prefs";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#6366f1",
  "#14b8a6",
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function createTrendsTooltip(t: (k: string) => string, locale: string) {
  const TrendsTooltipInner = memo(
    ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: Array<{ name: string; value: number; color: string }>;
      label?: string;
    }) => {
      if (!active || !payload?.length || !label) return null;
      return (
        <div className="chart-tooltip-accessible min-w-[180px] p-4">
          <p className="font-semibold mb-2">{label}</p>
          <ul className="space-y-1.5 text-sm">
            {payload.map((entry) => (
              <li key={entry.name} className="flex justify-between gap-4">
                <span style={{ color: entry.color }}>{entry.name}</span>
                <span className="chart-tooltip-secondary font-medium tabular-nums">
                  {Number(entry.value).toLocaleString(locale)} {t("listensDelta")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
  );
  TrendsTooltipInner.displayName = "TrendsTooltip";
  return TrendsTooltipInner;
}

const DEFAULT_GENRE_COUNT = 5;
const MAX_FILTER_GENRE_COUNT = 12;

type GroqEligibility = {
  unknownTrackCount: number;
  unknownRatio: number;
  totalTrackCount: number;
  groqConfigured: boolean;
};

type GroqJobStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type GenreTrendsSummaryWidgetProps = {
  startDate?: string;
  endDate?: string;
};

/**
 * Compact multi-line genre trends chart for the overview dashboard.
 * Mirrors /dashboard/genres/trends (monthly aggregation, top genres by default).
 */
export function GenreTrendsSummaryWidget({
  startDate,
  endDate,
}: GenreTrendsSummaryWidgetProps) {
  const t = useTranslations("genreTrends");
  const tOverview = useTranslations("overview");
  const tConsent = useTranslations("onboarding.genreLlmConsent");
  const locale = useLocale();
  const viewerUserId = useDashboardViewerUserId();
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);

  const { data, isLoading, error, refetch } = useGenreTrends(
    startDate,
    endDate,
    "month",
    undefined,
    viewerUserId
  );

  const availableGenres = useMemo(
    () => data?.availableGenres ?? [],
    [data?.availableGenres]
  );
  const filterGenres = useMemo(
    () => availableGenres.slice(0, MAX_FILTER_GENRE_COUNT),
    [availableGenres]
  );
  const chartData = useMemo(() => data?.data ?? [], [data?.data]);

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    if (availableGenres.length === 0) return;
    if (selectedGenres.length > 0) return;
    const n = Math.min(DEFAULT_GENRE_COUNT, availableGenres.length);
    setSelectedGenres(availableGenres.slice(0, n));
  }, [availableGenres, selectedGenres.length]);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  const trendsQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    p.set("period", "month");
    if (viewerUserId) p.set("userId", viewerUserId);
    const qs = p.toString();
    return qs ? `?${qs}` : "?period=month";
  }, [startDate, endDate, viewerUserId]);

  const [groqMeta, setGroqMeta] = useState<{
    loaded: boolean;
    eligibility: GroqEligibility | null;
    jobStatus: GroqJobStatus | null;
  }>({ loaded: false, eligibility: null, jobStatus: null });
  const [groqStarting, setGroqStarting] = useState(false);

  useEffect(() => {
    if (viewerUserId) {
      setGroqMeta({ loaded: true, eligibility: null, jobStatus: null });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/user/onboarding/import/genre-backfill/status");
        const data = (await res.json().catch(() => ({}))) as {
          eligibility?: GroqEligibility;
          job?: { status: GroqJobStatus } | null;
        };
        if (cancelled) return;
        if (!res.ok) {
          setGroqMeta({ loaded: true, eligibility: null, jobStatus: null });
          return;
        }
        setGroqMeta({
          loaded: true,
          eligibility: data.eligibility ?? null,
          jobStatus: data.job?.status ?? null,
        });
      } catch {
        if (!cancelled) {
          setGroqMeta({ loaded: true, eligibility: null, jobStatus: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerUserId]);

  const refreshGroqMeta = useCallback(async () => {
    if (viewerUserId) return;
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/status");
      const data = (await res.json().catch(() => ({}))) as {
        eligibility?: GroqEligibility;
        job?: { status: GroqJobStatus } | null;
      };
      if (!res.ok) return;
      setGroqMeta({
        loaded: true,
        eligibility: data.eligibility ?? null,
        jobStatus: data.job?.status ?? null,
      });
    } catch {
      /* ignore */
    }
  }, [viewerUserId]);

  const startGroqBackfill = useCallback(async () => {
    setGroqStarting(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/start", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data?.error ?? tConsent("startError"));
        return;
      }
      clearGenreBackfillBannerBlockingPrefs();
      toast.success(tConsent("startedToast"));
      await refreshGroqMeta();
      window.setTimeout(() => {
        document.getElementById("genre-backfill-global-badge-panel")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    } catch {
      toast.error(tConsent("startError"));
    } finally {
      setGroqStarting(false);
    }
  }, [refreshGroqMeta, tConsent]);

  if (isLoading) {
    return (
      <div className="sm:col-span-2 lg:col-span-4 min-h-[320px] w-full min-w-0">
        <div className="relative h-full overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="mt-2 h-4 w-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="p-6 pt-2">
            <div className="h-[260px] bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sm:col-span-2 lg:col-span-4 w-full min-w-0">
        <div className="rounded-2xl border border-card-border bg-card-surface p-6">
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  if (!data || (chartData.length === 0 && availableGenres.length === 0)) {
    return null;
  }

  return (
    <div className="sm:col-span-2 lg:col-span-4 min-h-[320px] w-full min-w-0">
      <div className="relative h-full overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40 animate-fade-in-up">
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("evolution")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("chartHint")}
                </p>
                <div className="mt-2 space-y-2 text-xs text-amber-800 dark:text-amber-200">
                  <p>{t("chartGenreAccuracyIntro")}</p>
                  <ul className="list-disc space-y-1.5 pl-4 marker:text-amber-700 dark:marker:text-amber-300">
                    <li>
                      {t.rich("chartGenreAccuracyPalette", {
                        manualLabel: (chunks) => (
                          <span className="font-semibold text-amber-900 dark:text-amber-50">{chunks}</span>
                        ),
                        palette: (chunks) => (
                          <Link
                            href="/dashboard/genres/palette"
                            className="font-semibold underline underline-offset-2 hover:text-amber-950 dark:hover:text-amber-50"
                          >
                            {chunks}
                          </Link>
                        ),
                      })}
                    </li>
                    <li>
                      {t.rich("chartGenreAccuracyGroq", {
                        aiLabel: (chunks) => (
                          <span className="font-semibold text-amber-900 dark:text-amber-50">{chunks}</span>
                        ),
                      })}
                    </li>
                  </ul>
                  {viewerUserId == null && groqMeta.loaded && groqMeta.eligibility ? (
                    <div className="mt-3 space-y-2 border-t border-amber-200/60 pt-2.5 dark:border-amber-800/50">
                      {!groqMeta.eligibility.groqConfigured ? (
                        <p className="text-[11px] font-medium leading-snug text-amber-950 dark:text-amber-50">
                          {tConsent("missingKey")}
                        </p>
                      ) : groqMeta.eligibility.unknownTrackCount === 0 ? (
                        <p className="text-[11px] leading-snug text-amber-900/90 dark:text-amber-100/85">
                          {t("groqStartNoUnknown")}
                        </p>
                      ) : (
                        <>
                          {groqMeta.jobStatus === "pending" ||
                          groqMeta.jobStatus === "running" ||
                          groqMeta.jobStatus === "paused" ? (
                            <p className="text-[11px] leading-snug text-amber-900/95 dark:text-amber-100/90">
                              <span>{t("groqSessionRunningHint")} </span>
                              <a
                                href="#genre-backfill-global-badge-panel"
                                className="font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-900 dark:text-amber-50 dark:hover:text-white"
                              >
                                {t("groqProgressAnchor")}
                              </a>
                            </p>
                          ) : (
                            <>
                              <p className="text-[11px] leading-snug text-amber-900/90 dark:text-amber-100/85">
                                {tConsent("privacy")}
                              </p>
                              <button
                                type="button"
                                disabled={groqStarting}
                                onClick={() => void startGroqBackfill()}
                                className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-accent-violet px-3 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {groqStarting ? tConsent("starting") : tConsent("accept")}
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/dashboard/genres/trends${trendsQuery}`}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20 transition-colors duration-200 shrink-0 self-start"
              >
                {tOverview("seeMore")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="px-6 pb-3 pt-1">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              {t("genresToDisplay")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {filterGenres.map((genre, idx) => {
                const selected = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                      selected
                        ? "border-accent-violet/40 bg-accent-violet/10 text-gray-900 dark:text-white"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: selected ? getColor(idx) : "transparent",
                        border: selected ? "none" : "1px solid #9ca3af",
                      }}
                    />
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 pt-2">
            {selectedGenres.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                {t("selectAtLeastOne")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 12, left: 0, bottom: 50 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    className="dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    angle={-40}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    width={40}
                  />
                  <Tooltip content={<TrendsTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {selectedGenres.map((genre) => (
                    <Line
                      key={genre}
                      type="monotone"
                      dataKey={genre}
                      name={genre}
                      stroke={getColor(availableGenres.indexOf(genre))}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                      animationDuration={500}
                      animationEasing="ease-in-out"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
