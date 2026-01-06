# 🚀 Guide de Configuration CI/CD - Démarrage Rapide

Ce guide vous aidera à configurer CI/CD pour la première fois.

## ⚡ Configuration en 5 Minutes

### Étape 1 : Pousser les Workflows (2 min)

Les fichiers de workflow sont déjà créés dans `.github/workflows/`. Il suffit de :

```bash
# Ajouter les nouveaux fichiers
git add .github/
git add GUIDE_CI_CD.md SETUP_CI_CD.md

# Commit
git commit -m "feat: add CI/CD workflows with GitHub Actions"

# Pousser
git push
```

**C'est tout !** Les workflows se déclencheront automatiquement sur le prochain push.

### Étape 2 : Vérifier que ça Fonctionne (1 min)

1. Allez sur votre repository GitHub
2. Cliquez sur l'onglet **"Actions"** (en haut)
3. Vous devriez voir le workflow "CI" en cours d'exécution
4. Attendez 3-5 minutes pour voir le résultat

✅ **Si c'est vert** : Tout fonctionne !
❌ **Si c'est rouge** : Cliquez dessus pour voir les erreurs

### Étape 3 : Configurer le Déploiement (Optionnel, 2 min)

Si vous voulez le déploiement automatique sur Vercel :

#### 3.1 Obtenir le Token Vercel

1. Allez sur https://vercel.com/account/tokens
2. Cliquez sur **"Create Token"**
3. Donnez-lui un nom (ex: "GitHub Actions")
4. **Copiez le token** (vous ne le reverrez plus !)

#### 3.2 Trouver les IDs Vercel

**VERCEL_ORG_ID** :
1. Allez sur https://vercel.com/dashboard
2. Cliquez sur **Settings** (en bas à gauche)
3. Dans **General**, vous verrez **"Team ID"** → C'est votre `VERCEL_ORG_ID`

**VERCEL_PROJECT_ID** :
1. Allez sur votre projet dans Vercel
2. Cliquez sur **Settings**
3. Dans **General**, vous verrez **"Project ID"** → C'est votre `VERCEL_PROJECT_ID`

#### 3.3 Ajouter les Secrets dans GitHub

1. Allez sur votre repository GitHub
2. Cliquez sur **Settings** (en haut)
3. Dans le menu de gauche : **Secrets and variables** > **Actions**
4. Cliquez sur **"New repository secret"**
5. Ajoutez les 3 secrets :
   - Nom: `VERCEL_TOKEN` → Valeur: (le token que vous avez copié)
   - Nom: `VERCEL_ORG_ID` → Valeur: (votre Team ID)
   - Nom: `VERCEL_PROJECT_ID` → Valeur: (votre Project ID)

#### 3.4 Tester le Déploiement

1. Faites un petit changement dans votre code
2. Committez et poussez sur `main`
3. Allez dans **Actions** → Le workflow "Deploy" devrait se déclencher
4. Attendez 5-10 minutes
5. Votre site devrait être déployé automatiquement ! 🎉

## 📊 Comprendre les Résultats

### Dans l'onglet Actions

Vous verrez :
- ✅ **Vert** = Succès
- ❌ **Rouge** = Échec
- 🟡 **Jaune** = En cours

### Cliquer sur un Workflow

Vous verrez :
- **Jobs** : Les différentes tâches (Lint, Test, Build, etc.)
- **Steps** : Les étapes dans chaque job
- **Logs** : Les détails de chaque étape

### Si quelque chose échoue

1. **Cliquez sur le workflow** qui a échoué
2. **Cliquez sur le job** qui a échoué (marqué en rouge)
3. **Lisez les logs** pour voir l'erreur
4. **Corrigez le problème** dans votre code
5. **Poussez à nouveau** → Le workflow se relancera automatiquement

## 🎯 Workflows Disponibles

### 1. CI (Intégration Continue)
- **Déclenché** : Sur chaque push et PR
- **Fait** : Tests, lint, type-check, build
- **Durée** : ~3-5 minutes

### 2. Deploy (Déploiement)
- **Déclenché** : Seulement sur `main` après que CI passe
- **Fait** : Déploie sur Vercel
- **Durée** : ~5-10 minutes
- **Nécessite** : Configuration des secrets Vercel

### 3. Test Coverage (Couverture)
- **Déclenché** : Sur chaque PR
- **Fait** : Génère un rapport de couverture
- **Durée** : ~2-3 minutes

## 🔧 Personnalisation

### Changer la Version de Node.js

Dans `.github/workflows/ci.yml`, changez :
```yaml
env:
  NODE_VERSION: '20'  # Changez ici (ex: '18', '20', '22')
```

### Ajouter des Notifications

Vous pouvez ajouter des notifications Slack, Discord, etc. dans `deploy.yml` :

```yaml
- name: Notify Slack
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Désactiver Temporairement un Workflow

Commentez le fichier YAML ou supprimez-le temporairement.

## ❓ Questions Fréquentes

**Q: Est-ce que ça coûte de l'argent ?**
R: GitHub Actions offre 2000 minutes gratuites/mois pour les repos privés, illimité pour les repos publics.

**Q: Puis-je tester localement ?**
R: Oui, avec `act` (https://github.com/nektos/act) mais ce n'est pas nécessaire.

**Q: Les workflows ralentissent-ils mon développement ?**
R: Non, ils s'exécutent en arrière-plan. Vous pouvez continuer à travailler normalement.

**Q: Que faire si les tests échouent ?**
R: Corrigez le problème et poussez à nouveau. Le workflow se relancera automatiquement.

**Q: Puis-je voir l'historique des workflows ?**
R: Oui, dans l'onglet "Actions", vous verrez tous les workflows passés.

## 📚 Pour Aller Plus Loin

- **Guide complet** : Lisez [`GUIDE_CI_CD.md`](./GUIDE_CI_CD.md) pour comprendre les concepts
- **Documentation GitHub Actions** : https://docs.github.com/en/actions
- **Workflows README** : Voir [`.github/workflows/README.md`](./.github/workflows/README.md)

## ✅ Checklist de Configuration

- [ ] Workflows poussés sur GitHub
- [ ] Workflow CI s'exécute et passe (vérifié dans Actions)
- [ ] Tests s'exécutent correctement
- [ ] (Optionnel) Secrets Vercel configurés
- [ ] (Optionnel) Déploiement automatique fonctionne

**Félicitations ! 🎉 Vous avez maintenant CI/CD configuré !**



