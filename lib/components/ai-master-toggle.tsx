"use client";

import { useRef } from "react";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { AiMasterToggleSwitch } from "@/lib/components/ai-master-toggle-switch";
import { useDraggableFloatingPosition } from "@/lib/hooks/use-draggable-floating-position";

/**
 * Toggle bas droite (desktop uniquement). Sur mobile, utiliser le menu Plus du dashboard.
 */
export function AiMasterToggle() {
  const pathname = usePathname();
  const t = useTranslations("aiMasterToggle");
  const isOnboarding = pathname.includes("/dashboard/onboarding");
  const containerRef = useRef<HTMLDivElement>(null);
  const { style, isDragging, dragHandleProps } = useDraggableFloatingPosition(containerRef);

  if (isOnboarding) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={style}
      className={`fixed z-[100] hidden max-w-[min(100vw-2rem,20rem)] items-center gap-2 rounded-2xl border border-border bg-background/95 px-3 py-3 text-sm shadow-lg backdrop-blur-sm lg:flex ${
        isDragging ? "select-none" : ""
      }`}
      role="presentation"
    >
      <button
        type="button"
        aria-label={t("dragHandleAriaLabel")}
        className={`touch-none shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        {...dragHandleProps}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <AiMasterToggleSwitch />
    </div>
  );
}
