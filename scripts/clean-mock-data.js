#!/usr/bin/env node

/**
 * Script pour nettoyer les données mockées Last.fm de la base de données
 * 
 * Ce script supprime toutes les écoutes correspondant aux chansons mockées
 * qui ont été ajoutées par erreur lorsque Last.fm n'était pas configuré.
 * 
 * Usage:
 *   node scripts/clean-mock-data.js --userId "user_123"
 *   node scripts/clean-mock-data.js --userId "user_123" --dry-run
 */

// Load environment variables from .env.local if available
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envPath = path.join(__dirname, '..', '.env');
  
  // Try .env.local first, then .env
  const envFile = fs.existsSync(envLocalPath) ? envLocalPath : 
                  (fs.existsSync(envPath) ? envPath : null);
  
  if (envFile) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = cleanValue;
          }
        }
      }
    });
  }
}

// Load environment variables
loadEnvFile();

// Debug: vérifier que DATABASE_URL est chargée (masquer les informations sensibles)
if (process.env.DATABASE_URL) {
  const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  console.log(`✓ DATABASE_URL chargée: ${maskedUrl.substring(0, 50)}...`);
} else {
  console.error('❌ DATABASE_URL non trouvée dans les variables d\'environnement');
  console.error('   Vérifiez que le fichier .env.local existe et contient DATABASE_URL');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(key) {
  // Try --key=value format first
  const equalFormat = args.find(arg => arg.startsWith(`--${key}=`));
  if (equalFormat) {
    return equalFormat.split('=')[1];
  }
  // Try --key value format
  const keyIndex = args.indexOf(`--${key}`);
  if (keyIndex !== -1 && keyIndex + 1 < args.length) {
    return args[keyIndex + 1];
  }
  // Check for boolean flags
  if (args.includes(`--${key}`)) {
    return true;
  }
  return undefined;
}

const userIdArg = getArg('userId');
const dryRun = getArg('dry-run') === true;

if (!userIdArg) {
  console.error('❌ Erreur: userId est requis');
  console.error('\nUsage:');
  console.error('  node scripts/clean-mock-data.js --userId "user_123"');
  console.error('  node scripts/clean-mock-data.js --userId "user_123" --dry-run');
  process.exit(1);
}

const USER_ID = userIdArg;

// Liste des chansons mockées à supprimer (correspond exactement à generateMockRecentTracks)
const MOCK_TRACKS = [
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "Anti-Hero", artist: "Taylor Swift" },
  { title: "Do I Wanna Know?", artist: "Arctic Monkeys" },
  { title: "HUMBLE.", artist: "Kendrick Lamar" },
  { title: "One More Time", artist: "Daft Punk" },
  { title: "Holocene", artist: "Bon Iver" },
  { title: "Space Song", artist: "Beach House" },
];

const prisma = new PrismaClient();

async function cleanMockData() {
  try {
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: USER_ID },
    });

    if (!user) {
      console.error(`❌ L'utilisateur avec l'ID "${USER_ID}" n'existe pas`);
      process.exit(1);
    }

    console.log(`🔍 Recherche des données mockées pour l'utilisateur: ${user.name || user.email || USER_ID}\n`);

    let totalDeleted = 0;
    const deletedTracks = [];

    for (const mockTrack of MOCK_TRACKS) {
      // Trouver l'artiste (insensible à la casse)
      const artist = await prisma.artist.findFirst({
        where: {
          nameLower: mockTrack.artist.toLowerCase(),
        },
      });

      if (!artist) {
        console.log(`   ⏭️  Artiste "${mockTrack.artist}" non trouvé, ignoré`);
        continue;
      }

      // Trouver la piste (insensible à la casse)
      const track = await prisma.track.findFirst({
        where: {
          artistId: artist.id,
          titleLower: mockTrack.title.toLowerCase(),
        },
        include: {
          listens: {
            where: {
              userId: USER_ID,
              source: 'lastfm',
            },
          },
        },
      });

      if (!track) {
        console.log(`   ⏭️  Piste "${mockTrack.title}" par "${mockTrack.artist}" non trouvée, ignorée`);
        continue;
      }

      const listenCount = track.listens.length;

      if (listenCount === 0) {
        console.log(`   ✓ "${mockTrack.title}" par "${mockTrack.artist}": aucune écoute à supprimer`);
        continue;
      }

      if (dryRun) {
        console.log(`   🔍 [DRY RUN] "${mockTrack.title}" par "${mockTrack.artist}": ${listenCount} écoute(s) seraient supprimée(s)`);
        totalDeleted += listenCount;
        deletedTracks.push({ ...mockTrack, count: listenCount });
      } else {
        // Supprimer les écoutes
        const deleteResult = await prisma.listen.deleteMany({
          where: {
            userId: USER_ID,
            trackId: track.id,
            source: 'lastfm',
          },
        });

        console.log(`   ✅ "${mockTrack.title}" par "${mockTrack.artist}": ${deleteResult.count} écoute(s) supprimée(s)`);
        totalDeleted += deleteResult.count;
        deletedTracks.push({ ...mockTrack, count: deleteResult.count });
      }
    }

    console.log('\n' + '='.repeat(50));
    if (dryRun) {
      console.log('🔍 [DRY RUN] Résumé du nettoyage:');
    } else {
      console.log('🎉 Nettoyage terminé !');
    }
    console.log('📊 Statistiques:');
    console.log(`   Total supprimé: ${totalDeleted} écoute(s)`);
    console.log(`   Chansons affectées: ${deletedTracks.length}`);
    
    if (deletedTracks.length > 0) {
      console.log('\n   Détails:');
      deletedTracks.forEach(({ title, artist, count }) => {
        console.log(`      - "${title}" par "${artist}": ${count} écoute(s)`);
      });
    }
    
    if (dryRun) {
      console.log('\n   ⚠️  Mode DRY RUN activé - aucune donnée n\'a été supprimée');
      console.log('   Relancez le script sans --dry-run pour effectuer la suppression');
    }
    
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanMockData().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
