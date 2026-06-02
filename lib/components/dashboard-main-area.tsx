"use client";

import { usePathname } from "@/i18n/navigation";

export function DashboardMainArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname.includes("/dashboard/onboarding");

  const contentClass = isOnboarding
    ? "p-4 pb-32 sm:p-6 lg:p-8 lg:pb-8"
    : "p-4 pb-20 sm:p-6 sm:pb-6 lg:p-8 lg:pb-8";

  return (
    <main className="min-w-0">
      <div className={contentClass}>{children}</div>
    </main>
  );
}
