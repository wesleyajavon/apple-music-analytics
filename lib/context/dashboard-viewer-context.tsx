"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

const DashboardViewerUserIdContext = createContext<string | undefined>(undefined);

export function DashboardViewerProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const userId = useMemo(
    () => searchParams.get("userId") ?? undefined,
    [searchParams]
  );

  return (
    <DashboardViewerUserIdContext.Provider value={userId}>
      {children}
    </DashboardViewerUserIdContext.Provider>
  );
}

/** Optional `userId` from the dashboard URL (e.g. public profile demo). */
export function useDashboardViewerUserId(): string | undefined {
  return useContext(DashboardViewerUserIdContext);
}
