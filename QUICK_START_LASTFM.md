# 🚀 Démarrage Rapide : Import Last.fm

Guide condensé pour importer vos données Last.fm rapidement.

## ⚡ Commandes Rapides

### 1. Créer un utilisateur
```bash
npm run user:create
# ou avec des paramètres
npm run user:create -- --email "votre@email.com" --name "Votre Nom"
```

### 2. Importer les données Last.fm
```bash
npm run lastfm:import -- --userId "USER_ID" --username "LASTFM_USERNAME"
```

### 3. Importer une période spécifique
```bash
npm run lastfm:import -- --userId "USER_ID" --username "LASTFM_USERNAME" --from 1704067200 --to 1735689599
```

---

## 📝 Étapes Complètes

### Étape 1 : Obtenir les clés Last.fm API

1. Allez sur [https://www.last.fm/api/account/create](https://www.last.fm/api/account/create)
2. Créez une application
3. Copiez **API Key** et **Shared secret**

### Étape 2 : Configurer `.env.local`

```env
LASTFM_API_KEY="votre_api_key"
LASTFM_API_SECRET="votre_shared_secret"
DATABASE_URL="postgresql://user:password@localhost:5432/apple_music_analytics"
```

### Étape 3 : Créer un utilisateur

```bash
npm run user:create
```

**Copiez l'ID utilisateur** affiché.

### Étape 4 : Importer les données

```bash
npm run lastfm:import -- --userId "VOTRE_USER_ID" --username "VOTRE_USERNAME_LASTFM"
```

---

## 📚 Documentation Complète

Pour plus de détails, consultez :
- **Guide complet** : `GUIDE_IMPORT_LASTFM.md`
- **Sources de données** : `DATA_SOURCES.md`

---

## ✅ Vérification

Vérifiez que les données sont importées :

```bash
# Via Prisma Studio
npm run db:studio

# Via l'API
curl "http://localhost:3000/api/listens?source=lastfm&limit=10"
```

---

## 🆘 Aide

- **Erreur "mocked data"** : Vérifiez vos clés dans `.env.local` et redémarrez le serveur. Si vous voyez toujours des données mockées, vos clés API ne sont pas correctement configurées.
- **Erreur "userId required"** : Créez d'abord un utilisateur avec `npm run user:create`
- **Pas de données** : Vérifiez que votre nom d'utilisateur Last.fm est correct et que vous avez des scrobbles sur votre compte
- **Données incorrectes** : Si vous voyez des artistes comme "The Weeknd" ou "Taylor Swift" que vous n'écoutez pas, c'est que l'API n'est pas configurée. Vérifiez `.env.local` et redémarrez le serveur.

## 🎯 Nettoyer et Réensemencer

Pour nettoyer votre base et la réensemencer avec vos vraies données :

```bash
npm run db:reseed:lastfm -- --userId "VOTRE_USER_ID" --username "VOTRE_USERNAME" --keep-user
```

