"use client";

import { Suspense, useCallback, useLayoutEffect, useState, type CSSProperties } from "react";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";
import { Sidebar } from "@/lib/components/sidebar";
import { DashboardStickyHeader } from "@/lib/components/dashboard-sticky-header";
import { DashboardMainArea } from "@/lib/components/dashboard-main-area";
import { Footer } from "@/lib/components/footer";
import { DashboardViewerProvider } from "@/lib/context/dashboard-viewer-context";
import { GenreBackfillResultNotifier } from "@/lib/components/genre-backfill-result-notifier";
import { GenreGroqClassificationNudgeNotifier } from "@/lib/components/genre-groq-classification-nudge-notifier";
import { GenreBackfillJobProvider } from "@/lib/context/genre-backfill-job-context";
import { NotificationCenterProvider } from "@/lib/context/notification-center-context";
import { ScrollProgressBar } from "@/lib/components/overview-bis";
import { DashboardMobileBottomNav } from "@/lib/components/dashboard-mobile-bottom-nav";

export function DashboardScrollWrapper({ children }: { children: React.ReactNode }) {
  const [filterElement, setFilterElement] = useState<HTMLDivElement | null>(null);
  const [filterHeight, setFilterHeight] = useState(0);
  const [navElement, setNavElement] = useState<HTMLElement | null>(null);
  const [navHeight, setNavHeight] = useState(0);

  const filterRef = useCallback((node: HTMLDivElement | null) => {
    setFilterElement(node);
  }, []);

  const navRef = useCallback((node: HTMLElement | null) => {
    setNavElement(node);
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

  useLayoutEffect(() => {
    const el = navElement;
    if (!el) {
      setNavHeight(0);
      return;
    }

    const updateNavHeight = () => {
      setNavHeight(el.getBoundingClientRect().height);
    };

    updateNavHeight();

    const observer = new ResizeObserver(updateNavHeight);
    observer.observe(el);
    window.addEventListener("resize", updateNavHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateNavHeight);
    };
  }, [navElement]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(DASHBOARD_BOTTOM_NAV_OFFSET_VAR, `${navHeight}px`);
    return () => {
      root.style.removeProperty(DASHBOARD_BOTTOM_NAV_OFFSET_VAR);
    };
  }, [navHeight]);

  const dashboardStyle = {
    "--dashboard-filter-height": `${filterHeight}px`,
    [DASHBOARD_BOTTOM_NAV_OFFSET_VAR]: `${navHeight}px`,
  } as CSSProperties;

  return (
    <div className="flex min-h-screen bg-background" style={dashboardStyle}>
        <ScrollProgressBar />
        <Sidebar />
        <NotificationCenterProvider>
        <GenreBackfillJobProvider>
          <GenreGroqClassificationNudgeNotifier />
          <GenreBackfillResultNotifier />
          <div className="min-w-0 flex-1 bg-surface-dashboard shadow-[0_0_0_1px_rgb(152_80_208_/_0.08)] max-lg:pb-[var(--dashboard-bottom-nav-offset,0px)]">
          <DashboardStickyHeader filterRef={filterRef} />
          <Suspense fallback={<main className="min-w-0"><div className="p-4 lg:p-8">{children}</div></main>}>
            <DashboardViewerProvider>
              <DashboardMainArea>{children}</DashboardMainArea>
              <Footer />
              <DashboardMobileBottomNav navRef={navRef} />
            </DashboardViewerProvider>
          </Suspense>
          </div>
        </GenreBackfillJobProvider>
      </NotificationCenterProvider>
    </div>
  );
}
