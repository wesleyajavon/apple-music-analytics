/**
 * Composant réutilisable pour afficher un état d'erreur
 */

interface ErrorStateProps {
  error: Error | null;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  error,
  message = "Une erreur est survenue lors du chargement des données",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-6xl mb-6">⚠️</div>
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3">
          {message}
        </h3>
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300 font-mono break-words">
              {error.message}
            </p>
          </div>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors font-medium shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

