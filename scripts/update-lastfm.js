#!/usr/bin/env node

/**
 * Script pour mettre à jour la base de données avec les nouvelles écoutes Last.fm
 * 
 * Ce script récupère uniquement les écoutes depuis la dernière écoute enregistrée
 * dans la base de données pour l'utilisateur spécifié.
 * 
 * Usage:
 *   node scripts/update-lastfm.js --userId "user_123" --username "lastfm_user"
 *   node scripts/update-lastfm.js --userId "user_123" --username "lastfm_user" --baseUrl "http://localhost:3000"
 *   node scripts/update-lastfm.js --userId "user_123" --username "lastfm_user" --dry-run
 *
 * Backfill (rattrapage si la base a un trou alors que Last.fm est à jour) :
 *   node scripts/update-lastfm.js --userId "..." --username "..." --from "2026-03-18"
 *   (ISO date ou timestamp Unix en secondes ; ignore la dernière écoute en base pour ce run)
 *
 * Options:
 *   --dry-run  Simule l'import sans modifier la base de données (affiche ce qui serait ajouté)
 *   --from     Date de début forcée (ISO, ex. 2026-03-18) ou unix seconds ; récupère tout depuis Last.fm
 *              depuis cette date. Les doublons sont toujours ignorés (même user, track, playedAt).
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

function hasFlag(flag) {
  return args.includes(`--${flag}`);
}

const userIdArg = getArg('userId');
const usernameArg = getArg('username');
const baseUrlArg = getArg('baseUrl') || 'http://localhost:3000';
const fromArg = getArg('from');
const DRY_RUN = hasFlag('dry-run');
const IMPORT_ADMIN_KEY = process.env.IMPORT_ADMIN_KEY;

/**
 * Parse --from: ISO date (2026-03-18), datetime, or unix seconds.
 * @returns {number|null} Unix seconds, or null if invalid
 */
