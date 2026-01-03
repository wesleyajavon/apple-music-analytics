'use client';

import { useEffect, useState } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

/**
 * Page de documentation Swagger UI
 * Affiche une interface interactive pour explorer et tester les routes API
 */
export default function ApiDocsPage() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/swagger')
      .then((res) => res.json())
      .then((data) => {
        setSpec(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading Swagger spec:', err);
        setError('Erreur lors du chargement de la documentation API');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement de la documentation...</p>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Erreur
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{error || 'Documentation non disponible'}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Assurez-vous que le serveur de développement est démarré et que les dépendances Swagger sont installées.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <SwaggerUI spec={spec} />
    </div>
  );
}

