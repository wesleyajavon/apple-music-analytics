# Guide de déploiement sur Vercel avec Vercel Postgres

## ⚡ Démarrage rapide

1. **Créer la DB** : Vercel Dashboard → Storage → Create Database → Postgres
2. **Récupérer les variables** : Settings → Environment Variables (automatique)
3. **Configurer localement** : `vercel env pull .env.local`
4. **Appliquer le schéma** : `npm run db:push`
5. **Déployer** : `vercel` ou push Git

---

## 🎯 Base de données recommandée : Vercel Postgres

**Pourquoi Vercel Postgres ?**
- ✅ Intégration native avec Vercel
- ✅ Configuration automatique des variables d'environnement
- ✅ Connection pooling automatique
- ✅ Serverless PostgreSQL (basé sur Neon)
- ✅ Plan gratuit généreux (256 MB)
- ✅ Scaling automatique
- ✅ Compatible avec Prisma
- ✅ Pas de configuration manuelle nécessaire

---

## 📋 Étapes complètes de configuration

### 1️⃣ Créer la base de données depuis Vercel

1. Connectez-vous à votre dashboard [Vercel](https://vercel.com)
2. Sélectionnez votre projet (ou créez-en un nouveau)
3. Allez dans l'onglet **Storage**
4. Cliquez sur **Create Database** → **Postgres**
5. Choisissez un nom pour votre base de données (ex: `apple-music-db`)
6. Sélectionnez une région (choisissez celle la plus proche de vos utilisateurs)
7. Cliquez sur **Create**

✅ **Vercel créera automatiquement 3 variables d'environnement :**
   - `POSTGRES_URL` - Connection string directe
   - `POSTGRES_PRISMA_URL` - Connection string avec pooler (pour Prisma) ⭐ **À utiliser**
   - `POSTGRES_URL_NON_POOLING` - Connection string sans pooler (pour les migrations)

### 2️⃣ Vérifier les variables d'environnement sur Vercel

1. Dans votre projet Vercel, allez dans **Settings** → **Environment Variables**
2. Vous devriez voir automatiquement :
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
3. Vérifiez qu'elles sont disponibles pour **Production**, **Preview** et **Development**

⚠️ **Important** : Ne supprimez pas ces variables ! Elles sont gérées automatiquement par Vercel.

### 3️⃣ Configurer les variables d'environnement locales

Pour le développement local, récupérez les valeurs depuis Vercel :

1. Dans **Settings** → **Environment Variables** sur Vercel
2. Cliquez sur chaque variable pour voir sa valeur
3. Copiez la valeur de `POSTGRES_PRISMA_URL`
4. Créez/modifiez votre fichier `.env.local` à la racine du projet :

```bash
POSTGRES_PRISMA_URL="postgres://default:xxx@xxx.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

Ou utilisez la CLI Vercel pour les récupérer automatiquement :

**Option A : Si Vercel CLI est installé globalement :**
```bash
vercel env pull .env.local
```

**Option B : Utiliser npx (sans installation) :**
```bash
npx vercel env pull .env.local
```

**Option C : Utiliser le script npm (recommandé) :**
```bash
npm run vercel:env:pull
```

⚠️ **Note** : Si vous obtenez une erreur "command not found: vercel", installez Vercel CLI avec :
```bash
npm install -g vercel
# ou sur macOS/Linux si permissions nécessaires :
sudo npm install -g vercel
```

⚠️ **Note** : Pour les migrations, utilisez `POSTGRES_URL_NON_POOLING` dans `.env.local` si nécessaire.

### 4️⃣ Vérifier la configuration Prisma

Le projet a déjà été configuré pour utiliser `POSTGRES_PRISMA_URL`. La configuration est correcte :

- ✅ `prisma/config.ts` utilise `POSTGRES_PRISMA_URL` (avec pooler pour l'application)
- ✅ `lib/prisma.ts` utilise l'adapter configuré
- ✅ Les migrations utiliseront `POSTGRES_URL_NON_POOLING` ou `DATABASE_URL`

### 5️⃣ Appliquer le schéma Prisma à Vercel Postgres

#### Option A : Utiliser `db push` (simple, recommandé pour commencer)

```bash
# Générer le client Prisma
npm run db:generate

# Appliquer le schéma directement à la base de données
npx prisma db push
```

⚠️ **Note** : `db push` fonctionne avec `POSTGRES_PRISMA_URL`. Idéal pour le développement rapide.

#### Option B : Utiliser les migrations (recommandé pour la production)

⚠️ **Note importante** : Prisma 7+ utilise un adapter, mais les migrations nécessitent toujours une variable `DATABASE_URL`.

**Pour créer des migrations localement :**

1. Dans `.env.local`, ajoutez temporairement :
```bash
# Pour les migrations, utilisez POSTGRES_URL_NON_POOLING
DATABASE_URL=$POSTGRES_URL_NON_POOLING
```

Ou copiez directement la valeur :
```bash
DATABASE_URL="postgres://default:xxx@xxx.pooler.supabase.com:5432/postgres"
```

2. Créez la migration :
```bash
npx prisma migrate dev --name init
```

**Pour appliquer les migrations en production :**

Option 1 : Exécuter localement avec les variables de production (recommandé)
```bash
# 1. Récupérer les variables d'environnement de production
vercel env pull .env.production

# 2. Ajouter DATABASE_URL pour les migrations (si pas déjà présent)
# Dans .env.production, ajoutez :
# DATABASE_URL=$POSTGRES_URL_NON_POOLING

# 3. Exécuter les migrations avec les variables de production
DATABASE_URL=$(grep POSTGRES_URL_NON_POOLING .env.production | cut -d '=' -f2) npx prisma migrate deploy
```

Ou plus simplement, après avoir configuré `.env.production` :
```bash
# Charger les variables et exécuter
source .env.production
export DATABASE_URL=$POSTGRES_URL_NON_POOLING
npx prisma migrate deploy
```

Option 2 : Via la ligne de commande avec URL directe
```bash
# Utilisez POSTGRES_URL_NON_POOLING pour les migrations
# Récupérez la valeur depuis Vercel Dashboard → Settings → Environment Variables
DATABASE_URL="votre_postgres_url_non_pooling" npx prisma migrate deploy
```

Option 3 : Créer une route API temporaire (pour migrations ponctuelles)
Créez un fichier `app/api/migrate/route.ts` (à supprimer après usage) :
```typescript
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function POST(request: Request) {
  // Sécurité : vérifiez un token secret dans les headers
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Utiliser POSTGRES_URL_NON_POOLING pour les migrations
    const dbUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
    execSync(`DATABASE_URL="${dbUrl}" npx prisma migrate deploy`, {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Puis appelez cette route avec un token secret :
```bash
curl -X POST https://votre-app.vercel.app/api/migrate \
  -H "Authorization: Bearer votre_migration_secret"
```

⚠️ **Important** : Supprimez cette route après avoir exécuté les migrations !

⚠️ **Rappel** : L'application utilise `POSTGRES_PRISMA_URL` (avec pooler) via l'adapter, mais les migrations nécessitent `POSTGRES_URL_NON_POOLING` (sans pooler).

### 6️⃣ Vérifier la connexion

```bash
# Ouvrir Prisma Studio pour vérifier
npm run db:studio
```

Cela devrait se connecter automatiquement à votre base de données Vercel Postgres via les variables d'environnement.

### 7️⃣ Configurer Vercel pour les builds

Vercel détectera automatiquement Next.js, mais assurez-vous que :

1. **Build Command** : `npm run build` (par défaut)
2. **Install Command** : `npm install` (par défaut)
3. **Output Directory** : `.next` (par défaut)

Ajoutez un script de build avec génération Prisma dans `package.json` :

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && next build"
  }
}
```

### 8️⃣ Déployer sur Vercel

#### Première fois :

```bash
# Installer Vercel CLI si nécessaire
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Suivre les instructions
```

#### Déploiements suivants :

```bash
# Push vers votre repo Git (GitHub/GitLab/Bitbucket)
git push

# Vercel déploiera automatiquement
```

### 9️⃣ Configuration et optimisations

Vercel Postgres gère automatiquement :
- ✅ Connection pooling (via `POSTGRES_PRISMA_URL`)
- ✅ SSL/TLS sécurisé
- ✅ Scaling automatique
- ✅ Backup automatique

Le fichier `prisma/config.ts` est déjà configuré correctement pour utiliser le pooler.

### 🔟 Sécurité et bonnes pratiques

1. ✅ Utilisez **toujours** `POSTGRES_PRISMA_URL` pour Prisma (déjà configuré)
2. ✅ Ne commitez **jamais** votre `.env.local` (déjà dans `.gitignore`)
3. ✅ Les variables d'environnement sont automatiquement séparées par environnement (Production/Preview/Development)
4. ✅ SSL/TLS est activé automatiquement par Vercel
5. ✅ Surveillez l'utilisation dans **Storage** → votre base de données sur Vercel

---

## 🔄 Alternative : Neon PostgreSQL (configuration manuelle)

Si vous préférez gérer votre propre instance Neon (plus de contrôle, plan gratuit plus généreux) :

### Étapes pour Neon PostgreSQL :

1. Allez sur [neon.tech](https://neon.tech) et créez un compte
2. Créez un nouveau projet et notez la connection string
3. Dans Vercel, allez dans **Settings** → **Environment Variables**
4. Ajoutez `DATABASE_URL` avec la connection string Neon (avec `-pooler` pour la production)
5. Mettez à jour `prisma/schema.prisma` pour utiliser `env("DATABASE_URL")`
6. Mettez à jour `prisma/config.ts` pour utiliser `process.env.DATABASE_URL`

⚠️ **Note** : Neon offre 0.5 GB de stockage gratuit vs 256 MB pour Vercel Postgres.

---

## 📊 Comparaison des options

| Critère | Vercel Postgres | Neon |
|---------|-----------------|------|
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Facilité | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Plan gratuit | 256 MB storage | 0.5 GB storage |
| Configuration | Automatique | Manuel |
| Intégration Vercel | Native | Manuelle |
| Flexibilité | Moyenne | Max |

---

## 🆘 Résolution de problèmes

### Erreur "Can't deploy more than one path" avec `vercel run`

Si vous obtenez cette erreur en essayant `vercel run db:migrate`, c'est parce que la commande `vercel run` n'existe pas dans Vercel CLI.

**Solution** : Utilisez plutôt l'une des méthodes suivantes :

1. **Exécuter localement avec les variables de production** (recommandé) :
   ```bash
   vercel env pull .env.production
   export DATABASE_URL=$(grep POSTGRES_URL_NON_POOLING .env.production | cut -d '=' -f2)
   npx prisma migrate deploy
   ```

2. **Exécuter directement avec l'URL** :
   ```bash
   DATABASE_URL="votre_postgres_url_non_pooling" npx prisma migrate deploy
   ```

Voir la section "Pour appliquer les migrations en production" ci-dessus pour plus de détails.

### Erreur "command not found: vercel"

Si vous obtenez cette erreur, Vercel CLI n'est pas installé. Solutions :

1. **Installer globalement** :
   ```bash
   npm install -g vercel
   # ou si permissions nécessaires :
   sudo npm install -g vercel
   ```

2. **Utiliser npx (sans installation)** :
   ```bash
   npx vercel env pull .env.local
   ```

3. **Utiliser le script npm** :
   ```bash
   npm run vercel:env:pull
   ```

### Erreur de connexion

- Vérifiez que `POSTGRES_PRISMA_URL` est présent dans les variables d'environnement Vercel
- Vérifiez que la base de données a été créée dans **Storage** → votre projet
- Pour le développement local, vérifiez que `.env.local` contient `POSTGRES_PRISMA_URL`
- Exécutez `npm run vercel:env:pull` ou `npx vercel env pull .env.local` pour récupérer les variables locales

### Erreur "Too many connections"

- Vercel Postgres gère automatiquement le pooling, mais si vous voyez cette erreur :
  - Vérifiez que vous utilisez `POSTGRES_PRISMA_URL` (pas `POSTGRES_URL`)
  - Vérifiez que vous n'ouvrez pas trop de connexions simultanées dans votre code

### Erreur Prisma en build

- Ajoutez `prisma generate` dans le script de build (déjà fait dans `package.json`)
- Vérifiez que `prisma` et `@prisma/client` sont dans `dependencies` (déjà configuré)
- Vérifiez que `POSTGRES_PRISMA_URL` est disponible pendant le build sur Vercel

---

## 📚 Ressources

- [Documentation Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Prisma avec Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Vercel CLI - Environment Variables](https://vercel.com/docs/cli/env)