function parseFromTimestamp(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (/^\d{10,13}$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return trimmed.length === 13 ? Math.floor(n / 1000) : n;
  }
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

if (!userIdArg || !usernameArg) {
  console.error('❌ Erreur: userId et username sont requis');
  console.error('\nUsage:');
  console.error('  node scripts/update-lastfm.js --userId "user_123" --username "lastfm_user"');
  console.error('  node scripts/update-lastfm.js --userId "user_123" --username "lastfm_user" --baseUrl "http://localhost:3000"');
  console.error('  node scripts/update-lastfm.js --userId "user_123" --username "lastfm_user" --dry-run');
  console.error('  node scripts/update-lastfm.js --userId "user_123" --username "lastfm_user" --from "2026-03-18"');
  process.exit(1);
}

if (!IMPORT_ADMIN_KEY) {
  console.error('❌ Erreur: IMPORT_ADMIN_KEY est requis pour ce script');
  console.error('   Définissez IMPORT_ADMIN_KEY dans .env.local pour autoriser le mode import admin.');
  console.error('   Le script utilise le header x-import-admin-key vers /api/lastfm/import.');
  process.exit(1);
}

const USER_ID = userIdArg;
const LASTFM_USERNAME = usernameArg;
const BASE_URL = baseUrlArg;

const prisma = new PrismaClient();

/**
 * Trouve la date de la dernière écoute Last.fm pour l'utilisateur
 * @returns {Date|null} La date de la dernière écoute ou null si aucune écoute n'existe
 */
async function getLastListenDate() {
  const lastListen = await prisma.listen.findFirst({
    where: {
      userId: USER_ID,
      source: 'lastfm',
    },
    orderBy: {
      playedAt: 'desc',
    },
    select: {
      playedAt: true,
    },
  });

  return lastListen ? lastListen.playedAt : null;
}

/**
 * Importe les nouvelles écoutes depuis une date donnée
 * @param {number} fromTimestamp - Timestamp Unix de début
 * @param {boolean} dryRun - Si true, simule sans écrire en base
 * @param {{ maxPages?: number }} [opts]
 */
async function importNewTracks(fromTimestamp, dryRun = false, opts = {}) {
  let page = 1;
  let totalPages = 1;
  let totalImported = 0;
  let totalSkipped = 0;
  const allErrors = [];

  const MAX_PAGES = opts.maxPages ?? 100;

  console.log(dryRun ? '🔍 Mode DRY-RUN : simulation sans modification de la base\n' : '🚀 Démarrage de la mise à jour Last.fm\n');
  console.log(`📋 Configuration:`);
  console.log(`   User ID: ${USER_ID}`);
  console.log(`   Last.fm Username: ${LASTFM_USERNAME}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Date de début: ${new Date(fromTimestamp * 1000).toLocaleString()}`);
  if (dryRun) {
    console.log(`   🧪 Mode: DRY-RUN (aucune donnée ne sera écrite)`);
  }
  console.log(`   ⚠️  Limite de sécurité: ${MAX_PAGES} pages max. (${MAX_PAGES * 200} scrobbles max. par run)`);
  console.log('');

  // Vérifier que le serveur est accessible
  try {
    console.log('🔍 Vérification de la connexion au serveur...');
    const healthCheck = await fetch(`${BASE_URL}/api/lastfm?limit=1`);
    if (!healthCheck.ok) {
      console.error('❌ Le serveur Next.js ne répond pas correctement');
      console.error(`   Status: ${healthCheck.status}`);
      console.error(`   Assurez-vous que le serveur est démarré avec: npm run dev`);
      process.exit(1);
    }
    console.log('✅ Serveur accessible\n');
  } catch (error) {
    console.error('❌ Impossible de se connecter au serveur Next.js');
    console.error(`   URL: ${BASE_URL}`);
    console.error(`   Erreur: ${error.message}`);
    console.error(`   Assurez-vous que le serveur est démarré avec: npm run dev`);
    process.exit(1);
  }

  do {
    process.stdout.write(`📄 Import page ${page}/${totalPages}... `);
    
    try {
      const body = {
        userId: USER_ID,
        username: LASTFM_USERNAME,
        limit: 200,
        page: page,
        from: fromTimestamp,
        dryRun: dryRun,
      };

      const response = await fetch(`${BASE_URL}/api/lastfm/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-import-admin-key': IMPORT_ADMIN_KEY,
        },
        body: JSON.stringify(body),
      });

      // Vérifier le type de contenu
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌');
        console.error('   Le serveur a retourné du HTML au lieu de JSON');
        console.error(`   Status: ${response.status}`);
        console.error(`   Réponse (premiers 500 caractères): ${text.substring(0, 500)}`);
        console.error(`   Cela indique probablement une erreur côté serveur.`);
        console.error(`   Vérifiez les logs du serveur Next.js.`);
        break;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌');
        console.error('   Erreur:', result.error || result.errors);
        allErrors.push(...(result.errors || [result.error || 'Unknown error']));
        break;
      }

      totalImported += result.imported;
      totalSkipped += result.skipped;
      totalPages = result.totalPages || 1;

      console.log(dryRun ? `✅ (simulation) Seraient importés: ${result.imported}, Seraient ignorés: ${result.skipped}` : `✅ Importé: ${result.imported}, Ignoré: ${result.skipped}`);
      
      if (result.errors && result.errors.length > 0) {
        console.warn(`   ⚠️  ${result.errors.length} erreur(s):`, result.errors.slice(0, 3));
        allErrors.push(...result.errors);
      }

      if (result._meta?.mocked) {
        console.warn('\n   ⚠️  ⚠️  ⚠️  ATTENTION: Utilisation de données mockées ! ⚠️  ⚠️  ⚠️');
        console.warn('   Les clés API Last.fm ne sont pas configurées ou le serveur ne les a pas chargées.');
        console.warn('   Vérifiez que LASTFM_API_KEY et LASTFM_API_SECRET sont définies dans .env.local');
        console.warn('   et redémarrez le serveur Next.js avec: npm run dev\n');
      }

      page++;
      
      // Vérifier la limite de sécurité
      if (page > MAX_PAGES) {
        console.warn(`\n⚠️  Limite de sécurité atteinte (${MAX_PAGES} pages)`);
        console.warn(`   Pour importer plus de pages, relancez le script avec les mêmes paramètres`);
        console.warn(`   Les pages déjà importées seront ignorées (déduplication automatique)`);
        break;
      }
      
      // Attendre entre les requêtes pour respecter les bonnes pratiques de l'API Last.fm
      // Délai de 2 secondes pour éviter de faire plusieurs appels par seconde
      if (page <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error('❌');
      console.error('   Erreur réseau:', error.message);
      allErrors.push(error.message);
      break;
    }
    
  } while (page <= totalPages && page <= MAX_PAGES);

  console.log('\n' + '='.repeat(50));
  console.log(dryRun ? '🔍 Simulation terminée !' : '🎉 Mise à jour terminée !');
  console.log('📊 Statistiques:');
  console.log(dryRun
    ? `   Seraient importés: ${totalImported}`
    : `   Total importé: ${totalImported}`);
  console.log(dryRun
    ? `   Seraient ignorés: ${totalSkipped}`
    : `   Total ignoré: ${totalSkipped}`);
  console.log(`   Pages traitées: ${page - 1}/${totalPages}`);
  if (allErrors.length > 0) {
    console.log(`   ⚠️  Erreurs: ${allErrors.length}`);
    if (allErrors.length <= 5) {
      allErrors.forEach((err, i) => console.log(`      ${i + 1}. ${err}`));
    } else {
      console.log(`      (Afficher les ${allErrors.length} premières erreurs...)`);
      allErrors.slice(0, 5).forEach((err, i) => console.log(`      ${i + 1}. ${err}`));
    }
  }
  if (dryRun && totalImported > 0) {
    console.log('\n   💡 Pour importer réellement, relancez sans --dry-run');
  }
  console.log('='.repeat(50));
}

async function main() {
  try {
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: USER_ID },
    });

    if (!user) {
      console.error(`❌ L'utilisateur avec l'ID "${USER_ID}" n'existe pas`);
      console.error('   Créez d\'abord l\'utilisateur ou utilisez le script import-lastfm.js pour un import complet');
      process.exit(1);
    }

    let fromTimestamp;

    if (fromArg) {
      const parsed = parseFromTimestamp(fromArg);
      if (parsed === null) {
        console.error(`❌ --from invalide: "${fromArg}"`);
        console.error('   Utilisez une date ISO (ex. 2026-03-18), une date/heure ISO, ou un timestamp Unix en secondes.');
        process.exit(1);
      }
      fromTimestamp = parsed;
      console.log('📌 Mode rattrapage: --from ignorera la dernière écoute en base pour ce run.\n');
      console.log(`   Point de départ: ${new Date(fromTimestamp * 1000).toLocaleString()}`);
      console.log(`   (Les écoutes déjà présentes sont ignorées automatiquement.)\n`);
    } else {
      // Trouver la date de la dernière écoute
      console.log('🔍 Recherche de la dernière écoute Last.fm...\n');
      const lastListenDate = await getLastListenDate();

      if (lastListenDate) {
        // Utiliser la date de la dernière écoute comme point de départ
        // On soustrait 1 seconde pour s'assurer d'inclure les écoutes qui ont pu être enregistrées
        // exactement à la même seconde
        fromTimestamp = Math.floor(lastListenDate.getTime() / 1000) - 1;
        console.log(`✅ Dernière écoute trouvée: ${lastListenDate.toLocaleString()}`);
        console.log(`   Import des écoutes depuis cette date...\n`);
        console.log(`   💡 Si la base a un trou alors que Last.fm est complet, relancez avec --from "YYYY-MM-DD" depuis le début du trou.\n`);
      } else {
        // Aucune écoute trouvée, importer depuis les 30 derniers jours par défaut
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        fromTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);
        console.log(`⚠️  Aucune écoute Last.fm trouvée pour cet utilisateur`);
        console.log(`   Import depuis les 30 derniers jours par défaut: ${thirtyDaysAgo.toLocaleString()}`);
        console.log(`   (Utilisez import-lastfm.js pour un import complet de l'historique)\n`);
      }
    }

    const maxPages = fromArg ? 500 : 100;

    // Importer les nouvelles écoutes (ou simuler en mode dry-run)
    await importNewTracks(fromTimestamp, DRY_RUN, { maxPages });

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
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

main().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});

