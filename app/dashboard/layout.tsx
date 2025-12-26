import { Suspense } from "react";
import { Providers } from "../providers";
import { Sidebar } from "@/lib/components/sidebar";
import { DateRangeFilter } from "@/lib/components/date-range-filter";

// Layout partagé pour toutes les pages du dashboard
// Wrappe les pages avec TanStack Query Provider pour la gestion d'état serveur
// Inclut une sidebar responsive et une barre de filtres de dates
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* Date range filter bar */}
          <Suspense
            fallback={
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            }
          >
            <DateRangeFilter />
          </Suspense>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </Providers>
  );
}

