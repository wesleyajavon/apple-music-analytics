/**
 * Composant réutilisable pour afficher un état de chargement
 */

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Chargement des données...",
  className = "",
}: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="text-center">
        <div className="inline-block relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full bg-blue-600 dark:bg-blue-500 opacity-75"></div>
          </div>
        </div>
        <p className="text-base font-medium text-gray-700 dark:text-gray-300">{message}</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Veuillez patienter...
        </p>
      </div>
    </div>
  );
}

