"use client";

import { useCallback, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";

export type DashboardSectionItem<T extends string> = {
  id: T;
  label: string;
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
        className={`${DASHBOARD_SEGMENTED_TRACK} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {items.map((item) => {
          const isActive = item.id === activeView;
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
              className={isActive ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}
            >
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
