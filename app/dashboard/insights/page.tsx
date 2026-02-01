"use client";

/**
 * Page Insights - Documentation sur les patterns, calculs et limitations
 * 
 * Cette page explique:
 * - Quels patterns révèlent ces données
 * - Comment les analytics sont calculés
 * - Les compromis et limitations du système
 */

const SectionIcons = {
  patterns: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  calculations: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
    </svg>
  ),
  limitations: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  architecture: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  ),
};

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-accent-violet dark:text-accent-violet font-mono text-sm">
      {children}
    </code>
  );
}

export default function InsightsPage() {
  return (
    <div className="px-4 py-6 sm:px-0 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Insights & Méthodologie
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          Comprendre ce que chaque page révèle, comment les analytics sont calculés, et les limites du système. Référence pour importer vos données et exploiter au mieux le dashboard.
        </p>
      </header>

      <div className="space-y-6">
        {/* Section 1: Patterns révélés */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
                {SectionIcons.patterns}
              </span>
              Patterns Révélés par les Données
            </h2>
          </div>
          <div className="p-6 space-y-6 text-gray-600 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Vue d&apos;ensemble
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                La page <InlineCode>/dashboard/overview</InlineCode> affiche vos statistiques globales avec comparaison à la période précédente: total d&apos;écoutes, artistes et titres uniques, temps total. Un aperçu de l&apos;évolution récente (graphique en aires) et du top genres complète le tableau.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Timeline et Tendances Temporelles
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                Les pages <InlineCode>/dashboard/timeline</InlineCode> et <InlineCode>/dashboard/genres/trends</InlineCode> révèlent des cycles d&apos;écoute avec agrégation par jour, semaine ou mois:
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li><strong className="text-gray-900 dark:text-white">Cycles hebdomadaires:</strong> Jours de la semaine où vous écoutez le plus</li>
                <li><strong className="text-gray-900 dark:text-white">Variations saisonnières:</strong> Évolution mensuelle des habitudes</li>
                <li><strong className="text-gray-900 dark:text-white">Tendances de genres:</strong> Genres en hausse ou en baisse sur la période (comparaison première / seconde moitié)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Heatmap d&apos;écoute
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                La page <InlineCode>/dashboard/heatmap</InlineCode> affiche un calendrier style GitHub avec l&apos;intensité d&apos;écoute par jour. Elle identifie vos jours les plus actifs et la distribution par jour de la semaine.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Analyse temporelle avancée
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                La page <InlineCode>/dashboard/temporal-analysis</InlineCode> détaille vos patterns d&apos;écoute: écoutes par jour de la semaine (lundi-dimanche), par heure de la journée, et identifie les moments de pic (jour et heure où vous écoutez le plus).
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Diversité et préférences de genres
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                Les pages <InlineCode>/dashboard/genres</InlineCode> et <InlineCode>/genres/trends</InlineCode> révèlent l&apos;étendue de votre palette musicale: genres dominants, évolution temporelle, et diversité générique. Les métriques (artistes uniques, titres uniques) montrent l&apos;équilibre entre répétition et exploration.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Réseau d&apos;artistes
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                La page <InlineCode>/dashboard/network</InlineCode> visualise les connexions entre artistes: liens par genre partagé, par proximité d&apos;écoute (artistes écoutés à moins de 30 min d&apos;intervalle), et clusters musicaux révélant vos goûts cohérents.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Apple Music Replay
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                La page <InlineCode>/dashboard/replay</InlineCode> compare vos années Replay: top artistes, titres et albums par année, avec statistiques comparatives et identification des artistes communs entre années.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Calculs des analytics */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-indigo/15 text-accent-indigo">
                {SectionIcons.calculations}
              </span>
              Comment les Analytics sont Calculés
            </h2>
          </div>
          <div className="p-6 space-y-6 text-gray-600 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Agrégations Temporelles
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                Les agrégations utilisent des requêtes SQL natives PostgreSQL pour des performances optimales:
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li><strong className="text-gray-900 dark:text-white">Quotidien:</strong> <InlineCode>DATE(played_at)</InlineCode> pour regrouper par jour</li>
                <li><strong className="text-gray-900 dark:text-white">Hebdomadaire:</strong> <InlineCode>DATE_TRUNC(&apos;week&apos;, played_at)</InlineCode> pour regrouper par semaine (lundi-dimanche)</li>
                <li><strong className="text-gray-900 dark:text-white">Mensuel:</strong> <InlineCode>TO_CHAR(played_at, &apos;YYYY-MM&apos;)</InlineCode> pour regrouper par mois</li>
                <li><strong className="text-gray-900 dark:text-white">Comptages:</strong> Utilisation de <InlineCode>COUNT(*)</InlineCode> et <InlineCode>COUNT(DISTINCT ...)</InlineCode> pour les métriques agrégées</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Statistiques Globales
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                Les statistiques de vue d&apos;ensemble sont calculées ainsi:
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li><strong className="text-gray-900 dark:text-white">Total d&apos;écoutes:</strong> Compte total des enregistrements dans la table <InlineCode>Listen</InlineCode></li>
                <li><strong className="text-gray-900 dark:text-white">Artistes uniques:</strong> Compte distinct des <InlineCode>artist_id</InlineCode> via les pistes écoutées</li>
                <li><strong className="text-gray-900 dark:text-white">Titres uniques:</strong> Compte distinct des <InlineCode>track_id</InlineCode></li>
                <li><strong className="text-gray-900 dark:text-white">Temps total:</strong> Somme des durées des pistes (en secondes) pour toutes les écoutes</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Réseau d&apos;Artistes
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                Le graphe de réseau utilise deux types de connexions:
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li><strong className="text-gray-900 dark:text-white">Connexions par genre:</strong> Deux artistes sont connectés s&apos;ils partagent au moins un genre dans le mapping</li>
                <li><strong className="text-gray-900 dark:text-white">Connexions par proximité:</strong> Deux artistes sont connectés s&apos;ils sont écoutés dans une fenêtre temporelle (par défaut 30 minutes)</li>
                <li><strong className="text-gray-900 dark:text-white">Poids des arêtes:</strong> Pour les connexions de proximité, le poids est le nombre de fois où les artistes ont été écoutés proches dans le temps</li>
                <li><strong className="text-gray-900 dark:text-white">Fusion:</strong> Les connexions par genre et proximité sont fusionnées, avec un poids combiné</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Distribution des Genres
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                Les genres suivent une résolution en cascade avec priorité:
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li><strong className="text-gray-900 dark:text-white">1. Track.genre:</strong> Genre stocké sur la piste (depuis Last.fm lors de l&apos;import ou via le script <InlineCode>fetch-track-genres.js</InlineCode> utilisant Last.fm, MusicBrainz, Spotify)</li>
                <li><strong className="text-gray-900 dark:text-white">2. ARTIST_TO_GENRE_MAP:</strong> Mapping statique artisanal par nom d&apos;artiste (fallback si Track.genre est null)</li>
                <li><strong className="text-gray-900 dark:text-white">3. &quot;Unknown&quot;:</strong> Si aucun des deux n&apos;est disponible</li>
                <li>Les écoutes sont agrégées par genre résolu; les pourcentages sont calculés sur le total d&apos;écoutes</li>
              </ul>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Pour enrichir les genres: <InlineCode>node scripts/fetch-track-genres.js</InlineCode> (requiert LASTFM_API_KEY)
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Export de Données
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                Les exports sont disponibles dans la barre de filtres (icônes CSV, JSON, PDF):
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li><strong className="text-gray-900 dark:text-white">CSV:</strong> Toutes les écoutes avec Date, Artiste, Titre, Genre, Source (filtres de période appliqués)</li>
                <li><strong className="text-gray-900 dark:text-white">JSON:</strong> Statistiques agrégées (overview, timeline, genres) au format structuré</li>
                <li><strong className="text-gray-900 dark:text-white">PDF:</strong> Rapport annuel personnalisé avec graphiques et top artistes/titres par année</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Limitations et compromis */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-rose/15 text-accent-rose">
                {SectionIcons.limitations}
              </span>
              Limitations et Compromis
            </h2>
          </div>
          <div className="p-6 space-y-6 text-gray-600 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Mapping de Genres
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Limitation:</strong> Le fallback <InlineCode>ARTIST_TO_GENRE_MAP</InlineCode> ne couvre qu&apos;une poignée d&apos;artistes populaires. Les pistes sans genre dans la base restent classées &quot;Unknown&quot; tant que le script <InlineCode>fetch-track-genres.js</InlineCode> n&apos;a pas été exécuté.
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Impact:</strong> Une partie des artistes/pistes peut apparaître en &quot;Unknown&quot;, ce qui réduit la finesse de l&apos;analyse par genre.
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                <strong>Solution actuelle:</strong> Exécuter <InlineCode>node scripts/fetch-track-genres.js</InlineCode> avec LASTFM_API_KEY pour enrichir les genres via Last.fm, MusicBrainz et Spotify (optionnel).
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Fenêtre de Proximité Fixe (Réseau d&apos;artistes)
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Limitation:</strong> La fenêtre de proximité est fixée à 30 minutes (<InlineCode>DEFAULT_PROXIMITY_WINDOW_MINUTES</InlineCode> dans <InlineCode>lib/constants/config.ts</InlineCode>). Les artistes écoutés dans cette fenêtre sont considérés comme &quot;liés&quot;.
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Impact:</strong> Des connexions peuvent être manquées si l&apos;écart dépasse 30 min, ou créées par coïncidence si deux artistes non liés sont écoutés à proximité.
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                <strong>Amélioration possible:</strong> Fenêtre configurable ou adaptative selon les patterns d&apos;écoute.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Sources de Données
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Actuellement:</strong> Deux sources sont supportées: <strong>Last.fm</strong> (API réelle quand <InlineCode>LASTFM_API_KEY</InlineCode> est configurée, mock sinon pour le développement) et <strong>Apple Music Replay</strong> (import manuel via <InlineCode>/api/replay/import</InlineCode> avec JSON des résumés annuels).
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Impact:</strong> Les données peuvent être incomplètes si vous utilisez principalement Spotify, YouTube Music ou d&apos;autres plateformes sans historique Last.fm.
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                <strong>Extensions futures:</strong> Support Spotify (OAuth requis), YouTube Music, etc. Voir <InlineCode>docs/FEATURES_ROADMAP.md</InlineCode>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Calcul du Temps d&apos;Écoute
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Limitation:</strong> Le temps total d&apos;écoute est estimé en sommant les durées des pistes, sans tenir compte des interruptions ou écoutes partielles.
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Impact:</strong> Le temps calculé peut surestimer le temps réellement passé à écouter si les pistes sont souvent interrompues ou partiellement écoutées.
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                <strong>Amélioration possible:</strong> Utilisation de données de progression d&apos;écoute si disponibles dans les sources.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Performance des Requêtes
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Compromis:</strong> Les agrégations complexes (notamment le réseau d&apos;artistes avec proximité) nécessitent de charger toutes les écoutes en mémoire pour les calculs.
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Impact:</strong> Les performances peuvent se dégrader avec de très grandes quantités de données (millions d&apos;écoutes).
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                <strong>Optimisations possibles:</strong> Utilisation de vues matérialisées, index supplémentaires, ou calculs asynchrones pour les grandes données.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Normalisation des Données
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Limitation:</strong> La normalisation des noms d&apos;artistes et de pistes dépend de la correspondance exacte des chaînes de caractères.
              </p>
              <p className="mb-2 text-sm leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Impact:</strong> Des variantes de noms (par exemple &quot;The Weeknd&quot; vs &quot;Weeknd&quot;) peuvent créer des duplications dans les statistiques.
              </p>
              <p className="mb-2 text-sm italic text-gray-500 dark:text-gray-400">
                <strong>Amélioration possible:</strong> Utilisation d&apos;identifiants MusicBrainz (MBID) ou d&apos;algorithmes de fuzzy matching pour la déduplication.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Architecture technique */}
        <section className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan">
                {SectionIcons.architecture}
              </span>
              Architecture Technique
            </h2>
          </div>
          <div className="p-6 space-y-6 text-gray-600 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Stack Technologique
              </h3>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li><strong className="text-gray-900 dark:text-white">Backend:</strong> Next.js 14 (App Router) avec API Routes</li>
                <li><strong className="text-gray-900 dark:text-white">Base de données:</strong> PostgreSQL avec Prisma ORM</li>
                <li><strong className="text-gray-900 dark:text-white">Cache:</strong> Redis préparé (optionnel, <InlineCode>REDIS_URL</InlineCode>); TanStack Query pour le cache côté client</li>
                <li><strong className="text-gray-900 dark:text-white">Frontend:</strong> React 18, TanStack Query v5, Tailwind CSS, Sonner (toasts)</li>
                <li><strong className="text-gray-900 dark:text-white">Visualisation:</strong> Recharts (lignes, barres, aires, camemberts), react-force-graph-2d (réseau d&apos;artistes)</li>
                <li><strong className="text-gray-900 dark:text-white">API:</strong> Documentation Swagger via <InlineCode>/api-docs</InlineCode></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Modèle de Données
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                Schéma normalisé (Prisma) pour éviter la redondance:
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li><strong className="text-gray-900 dark:text-white">Artist:</strong> nom, nameLower (recherche insensible à la casse), MBID, imageUrl</li>
                <li><strong className="text-gray-900 dark:text-white">Track:</strong> titre, artiste, durée, genre (Last.fm ou script), MBID</li>
                <li><strong className="text-gray-900 dark:text-white">Listen:</strong> timestamp (<InlineCode>playedAt</InlineCode>), source (lastfm | apple_music_replay), lien vers Track</li>
                <li><strong className="text-gray-900 dark:text-white">ReplayYearly:</strong> année, totaux; relié à ReplayTopArtist, ReplayTopTrack, ReplayTopAlbum</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2 text-gray-900 dark:text-white">
                Import de Données
              </h3>
              <p className="mb-2 text-sm leading-relaxed">
                Pour alimenter le dashboard:
              </p>
              <ul className="space-y-2 ml-4 list-disc text-sm">
                <li><strong className="text-gray-900 dark:text-white">Last.fm:</strong> <InlineCode>node scripts/import-lastfm.js</InlineCode> ou API <InlineCode>POST /api/lastfm/import</InlineCode> (requiert LASTFM_API_KEY et LASTFM_USER)</li>
                <li><strong className="text-gray-900 dark:text-white">Apple Music Replay:</strong> Import manuel du JSON annuel via <InlineCode>POST /api/replay/import</InlineCode></li>
                <li><strong className="text-gray-900 dark:text-white">Genres:</strong> <InlineCode>node scripts/fetch-track-genres.js</InlineCode> pour enrichir les genres via Last.fm/MusicBrainz/Spotify</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

