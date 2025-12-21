export default function ReplayPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Apple Music Replay
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Données importées depuis Apple Music Replay
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Importer des données</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Importez vos données Apple Music Replay annuelles
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Importer Replay
          </button>
        </div>
      </div>
    </div>
  );
}

