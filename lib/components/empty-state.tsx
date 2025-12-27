/**
 * Composant réutilisable pour afficher un état vide
 */

interface EmptyStateProps {
  message?: string;
  icon?: string;
  className?: string;
  description?: string;
}

export function EmptyState({
  message = "Aucune donnée disponible",
  icon = "📭",
  className = "",
  description,
}: EmptyStateProps) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-6xl mb-6 transform transition-transform hover:scale-110 duration-300">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {message}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

