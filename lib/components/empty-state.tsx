/**
 * Composant réutilisable pour afficher un état vide
 */

interface EmptyStateProps {
  message?: string;
  icon?: string;
  className?: string;
}

export function EmptyState({
  message = "Aucune donnée disponible",
  icon = "📭",
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="text-center">
        <div className="text-4xl mb-4">{icon}</div>
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

