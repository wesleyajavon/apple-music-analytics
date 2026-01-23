#!/usr/bin/env node

/**
 * Script pour mettre à jour les genres des pistes depuis un fichier JSON
 * 
 * Ce script lit un fichier JSON contenant des pistes avec leurs genres mis à jour
 * et met à jour la base de données en conséquence.
 * 
 * Usage:
 *   node scripts/update-track-genres.js --file "/path/to/tracks_with_genre_v2.json"
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

// Parse command line arguments (supports both --key=value and --key value formats)
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
  return undefined;
}

const fileArg = getArg('file');

if (!fileArg) {
  console.error('❌ Erreur: le paramètre --file est requis');
  console.error('\nUsage:');
  console.error('  node scripts/update-track-genres.js --file "/path/to/tracks_with_genre_v2.json"');
  process.exit(1);
}

const prisma = new PrismaClient();

/**
 * Met à jour les genres des pistes depuis le fichier JSON
 */
async function updateTrackGenres(jsonFilePath) {
  // Vérifier que le fichier existe
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`❌ Le fichier "${jsonFilePath}" n'existe pas`);
    process.exit(1);
  }

  console.log(`📖 Lecture du fichier: ${jsonFilePath}\n`);

  // Lire et parser le fichier JSON
  let tracksData;
  try {
    const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
    tracksData = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du fichier JSON:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(tracksData)) {
    console.error('❌ Le fichier JSON doit contenir un tableau de pistes');
    process.exit(1);
  }

  console.log(`📊 ${tracksData.length} pistes trouvées dans le fichier\n`);

  let updated = 0;
  let notFound = 0;
  let noChange = 0;
  const errors = [];

  console.log('🔄 Mise à jour des genres...\n');

  // Traiter chaque piste par batch pour améliorer les performances
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < tracksData.length; i += BATCH_SIZE) {
    const batch = tracksData.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(tracksData.length / BATCH_SIZE);
    
    process.stdout.write(`📦 Traitement du batch ${batchNumber}/${totalBatches} (${batch.length} pistes)... `);

    try {
      // Traiter chaque piste du batch
      for (const trackData of batch) {
        const { trackId, genre } = trackData;

        if (!trackId) {
          errors.push(`Piste sans trackId: ${JSON.stringify(trackData)}`);
          continue;
        }

        if (!genre) {
          // Si pas de genre, on peut vouloir mettre null ou laisser tel quel
          // Pour l'instant, on skip
          continue;
        }

        try {
          // Trouver la piste dans la base de données
          const track = await prisma.track.findUnique({
            where: { id: trackId },
            select: { id: true, genre: true, title: true },
          });

          if (!track) {
            notFound++;
            continue;
          }

          // Vérifier si le genre a changé
          if (track.genre === genre) {
            noChange++;
            continue;
          }

          // Mettre à jour le genre
          await prisma.track.update({
            where: { id: trackId },
            data: { genre: genre },
          });

          updated++;
        } catch (error) {
          errors.push(`Erreur pour trackId ${trackId}: ${error.message}`);
        }
      }

      console.log(`✅`);
    } catch (error) {
      console.error(`❌`);
      errors.push(`Erreur dans le batch ${batchNumber}: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Mise à jour terminée !');
  console.log('📊 Statistiques:');
  console.log(`   ✅ Pistes mises à jour: ${updated}`);
  console.log(`   ⏭️  Pistes sans changement: ${noChange}`);
  console.log(`   ❌ Pistes non trouvées: ${notFound}`);
  console.log(`   📝 Total traité: ${tracksData.length}`);
  if (errors.length > 0) {
    console.log(`   ⚠️  Erreurs: ${errors.length}`);
    if (errors.length <= 10) {
      errors.forEach((err, i) => console.log(`      ${i + 1}. ${err}`));
    } else {
      console.log(`      (Afficher les 10 premières erreurs...)`);
      errors.slice(0, 10).forEach((err, i) => console.log(`      ${i + 1}. ${err}`));
    }
  }
  console.log('='.repeat(50));
}

async function main() {
  try {
    await updateTrackGenres(fileArg);
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
