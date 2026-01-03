# Guide : Faire attendre Vercel jusqu'à ce que CI passe

## 🎯 Objectif

Faire en sorte que Vercel ne déploie **que si** les tests CI passent.

## ⚠️ Information Importante

L'option "Wait for GitHub Checks" n'existe **plus** dans Vercel. Voici la méthode moderne.

## 📋 Deux Solutions Possibles

### Solution A : Branch Protection (Recommandé - Plus Simple)
- Configurez GitHub pour protéger la branche `main`
- Les merges nécessitent que CI passe
- Vercel continue de déployer automatiquement (rien à changer dans Vercel)

### Solution B : Deploy Hook Vercel (Plus de Contrôle)
- Créez un Deploy Hook Vercel
- Déclenchez le déploiement depuis GitHub Actions après que CI passe
- Optionnel : Désactivez l'auto-deploy (mais pas nécessaire)

---

## 🚀 Guide Étape par Étape

### Étape 1 : Créer un Deploy Hook dans Vercel

1. **Allez sur Vercel Dashboard**
   - https://vercel.com/dashboard

2. **Sélectionnez votre projet** (Apple Music Analytics)

3. **Allez dans Settings**
   - Cliquez sur "Settings" en haut à droite du projet

4. **Allez dans "Git"**
   - Dans le menu de gauche, cliquez sur "Git"

5. **Trouvez "Deploy Hooks"**
   - Faites défiler jusqu'à la section "Deploy Hooks"
   - Ou cherchez dans le menu latéral

6. **Créez un nouveau Deploy Hook**
   - Cliquez sur "Create Hook" ou "Add Hook"
   - **Nom** : `production-deploy` (ou ce que vous voulez)
   - **Branch** : `main` (ou `master` si c'est votre branche principale)
   - **Git Provider** : GitHub (si applicable)

7. **Copiez l'URL du hook**
   - Vous verrez une URL comme : `https://api.vercel.com/v1/integrations/deploy/...`
   - **⚠️ IMPORTANT** : Copiez cette URL, vous en aurez besoin à l'étape suivante

---

### Étape 2 : Ajouter le Hook comme Secret GitHub

1. **Allez sur votre repository GitHub**
   - https://github.com/VOTRE_USERNAME/apple-music-analytics

2. **Allez dans Settings**
   - Cliquez sur "Settings" en haut du repository

3. **Allez dans "Secrets and variables" > "Actions"**
   - Dans le menu de gauche : Settings > Secrets and variables > Actions

4. **Cliquez sur "New repository secret"**

5. **Ajoutez le secret** :
   - **Name** : `VERCEL_DEPLOY_HOOK_URL`
   - **Secret** : Collez l'URL du hook que vous avez copiée à l'étape 1
   - Cliquez sur "Add secret"

---

### Étape 3 : Configurer Vercel (Optionnel)

**⚠️ IMPORTANT : Ne cliquez PAS sur "Disconnect"** - Cela déconnecterait complètement votre repository Git.

**Option A : Utiliser "Ignored Build Step" (Avancé)**
1. Dans Vercel Dashboard > Votre Projet > Settings > Git
2. Trouvez "Ignored Build Step"
3. Configurez pour ignorer les builds automatiques
4. Maintenant seul le Deploy Hook déclenchera les déploiements

**Option B : Garder l'auto-deploy + Hook (Hybride)**
- Laissez Vercel connecté tel quel
- Le Deploy Hook sera déclenché par GitHub Actions après CI
- Note : Vercel peut déployer deux fois (auto + hook), mais c'est gérable

**Option C : Ne rien changer (Recommandé)**
- Gardez Vercel connecté
- Utilisez Branch Protection sur GitHub (Option 1 ci-dessous)
- Plus simple et plus propre

**Recommandation** : Option C (Branch Protection) - Pas besoin de modifier Vercel

---

### Étape 4 : Mettre à Jour le Workflow GitHub Actions

Le workflow `deploy.yml` va maintenant déclencher Vercel via le hook au lieu de juste vérifier.

---

## ✅ Vérification

Une fois configuré :

1. **Faites un push sur `main`**
2. **Le workflow CI s'exécute** (tests, lint, etc.)
3. **Si CI passe** → Le workflow `deploy.yml` déclenche Vercel via le hook
4. **Si CI échoue** → Aucun déploiement

---

## 🔄 Option 1 : Branch Protection (Plus Simple - RECOMMANDÉ)

**Cette méthode ne nécessite AUCUNE modification dans Vercel.** Vous gardez Vercel connecté tel quel.

### Configurer Branch Protection sur GitHub

1. **Allez sur GitHub** > Votre Repository > **Settings** > **Branches**

2. **Ajoutez une règle de protection** :
   - Cliquez sur "Add rule"
   - **Branch name pattern** : `main`
   - ✅ Cochez **"Require status checks to pass before merging"**
   - ✅ Cochez **"Require branches to be up to date before merging"**
   - Dans **"Status checks that are required"**, ajoutez :
     - `CI` (votre workflow principal)
     - `Pre-Deploy Check` (optionnel)

3. **Sauvegardez**

**Résultat** : Les merges vers `main` nécessitent que CI passe. Vercel déploiera automatiquement après le merge.

---

## 📊 Comparaison des Méthodes

| Méthode | Complexité | Contrôle | Recommandé pour |
|---------|-----------|----------|-----------------|
| Deploy Hook | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Contrôle total |
| Branch Protection | ⭐⭐ | ⭐⭐⭐ | Simplicité |

---

## 🎯 Recommandation

**Pour votre cas** : Je recommande **Branch Protection** car :
- ✅ Plus simple à configurer
- ✅ Pas besoin de modifier Vercel
- ✅ Vercel continue de déployer automatiquement
- ✅ Les merges sont protégés

**Si vous voulez plus de contrôle** : Utilisez le **Deploy Hook**.

---

## ❓ Questions ?

- **Q: Puis-je utiliser les deux méthodes ?**
  R: Oui, mais c'est redondant. Choisissez une.

- **Q: Que se passe-t-il si je ne fais rien ?**
  R: Vercel déploiera toujours, même si CI échoue. Pas idéal pour la production.

- **Q: La méthode Deploy Hook fonctionne-t-elle pour les previews ?**
  R: Oui, vous pouvez créer des hooks pour différentes branches.

