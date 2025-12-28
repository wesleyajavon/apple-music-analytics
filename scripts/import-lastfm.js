#!/usr/bin/env node

/**
 * Script pour importer tout l'historique Last.fm
 * 
 * Usage:
 *   node scripts/import-lastfm.js --userId "user_123" --username "lastfm_user"
 *   node scripts/import-lastfm.js --userId "user_123" --username "lastfm_user" --from 1704067200 --to 1735689599
 */

const { PrismaClient } = require('@prisma/client');

// Parse command line arguments
const args = process.argv.slice(2);
const userIdArg = args.find(arg => arg.startsWith('--userId='))?.split('=')[1];
const usernameArg = args.find(arg => arg.startsWith('--username='))?.split('=')[1];
const fromArg = args.find(arg => arg.startsWith('--from='))?.split('=')[1];
const toArg = args.find(arg => arg.startsWith('--to='))?.split('=')[1];
const baseUrlArg = args.find(arg => arg.startsWith('--baseUrl='))?.split('=')[1] || 'http://localhost:3000';

if (!userIdArg || !usernameArg) {
  console.error('❌ Erreur: userId et username sont requis');
  console.error('\nUsage:');
  console.error('  node scripts/import-lastfm.js --userId "user_123" --username "lastfm_user"');
  console.error('  node scripts/import-lastfm.js --userId "user_123" --username "lastfm_user" --from 1704067200 --to 1735689599');
  process.exit(1);
}

const USER_ID = userIdArg;
const LASTFM_USERNAME = usernameArg;
const BASE_URL = baseUrlArg;
const FROM = fromArg ? parseInt(fromArg, 10) : undefined;
const TO = toArg ? parseInt(toArg, 10) : undefined;

async function importAllTracks() {
  let page = 1;
  let totalPages = 1;
  let totalImported = 0;
  let totalSkipped = 0;
  const allErrors = [];

  console.log('🚀 Démarrage de l\'import Last.fm\n');
  console.log(`📋 Configuration:`);
  console.log(`   User ID: ${USER_ID}`);
  console.log(`   Last.fm Username: ${LASTFM_USERNAME}`);
  console.log(`   Base URL: ${BASE_URL}`);
  if (FROM) console.log(`   Date début: ${new Date(FROM * 1000).toLocaleString()}`);
  if (TO) console.log(`   Date fin: ${new Date(TO * 1000).toLocaleString()}`);
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
        ...(FROM && { from: FROM }),
        ...(TO && { to: TO }),
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
      
      // Attendre un peu entre les requêtes pour ne pas surcharger l'API
      if (page <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error('❌');
      console.error('   Erreur réseau:', error.message);
      allErrors.push(error.message);
      break;
    }
    
  } while (page <= totalPages);

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Import terminé !');
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

// Vérifier si fetch est disponible (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Erreur: fetch n\'est pas disponible');
  console.error('   Ce script nécessite Node.js 18+ ou installez node-fetch:');
  console.error('   npm install node-fetch@2');
  process.exit(1);
}

importAllTracks().catch(error => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});

