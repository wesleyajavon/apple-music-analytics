/**
 * Script simple pour tester la connexion Redis
 * Usage: node scripts/test-redis.js
 */

// Charger les variables d'environnement depuis .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

async function testRedis() {
  const Redis = require('ioredis');

  if (!process.env.REDIS_URL) {
    console.log('❌ REDIS_URL n\'est pas défini dans .env.local');
    process.exit(1);
  }

  let redisUrl = process.env.REDIS_URL;
  console.log('🔗 Tentative de connexion à Redis...');
  
  // For Upstash, convert redis:// to rediss:// (TLS required)
  if (redisUrl.includes('upstash.io') && redisUrl.startsWith('redis://')) {
    redisUrl = redisUrl.replace('redis://', 'rediss://');
    console.log('🔒 Conversion en rediss:// (TLS) pour Upstash');
  }
  
  console.log('📍 URL:', redisUrl.replace(/:[^:@]+@/, ':****@')); // Masque le mot de passe
  
  // Vérifier le format de l'URL
  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    console.error('❌ L\'URL Redis doit commencer par redis:// ou rediss://');
    process.exit(1);
  }

  // Check if Upstash (requires IPv6)
  const isUpstash = redisUrl.includes('upstash.io');
  
  const options = {
    maxRetriesPerRequest: null, // No automatic retries for testing
    enableReadyCheck: true,
    connectTimeout: 10000,
    lazyConnect: false, // Connect immediately for testing
  };

  // For Upstash, use IPv6 (required by some Upstash instances)
  if (isUpstash) {
    options.family = 6; // Force IPv6
    console.log('🌐 Configuration IPv6 pour Upstash activée');
  }

  const redis = new Redis(redisUrl, options);

  let connectionError = null;
  
  // Handle connection errors
  redis.on('error', (err) => {
    connectionError = err;
    console.error('⚠️  Redis error event:', err.message);
  });

  redis.on('connect', () => {
    console.log('🔌 Connexion établie...');
  });

  redis.on('ready', () => {
    console.log('✅ Redis est prêt !');
  });

  try {
    // Wait a bit for connection to establish
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    if (connectionError) {
      throw connectionError;
    }

    // Test PING
    const pong = await redis.ping();
    console.log('✅ PING:', pong);

    // Test SET/GET
    await redis.set('test:connection', 'ok', 'EX', 10);
    const value = await redis.get('test:connection');
    console.log('✅ SET/GET test:', value === 'ok' ? '✓' : '✗');

    // Nettoyage
    await redis.del('test:connection');

    await redis.quit();
    console.log('\n🎉 Redis fonctionne correctement !');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur Redis:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    console.error('\n💡 Vérifiez que:');
    console.error('   1. Votre URL Redis est correcte et complète');
    console.error('   2. Votre instance Redis est accessible depuis votre réseau');
    console.error('   3. Vos credentials sont valides (vérifiez sur Upstash dashboard)');
    console.error('   4. Votre instance Upstash n\'est pas en pause (plan gratuit)');
    
    try {
      await redis.quit();
    } catch (e) {
      // Ignore quit errors
    }
    process.exit(1);
  }
}

testRedis();

