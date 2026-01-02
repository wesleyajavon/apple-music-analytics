#!/usr/bin/env node

/**
 * Script utilitaire pour créer un utilisateur dans la base de données
 * 
 * Usage:
 *   node scripts/create-user.js
 *   node scripts/create-user.js --email "user@example.com" --name "John Doe"
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const emailArg = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
const nameArg = args.find(arg => arg.startsWith('--name='))?.split('=')[1];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('👤 Création d\'un nouvel utilisateur\n');

  let email = emailArg;
  let name = nameArg;

  // Demander l'email si non fourni en argument
  if (!email) {
    email = await question('Email (optionnel, appuyez sur Entrée pour ignorer): ');
    if (email.trim() === '') email = null;
  }

  // Demander le nom si non fourni en argument
  if (!name) {
    name = await question('Nom (optionnel, appuyez sur Entrée pour ignorer): ');
    if (name.trim() === '') name = null;
  }

  try {
    const user = await prisma.user.create({
      data: {
        ...(email && { email }),
        ...(name && { name }),
      },
    });

    console.log('\n✅ Utilisateur créé avec succès !');
    console.log('📋 Détails:');
    console.log(`   ID: ${user.id}`);
    if (user.email) console.log(`   Email: ${user.email}`);
    if (user.name) console.log(`   Nom: ${user.name}`);
    console.log(`   Créé le: ${user.createdAt.toLocaleString()}`);
    console.log('\n💡 Copiez l\'ID ci-dessus pour l\'utiliser lors de l\'import Last.fm');
    console.log('   Exemple: curl -X POST http://localhost:3000/api/lastfm/import \\');
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"userId": "${user.id}", "username": "votre_username", "limit": 200}'`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.error('\n❌ Erreur: Un utilisateur avec cet email existe déjà');
    } else {
      console.error('\n❌ Erreur lors de la création:', error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});



