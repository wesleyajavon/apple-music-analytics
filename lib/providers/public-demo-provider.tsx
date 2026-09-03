"use client";

import { createContext, useContext, useMemo } from "react";
import { withPublicDemoUserId } from "@/lib/constants/public-profile";

type PublicDemoContextValue = {
  publicProfileUserId: string | null;
  publicDemoOverviewPath: string | null;
  hrefWithPublicDemo: (href: string) => string | null;
};

const PublicDemoContext = createContext<PublicDemoContextValue>({
  publicProfileUserId: null,
  publicDemoOverviewPath: null,
  hrefWithPublicDemo: () => null,
});

export function PublicDemoProvider({
  publicProfileUserId,
  children,
}: {
  publicProfileUserId: string | null;
  children: React.ReactNode;
}) {
  const value = useMemo(
    (): PublicDemoContextValue => ({
      publicProfileUserId,
      publicDemoOverviewPath: publicProfileUserId
        ? withPublicDemoUserId("/dashboard/overview", publicProfileUserId)
        : null,
      hrefWithPublicDemo: (href: string) =>
        publicProfileUserId ? withPublicDemoUserId(href, publicProfileUserId) : null,
    }),
    [publicProfileUserId],
  );

  return (
    <PublicDemoContext.Provider value={value}>{children}</PublicDemoContext.Provider>
  );
}

export function usePublicDemo(): PublicDemoContextValue {
  return useContext(PublicDemoContext);
}
