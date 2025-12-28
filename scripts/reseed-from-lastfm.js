#!/usr/bin/env node

/**
 * Script pour nettoyer la base de données et la réensemencer avec des données Last.fm réelles
 * 
 * Usage:
 *   node scripts/reseed-from-lastfm.js --userId "user_123" --username "lastfm_user"
 *   node scripts/reseed-from-lastfm.js --userId "user_123" --username "lastfm_user" --keep-user
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
const keepUserArg = args.includes('--keep-user');
const baseUrlArg = getArg('baseUrl') || 'http://localhost:3000';

if (!userIdArg || !usernameArg) {
  console.error('❌ Erreur: userId et username sont requis');
  console.error('\nUsage:');
  console.error('  node scripts/reseed-from-lastfm.js --userId "user_123" --username "lastfm_user"');
  console.error('  node scripts/reseed-from-lastfm.js --userId "user_123" --username "lastfm_user" --keep-user');
  process.exit(1);
}

const USER_ID = userIdArg;
const LASTFM_USERNAME = usernameArg;
const BASE_URL = baseUrlArg;
const KEEP_USER = keepUserArg;

const prisma = new PrismaClient();

async function cleanupDatabase() {
  console.log('🧹 Nettoyage de la base de données...\n');

  try {
    // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
    console.log('   Suppression des listens...');
    const listensCount = await prisma.listen.count();
    await prisma.listen.deleteMany();
    console.log(`   ✓ ${listensCount} listens supprimées`);

    console.log('   Suppression des replay data...');
    const replayCount = await prisma.replayYearly.count();
    await prisma.replayYearly.deleteMany();
    console.log(`   ✓ ${replayCount} replay yearly supprimés`);

    console.log('   Suppression des tracks...');
    const tracksCount = await prisma.track.count();
    await prisma.track.deleteMany();
    console.log(`   ✓ ${tracksCount} tracks supprimées`);

    console.log('   Suppression des artists...');
    const artistsCount = await prisma.artist.count();
    await prisma.artist.deleteMany();
    console.log(`   ✓ ${artistsCount} artists supprimés`);

    if (!KEEP_USER) {
      console.log('   Suppression des users...');
      const usersCount = await prisma.user.count();
      await prisma.user.deleteMany();
      console.log(`   ✓ ${usersCount} users supprimés`);
    } else {
      console.log('   ⏭️  Conservation des users (--keep-user)');
    }

    console.log('\n✅ Base de données nettoyée avec succès !\n');
  } catch (error) {
    console.error('\n❌ Erreur lors du nettoyage:', error.message);
    throw error;
  }
}

async function createUserIfNeeded() {
  if (KEEP_USER) {
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: USER_ID },
    });

    if (!user) {
      console.error(`❌ L'utilisateur avec l'ID "${USER_ID}" n'existe pas`);
      console.error('   Utilisez --keep-user uniquement si l\'utilisateur existe déjà');
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé: ${user.email || user.name || USER_ID}\n`);
    return user;
  }

  // Créer un nouvel utilisateur
  console.log('👤 Création d\'un nouvel utilisateur...');
  const user = await prisma.user.create({
    data: {
      email: `${LASTFM_USERNAME}@lastfm.local`,
      name: LASTFM_USERNAME,
    },
  });

  console.log(`✅ Utilisateur créé: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Nom: ${user.name}\n`);

  return user;
}

async function importFromLastFm(userId) {
  console.log('📥 Import des données Last.fm...\n');

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

  let page = 1;
  let totalPages = 1;
  let totalImported = 0;
  let totalSkipped = 0;
  const allErrors = [];

  do {
    process.stdout.write(`📄 Import page ${page}/${totalPages}... `);

    try {
      const response = await fetch(`${BASE_URL}/api/lastfm/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          username: LASTFM_USERNAME,
          limit: 200,
          page: page,
        }),
      });

      // Vérifier le type de contenu
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌');
        console.error('   Le serveur a retourné du HTML au lieu de JSON');
        console.error(`   Status: ${response.status}`);
        console.error(`   Réponse (premiers 500 caractères): ${text.substring(0, 500)}`);
        break;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌');
        console.error('   Erreur:', result.error || result.errors);
        if (result.errors) {
          allErrors.push(...result.errors);
        }
        break;
      }

      totalImported += result.imported;
      totalSkipped += result.skipped;
      totalPages = result.totalPages || 1;

      console.log(`✅ Importé: ${result.imported}, Ignoré: ${result.skipped}`);

      if (result.errors && result.errors.length > 0) {
        console.warn(`   ⚠️  ${result.errors.length} erreur(s)`);
        allErrors.push(...result.errors);
      }

      if (result._meta?.mocked) {
        console.warn('   ⚠️  Utilisation de données mockées (Last.fm non configuré)');
      }

      page++;

      // Attendre un peu entre les requêtes
      if (page <= totalPages) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
      allErrors.forEach((err, i) => console.log(`      ${i + 1}. ${err.substring(0, 100)}`));
    } else {
      console.log(`      (Afficher les ${Math.min(5, allErrors.length)} premières erreurs...)`);
      allErrors.slice(0, 5).forEach((err, i) => console.log(`      ${i + 1}. ${err.substring(0, 100)}`));
    }
  }
  console.log('='.repeat(50));
}

async function main() {
  console.log('🚀 Réensemencement de la base de données avec Last.fm\n');
  console.log(`📋 Configuration:`);
  console.log(`   User ID: ${USER_ID}`);
  console.log(`   Last.fm Username: ${LASTFM_USERNAME}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Keep User: ${KEEP_USER}`);
  console.log('');

  try {
    // Étape 1: Nettoyer la base de données
    await cleanupDatabase();

    // Étape 2: Créer ou utiliser l'utilisateur
    let userId = USER_ID;
    if (!KEEP_USER) {
      const user = await createUserIfNeeded();
      userId = user.id;
    }

    // Étape 3: Importer depuis Last.fm
    await importFromLastFm(userId);

    console.log('\n✅ Réensemencement terminé avec succès !');
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

main().catch((error) => {
  console.error('\n❌ Erreur fatale:', error);
  process.exit(1);
});

