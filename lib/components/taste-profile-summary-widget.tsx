"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTasteProfile } from "@/lib/hooks/use-taste-profile";

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
 */
export function TasteProfileSummaryWidget() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const effectiveRange = useMemo(() => {
    if (startDateParam && endDateParam) {
      return { startDate: startDateParam, endDate: endDateParam };
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  }, [startDateParam, endDateParam]);

  const { data, isLoading } = useTasteProfile(
    effectiveRange.startDate,
    effectiveRange.endDate,
    "casual"
  );

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card animate-pulse">
        <div className="p-6">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
      <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Explain My Taste
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Votre profil musical en bref
            </p>
          </div>
          <Link
            href="/dashboard/taste-profile"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
              text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20
              transition-colors duration-200"
          >
            Voir plus
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
            (résultat en cache)
          </p>
        )}
      </div>
    </div>
  );
}
