"use client";

import { useCallback, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { LucideIcon } from "lucide-react";

export type DashboardSectionItem<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
};

export function useDashboardSectionView<T extends string>(
  available: readonly T[],
  fallback: T
): {
  activeView: T;
  setView: (view: T) => void;
} {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = searchParams.get("view");
  const activeView =
    requested && available.includes(requested as T) ? (requested as T) : fallback;

  const setView = useCallback(
    (view: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === fallback) {
        params.delete("view");
      } else {
        params.set("view", view);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [fallback, pathname, router, searchParams]
  );

  return { activeView, setView };
}

type DashboardSectionSwitcherProps<T extends string> = {
  items: DashboardSectionItem<T>[];
  activeView: T;
  onChange: (view: T) => void;
  idPrefix: string;
  navLabel: string;
};

export function DashboardSectionSwitcher<T extends string>({
  items,
  activeView,
  onChange,
  idPrefix,
  navLabel,
}: DashboardSectionSwitcherProps<T>) {
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const index = items.findIndex((item) => item.id === activeView);
      if (index < 0 || items.length <= 1) return;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onChange(items[(index + 1) % items.length].id);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onChange(items[(index - 1 + items.length) % items.length].id);
      } else if (event.key === "Home") {
        event.preventDefault();
        onChange(items[0].id);
      } else if (event.key === "End") {
        event.preventDefault();
        onChange(items[items.length - 1].id);
      }
    },
    [activeView, items, onChange]
  );

  if (items.length === 0) return null;

  return (
    <nav aria-label={navLabel} className="space-y-2">
      <div
        role="tablist"
        aria-label={navLabel}
        onKeyDown={onKeyDown}
        className="flex gap-2 overflow-x-auto rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-2 shadow-sm backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] dark:border-white/[0.08] dark:bg-[#0a0c14]/90 sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const isActive = item.id === activeView;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`${idPrefix}-panel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(item.id)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 sm:px-4 ${
                isActive
                  ? "border-accent-violet/25 bg-accent-violet/10 text-accent-violet dark:border-violet-400/25 dark:bg-violet-500/15 dark:text-violet-100"
                  : "border-transparent text-slate-500 hover:border-slate-200/80 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.04] dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function DashboardSectionPanel<T extends string>({
  view,
  activeView,
  idPrefix,
  children,
}: {
  view: T;
  activeView: T;
  idPrefix: string;
  children: ReactNode;
}) {
  if (view !== activeView) return null;

  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${view}`}
      aria-labelledby={`${idPrefix}-tab-${view}`}
    >
      {children}
    </div>
  );
}
