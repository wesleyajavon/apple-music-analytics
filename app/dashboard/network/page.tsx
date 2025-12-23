export default function NetworkPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Réseau d&apos;artistes
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Visualisation des connexions entre vos artistes écoutés
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div id="network-graph" className="w-full h-96">
          <p className="text-gray-600 dark:text-gray-400">
            Graphique de réseau avec D3.js à venir...
          </p>
        </div>
      </div>
    </div>
  );
}

