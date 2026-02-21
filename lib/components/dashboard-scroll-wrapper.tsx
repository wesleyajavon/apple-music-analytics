"use client";

import { useRef } from "react";
import { ScrollContainerProvider } from "@/lib/contexts/scroll-container-context";
import { Sidebar } from "@/lib/components/sidebar";
import { DateRangeFilter } from "@/lib/components/date-range-filter";
import { Footer } from "@/lib/components/footer";
import { Suspense } from "react";

export function DashboardScrollWrapper({ children }: { children: React.ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  return (
    <ScrollContainerProvider containerRef={mainRef}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden">
            <Suspense
              fallback={
                <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse w-64" />
                </div>
              }
            >
              <DateRangeFilter />
            </Suspense>
            <main ref={mainRef} className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6 lg:p-8">{children}</div>
            </main>
            <Footer />
          </div>
        </div>
      </div>
    </ScrollContainerProvider>
  );
}
