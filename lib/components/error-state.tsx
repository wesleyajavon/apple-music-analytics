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
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-600 dark:text-red-400 font-medium mb-2">
          {message}
        </p>
        {error && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {error.message}
          </p>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

