# MCP Gemini Design

**Gemini est votre développeur frontend.** Pour tout travail d'UI/design, utilisez ce MCP. Les descriptions d'outils contiennent toutes les instructions nécessaires.

## Avant d'écrire du code UI, demandez-vous :

* Est-ce un NOUVEAU composant visuel (popup, carte, section, etc.) ? → `snippet_frontend` ou `create_frontend`
* Est-ce un REDESIGN d'un élément existant ? → `modify_frontend`
* Est-ce juste du texte/logique, ou un changement trivial ? → Faites-le vous-même

## Règles critiques :

1. **Si l'UI existe déjà et vous devez la redesigner/restyler** → utilisez `modify_frontend`, PAS `snippet_frontend`.
2. **Les tâches peuvent être mixtes** (logique + UI). Séparez-les mentalement. Faites la logique vous-même, déléguez l'UI à Gemini.

## Stack de ce projet

- **Framework** : Next.js 14 (App Router) avec React 18
- **Styling** : Tailwind CSS avec support du mode sombre
- **Structure** : Pages dans `app/dashboard/`, composants réutilisables dans `lib/components/`

## Contexte du design system

Ce projet utilise :
- Tailwind CSS pour le styling
- Mode sombre (dark mode) disponible
- Design moderne et épuré
- Composants réutilisables dans `lib/components/`

Quand vous utilisez Gemini Design, référencez ces informations pour que les composants générés correspondent au style du projet.

## Exemples d'utilisation

### Créer un nouveau composant
"Crée une carte de statistiques pour le dashboard avec icône, titre, valeur et indicateur de tendance"

### Redesigner un composant existant
"Redesign cette carte pour qu'elle soit plus moderne avec des ombres subtiles et un meilleur espacement"

### Ajouter un élément à une page existante
"Ajoute une barre de recherche dans le header avec dropdown de résultats"

## Bonnes pratiques

1. **Soyez spécifique** : Mentionnez les couleurs, espacements, styles existants à respecter
2. **Itérez par petites étapes** : Créez d'abord une section, puis ajoutez les autres
3. **Référencez des designs réels** : "Style comme le dashboard Stripe" ou "Similar à Notion"
4. **Vérifiez la responsivité** : Les composants sont responsive par défaut, mais testez quand même
