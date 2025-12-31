#!/usr/bin/env node

/**
 * Script pour récupérer et mettre à jour les genres des tracks depuis l'API Last.fm, MusicBrainz et Spotify
 * 
 * Ce script parcourt tous les tracks dans la base de données qui n'ont pas de genre (genre IS NULL)
 * et utilise plusieurs sources pour obtenir leur genre réel :
 * 1. Last.fm track.getInfo (genres au niveau track)
 * 2. MusicBrainz (genres au niveau track, fallback sur artiste)
 * 3. Spotify (genres au niveau artiste, optionnel si configuré)
 * 
 * Configuration:
 * - LASTFM_API_KEY: Clé API Last.fm (requis)
 * - MUSICBRAINZ_USER_AGENT: User-Agent pour MusicBrainz (optionnel, a une valeur par défaut)
 * - SPOTIFY_CLIENT_ID: Client ID Spotify (optionnel)
 * - SPOTIFY_CLIENT_SECRET: Client Secret Spotify (optionnel)
 * 
 * Pour obtenir des credentials Spotify:
 * 1. Créer une app sur https://developer.spotify.com/dashboard
 * 2. Récupérer le Client ID et Client Secret
 * 
 * Usage:
 *   node scripts/fetch-track-genres.js
 *   node scripts/fetch-track-genres.js --limit 100
 *   node scripts/fetch-track-genres.js --batch-size 50
 */

const { PrismaClient } = require('@prisma/client');

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1];

const LIMIT = limitArg ? parseInt(limitArg, 10) : null; // null = pas de limite
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg, 10) : 50;
const DELAY_BETWEEN_REQUESTS = 2000; // 2 secondes entre chaque requête API (respect des bonnes pratiques Last.fm)
const DELAY_BETWEEN_MUSICBRAINZ = 1000; // 1 seconde entre chaque requête MusicBrainz (obligatoire)
const DELAY_BETWEEN_SPOTIFY = 100; // 100ms entre chaque requête Spotify (pas de limite stricte mais on reste raisonnable)

// Configuration Last.fm API
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

// Configuration MusicBrainz API
const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const MUSICBRAINZ_USER_AGENT = process.env.MUSICBRAINZ_USER_AGENT || 'AppleMusicAnalytics/1.0.0 (https://github.com/wesleyajavon/apple-music-analytics)';

// Configuration Spotify API
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Cache pour le token Spotify (évite de le régénérer à chaque requête)
let spotifyAccessToken = null;
let spotifyTokenExpiry = 0;

if (!LASTFM_API_KEY || LASTFM_API_KEY === 'mock_api_key') {
  console.error('❌ Erreur: LASTFM_API_KEY n\'est pas configuré');
  console.error('   Configurez LASTFM_API_KEY dans votre fichier .env');
  console.error('   Vous pouvez obtenir une clé API sur: https://www.last.fm/api/account/create');
  process.exit(1);
}

const prisma = new PrismaClient();

/**
 * Récupère le genre d'un track depuis l'API MusicBrainz
 * @param {string} artistName - Nom de l'artiste
 * @param {string} trackName - Nom du track
 * @returns {Promise<string|null>} Genre principal, ou null si non trouvé
 */
