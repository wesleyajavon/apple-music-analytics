"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Provider TanStack Query avec configuration optimisée pour un dashboard analytique
// staleTime: 60s pour réduire les requêtes inutiles sur des données qui changent peu
// refetchOnWindowFocus: false pour éviter les rechargements lors du changement d'onglet
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

