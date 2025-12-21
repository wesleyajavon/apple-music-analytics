export default function GenresPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Genres
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Répartition de vos écoutes par genre musical
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Visualisation des genres à venir...
        </p>
      </div>
    </div>
  );
}

