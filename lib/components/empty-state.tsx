/**
 * Composant réutilisable pour afficher un état vide avec messages contextuels,
 * actions suggérées et illustrations (emoji ou SVG).
 */

"use client";

import Link from "next/link";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  /** Message principal */
  message?: string;
  /** Description ou précision contextuelle */
  description?: string;
  /** Emoji ou caractère d’illustration (ignoré si illustration est fourni) */
  icon?: string;
  /** Illustration personnalisée (SVG, composant). Si fourni, remplace icon. */
  illustration?: React.ReactNode;
  /** Actions suggérées (boutons/liens) */
  actions?: EmptyStateAction[];
  className?: string;
}

/** Illustrations SVG légères pour les états vides */
const ILLUSTRATIONS = {
  /** Données / statistiques */
  stats: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  /** Calendrier / dates */
  calendar: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  /** Filtre / période */
  filter: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  ),
  /** Réseau / graphe */
  network: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  ),
  /** Musique / écoute */
  music: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  ),
  /** Replay / comparaison */
  replay: (
    <svg
      className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
} as const;

export type EmptyStateIllustrationKey = keyof typeof ILLUSTRATIONS;

export function EmptyState({
  message = "Aucune donnée disponible",
  description,
  icon = "📭",
  illustration,
  actions,
  className = "",
}: EmptyStateProps) {
  const visual = illustration ?? (
    <div
      className="text-6xl mb-6 transform transition-transform hover:scale-110 duration-300"
      aria-hidden
    >
      {icon}
    </div>
  );

  return (
    <div
      className={`flex items-center justify-center py-16 ${className}`}
      role="status"
      aria-label={message}
    >
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6 flex justify-center [&>svg]:shrink-0">
          {visual}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {message}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {description}
          </p>
        )}
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {actions.map((action, idx) => {
              const isPrimary = idx === 0;
              if (action.href) {
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={
                      isPrimary
                        ? "inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                        : "inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    }
                  >
                    {action.label}
                  </Link>
                );
              }
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={
                    isPrimary
                      ? "inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                      : "inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  }
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Presets contextuels (message, description, icon/illustration, actions) pour réutilisation */
export const emptyStatePresets = {
  /** Aucune donnée d’écoute : inviter à importer (Last.fm / Replay) */
  importData: {
    message: "Aucune donnée d'écoute disponible",
    description:
      "Importez vos données Last.fm ou Apple Music Replay pour voir vos statistiques.",
    illustration: ILLUSTRATIONS.stats,
    actions: [
      { label: "Importer vos données", href: "/api-docs" },
    ] as EmptyStateAction[],
  },
  /** Aucune donnée Replay : inviter à importer Replay */
  importReplay: {
    message: "Aucune donnée Replay disponible",
    description:
      "Importez vos données Apple Music Replay pour comparer vos années d'écoute.",
    illustration: ILLUSTRATIONS.replay,
    actions: [{ label: "Voir comment importer Replay", href: "/api-docs" }] as EmptyStateAction[],
  },
  /** Aucun résultat pour la période : inviter à modifier les dates */
  changeDates: (basePath: string) => ({
    message: "Aucune donnée pour cette période",
    description: "Modifiez les dates ou la période dans la barre de filtres pour afficher des résultats.",
    illustration: ILLUSTRATIONS.filter,
    actions: [{ label: "Modifier les dates", href: basePath }] as EmptyStateAction[],
  }),
  /** Aucune écoute pour une date précise (ex. détail heatmap) */
  noDayDetail: {
    message: "Aucune écoute trouvée pour cette date",
    description: "Choisissez une autre date dans le calendrier pour voir le détail.",
    illustration: ILLUSTRATIONS.music,
  },
  /** Réseau d’artistes vide */
  noNetwork: {
    message: "Aucune donnée pour visualiser le réseau d'artistes",
    description:
      "Assurez-vous d'avoir des écoutes avec des connexions entre artistes. Importez ou étendez vos données si besoin.",
    illustration: ILLUSTRATIONS.network,
    actions: [{ label: "Voir la doc d'import", href: "/api-docs" }] as EmptyStateAction[],
  },
} as const;

export { ILLUSTRATIONS };
