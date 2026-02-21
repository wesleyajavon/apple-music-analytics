# Protection de la documentation manuelle

## Structure

- **`guides/`** — Documentation manuelle (guides, quick-start, setup). **NE JAMAIS supprimer ni modifier** lors d'un nettoyage ou d'une régénération.
- **`docs/`** — Sortie TypeDoc uniquement (`npm run docs:generate`). Contenu régénéré automatiquement.

## Règles

1. Lors d'un nettoyage du projet ou d'une régénération de la documentation : **ne jamais supprimer le dossier `guides/`**.
2. Les fichiers dans `guides/` sont essentiels pour le setup et l'onboarding des contributeurs.
3. Si un agent ou un script doit nettoyer la documentation : exclure explicitement `guides/` de toute suppression.
