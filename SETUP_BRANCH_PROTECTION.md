# Guide : Configurer Branch Protection (Étape par Étape)

## ⚠️ Problème : Les Status Checks n'Apparaissent Pas

Si vous ne voyez que "Vercel" dans la liste des status checks, c'est parce que **les workflows GitHub Actions n'ont pas encore été exécutés sur GitHub**.

Les status checks n'apparaissent dans GitHub qu'**après** qu'un workflow s'est exécuté au moins une fois.

---

## 🚀 Solution : Pousser les Workflows d'Abord

### Étape 1 : Pousser les Workflows sur GitHub

Les fichiers workflows sont créés localement mais pas encore sur GitHub. Il faut les pousser :

```bash
# 1. Ajouter les fichiers workflows
git add .github/workflows/

# 2. Ajouter les guides (optionnel mais utile)
git add SETUP_VERCEL_WAIT_FOR_CI.md SETUP_BRANCH_PROTECTION.md GUIDE_CI_CD.md

# 3. Commit
git commit -m "feat: add CI/CD workflows with GitHub Actions"

# 4. Push
git push
```

### Étape 2 : Attendre que les Workflows S'Exécutent

Une fois poussé, GitHub Actions va automatiquement :

1. **Détecter les workflows** dans `.github/workflows/`
2. **Les exécuter** sur le push que vous venez de faire
3. **Créer les status checks** : "CI" et "Pre-Deploy Check"

**Temps d'attente** : 3-5 minutes pour que les workflows se terminent

### Étape 3 : Vérifier que les Workflows Sont Terminés

1. Allez sur GitHub > Votre Repository
2. Cliquez sur l'onglet **"Actions"** (en haut)
3. Vous devriez voir :
   - ✅ Workflow "CI" en cours ou terminé
   - ✅ Workflow "Deploy to Vercel" (si sur main)

### Étape 4 : Configurer Branch Protection (MAINTENANT)

Maintenant que les workflows ont été exécutés, les status checks apparaîtront :

1. **GitHub** > Repository > **Settings** > **Branches**

2. **Ajoutez une règle** :
   - Cliquez sur "Add rule" ou "Add branch protection rule"
   - **Branch name pattern** : `main`

3. **Configurez** :
   - ✅ Cochez **"Require status checks to pass before merging"**
   - ✅ Cochez **"Require branches to be up to date before merging"**

4. **Dans "Status checks that are required"** :
   - Vous devriez maintenant voir :
     - `CI` ✅ (votre workflow principal)
     - `Deploy to Vercel` ✅ (si vous êtes sur main)
   - Cochez `CI` (obligatoire)
   - Optionnel : Cochez `Deploy to Vercel`

5. **Sauvegardez** :
   - Cliquez sur "Create" ou "Save changes"

---

## ✅ Résultat

Maintenant :
- ✅ Les merges vers `main` nécessitent que CI passe
- ✅ Vercel continue de déployer automatiquement
- ✅ Aucune modification dans Vercel nécessaire

---

## 🔍 Si les Status Checks N'Apparaissent Toujours Pas

### Vérification 1 : Les Workflows Sont-ils sur GitHub ?

1. Allez sur GitHub > Votre Repository
2. Cliquez sur `.github/workflows/`
3. Vous devriez voir : `ci.yml`, `deploy.yml`, `test-coverage.yml`

**Si non** : Les fichiers ne sont pas poussés. Répétez l'Étape 1.

### Vérification 2 : Les Workflows S'Exécutent-ils ?

1. Allez sur GitHub > Votre Repository > **Actions**
2. Vous devriez voir des workflows en cours ou terminés

**Si non** : 
- Vérifiez que vous avez bien poussé sur GitHub
- Vérifiez la syntaxe YAML (pas d'erreurs)

### Vérification 3 : Le Nom du Workflow Est Correct

Dans `.github/workflows/ci.yml`, le nom est :
```yaml
name: CI
```

Le status check apparaîtra comme **"CI"** dans GitHub.

---

## 📝 Alternative : Utiliser "Vercel" Temporairement

Si vous voulez configurer Branch Protection **maintenant** sans attendre :

1. **Cochez "Vercel"** dans les status checks requis
2. **Plus tard**, une fois que les workflows CI ont été exécutés :
   - Retournez dans Settings > Branches
   - Modifiez la règle
   - Ajoutez "CI" aux checks requis
   - Vous pouvez garder ou retirer "Vercel"

Cela protégera votre branche immédiatement, même si ce n'est pas la solution idéale.

---

## 🎯 Résumé des Étapes

1. ✅ Pousser les workflows sur GitHub
2. ⏳ Attendre 3-5 minutes que les workflows s'exécutent
3. ✅ Configurer Branch Protection avec les checks "CI" et "Deploy to Vercel"
4. ✅ Sauvegarder

**C'est tout !** 🎉



