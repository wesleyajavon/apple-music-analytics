# GitHub Actions Workflows

Workflows CI/CD pour Apple Music Analytics.

## Workflows

### 1. `ci.yml` – Intégration continue

**Déclenchement** : push et Pull Request sur toutes les branches

**Jobs** :
- **Lint & Type Check** : TypeScript, ESLint
- **Run Tests** : tests unitaires (Vitest), rapport JUnit, upload Codecov
- **Build Check** : build Next.js de production

**Durée** : ~3–5 min

---

### 2. `test-coverage.yml` – Rapport de couverture

**Déclenchement** : Pull Request

**Fait** :
- Génère un rapport de couverture (lcov)
- Commente la PR avec les résultats
- Upload des artifacts (7 jours)

**Durée** : ~2–3 min

---

## Déploiement

Le projet est déployé automatiquement sur **Vercel** à chaque push sur `main`. Aucun workflow GitHub Actions n’est requis pour le déploiement.

**Optionnel** : pour que Vercel attende les checks CI avant de déployer :
1. Vercel Dashboard → Settings → Git
2. Activer « Wait for GitHub Checks »
3. Ajouter le check `CI` comme requis

---

## Dépannage

| Problème | Vérification |
|----------|---------------|
| Workflow ne se déclenche pas | Fichiers dans `.github/workflows/`, syntaxe YAML correcte |
| Tests échouent | Logs dans l’onglet Actions, étape en échec |
| Build échoue | `DATABASE_URL` dans les secrets si nécessaire |

---

## Badge

```markdown
![CI](https://github.com/USERNAME/REPO/actions/workflows/ci.yml/badge.svg)
```
