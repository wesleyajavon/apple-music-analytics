"use client";

import { Suspense, useCallback, useLayoutEffect, useState, type CSSProperties } from "react";
import { Sidebar } from "@/lib/components/sidebar";
import { DateRangeFilter } from "@/lib/components/date-range-filter";
import { DashboardToolbarBrand } from "@/lib/components/dashboard-toolbar-brand";
import { Footer } from "@/lib/components/footer";
import { DashboardViewerProvider } from "@/lib/context/dashboard-viewer-context";
import { GenreGroqClassificationNudgeNotifier } from "@/lib/components/genre-groq-classification-nudge-notifier";
import { GenreBackfillJobProvider } from "@/lib/context/genre-backfill-job-context";
import { NotificationCenterProvider } from "@/lib/context/notification-center-context";

export function DashboardScrollWrapper({ children }: { children: React.ReactNode }) {
  const [filterElement, setFilterElement] = useState<HTMLDivElement | null>(null);
  const [filterHeight, setFilterHeight] = useState(0);

  const filterRef = useCallback((node: HTMLDivElement | null) => {
    setFilterElement(node);
  }, []);

  useLayoutEffect(() => {
    const el = filterElement;
    if (!el) return;

    const updateFilterHeight = () => {
      setFilterHeight(el.getBoundingClientRect().height);
    };

    updateFilterHeight();

    const observer = new ResizeObserver(updateFilterHeight);
    observer.observe(el);
    window.addEventListener("resize", updateFilterHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFilterHeight);
    };
  }, [filterElement]);

  const dashboardStyle = {
    "--dashboard-filter-height": `${filterHeight}px`,
  } as CSSProperties;

  return (
    <div className="flex min-h-screen bg-background" style={dashboardStyle}>
      <Sidebar />
      <NotificationCenterProvider>
        <GenreBackfillJobProvider>
          <GenreGroqClassificationNudgeNotifier />
          <div className="min-w-0 flex-1 bg-surface-dashboard shadow-[0_0_0_1px_rgb(152_80_208_/_0.08)]">
          <Suspense
            fallback={
              <div className="sticky top-0 z-30 shrink-0 border-b border-card-border bg-surface-glass shadow-[0_1px_0_0_rgb(152_80_208_/_0.1)] backdrop-blur-md">
                <div className="border-b border-card-border/70 px-4 py-3 lg:hidden">
                  <div className="h-9 w-40 animate-pulse rounded-lg bg-card-surface" />
                </div>
                <div className="px-4 py-3 sm:px-6 lg:px-8">
                  <div className="h-10 w-64 animate-pulse rounded-xl bg-card-surface" />
                </div>
              </div>
            }
          >
            <div
              ref={filterRef}
              className="sticky top-0 z-30 shrink-0 border-b border-card-border bg-surface-glass shadow-[0_1px_0_0_rgb(152_80_208_/_0.1)] backdrop-blur-md"
            >
              <DashboardToolbarBrand />
              <DateRangeFilter />
            </div>
          </Suspense>
          <Suspense fallback={<main className="min-w-0"><div className="p-4 sm:p-6 lg:p-8">{children}</div></main>}>
            <DashboardViewerProvider>
              <main className="min-w-0">
                <div className="p-4 sm:p-6 lg:p-8">{children}</div>
              </main>
              <Footer />
            </DashboardViewerProvider>
          </Suspense>
          </div>
        </GenreBackfillJobProvider>
      </NotificationCenterProvider>
    </div>
  );
}