async function fetchTrackGenreFromMusicBrainz(artistName, trackName) {
  try {
    // Étape 1: Rechercher l'enregistrement
    const searchQuery = `recording:"${trackName}" AND artist:"${artistName}"`;
    const searchUrl = `${MUSICBRAINZ_BASE_URL}/recording/?query=${encodeURIComponent(searchQuery)}&fmt=json&limit=5`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': MUSICBRAINZ_USER_AGENT,
      },
    });
    
    if (!searchResponse.ok) {
      return null;
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.recordings || searchData.recordings.length === 0) {
      return null;
    }

    // Prendre le premier résultat (le plus pertinent)
    const recording = searchData.recordings[0];
    const mbid = recording.id;

    if (!mbid) {
      return null;
    }

    // Étape 2: Récupérer les genres associés à l'enregistrement
    // Inclure aussi artist-credits pour pouvoir récupérer l'ID de l'artiste en fallback
    const recordingUrl = `${MUSICBRAINZ_BASE_URL}/recording/${mbid}?inc=genres+artist-credits&fmt=json`;
    
    const recordingResponse = await fetch(recordingUrl, {
      headers: {
        'User-Agent': MUSICBRAINZ_USER_AGENT,
      },
    });

    if (!recordingResponse.ok) {
      return null;
    }

    const recordingData = await recordingResponse.json();
    
    // Extraire les genres depuis la réponse
    const genres = recordingData.genres;
    if (!genres || genres.length === 0) {
      // Si pas de genres sur l'enregistrement, essayer sur l'artiste
      // Utiliser recordingData qui contient les détails complets avec artist-credits
      if (recordingData['artist-credit'] && recordingData['artist-credit'][0]?.artist?.id) {
        const artistMbid = recordingData['artist-credit'][0].artist.id;
        const artistUrl = `${MUSICBRAINZ_BASE_URL}/artist/${artistMbid}?inc=genres&fmt=json`;
        
        const artistResponse = await fetch(artistUrl, {
          headers: {
            'User-Agent': MUSICBRAINZ_USER_AGENT,
          },
        });

        if (artistResponse.ok) {
          const artistData = await artistResponse.json();
          if (artistData.genres && artistData.genres.length > 0) {
            // Prendre le genre le plus populaire (celui avec le plus de votes)
            const sortedGenres = artistData.genres.sort((a, b) => (b.count || 0) - (a.count || 0));
            const genre = sortedGenres[0].name;
            return genre.charAt(0).toUpperCase() + genre.slice(1).toLowerCase();
          }
        }
      }
      return null;
    }

    // Prendre le genre le plus populaire (celui avec le plus de votes)
    const sortedGenres = genres.sort((a, b) => (b.count || 0) - (a.count || 0));
    const genre = sortedGenres[0].name;

    if (!genre || typeof genre !== 'string') {
      return null;
    }

    // Capitaliser la première lettre pour la cohérence
    return genre.charAt(0).toUpperCase() + genre.slice(1).toLowerCase();
  } catch (error) {
    // Ne pas logger les erreurs MusicBrainz pour éviter le spam
    return null;
  }
}

/**
 * Récupère le genre d'un track depuis l'API Last.fm track.getInfo
 * @param {string} artistName - Nom de l'artiste
 * @param {string} trackName - Nom du track
 * @returns {Promise<string|null>} Genre principal, ou null si non trouvé
 */
async function fetchTrackGenreFromLastFm(artistName, trackName) {
  try {
    const apiParams = new URLSearchParams({
      method: 'track.getInfo',
      api_key: LASTFM_API_KEY,
      format: 'json',
      artist: artistName,
      track: trackName,
    });

    const response = await fetch(`${LASTFM_BASE_URL}?${apiParams.toString()}`);
    
    if (!response.ok) {
      console.warn(`   ⚠️  Erreur HTTP ${response.status} pour "${trackName}" par "${artistName}"`);
      return null;
    }

    const data = await response.json();

    // Vérifier les erreurs de l'API
    if (data.error) {
      // Erreur 6 = track non trouvé, c'est normal
      if (data.error === 6) {
        return null;
      }
      console.warn(`   ⚠️  Erreur API Last.fm (${data.error}): ${data.message || 'Unknown error'}`);
      return null;
    }

    // Extraire le genre depuis la réponse
    const track = data.track;
    if (!track) {
      return null;
    }

    // Last.fm retourne les tags/genres dans track.toptags.tag
    // On prend le premier tag (le plus populaire) comme genre principal
    const tags = track.toptags?.tag;
    if (!tags || (Array.isArray(tags) && tags.length === 0)) {
      return null;
    }

    // Si c'est un tableau, prendre le premier élément, sinon c'est un objet unique
    const primaryTag = Array.isArray(tags) ? tags[0] : tags;
    const genre = primaryTag?.name;

    if (!genre || typeof genre !== 'string') {
      return null;
    }

    // Capitaliser la première lettre pour la cohérence
    return genre.charAt(0).toUpperCase() + genre.slice(1).toLowerCase();
  } catch (error) {
    return null;
  }
}

/**
 * Obtient un token d'accès Spotify via Client Credentials flow
 * @returns {Promise<string|null>} Token d'accès ou null si erreur
 */
async function getSpotifyAccessToken() {
  // Vérifier si on a un token valide en cache
  if (spotifyAccessToken && Date.now() < spotifyTokenExpiry) {
    return spotifyAccessToken;
  }

  // Vérifier que les credentials sont configurés
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return null;
  }

  try {
    const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    spotifyAccessToken = data.access_token;
    // Le token expire dans 3600 secondes, on le renouvelle 5 minutes avant
    spotifyTokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    
    return spotifyAccessToken;
  } catch (error) {
    return null;
  }
}

/**
 * Récupère le genre d'un track depuis l'API Spotify
 * Note: Spotify retourne les genres au niveau de l'artiste, pas du track
 * @param {string} artistName - Nom de l'artiste
 * @param {string} trackName - Nom du track
 * @returns {Promise<string|null>} Genre principal, ou null si non trouvé
 */
