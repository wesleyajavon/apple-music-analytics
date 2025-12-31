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
 */

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

const userIdArg = getArg('userId');
const usernameArg = getArg('username');
const baseUrlArg = getArg('baseUrl') || 'http://localhost:3000';

if (!userIdArg || !usernameArg) {
  console.error('❌ Erreur: userId et username sont requis');
  console.error('\nUsage:');
  console.error('  node scripts/update-lastfm.js --userId "user_123" --username "lastfm_user"');
  console.error('  node scripts/update-lastfm.js --userId "user_123" --username "lastfm_user" --baseUrl "http://localhost:3000"');
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
 */
async function importNewTracks(fromTimestamp) {
  let page = 1;
  let totalPages = 1;
  let totalImported = 0;
  let totalSkipped = 0;
  const allErrors = [];
  
  // Limite de sécurité : ne pas importer plus de 100 pages par exécution
  // pour éviter de surcharger l'API Last.fm
  const MAX_PAGES = 100;

  console.log('🚀 Démarrage de la mise à jour Last.fm\n');
  console.log(`📋 Configuration:`);
  console.log(`   User ID: ${USER_ID}`);
  console.log(`   Last.fm Username: ${LASTFM_USERNAME}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Date de début: ${new Date(fromTimestamp * 1000).toLocaleString()}`);
  console.log(`   ⚠️  Limite de sécurité: ${MAX_PAGES} pages maximum par exécution`);
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
      };

      const response = await fetch(`${BASE_URL}/api/lastfm/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      console.log(`✅ Importé: ${result.imported}, Ignoré: ${result.skipped}`);
      
      if (result.errors && result.errors.length > 0) {
        console.warn(`   ⚠️  ${result.errors.length} erreur(s):`, result.errors.slice(0, 3));
        allErrors.push(...result.errors);
      }

      if (result._meta?.mocked) {
        console.warn('   ⚠️  Utilisation de données mockées (Last.fm non configuré)');
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
  console.log('🎉 Mise à jour terminée !');
  console.log('📊 Statistiques:');
  console.log(`   Total importé: ${totalImported}`);
  console.log(`   Total ignoré: ${totalSkipped}`);
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

    // Trouver la date de la dernière écoute
    console.log('🔍 Recherche de la dernière écoute Last.fm...\n');
    const lastListenDate = await getLastListenDate();

    let fromTimestamp;

    if (lastListenDate) {
      // Utiliser la date de la dernière écoute comme point de départ
      // On soustrait 1 seconde pour s'assurer d'inclure les écoutes qui ont pu être enregistrées
      // exactement à la même seconde
      fromTimestamp = Math.floor(lastListenDate.getTime() / 1000) - 1;
      console.log(`✅ Dernière écoute trouvée: ${lastListenDate.toLocaleString()}`);
      console.log(`   Import des écoutes depuis cette date...\n`);
    } else {
      // Aucune écoute trouvée, importer depuis les 30 derniers jours par défaut
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      fromTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);
      console.log(`⚠️  Aucune écoute Last.fm trouvée pour cet utilisateur`);
      console.log(`   Import depuis les 30 derniers jours par défaut: ${thirtyDaysAgo.toLocaleString()}`);
      console.log(`   (Utilisez import-lastfm.js pour un import complet de l'historique)\n`);
    }

    // Importer les nouvelles écoutes
    await importNewTracks(fromTimestamp);

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

