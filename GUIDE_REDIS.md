# Guide pour obtenir une URL Redis

Ce guide vous explique étape par étape comment obtenir une URL Redis pour mettre en cache les requêtes coûteuses de votre application.

---

## 🎯 Option 1 : Upstash Redis (Recommandé pour Next.js/Vercel)

**Pourquoi Upstash ?**
- ✅ Gratuit jusqu'à 10 000 requêtes/jour (plus que suffisant pour le développement)
- ✅ Intégration native avec Vercel
- ✅ Serverless (payez seulement ce que vous utilisez)
- ✅ Configuration en 2 minutes
- ✅ Parfait pour les projets Next.js

### Étapes détaillées :

#### 1. Créer un compte Upstash

1. Allez sur [https://upstash.com](https://upstash.com)
2. Cliquez sur **"Sign Up"** ou **"Get Started"**
3. Connectez-vous avec GitHub (recommandé) ou créez un compte email

#### 2. Créer une base de données Redis

1. Une fois connecté, cliquez sur **"Create Database"** ou **"New Database"**
2. Remplissez le formulaire :
   - **Name** : `apple-music-analytics-cache` (ou un nom de votre choix)
   - **Type** : Laissez **Redis** (par défaut)
   - **Region** : Choisissez la région la plus proche de vos utilisateurs (ex: `eu-west-1` pour l'Europe, `us-east-1` pour les USA)
   - **TLS** : Laissez activé (recommandé pour la sécurité)
3. Cliquez sur **"Create"**

#### 3. Récupérer l'URL Redis

1. Une fois la base créée, vous serez redirigé vers la page de détails
2. Dans la section **"REST API"** ou **"Connection Details"**, vous trouverez :
   - **UPSTASH_REDIS_REST_URL** (pour l'API REST)
   - **UPSTASH_REDIS_REST_TOKEN** (pour l'authentification)

   **OU** dans l'onglet **"Redis CLI"** ou **"Details"**, vous verrez :
   - **REDIS_URL** : une URL au format `redis://default:xxxxx@xxxxx.upstash.io:6379`

3. **Copiez l'URL Redis complète** (elle ressemble à) :
   ```
   redis://default:AbCdEf123456@eu-west-1-upstash-12345.upstash.io:6379
   ```

#### 4. Ajouter l'URL dans vos variables d'environnement

**Pour le développement local :**

1. Ouvrez votre fichier `.env.local` (créez-le s'il n'existe pas)
2. Ajoutez :
   ```bash
   REDIS_URL="redis://default:xxxxx@xxxxx.upstash.io:6379"
   ```
   (Remplacez `xxxxx` par votre URL réelle)

**Pour la production sur Vercel :**

1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Environment Variables**
4. Cliquez sur **"Add New"**
5. Remplissez :
   - **Key** : `REDIS_URL`
   - **Value** : Votre URL Redis (copiée depuis Upstash)
   - **Environment** : Cochez **Production**, **Preview**, et **Development**
6. Cliquez sur **"Save"**

✅ **C'est fait !** Vous avez maintenant une URL Redis configurée.

---

## 🏠 Option 2 : Redis Local (Pour le développement uniquement)

Si vous préférez utiliser Redis localement pour le développement (gratuit, mais nécessite Redis installé sur votre machine).

### Étapes détaillées :

#### 1. Installer Redis sur votre machine

**Sur macOS (avec Homebrew) :**
```bash
brew install redis
```

**Sur Ubuntu/Debian :**
```bash
sudo apt update
sudo apt install redis-server
```

**Sur Windows :**
- Téléchargez Redis depuis [redis.io/download](https://redis.io/download)
- Ou utilisez WSL (Windows Subsystem for Linux) et suivez les instructions Ubuntu

#### 2. Démarrer Redis

**Sur macOS/Linux :**
```bash
# Démarrer Redis en arrière-plan
brew services start redis
# OU pour un démarrage temporaire
redis-server
```

**Sur Ubuntu/Debian :**
```bash
sudo systemctl start redis-server
# Pour démarrer automatiquement au boot
sudo systemctl enable redis-server
```

#### 3. Vérifier que Redis fonctionne

```bash
# Tester la connexion
redis-cli ping
# Devrait répondre : PONG
```

#### 4. Configurer l'URL Redis locale

1. Ouvrez votre fichier `.env.local`
2. Ajoutez :
   ```bash
   REDIS_URL="redis://localhost:6379/0"
   ```

   Si vous avez configuré un mot de passe :
   ```bash
   REDIS_URL="redis://:votre_mot_de_passe@localhost:6379/0"
   ```

⚠️ **Note** : L'URL locale ne fonctionnera que sur votre machine. Pour la production, vous devrez utiliser une option cloud (Upstash, Redis Cloud, etc.).

---

## ☁️ Option 3 : Redis Cloud (Alternative cloud)

Redis Cloud offre un plan gratuit généreux (30 MB).

### Étapes :

1. Allez sur [redis.com/cloud](https://redis.com/try-free/)
2. Créez un compte gratuit
3. Créez une base de données
4. Récupérez l'URL de connexion dans les paramètres
5. Ajoutez-la dans vos variables d'environnement (comme pour Upstash)

---

## 🔍 Comment trouver votre URL Redis sur Upstash (détaillé)

Si vous avez du mal à trouver l'URL :

1. **Connectez-vous à Upstash** : [console.upstash.com](https://console.upstash.com)
2. **Sélectionnez votre base de données** dans la liste
3. **Onglet "Details"** ou **"Connect"** :
   - Cherchez une section avec "Redis CLI" ou "Connection String"
   - L'URL sera au format : `redis://default:PASSWORD@HOST:PORT`
4. **Onglet "REST API"** (alternative si vous utilisez l'API REST) :
   - Vous verrez `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`
   - Mais pour `ioredis`, vous avez besoin de l'URL standard (pas REST)

**Format de l'URL :**
```
redis://default:VOTRE_PASSWORD@VOTRE_HOST.upstash.io:6379
```

---

## ✅ Vérification

Pour vérifier que votre Redis fonctionne, vous pouvez tester dans votre code :

```typescript
// Test rapide (à supprimer après)
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
redis.ping().then(() => {
  console.log('✅ Redis connecté avec succès !');
}).catch((err) => {
  console.error('❌ Erreur Redis:', err);
});
```

---

## 🎯 Recommandation

**Pour ce projet :**
- **Développement local** : Redis local (`redis://localhost:6379/0`)
- **Production (Vercel)** : **Upstash Redis** (le plus simple et gratuit)

Vous pouvez même utiliser Upstash pour le développement local aussi, c'est très pratique !

---

## 📚 Ressources

- [Upstash Documentation](https://docs.upstash.com/redis)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Redis Official Docs](https://redis.io/docs/)




