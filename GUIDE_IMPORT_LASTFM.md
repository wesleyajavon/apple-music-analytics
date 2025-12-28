# Guide Étape par Étape : Import Last.fm (Production)

Ce guide vous accompagne pas à pas pour importer vos **vraies données Last.fm** dans votre application. L'application utilise maintenant l'API Last.fm réelle pour récupérer vos scrobbles.

## 📋 Prérequis

- Node.js 18+ installé
- Base de données PostgreSQL configurée
- Application Next.js en cours d'exécution (ou prête à être déployée)

---

## Étape 1 : Créer un compte et une application Last.fm API

### 1.1 Créer un compte Last.fm

1. Allez sur [https://www.last.fm/join](https://www.last.fm/join)
2. Créez un compte (ou connectez-vous si vous en avez déjà un)
3. Notez votre **nom d'utilisateur Last.fm** (vous en aurez besoin plus tard)

### 1.2 Créer une application API

1. Allez sur [https://www.last.fm/api/account/create](https://www.last.fm/api/account/create)
2. Remplissez le formulaire :
   - **Application name** : `Apple Music Analytics` (ou le nom de votre choix)
   - **Application description** : `Personal music analytics dashboard`
   - **Callback URL** : `http://localhost:3000` (pour le développement)
   - **Application website** : `http://localhost:3000` (optionnel)
3. Cliquez sur **Create application**
4. **Important** : Copiez immédiatement vos clés :
   - **API Key** (publique)
   - **Shared secret** (privée, gardez-la secrète !)

⚠️ **Note** : Si vous fermez la page, vous ne pourrez plus voir le "Shared secret". Notez-le dans un endroit sûr.

---

## Étape 2 : Configurer les variables d'environnement

### 2.1 Localiser le fichier `.env.local`

Si vous n'avez pas encore de fichier `.env.local`, copiez le fichier d'exemple :

```bash
cp env.example .env.local
```

### 2.2 Ajouter les clés Last.fm

Ouvrez `.env.local` et ajoutez/modifiez ces lignes :

```env
LASTFM_API_KEY="votre_api_key_ici"
LASTFM_API_SECRET="votre_shared_secret_ici"
```

Remplacez `"votre_api_key_ici"` et `"votre_shared_secret_ici"` par les valeurs que vous avez copiées à l'étape 1.2.

**Exemple** :
```env
LASTFM_API_KEY="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
LASTFM_API_SECRET="s1h2a3r4e5d6s7e8c9r0e1t2k3e4y5"
```

### 2.3 Vérifier la configuration de la base de données

Assurez-vous que `DATABASE_URL` est correctement configuré dans `.env.local` :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/apple_music_analytics"
```

---

## Étape 3 : Créer un utilisateur dans la base de données

Vous devez créer un utilisateur dans votre base de données avant d'importer les données. Choisissez une des méthodes suivantes :

### Option A : Utiliser Prisma Studio (Recommandé - Interface graphique)

1. Lancez Prisma Studio :
   ```bash
   npm run db:studio
   ```
2. Ouvrez votre navigateur sur [http://localhost:5555](http://localhost:5555)
3. Cliquez sur le modèle **User**
4. Cliquez sur **Add record**
5. Remplissez :
   - **email** : `votre@email.com` (optionnel mais recommandé)
   - **name** : `Votre Nom` (optionnel)
6. Cliquez sur **Save 1 change**
7. **Copiez l'ID de l'utilisateur** (vous en aurez besoin pour l'import)

### Option B : Utiliser un script Node.js

Créez un fichier temporaire `create-user.js` à la racine du projet :

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      email: 'votre@email.com',  // Remplacez par votre email
      name: 'Votre Nom',          // Remplacez par votre nom
    },
  });
  
  console.log('✅ Utilisateur créé avec succès !');
  console.log('📋 ID utilisateur:', user.id);
  console.log('💾 Copiez cet ID pour l\'étape suivante');
  
  await prisma.$disconnect();
}

main().catch(console.error);
```

Exécutez le script :

```bash
node create-user.js
```

**Notez l'ID utilisateur** affiché dans la console.

### Option C : Utiliser SQL directement

Si vous préférez utiliser SQL directement :

```sql
INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,  -- PostgreSQL génère un ID
  'votre@email.com',
  'Votre Nom',
  NOW(),
  NOW()
)
RETURNING id;
```

---

## Étape 4 : Vérifier que l'application fonctionne

### 4.1 Démarrer l'application

```bash
npm run dev
```

L'application devrait démarrer sur [http://localhost:3000](http://localhost:3000)

### 4.2 Tester la connexion Last.fm

Testez que Last.fm est bien configuré en appelant l'endpoint :

```bash
curl "http://localhost:3000/api/lastfm?username=votre_username_lastfm&limit=5"
```

Remplacez `votre_username_lastfm` par votre nom d'utilisateur Last.fm.

**Résultat attendu** :
- Si configuré : `"mocked": false` et **vos vraies données Last.fm**
- Si non configuré : `"mocked": true` et des données de test (développement uniquement)

**Important** : Si vous voyez `"mocked": true`, vérifiez que vos clés API sont bien dans `.env.local` et redémarrez le serveur.

---

## Étape 5 : Importer les données Last.fm

### 5.1 Import initial (dernières écoutes)

Pour commencer, importons les dernières écoutes (200 maximum par page) :

```bash
curl -X POST http://localhost:3000/api/lastfm/import \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "VOTRE_USER_ID_ICI",
    "username": "VOTRE_USERNAME_LASTFM",
    "limit": 200
  }'
```

**Remplacez** :
- `VOTRE_USER_ID_ICI` : L'ID utilisateur créé à l'étape 3
- `VOTRE_USERNAME_LASTFM` : Votre nom d'utilisateur Last.fm

**Exemple de réponse** :
```json
{
  "success": true,
  "imported": 150,
  "skipped": 50,
  "errors": [],
  "totalPages": 10,
  "currentPage": 1,
  "_meta": {
    "mocked": false,
    "message": "Using real Last.fm API"
  }
}
```

### 5.2 Importer tout l'historique (optionnel)

Pour importer tout votre historique Last.fm, utilisez le script officiel qui gère automatiquement la pagination :

```bash
npm run lastfm:import -- --userId "VOTRE_USER_ID" --username "VOTRE_USERNAME_LASTFM"
```

Ce script va automatiquement :
- Paginer à travers toutes vos pages de scrobbles
- Afficher la progression en temps réel
- Gérer les erreurs et continuer en cas de problème
- Afficher un résumé final avec les statistiques

**Alternative** : Si vous voulez nettoyer la base et réensemencer avec vos données Last.fm :

```bash
npm run db:reseed:lastfm -- --userId "VOTRE_USER_ID" --username "VOTRE_USERNAME_LASTFM" --keep-user
```

### 5.3 Importer une période spécifique

Pour importer une période spécifique (par exemple, l'année 2024) :

```bash
# Convertir les dates en timestamps Unix
# 1er janvier 2024 00:00:00 UTC = 1704067200
# 31 décembre 2024 23:59:59 UTC = 1735689599

curl -X POST http://localhost:3000/api/lastfm/import \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "VOTRE_USER_ID_ICI",
    "username": "VOTRE_USERNAME_LASTFM",
    "limit": 200,
    "from": 1704067200,
    "to": 1735689599
  }'
```

**Conseil** : Utilisez un outil en ligne comme [https://www.epochconverter.com/](https://www.epochconverter.com/) pour convertir vos dates en timestamps Unix.

---

## Étape 6 : Vérifier les données importées

### 6.1 Via Prisma Studio

1. Ouvrez Prisma Studio : `npm run db:studio`
2. Naviguez vers le modèle **Listen**
3. Vous devriez voir vos écoutes importées avec `source: "lastfm"`

### 6.2 Via l'API

```bash
curl "http://localhost:3000/api/listens?source=lastfm&limit=10"
```

### 6.3 Via le Dashboard

1. Ouvrez [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. Les données Last.fm devraient apparaître dans :
   - **Overview** : Statistiques générales
   - **Timeline** : Graphique d'évolution
   - **Genres** : Répartition par genres
   - **Network** : Réseau d'artistes

---

## 🔄 Synchronisation Automatique (Optionnel)

Pour synchroniser automatiquement vos nouvelles écoutes Last.fm, vous pouvez :

### Option 1 : Cron Job local

Utilisez le script d'import avec un cron job :

```bash
# Éditer le crontab
crontab -e

# Ajouter une ligne pour synchroniser toutes les heures
0 * * * * cd /chemin/vers/votre/projet && npm run lastfm:import -- --userId "VOTRE_USER_ID" --username "VOTRE_USERNAME"
```

### Option 2 : Vercel Cron (si déployé sur Vercel)

Créez `vercel.json` :

```json
{
  "crons": [{
    "path": "/api/lastfm/import",
    "schedule": "0 * * * *"
  }]
}
```

**Note** : Pour la synchronisation automatique, vous devrez passer les paramètres `userId` et `username` dans le body de la requête.

---

## ❓ Dépannage

### Problème : "Using mocked Last.fm data" (vous voyez des données de test au lieu de vos vraies données)

**Solutions** :
1. Vérifiez que vos clés API sont bien dans `.env.local` :
   ```env
   LASTFM_API_KEY="votre_vraie_api_key"
   LASTFM_API_SECRET="votre_vraie_shared_secret"
   ```
2. Redémarrez le serveur Next.js (`npm run dev`)
3. Vérifiez que les clés ne contiennent pas d'espaces ou de guillemets supplémentaires
4. Testez avec : `curl "http://localhost:3000/api/lastfm?username=votre_username&limit=1"` et vérifiez que `"mocked": false`

### Problème : "userId is required"

**Solution** : Assurez-vous d'avoir créé un utilisateur et d'utiliser le bon ID.

### Problème : "Failed to import Last.fm tracks"

**Solutions** :
- Vérifiez que Last.fm API est accessible
- Vérifiez que votre nom d'utilisateur Last.fm est correct
- Vérifiez les logs du serveur pour plus de détails

### Problème : Trop de doublons ignorés

**C'est normal** : L'import évite les doublons. Si vous réimportez les mêmes données, elles seront ignorées.

---

## ✅ Checklist de Vérification

- [ ] Compte Last.fm créé
- [ ] Application API créée et clés copiées
- [ ] Variables d'environnement configurées (`.env.local`)
- [ ] Utilisateur créé dans la base de données
- [ ] ID utilisateur noté
- [ ] Test de connexion Last.fm réussi
- [ ] Import initial réussi
- [ ] Données visibles dans Prisma Studio
- [ ] Données visibles dans le dashboard

---

## 🎉 Félicitations !

Vos données Last.fm sont maintenant importées dans votre application. Vous pouvez explorer vos statistiques d'écoute dans le dashboard !

Pour toute question ou problème, consultez les logs du serveur ou vérifiez la documentation dans `DATA_SOURCES.md`.

