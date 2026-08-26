"use client";

import { usePathname } from "@/i18n/navigation";

export function DashboardMainArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname.includes("/dashboard/onboarding");
  const isAskSoundprint = pathname.includes("/dashboard/ask-your-soundprint");

  const contentClass = isOnboarding
    ? "p-4 pb-4 lg:p-8 lg:pb-8"
    : isAskSoundprint
      ? "p-0 lg:flex lg:h-[calc(100dvh-var(--dashboard-filter-height,0px))] lg:flex-col lg:overflow-hidden"
      : "p-4 lg:p-8 lg:pb-8";

  return (
    <main className="min-w-0">
      <div className={contentClass}>{children}</div>
    </main>
  );
}
