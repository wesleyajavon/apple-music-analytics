import Link from "next/link";
import { Providers } from "../providers";

// Layout partagé pour toutes les pages du dashboard
// Wrappe les pages avec TanStack Query Provider pour la gestion d'état serveur
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { href: "/dashboard/overview", label: "Vue d'ensemble" },
    { href: "/dashboard/timeline", label: "Timeline" },
    { href: "/dashboard/genres", label: "Genres" },
    { href: "/dashboard/replay", label: "Replay" },
    { href: "/dashboard/network", label: "Réseau" },
  ];

  return (
    <Providers>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link
                  href="/dashboard"
                  className="flex items-center px-2 py-2 text-xl font-semibold text-gray-900 dark:text-white"
                >
                  🎵 Analytics
                </Link>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </Providers>
  );
}

