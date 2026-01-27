#!/usr/bin/env node

/**
 * Script pour annuler l'import Last.fm d'aujourd'hui
 * 
 * Ce script supprime toutes les écoutes Last.fm qui ont été ajoutées aujourd'hui
 * pour un utilisateur donné. Utile pour annuler un import qui s'est mal passé.
 * 
 * Usage:
 *   node scripts/rollback-today-import.js --userId "user_123"
 *   node scripts/rollback-today-import.js --userId "user_123" --dry-run
 *   node scripts/rollback-today-import.js --userId "user_123" --date "2026-01-26"
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
const dateArg = getArg('date');

if (!userIdArg) {
  console.error('❌ Erreur: userId est requis');
  console.error('\nUsage:');
  console.error('  node scripts/rollback-today-import.js --userId "user_123"');
  console.error('  node scripts/rollback-today-import.js --userId "user_123" --dry-run');
  console.error('  node scripts/rollback-today-import.js --userId "user_123" --date "2026-01-26"');
  process.exit(1);
}

const USER_ID = userIdArg;

// Determine the date range
let startDate, endDate;
if (dateArg) {
  // Use provided date
  const targetDate = new Date(dateArg);
  if (isNaN(targetDate.getTime())) {
    console.error(`❌ Date invalide: ${dateArg}`);
    console.error('   Format attendu: YYYY-MM-DD (ex: 2026-01-26)');
    process.exit(1);
  }
  startDate = new Date(targetDate);
  startDate.setHours(0, 0, 0, 0);
  endDate = new Date(targetDate);
  endDate.setHours(23, 59, 59, 999);
} else {
  // Use today
  startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
}

const prisma = new PrismaClient();

async function rollbackTodayImport() {
  try {
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: USER_ID },
    });

    if (!user) {
      console.error(`❌ L'utilisateur avec l'ID "${USER_ID}" n'existe pas`);
      process.exit(1);
    }

    console.log(`🔍 Recherche des écoutes Last.fm à supprimer...\n`);
    console.log(`📋 Configuration:`);
    console.log(`   User ID: ${USER_ID}`);
    console.log(`   Utilisateur: ${user.name || user.email || 'N/A'}`);
    console.log(`   Date: ${startDate.toLocaleDateString('fr-FR')}`);
    console.log(`   Plage: ${startDate.toISOString()} → ${endDate.toISOString()}`);
    console.log(`   Mode: ${dryRun ? 'DRY RUN (aucune suppression)' : 'SUPPRESSION RÉELLE'}\n`);

    // Find listens created today (based on createdAt) OR played today (based on playedAt)
    // We check both because we want to remove listens that were imported today
    const listensToDelete = await prisma.listen.findMany({
      where: {
        userId: USER_ID,
        source: 'lastfm',
        OR: [
          // Listens created today (imported today)
          {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Listens played today (might have been imported earlier but played today)
          {
            playedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      include: {
        track: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (listensToDelete.length === 0) {
      console.log('✅ Aucune écoute trouvée pour cette date.');
      console.log('   Aucune action nécessaire.\n');
      return;
    }

    // Group by date for better reporting
    const byDate = {};
    listensToDelete.forEach(listen => {
      const dateKey = listen.createdAt.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = [];
      }
      byDate[dateKey].push(listen);
    });

    console.log(`📊 Écoutes trouvées: ${listensToDelete.length}\n`);
    console.log('📅 Répartition par date de création:');
    Object.keys(byDate).sort().forEach(date => {
      console.log(`   ${date}: ${byDate[date].length} écoute(s)`);
    });

    // Show sample tracks
    console.log('\n🎵 Exemples de pistes à supprimer (5 premières):');
    listensToDelete.slice(0, 5).forEach((listen, i) => {
      console.log(`   ${i + 1}. ${listen.track.artist.name} - ${listen.track.title}`);
      console.log(`      Créée: ${listen.createdAt.toLocaleString('fr-FR')}`);
      console.log(`      Jouée: ${listen.playedAt.toLocaleString('fr-FR')}`);
    });
    if (listensToDelete.length > 5) {
      console.log(`   ... et ${listensToDelete.length - 5} autres`);
    }

    if (dryRun) {
      console.log('\n' + '='.repeat(50));
      console.log('🔍 [DRY RUN] Résumé:');
      console.log(`   ${listensToDelete.length} écoute(s) seraient supprimée(s)`);
      console.log('\n   ⚠️  Mode DRY RUN activé - aucune donnée n\'a été supprimée');
      console.log('   Relancez le script sans --dry-run pour effectuer la suppression');
      console.log('='.repeat(50));
      return;
    }

    // Confirm before deletion
    console.log('\n⚠️  ATTENTION: Cette action est irréversible !');
    console.log(`   ${listensToDelete.length} écoute(s) seront supprimée(s) définitivement.`);
    
    // Delete listens
    console.log('\n🗑️  Suppression en cours...');
    const deleteResult = await prisma.listen.deleteMany({
      where: {
        id: {
          in: listensToDelete.map(l => l.id),
        },
      },
    });

    console.log('\n' + '='.repeat(50));
    console.log('✅ Suppression terminée !');
    console.log('📊 Statistiques:');
    console.log(`   Écoutes supprimées: ${deleteResult.count}`);
    console.log('='.repeat(50));
    console.log('\n💡 Vous pouvez maintenant réimporter les données avec:');
    console.log(`   node scripts/update-lastfm.js --userId "${USER_ID}" --username "votre_username"`);

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

rollbackTodayImport().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});
