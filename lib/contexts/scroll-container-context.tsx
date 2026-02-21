"use client";

import { createContext, useContext, useRef, type RefObject } from "react";

const ScrollContainerContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function useScrollContainer() {
  return useContext(ScrollContainerContext);
}

export function ScrollContainerProvider({
  containerRef,
  children,
}: {
  containerRef: RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  return (
    <ScrollContainerContext.Provider value={containerRef}>
      {children}
    </ScrollContainerContext.Provider>
  );
}
