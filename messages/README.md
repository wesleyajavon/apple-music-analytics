# Structure des messages i18n

Ce dossier contient les fichiers de traduction pour chaque langue supportée.

## Fichiers

- `fr.json` : Français (locale par défaut)
- `en.json` : Anglais
- `es.json` : Espagnol (complet)

## Structure modulaire par zone

| Clé | Description |
|-----|-------------|
| `common` | Labels partagés (boutons, actions, erreurs génériques) |
| `sidebar` | Navigation latérale |
| `dashboard` | Pages dashboard (layout, titres) |
| `overview` | Page vue d'ensemble |
| `timeline` | Page timeline |
| `heatmap` | Page heatmap |
| `temporal-analysis` | Page analyse temporelle |
| `genres` | Page genres + trends |
| `artists` | Page artistes |
| `network` | Page réseau |
| `ai-insights` | Page AI Insights |
| `taste-evolution` | Page évolution des goûts |
| `taste-profile` | Page Explain My Taste |
| `when-will-i-listen` | Page quand vais-je écouter |
| `insights` | Page méthodologie |
| `pricing` | Page tarification |
| `api-docs` | Page doc API |
| `errors` | error.tsx, global-error.tsx |
| `components` | empty-state, error-state, date-range-filter, period-selector, etc. |
| `home` | Page d'accueil |

## Documentation complète

Voir `docs/I18N_IMPLEMENTATION.md` pour la documentation complète de l’implémentation multilingue.

## Où placer les clés

- **États vides / erreurs** : `components.emptyState.*`, `components.errorState.*`
- **Filtres de dates** : `components.dateRangeFilter.*`
- **Sélecteur de période** : `components.periodSelector.*`
- **Navigation** : `sidebar.*`
- **Contenu d'une page** : nom de la zone correspondante (ex: `overview.*`, `genres.*`)
