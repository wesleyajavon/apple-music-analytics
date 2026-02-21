"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useTasteProfile } from "@/lib/hooks/use-taste-profile";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";

function truncateText(text: string, maxLength: number = 220): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength).trim();
  const lastSpace = truncated.lastIndexOf(" ");
  const end = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;
  return truncated.slice(0, end) + "…";
}

/**
 * Small overview widget showing a taste profile summary.
 * Displays truncated description with link to full profile.
 * Uses full listen range when "all" (tout) filter is selected.
 */
export function TasteProfileSummaryWidget() {
  const t = useTranslations("taste-profile");
  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();

  const { data, isLoading } = useTasteProfile(startDate, endDate, "casual");
  const isLoadingOrFetching = isRangeLoading || isLoading;

  if (isLoadingOrFetching) {
    return (
      <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card min-h-[200px]">
        <div className="p-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-shimmer" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2 animate-shimmer" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5 animate-shimmer" />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card transition-shadow duration-300 hover:shadow-card-hover min-h-[220px] flex flex-col">
      <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("title")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t("subtitleShort")}
            </p>
          </div>
          <Link
            href="/dashboard/taste-profile"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
              text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20
              transition-colors duration-200"
          >
            {t("seeMore")}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
      <div className="p-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {truncateText(data.description, 220)}
        </p>
        {data.cached && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {t("cached")}
          </p>
        )}
      </div>
    </div>
  );
}
