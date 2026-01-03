# GitHub Actions Workflows

Ce dossier contient les workflows CI/CD pour le projet Apple Music Analytics.

## 📋 Workflows Disponibles

### 1. `ci.yml` - Intégration Continue
**Quand** : Sur chaque push et Pull Request

**Fait** :
- ✅ Vérification TypeScript
- ✅ Linting (ESLint)
- ✅ Tests unitaires
- ✅ Build de vérification

**Durée** : ~3-5 minutes

---

### 2. `deploy.yml` - Vérification Pre-Déploiement (Optionnel)
**Quand** : Seulement sur la branche `main`

**Fait** :
- ✅ Vérifie que CI a réussi avant déploiement
- ⚠️ **Note** : Ce workflow est optionnel si Vercel est déjà configuré pour déployer automatiquement

**Durée** : ~1-2 minutes

**Configuration** :
- **Aucune configuration requise** (utilise le token GitHub automatique)
- Si vous voulez que Vercel attende ce check, configurez dans Vercel Dashboard > Settings > Git > "Wait for GitHub Checks"

**⚠️ Important** : Si Vercel déploie déjà automatiquement, ce workflow sert uniquement de garde-fou. Vous pouvez le supprimer si vous préférez la simplicité. Voir [`DEPLOY_OPTIONS.md`](./DEPLOY_OPTIONS.md) pour plus de détails.

---

### 3. `test-coverage.yml` - Rapport de Couverture
**Quand** : Sur chaque Pull Request

**Fait** :
- ✅ Génère un rapport de couverture
- ✅ Commente la PR avec les résultats

**Durée** : ~2-3 minutes

---

## 🚀 Comment Utiliser

### Première Configuration

1. **Poussez ces fichiers** sur GitHub
2. **Allez dans l'onglet "Actions"** de votre repository
3. **Les workflows se déclencheront automatiquement** sur le prochain push

### Configuration Vercel (Optionnel)

**Si Vercel déploie déjà automatiquement** (ce qui semble être votre cas) :
- ✅ Rien à faire ! Le workflow `deploy.yml` est optionnel
- Vous pouvez le supprimer si vous préférez la simplicité
- Ou le garder comme garde-fou pour vérifier que CI passe

**Si vous voulez que Vercel attende les checks GitHub** :
1. Allez dans Vercel Dashboard > Votre Projet > Settings > Git
2. Activez "Wait for GitHub Checks"
3. Ajoutez "Pre-Deploy Check" comme check requis

**Pour plus d'options**, consultez [`DEPLOY_OPTIONS.md`](./DEPLOY_OPTIONS.md)

### Voir les Résultats

- **Onglet "Actions"** : Voir tous les workflows et leur statut
- **Badge de statut** : Ajoutez `![CI](https://github.com/USERNAME/REPO/workflows/CI/badge.svg)` dans votre README
- **Notifications** : GitHub vous notifiera par email si un workflow échoue

## 🔍 Dépannage

### Le workflow ne se déclenche pas
- Vérifiez que les fichiers sont dans `.github/workflows/`
- Vérifiez la syntaxe YAML (pas d'erreurs d'indentation)
- Vérifiez que vous avez poussé sur la bonne branche

### Les tests échouent
- Cliquez sur le workflow qui a échoué
- Regardez les logs pour voir quelle étape a échoué
- Corrigez le problème et poussez à nouveau

### Le déploiement échoue
- **Note** : Si Vercel déploie déjà automatiquement, ce workflow ne déploie pas réellement
- Il vérifie seulement que CI passe
- Si le check échoue, vérifiez que le workflow CI a bien réussi
- Consultez [`DEPLOY_OPTIONS.md`](./DEPLOY_OPTIONS.md) pour comprendre les options

## 📚 Pour En Savoir Plus

Consultez le guide : [`GUIDE_CI_CD.md`](../../GUIDE_CI_CD.md)

