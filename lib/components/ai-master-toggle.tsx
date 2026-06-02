"use client";

import { usePathname } from "@/i18n/navigation";
import { AiMasterToggleSwitch } from "@/lib/components/ai-master-toggle-switch";

/**
 * Toggle bas droite (desktop uniquement). Sur mobile, utiliser le menu Plus du dashboard.
 */
export function AiMasterToggle() {
  const pathname = usePathname();
  const isOnboarding = pathname.includes("/dashboard/onboarding");

  if (isOnboarding) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] hidden max-w-[min(100vw-2rem,20rem)] items-center gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 text-sm shadow-lg backdrop-blur-sm lg:flex"
      role="presentation"
    >
      <AiMasterToggleSwitch />
    </div>
  );
}
