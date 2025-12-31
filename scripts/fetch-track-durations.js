#!/usr/bin/env node

/**
 * Script pour récupérer et mettre à jour les durées des tracks depuis l'API Last.fm
 * 
 * Ce script parcourt tous les tracks dans la base de données qui n'ont pas de durée (duration IS NULL)
 * et utilise l'API Last.fm track.getInfo pour obtenir leur durée réelle.
 * 
 * Usage:
 *   node scripts/fetch-track-durations.js
 *   node scripts/fetch-track-durations.js --limit 100
 *   node scripts/fetch-track-durations.js --batch-size 50
 */

const { PrismaClient } = require('@prisma/client');

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1];

const LIMIT = limitArg ? parseInt(limitArg, 10) : null; // null = pas de limite
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg, 10) : 50;
const DELAY_BETWEEN_REQUESTS = 2000; // 2 secondes entre chaque requête API (respect des bonnes pratiques Last.fm)

// Configuration Last.fm API
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/';

if (!LASTFM_API_KEY || LASTFM_API_KEY === 'mock_api_key') {
  console.error('❌ Erreur: LASTFM_API_KEY n\'est pas configuré');
  console.error('   Configurez LASTFM_API_KEY dans votre fichier .env');
  console.error('   Vous pouvez obtenir une clé API sur: https://www.last.fm/api/account/create');
  process.exit(1);
}

const prisma = new PrismaClient();

/**
 * Récupère la durée d'un track depuis l'API Last.fm track.getInfo
 * @param {string} artistName - Nom de l'artiste
 * @param {string} trackName - Nom du track
 * @returns {Promise<number|null>} Durée en secondes, ou null si non trouvé
 */
async function fetchTrackDuration(artistName, trackName) {
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

    // Extraire la durée depuis la réponse
    const track = data.track;
    if (!track || !track.duration) {
      return null;
    }

    // L'API Last.fm retourne la durée en millisecondes (selon la documentation officielle)
    const durationMs = parseInt(track.duration, 10);
    
    // Si la durée n'est pas disponible ou invalide, retourner null
    if (isNaN(durationMs) || durationMs <= 0) {
      return null;
    }

    // Convertir de millisecondes en secondes
    return Math.floor(durationMs / 1000);
  } catch (error) {
    console.warn(`   ⚠️  Erreur lors de la récupération de la durée: ${error.message}`);
    return null;
  }
}

/**
 * Met à jour la durée d'un track dans la base de données
 */
async function updateTrackDuration(trackId, duration) {
  try {
    await prisma.track.update({
      where: { id: trackId },
      data: { duration },
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
async function fetchAllTrackDurations() {
  console.log('🚀 Démarrage de la récupération des durées des tracks\n');
  console.log('📋 Configuration:');
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Délai entre requêtes: ${DELAY_BETWEEN_REQUESTS}ms`);
  if (LIMIT) {
    console.log(`   Limite: ${LIMIT} tracks maximum`);
  } else {
    console.log(`   Limite: Aucune (tous les tracks sans durée)`);
  }
  console.log('');

  let stats = {
    total: 0,
    updated: 0,
    notFound: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // Récupérer tous les tracks sans durée, avec leurs artistes
    const whereClause = {
      duration: null,
    };

    const totalTracksWithoutDuration = await prisma.track.count({
      where: whereClause,
    });

    console.log(`📊 Tracks sans durée trouvés: ${totalTracksWithoutDuration}`);
    
    if (totalTracksWithoutDuration === 0) {
      console.log('✅ Tous les tracks ont déjà une durée !');
      return;
    }

    const actualLimit = LIMIT || totalTracksWithoutDuration;
    console.log(`📝 Traitement de ${actualLimit} tracks...\n`);

    // Traiter par batch pour éviter de charger trop de données en mémoire
    // On récupère les tracks sans durée à chaque itération pour éviter les problèmes
    // de pagination quand les tracks sont mis à jour pendant le traitement
    let processed = 0;
    let batchNumber = 0;
    const processedIds = new Set(); // Garder une trace des IDs déjà traités pour éviter les doublons

    while (processed < actualLimit) {
      const batchLimit = Math.min(BATCH_SIZE, actualLimit - processed);
      
      // Récupérer les tracks sans durée (en excluant ceux déjà traités)
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
        // Vérifier que le track n'a toujours pas de durée (au cas où il aurait été mis à jour entre temps)
        if (track.duration !== null) {
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

        // Récupérer la durée depuis Last.fm
        const duration = await fetchTrackDuration(track.artist.name, track.title);

        if (duration === null) {
          stats.notFound++;
          console.log('❌ Durée non trouvée');
        } else {
          // Mettre à jour dans la base de données
          const success = await updateTrackDuration(track.id, duration);
          if (success) {
            stats.updated++;
            console.log(`✅ ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`);
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
    console.log(`   ✅ Durées mises à jour: ${stats.updated}`);
    console.log(`   ❌ Durées non trouvées: ${stats.notFound}`);
    console.log(`   ⚠️  Erreurs: ${stats.errors}`);
    console.log(`   📈 Taux de succès: ${stats.total > 0 ? Math.round((stats.updated / stats.total) * 100) : 0}%`);
    console.log('='.repeat(50));

    // Afficher le nombre de tracks restants sans durée
    const remaining = await prisma.track.count({
      where: { duration: null },
    });
    if (remaining > 0) {
      console.log(`\n💡 Il reste ${remaining} tracks sans durée dans la base de données.`);
      if (LIMIT && remaining > 0) {
        console.log(`   Relancez le script pour continuer le traitement.`);
      }
    } else {
      console.log(`\n✅ Tous les tracks ont maintenant une durée !`);
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
fetchAllTrackDurations().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});

