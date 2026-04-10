"use client";

import { Suspense } from "react";
import { Sidebar } from "@/lib/components/sidebar";
import { DateRangeFilter } from "@/lib/components/date-range-filter";
import { Footer } from "@/lib/components/footer";
import { DashboardViewerProvider } from "@/lib/context/dashboard-viewer-context";

export function DashboardScrollWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      <Sidebar />
      <div className="min-w-0 flex-1 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:bg-gray-900 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
        <Suspense
          fallback={
            <div className="sticky top-0 z-30 shrink-0 border-b border-gray-200/90 bg-white/90 shadow-[0_1px_0_0_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="px-4 py-3 sm:px-6 lg:px-8">
                <div className="h-10 w-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          }
        >
          <div
            className="sticky top-0 z-30 shrink-0 border-b border-gray-200/90 bg-white/90 shadow-[0_1px_0_0_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]"
          >
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
    </div>
  );
}
