import { DashboardScrollWrapper } from "@/lib/components/dashboard-scroll-wrapper";

// Layout partagé pour toutes les pages du dashboard
// Inclut une sidebar responsive et une barre de filtres de dates
// ThemeProvider et QueryClientProvider sont dans app/layout.tsx via Providers
// DashboardScrollWrapper fournit le ref du main pour la barre de progression (overview-bis)
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardScrollWrapper>{children}</DashboardScrollWrapper>;
}

