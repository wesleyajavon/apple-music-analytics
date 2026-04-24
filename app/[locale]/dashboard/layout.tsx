import { DashboardScrollWrapper } from "@/lib/components/dashboard-scroll-wrapper";

// Layout partagé pour toutes les pages du dashboard
// Inclut une sidebar responsive et une barre de filtres de dates
// ThemeProvider et QueryClientProvider sont dans app/layout.tsx via Providers
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardScrollWrapper>{children}</DashboardScrollWrapper>;
}

