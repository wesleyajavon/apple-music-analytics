"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Provider TanStack Query avec configuration optimisée pour un dashboard analytique
// staleTime: 60s pour réduire les requêtes inutiles sur des données qui changent peu
// refetchOnWindowFocus: false pour éviter les rechargements lors du changement d'onglet
// retry: 1 pour permettre un seul retry en cas d'erreur réseau
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 60 secondes
            refetchOnWindowFocus: false,
            retry: 1, // Un seul retry en cas d'erreur
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

