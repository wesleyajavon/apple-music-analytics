"use client";

import { Suspense, useCallback, useLayoutEffect, useState, type CSSProperties } from "react";
import { Sidebar, SidebarProvider } from "@/lib/components/sidebar";
import { DashboardStickyHeader } from "@/lib/components/dashboard-sticky-header";
import { DashboardMainArea } from "@/lib/components/dashboard-main-area";
import { Footer } from "@/lib/components/footer";
import { DashboardViewerProvider } from "@/lib/context/dashboard-viewer-context";
import { GenreGroqClassificationNudgeNotifier } from "@/lib/components/genre-groq-classification-nudge-notifier";
import { GenreBackfillJobProvider } from "@/lib/context/genre-backfill-job-context";
import { NotificationCenterProvider } from "@/lib/context/notification-center-context";
import { ScrollProgressBar } from "@/lib/components/overview-bis";
import { DashboardMobileBottomNav } from "@/lib/components/dashboard-mobile-bottom-nav";

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
    <SidebarProvider>
      <div className="flex min-h-screen bg-background" style={dashboardStyle}>
        <ScrollProgressBar />
        <Sidebar />
        <NotificationCenterProvider>
        <GenreBackfillJobProvider>
          <GenreGroqClassificationNudgeNotifier />
          <div className="min-w-0 flex-1 bg-surface-dashboard shadow-[0_0_0_1px_rgb(152_80_208_/_0.08)]">
          <DashboardStickyHeader filterRef={filterRef} />
          <Suspense fallback={<main className="min-w-0"><div className="p-4 sm:p-6 lg:p-8">{children}</div></main>}>
            <DashboardViewerProvider>
              <DashboardMainArea>{children}</DashboardMainArea>
              <Footer />
              <DashboardMobileBottomNav />
            </DashboardViewerProvider>
          </Suspense>
          </div>
        </GenreBackfillJobProvider>
      </NotificationCenterProvider>
      </div>
    </SidebarProvider>
  );
}
