"use client";

/**
 * Page Insights - Documentation sur les patterns, calculs et limitations
 * 
 * Cette page explique:
 * - Quels patterns révèlent ces données
 * - Comment les analytics sont calculés
 * - Les compromis et limitations du système
 */

export default function InsightsPage() {
  return (
    <div className="px-4 py-6 sm:px-0 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Insights & Méthodologie
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Comprendre les patterns, calculs et limitations de vos données musicales
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Patterns révélés */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🔍</span>
            Patterns Révélés par les Données
          </h2>
          
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Tendances Temporelles
              </h3>
              <p className="mb-2">
                Les agrégations quotidiennes, hebdomadaires et mensuelles révèlent des cycles d&apos;écoute significatifs:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Cycles hebdomadaires:</strong> Identification des jours de la semaine où vous écoutez le plus de musique</li>
                <li><strong>Variations saisonnières:</strong> Évolution mensuelle des habitudes d&apos;écoute</li>
                <li><strong>Pics d&apos;activité:</strong> Moments où l&apos;écoute est la plus intense</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Diversité Musicale
              </h3>
              <p className="mb-2">
                Les métriques de diversité révèlent l&apos;étendue de votre palette musicale:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Artistes uniques:</strong> Nombre total d&apos;artistes découverts</li>
                <li><strong>Titres uniques:</strong> Diversité des morceaux écoutés</li>
                <li><strong>Ratio écoute/diversité:</strong> Équilibre entre répétition et exploration</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Réseau d&apos;Artistes
              </h3>
              <p className="mb-2">
                Le graphe de réseau d&apos;artistes révèle des connexions subtiles:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Connexions par genre:</strong> Artistes partageant des genres communs</li>
                <li><strong>Proximité d&apos;écoute:</strong> Artistes écoutés dans des sessions proches dans le temps</li>
                <li><strong>Clusters musicaux:</strong> Groupes d&apos;artistes liés, révélant vos goûts musicaux cohérents</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Préférences de Genres
              </h3>
              <p className="mb-2">
                La distribution des genres révèle vos préférences musicales dominantes:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Genres dominants:</strong> Styles musicaux les plus écoutés</li>
                <li><strong>Évolution temporelle:</strong> Changements dans les préférences au fil du temps</li>
                <li><strong>Diversité générique:</strong> Éventail des styles musicaux explorés</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Calculs des analytics */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>⚙️</span>
            Comment les Analytics sont Calculés
          </h2>
          
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Agrégations Temporelles
              </h3>
              <p className="mb-2">
                Les agrégations utilisent des requêtes SQL natives PostgreSQL pour des performances optimales:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Quotidien:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">DATE(played_at)</code> pour regrouper par jour</li>
                <li><strong>Hebdomadaire:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">DATE_TRUNC(&apos;week&apos;, played_at)</code> pour regrouper par semaine (lundi-dimanche)</li>
                <li><strong>Mensuel:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">TO_CHAR(played_at, &apos;YYYY-MM&apos;)</code> pour regrouper par mois</li>
                <li><strong>Comptages:</strong> Utilisation de <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">COUNT(*)</code> et <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">COUNT(DISTINCT ...)</code> pour les métriques agrégées</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Statistiques Globales
              </h3>
              <p className="mb-2">
                Les statistiques de vue d&apos;ensemble sont calculées ainsi:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Total d&apos;écoutes:</strong> Compte total des enregistrements dans la table <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Listen</code></li>
                <li><strong>Artistes uniques:</strong> Compte distinct des <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">artist_id</code> via les pistes écoutées</li>
                <li><strong>Titres uniques:</strong> Compte distinct des <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">track_id</code></li>
                <li><strong>Temps total:</strong> Somme des durées des pistes (en secondes) pour toutes les écoutes</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Réseau d&apos;Artistes
              </h3>
              <p className="mb-2">
                Le graphe de réseau utilise deux types de connexions:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Connexions par genre:</strong> Deux artistes sont connectés s&apos;ils partagent au moins un genre dans le mapping</li>
                <li><strong>Connexions par proximité:</strong> Deux artistes sont connectés s&apos;ils sont écoutés dans une fenêtre temporelle (par défaut 30 minutes)</li>
                <li><strong>Poids des arêtes:</strong> Pour les connexions de proximité, le poids est le nombre de fois où les artistes ont été écoutés proches dans le temps</li>
                <li><strong>Fusion:</strong> Les connexions par genre et proximité sont fusionnées, avec un poids combiné</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Distribution des Genres
              </h3>
              <p className="mb-2">
                Les genres sont calculés via un mapping artisanal:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Chaque artiste est associé à un genre via un dictionnaire statique</li>
                <li>Les écoutes sont comptées par artiste, puis agrégées par genre</li>
                <li>Les pourcentages sont calculés par rapport au total d&apos;écoutes</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Limitations et compromis */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>⚠️</span>
            Limitations et Compromis
          </h2>
          
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Mapping de Genres Simplifié
              </h3>
              <p className="mb-2">
                <strong>Limitation:</strong> Le système utilise un mapping statique artisanal d&apos;artistes vers genres, limité à quelques artistes populaires.
              </p>
              <p className="mb-2">
                <strong>Impact:</strong> Beaucoup d&apos;artistes sont classés comme &quot;Unknown&quot;, réduisant la précision de l&apos;analyse des genres.
              </p>
              <p className="mb-2 text-sm italic">
                <strong>Solution future:</strong> Intégration avec des APIs de métadonnées musicales (Last.fm, MusicBrainz) pour obtenir les genres de manière automatique.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Fenêtre de Proximité Fixe
              </h3>
              <p className="mb-2">
                <strong>Limitation:</strong> La fenêtre de proximité pour les connexions d&apos;artistes est fixée à 30 minutes par défaut.
              </p>
              <p className="mb-2">
                <strong>Impact:</strong> Des connexions significatives peuvent être manquées si les artistes sont écoutés avec un écart légèrement supérieur, ou inversement, des connexions peuvent être créées par coïncidence.
              </p>
              <p className="mb-2 text-sm italic">
                <strong>Amélioration possible:</strong> Utilisation de fenêtres adaptatives basées sur les patterns d&apos;écoute individuels.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Sources de Données Limitées
              </h3>
              <p className="mb-2">
                <strong>Limitation:</strong> Actuellement, seules deux sources sont supportées: Last.fm (mock) et Apple Music Replay.
              </p>
              <p className="mb-2">
                <strong>Impact:</strong> Les données peuvent être incomplètes si vous utilisez d&apos;autres plateformes de streaming ou méthodes d&apos;écoute.
              </p>
              <p className="mb-2 text-sm italic">
                <strong>Extensions futures:</strong> Support pour Spotify, YouTube Music, et autres plateformes via leurs APIs respectives.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Calcul du Temps d&apos;Écoute
              </h3>
              <p className="mb-2">
                <strong>Limitation:</strong> Le temps total d&apos;écoute est estimé en sommant les durées des pistes, sans tenir compte des interruptions ou écoutes partielles.
              </p>
              <p className="mb-2">
                <strong>Impact:</strong> Le temps calculé peut surestimer le temps réellement passé à écouter si les pistes sont souvent interrompues ou partiellement écoutées.
              </p>
              <p className="mb-2 text-sm italic">
                <strong>Amélioration possible:</strong> Utilisation de données de progression d&apos;écoute si disponibles dans les sources.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Performance des Requêtes
              </h3>
              <p className="mb-2">
                <strong>Compromis:</strong> Les agrégations complexes (notamment le réseau d&apos;artistes avec proximité) nécessitent de charger toutes les écoutes en mémoire pour les calculs.
              </p>
              <p className="mb-2">
                <strong>Impact:</strong> Les performances peuvent se dégrader avec de très grandes quantités de données (millions d&apos;écoutes).
              </p>
              <p className="mb-2 text-sm italic">
                <strong>Optimisations possibles:</strong> Utilisation de vues matérialisées, index supplémentaires, ou calculs asynchrones pour les grandes données.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Normalisation des Données
              </h3>
              <p className="mb-2">
                <strong>Limitation:</strong> La normalisation des noms d&apos;artistes et de pistes dépend de la correspondance exacte des chaînes de caractères.
              </p>
              <p className="mb-2">
                <strong>Impact:</strong> Des variantes de noms (par exemple &quot;The Weeknd&quot; vs &quot;Weeknd&quot;) peuvent créer des duplications dans les statistiques.
              </p>
              <p className="mb-2 text-sm italic">
                <strong>Amélioration possible:</strong> Utilisation d&apos;identifiants MusicBrainz (MBID) ou d&apos;algorithmes de fuzzy matching pour la déduplication.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Architecture technique */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>🏗️</span>
            Architecture Technique
          </h2>
          
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Stack Technologique
              </h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Backend:</strong> Next.js avec API Routes</li>
                <li><strong>Base de données:</strong> PostgreSQL avec Prisma ORM</li>
                <li><strong>Frontend:</strong> React avec TanStack Query pour la gestion d&apos;état</li>
                <li><strong>Visualisation:</strong> Bibliothèques de graphes pour le réseau d&apos;artistes</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                Modèle de Données
              </h3>
              <p className="mb-2">
                Le schéma normalisé sépare les entités pour éviter la redondance:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Artist:</strong> Informations sur les artistes (nom, image, MBID)</li>
                <li><strong>Track:</strong> Informations sur les pistes (titre, durée, référence à l&apos;artiste)</li>
                <li><strong>Listen:</strong> Enregistrements d&apos;écoute individuels (timestamp, source, référence à la piste)</li>
                <li><strong>ReplayYearly:</strong> Résumés annuels Apple Music Replay avec top artists/tracks/albums</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