async function fetchTrackGenreFromSpotify(artistName, trackName) {
  try {
    // Obtenir un token d'accès
    const token = await getSpotifyAccessToken();
    if (!token) {
      return null;
    }

    // Rechercher le track
    const searchQuery = `track:"${trackName}" artist:"${artistName}"`;
    const searchUrl = `${SPOTIFY_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!searchResponse.ok) {
      return null;
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.tracks || !searchData.tracks.items || searchData.tracks.items.length === 0) {
      return null;
    }

    // Prendre le premier résultat
    const track = searchData.tracks.items[0];
    
    // Récupérer les artistes du track
    if (!track.artists || track.artists.length === 0) {
      return null;
    }

    // Prendre le premier artiste et récupérer ses informations détaillées
    const artistId = track.artists[0].id;
    if (!artistId) {
      return null;
    }

    // Récupérer les genres de l'artiste
    const artistUrl = `${SPOTIFY_BASE_URL}/artists/${artistId}`;
    
    const artistResponse = await fetch(artistUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!artistResponse.ok) {
      return null;
    }

    const artistData = await artistResponse.json();
    
    // Spotify retourne un tableau de genres pour l'artiste
    if (!artistData.genres || artistData.genres.length === 0) {
      return null;
    }

    // Prendre le premier genre (Spotify les retourne généralement par popularité)
    const genre = artistData.genres[0];

    if (!genre || typeof genre !== 'string') {
      return null;
    }

    // Capitaliser la première lettre de chaque mot pour la cohérence
    return genre
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } catch (error) {
    // Ne pas logger les erreurs Spotify pour éviter le spam
    return null;
  }
}

/**
 * Récupère le genre d'un track en essayant d'abord Last.fm, puis MusicBrainz, puis Spotify en fallback
 * @param {string} artistName - Nom de l'artiste
 * @param {string} trackName - Nom du track
 * @returns {Promise<{genre: string|null, source: 'lastfm'|'musicbrainz'|'spotify'|null}>} Genre principal et sa source
 */
async function fetchTrackGenre(artistName, trackName) {
  // Essayer Last.fm d'abord
  const lastFmGenre = await fetchTrackGenreFromLastFm(artistName, trackName);
  if (lastFmGenre) {
    return { genre: lastFmGenre, source: 'lastfm' };
  }

  // Si Last.fm n'a pas trouvé, essayer MusicBrainz
  // Attendre le délai requis pour MusicBrainz
  await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_MUSICBRAINZ));
  
  const musicBrainzGenre = await fetchTrackGenreFromMusicBrainz(artistName, trackName);
  if (musicBrainzGenre) {
    return { genre: musicBrainzGenre, source: 'musicbrainz' };
  }

  // Si MusicBrainz n'a pas trouvé, essayer Spotify (si configuré)
  if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) {
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SPOTIFY));
    
    const spotifyGenre = await fetchTrackGenreFromSpotify(artistName, trackName);
    if (spotifyGenre) {
      return { genre: spotifyGenre, source: 'spotify' };
    }
  }

  return { genre: null, source: null };
}

/**
 * Met à jour le genre d'un track dans la base de données
 */
async function updateTrackGenre(trackId, genre) {
  try {
    await prisma.track.update({
      where: { id: trackId },
      data: { genre },
    });
    return true;
  } catch (error) {
    console.error(`   ❌ Erreur lors de la mise à jour du track ${trackId}: ${error.message}`);
    return false;
  }
}

/**
 * Fonction principale
 */
async function fetchAllTrackGenres() {
  console.log('🚀 Démarrage de la récupération des genres des tracks\n');
  console.log('📋 Configuration:');
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Délai entre requêtes: ${DELAY_BETWEEN_REQUESTS}ms`);
  if (LIMIT) {
    console.log(`   Limite: ${LIMIT} tracks maximum`);
  } else {
    console.log(`   Limite: Aucune (tous les tracks sans genre)`);
  }
  console.log('');

  let stats = {
    total: 0,
    updated: 0,
    updatedFromLastFm: 0,
    updatedFromMusicBrainz: 0,
    updatedFromSpotify: 0,
    notFound: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // Récupérer tous les tracks sans genre, avec leurs artistes
    const whereClause = {
      genre: null,
    };

    const totalTracksWithoutGenre = await prisma.track.count({
      where: whereClause,
    });

    console.log(`📊 Tracks sans genre trouvés: ${totalTracksWithoutGenre}`);
    
    if (totalTracksWithoutGenre === 0) {
      console.log('✅ Tous les tracks ont déjà un genre !');
      return;
    }

    const actualLimit = LIMIT || totalTracksWithoutGenre;
    console.log(`📝 Traitement de ${actualLimit} tracks...\n`);

    // Traiter par batch pour éviter de charger trop de données en mémoire
    // On récupère les tracks sans genre à chaque itération pour éviter les problèmes
    // de pagination quand les tracks sont mis à jour pendant le traitement
    let processed = 0;
    let batchNumber = 0;
    const processedIds = new Set(); // Garder une trace des IDs déjà traités pour éviter les doublons

    while (processed < actualLimit) {
      const batchLimit = Math.min(BATCH_SIZE, actualLimit - processed);
      
      // Récupérer les tracks sans genre (en excluant ceux déjà traités)
      const tracks = await prisma.track.findMany({
        where: {
          ...whereClause,
          ...(processedIds.size > 0 && {
            id: {
              notIn: Array.from(processedIds),
            },
          }),
        },
        include: {
          artist: true,
        },
        take: batchLimit,
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (tracks.length === 0) {
        // Plus de tracks à traiter
        break;
      }

      batchNumber++;
      console.log(`\n📦 Traitement du batch ${batchNumber} (${tracks.length} tracks)...`);

      for (const track of tracks) {
        // Vérifier que le track n'a toujours pas de genre (au cas où il aurait été mis à jour entre temps)
        if (track.genre !== null) {
          // Ce track a déjà été mis à jour, on le saute
          processedIds.add(track.id);
          continue;
        }

        // Vérifier qu'on n'a pas déjà traité ce track
        if (processedIds.has(track.id)) {
          continue;
        }

        stats.total++;
        processedIds.add(track.id);
        process.stdout.write(`   [${stats.total}/${actualLimit}] "${track.title}" par "${track.artist.name}"... `);

        // Récupérer le genre (Last.fm puis MusicBrainz en fallback)
        const result = await fetchTrackGenre(track.artist.name, track.title);

        if (result.genre === null) {
          stats.notFound++;
          console.log('❌ Genre non trouvé');
        } else {
          // Mettre à jour dans la base de données
          const success = await updateTrackGenre(track.id, result.genre);
          if (success) {
            stats.updated++;
          if (result.source === 'lastfm') {
            stats.updatedFromLastFm++;
            console.log(`✅ ${result.genre} (Last.fm)`);
          } else if (result.source === 'musicbrainz') {
            stats.updatedFromMusicBrainz++;
            console.log(`✅ ${result.genre} (MusicBrainz)`);
          } else if (result.source === 'spotify') {
            stats.updatedFromSpotify++;
            console.log(`✅ ${result.genre} (Spotify)`);
          } else {
            console.log(`✅ ${result.genre}`);
          }
          } else {
            stats.errors++;
            console.log('❌ Erreur de mise à jour');
          }
        }

        // Attendre entre les requêtes pour respecter les bonnes pratiques de l'API Last.fm
        if (stats.total < actualLimit) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
      }

      processed += tracks.length;

      // Si on a traité moins de tracks que prévu dans ce batch, c'est qu'il n'y en a plus
      if (tracks.length < batchLimit) {
        break;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Traitement terminé !');
    console.log('📊 Statistiques:');
    console.log(`   Total traité: ${stats.total}`);
    console.log(`   ✅ Genres mis à jour: ${stats.updated}`);
    if (stats.updated > 0) {
      console.log(`      - Depuis Last.fm: ${stats.updatedFromLastFm}`);
      console.log(`      - Depuis MusicBrainz: ${stats.updatedFromMusicBrainz}`);
      if (stats.updatedFromSpotify > 0) {
        console.log(`      - Depuis Spotify: ${stats.updatedFromSpotify}`);
      }
    }
    console.log(`   ❌ Genres non trouvés: ${stats.notFound}`);
    console.log(`   ⚠️  Erreurs: ${stats.errors}`);
    console.log(`   📈 Taux de succès: ${stats.total > 0 ? Math.round((stats.updated / stats.total) * 100) : 0}%`);
    console.log('='.repeat(50));

    // Afficher le nombre de tracks restants sans genre
    const remaining = await prisma.track.count({
      where: { genre: null },
    });
    if (remaining > 0) {
      console.log(`\n💡 Il reste ${remaining} tracks sans genre dans la base de données.`);
      if (LIMIT && remaining > 0) {
        console.log(`   Relancez le script pour continuer le traitement.`);
      }
    } else {
      console.log(`\n✅ Tous les tracks ont maintenant un genre !`);
    }

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Vérifier si fetch est disponible (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Erreur: fetch n\'est pas disponible');
  console.error('   Ce script nécessite Node.js 18+ ou installez node-fetch:');
  console.error('   npm install node-fetch@2');
  process.exit(1);
}

// Exécuter le script
fetchAllTrackGenres().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});

