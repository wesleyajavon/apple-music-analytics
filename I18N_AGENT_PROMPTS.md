# Prompts Agent – Internationalisation (i18n) Apple Music Analytics

Ce document contient tous les prompts à transmettre à l’agent pour implémenter progressivement le support multi-langues (anglais, puis espagnol). L’application est actuellement en français.

**Stratégie recommandée :** `next-intl` avec Next.js App Router (routing basé sur le préfixe `/en`, `/fr`, `/es`).

---

## Ordre d’exécution recommandé

1. **Phase 0** (obligatoire en premier) : infrastructure next-intl
2. **Phase 1** : composants partagés (sidebar, filtres, empty/error state)
3. **Phase 2** : pages une par une (overview → timeline → …)
4. **Phase 5** : formatage et aria-labels (peut se faire en parallèle des pages)
5. **Phase 3** : PDF
6. **Phase 4** : services AI (une fois que la locale est disponible partout)
7. **Phase 6** : Swagger (optionnel)
8. **Phase 7** : tests
9. **Phase 8** : espagnol (après validation de l’anglais)

---

## Phase 0 : Infrastructure (à faire en premier)

### Prompt 0.1 – Setup next-intl

```
Configure l'internationalisation pour Next.js 14 App Router avec next-intl :

1. Installer next-intl
2. Créer la structure de dossiers :
   - messages/fr.json (toutes les clés en français - contenu actuel)
   - messages/en.json (traductions anglaises)
   - messages/es.json (stub vide pour l'espagnol)
3. Créer i18n/request.ts avec getRequestConfig
4. Créer i18n/routing.ts avec locales: ['fr', 'en', 'es'] et defaultLocale: 'fr'
5. Créer le middleware next-intl pour le routing
6. Adapter app/layout.tsx pour utiliser le segment [locale] dynamique
7. Déplacer le contenu actuel sous app/[locale]/ et mettre à jour le layout racine

Vérifier que le html lang="" soit dynamique selon la locale.
```

### Prompt 0.2 – Structure des messages

```
Organise les fichiers messages/*.json avec une structure modulaire par zone :

- common: labels partagés (boutons, actions, erreurs génériques)
- sidebar: navigation
- dashboard: pages dashboard
- overview: page vue d'ensemble
- timeline: page timeline
- heatmap: page heatmap
- temporal-analysis: page analyse temporelle
- genres: page genres + trends
- artists: page artistes
- network: page réseau
- ai-insights: page AI Insights
- taste-evolution: page évolution des goûts
- taste-profile: page Explain My Taste
- when-will-i-listen: page quand vais-je écouter
- insights: page méthodologie
- pricing: page tarification
- api-docs: page doc API
- errors: error.tsx, global-error.tsx
- components: empty-state, error-state, date-range-filter, period-selector, etc.

Documente cette structure dans un fichier messages/README.md pour que les prochains prompts sachent où placer les clés.
```

---

## Phase 1 : Composants partagés (priorité haute)

### Prompt 1.1 – Sidebar

```
Internationalise lib/components/sidebar.tsx :
- Tous les labels des groupes de navigation (Principal, Analyse temporelle, Contenu, IA, Autre)
- Tous les labels des items (Vue d'ensemble, Timeline, Heatmap, Analyse Temporelle, Genres, Tendances Genres, Artistes, Réseau, AI Insights, Évolution des goûts, Quand vais-je écouter ?, Explain My Taste, Méthodologie, Test Sentry)
- aria-label "Ouvrir le menu"
Extrait toutes les chaînes vers messages/*.json et utilise useTranslations.
```

### Prompt 1.2 – DateRangeFilter

```
Internationalise lib/components/date-range-filter.tsx :
- Label "Période"
- Labels des presets : "7d", "30d", "YTD", "All" (garder 7d/30d si ce sont des codes, sinon traduire)
- Label "Export"
- title des boutons : "Exporter les écoutes en CSV", "Exporter les statistiques en JSON", "Générer le rapport PDF annuel"
- Toasts : "Filtre mis à jour", "Période sélectionnée : {label}", "Export {type} en cours...", "Export {type} réussi", "Le fichier {filename} a été téléchargé avec succès", "Erreur lors de l'export {type}", "Erreur lors de l'export", "Une erreur est survenue lors de l'export"
```

### Prompt 1.3 – PeriodSelector

```
Internationalise lib/components/period-selector.tsx :
- Label "Agrégation"
- Options : "Quotidien", "Hebdomadaire", "Mensuel"
```

### Prompt 1.4 – EmptyState et presets

```
Internationalise lib/components/empty-state.tsx :
- Message par défaut "Aucune donnée disponible"
- emptyStatePresets.importData : message, description, action label
- emptyStatePresets.importReplay : message, description, action label
- emptyStatePresets.changeDates : message, description, action label (fonction avec basePath)
- emptyStatePresets.noDayDetail : message, description
- emptyStatePresets.noNetwork : message, description, action label
Le composant doit accepter des props message/description/actions déjà traduites OU utiliser useTranslations(key) si on passe une clé.
```

### Prompt 1.5 – ErrorState

```
Internationalise lib/components/error-state.tsx :
- Message par défaut "Une erreur est survenue lors du chargement des données"
- Bouton "Réessayer"
```

### Prompt 1.6 – LoadingState et SkeletonLoaders

```
Vérifie lib/components/loading-state.tsx et lib/components/skeleton-loaders.tsx.
Internationalise tout texte affiché (ex: "Chargement...", labels de skeleton).
```

---

## Phase 2 : Pages principales

### Prompt 2.0 – Redirect Dashboard

```
Adapte app/[locale]/dashboard/page.tsx : le redirect doit aller vers /[locale]/dashboard/overview (inclure la locale dans le path).
Utilise les params ou headers pour obtenir la locale courante.
```

### Prompt 2.1 – Page d'accueil

```
Internationalise app/[locale]/page.tsx :
- Titre "Apple Music Analytics Dashboard"
- Bouton "Accéder au Dashboard"
```

### Prompt 2.2 – Layout et metadata

```
Internationalise app/[locale]/layout.tsx :
- metadata.title et metadata.description doivent être dynamiques selon la locale
Utilise generateMetadata({ params: { locale } }) ou un fichier de messages dédié aux metadata.
```

### Prompt 2.3 – Dashboard Overview

```
Internationalise app/[locale]/dashboard/overview/page.tsx complètement :
- Titre page "Vue d'ensemble"
- Sous-titre "Statistiques générales de votre écoute musicale..."
- StatCard labels : "Total d'écoutes", "Artistes uniques", "Titres uniques", "Temps total"
- "vs période précédente"
- "Non disponible" (formatTime)
- Sections : "Évolution récente", "Nombre d'écoutes par jour", "Voir plus", "Top genres", "Vos genres les plus écoutés", "Voir tout", "Artistes les plus écoutés", "Vos artistes favoris par nombre d'écoutes"
- Tooltips Recharts : "écoutes", "Écoutes"
- Messages ErrorState/EmptyState
- formatTime et toLocaleDateString : passer la locale courante ( useLocale() )
```

### Prompt 2.4 – Dashboard Timeline

```
Internationalise app/[locale]/dashboard/timeline/page.tsx :
- Titre, sous-titre, labels des graphiques
- PeriodSelector si présent
- Tooltips, axis labels
- EmptyState, ErrorState
- Tout toLocaleDateString avec la locale
```

### Prompt 2.5 – Dashboard Heatmap

```
Internationalise app/[locale]/dashboard/heatmap/page.tsx et lib/components/calendar-heatmap.tsx :
- Titre, description
- Labels du tooltip (date, écoutes, etc.)
- EmptyState noDayDetail
- Légende si présente
```

### Prompt 2.6 – Dashboard Temporal Analysis

```
Internationalise app/[locale]/dashboard/temporal-analysis/page.tsx :
- Titre, sous-titre
- Labels des graphiques (heures, jours, etc.)
- Tous les textes affichés
```

### Prompt 2.7 – Dashboard Genres

```
Internationalise app/[locale]/dashboard/genres/page.tsx et app/[locale]/dashboard/genres/trends/page.tsx :
- Titres, descriptions
- Labels des graphiques
- "écoutes", pourcentages
- EmptyState, ErrorState
```

### Prompt 2.8 – Dashboard Artists

```
Internationalise app/[locale]/dashboard/artists/page.tsx :
- Titre, description
- Labels, tooltips
- EmptyState, ErrorState
```

### Prompt 2.9 – Dashboard Network

```
Internationalise app/[locale]/dashboard/network/page.tsx et lib/components/artist-network-graph.tsx :
- Titre, description
- Labels du graphe (tooltips sur les nœuds)
- emptyStatePresets.noNetwork
```

### Prompt 2.10 – Dashboard AI Insights

```
Internationalise app/[locale]/dashboard/ai-insights/page.tsx et lib/components/ai-insights-summary-widget.tsx :
- Titre, description
- Labels des sections
- États vides, erreurs
```

### Prompt 2.11 – Dashboard Taste Evolution

```
Internationalise app/[locale]/dashboard/taste-evolution/page.tsx et lib/components/taste-evolution-summary-widget.tsx :
- Titre, description
- Labels des graphiques
- Tout texte affiché
```

### Prompt 2.12 – Dashboard Taste Profile (Explain My Taste)

```
Internationalise app/[locale]/dashboard/taste-profile/page.tsx et lib/components/taste-profile-summary-widget.tsx :
- Titre, description
- Labels des tonalités (analytique, décontracté, poétique)
- Boutons, états
```

### Prompt 2.13 – Dashboard When Will I Listen

```
Internationalise app/[locale]/dashboard/when-will-i-listen/page.tsx et lib/components/when-will-i-listen-widget.tsx :
- Titre, description
- Labels de prédiction
- Explications générées (voir Phase 4 - services AI)
```

### Prompt 2.14 – Dashboard Insights (Méthodologie)

```
Internationalise app/[locale]/dashboard/insights/page.tsx :
- Tout le contenu de la page méthodologie
```

### Prompt 2.14b – Dashboard Sentry Test

```
Internationalise app/[locale]/dashboard/sentry-test/page.tsx (page très riche en texte) :
- Titre "Test Sentry", description
- Bloc "Sentry non configuré" : titre, instructions (5 étapes), variables env
- "Configuration Sentry" : DSN, Sentry initialisé, Environnement, message warning
- Section "Tests d'erreurs" : Erreur JavaScript, Erreur Asynchrone, Erreur Non Gérée, Erreur API
- Section "Tests de messages" : Message Info, Message Warning
- Section "Configuration" : Définir Utilisateur, Définir Tags, Définir Contexte
- Section "Comment voir les erreurs dans Sentry" : toutes les étapes
- Section "Comment vérifier que ça fonctionne" : les 3 points
- Tous les setTestResult() : messages de feedback affichés à l'utilisateur
Note : Les captureMessage() et Error() envoyés à Sentry peuvent rester en français ou suivre la locale (debug).
```

### Prompt 2.15 – Dashboard Pricing

```
Internationalise app/[locale]/dashboard/pricing/page.tsx :
- Titre, descriptions des plans
- Boutons, labels
```

### Prompt 2.16 – API Docs

```
Internationalise app/[locale]/api-docs/page.tsx :
- "Chargement de la documentation..."
- "Erreur"
- "Erreur lors du chargement de la documentation API"
- "Documentation non disponible"
- "Assurez-vous que le serveur de développement est démarré..."
```

### Prompt 2.17 – Error boundaries

```
Internationalise app/[locale]/error.tsx et app/[locale]/global-error.tsx :
- "Quelque chose s'est mal passé"
- "Une erreur inattendue s'est produite..."
- "Détails de l'erreur (développement)"
- "Réessayer"
- "Erreur critique"
- "Une erreur critique s'est produite..."
- Mettre à jour <html lang="..."> dynamiquement dans global-error
```

---

## Phase 3 : PDF et exports

### Prompt 3.1 – Rapport PDF annuel

```
Internationalise lib/components/pdf/annual-report.tsx :
- "Rapport Annuel {year}"
- "Analyse de vos habitudes d'écoute musicale"
- "Vue d'ensemble"
- "Total d'écoutes", "Artistes uniques", "Titres uniques", "Temps d'écoute"
- "Genres musicaux"
- "écoutes"
- "Évolution mensuelle"
- En-têtes tableau : "Mois", "Écoutes", "Artistes", "Titres"
- "Généré le {date} - Apple Music Analytics Dashboard"
- formatTime, formatNumber, formatMonth : passer la locale au Intl
Note : @react-pdf/renderer ne supporte pas les hooks React. Il faudra passer la locale et les messages traduits en props au composant AnnualReportPDF.
```

### Prompt 3.2 – API Export (CSV, JSON)

```
Vérifie app/api/export/listens/route.ts, app/api/export/stats/route.ts, app/api/export/report/route.ts.
Si des messages d'erreur sont renvoyés au client, les internationaliser côté API n'est pas trivial (l'API n'a pas accès à la locale du client).
Options : 
- Garder les messages d'erreur API en anglais (convention)
- Ou passer ?locale=fr dans la requête et utiliser ce paramètre pour les messages
Documente le choix et applique.
```

---

## Phase 4 : Services AI (génération de contenu)

### Prompt 4.1 – Taste Profile Service

```
Adapte lib/services/ai/taste-profile-service.ts pour la locale :
- Le prompt BASE_SYSTEM_PROMPT demande "Langue: français". Remplacer par un paramètre locale (fr, en, es).
- Les TONE_INSTRUCTIONS sont en français : créer des versions par langue ou générer dynamiquement.
- Le format de réponse attendu : "Un paragraphe unique commençant par 'Votre goût musical...'" → adapter selon la langue.
- L'API taste-profile doit accepter un paramètre locale (header Accept-Language ou query param) et le transmettre au service.
```

### Prompt 4.2 – Analytics Summarizer

```
Vérifie lib/services/ai/analytics-summarizer.ts : les prompts système et les instructions de langue.
Ajouter le support de la locale et adapter les prompts pour que le résumé soit généré dans la langue demandée.
```

### Prompt 4.3 – Taste Evolution Commentary

```
Vérifie lib/services/ai/taste-evolution-commentary.ts : idem, support locale.
```

### Prompt 4.4 – Listening Habit Explainer

```
Vérifie lib/services/predictions/listening-habit-service.ts et listening-habit-explainer si présent.
Les explications "Quand vais-je écouter ?" doivent être générées dans la langue de l'utilisateur.
Propager la locale depuis le frontend jusqu'au service.
```

### Prompt 4.5 – Hooks AI et propagation locale

```
Vérifie lib/hooks/use-ai-insights.ts, use-taste-profile.ts, use-taste-evolution.ts.
S'assurer que la locale courante (useLocale()) est passée aux appels API.
Ajouter locale dans les paramètres des requêtes fetch vers les routes AI.
```

---

## Phase 5 : Formatage et accessibilité

### Prompt 5.1 – Locale dans les formatages

```
Audit global : rechercher tous les usages de :
- toLocaleString("fr-FR")
- toLocaleDateString("fr-FR", ...)
- toLocaleTimeString
- Intl.NumberFormat("fr-FR")
- Intl.DateTimeFormat

Remplacer par des versions qui utilisent la locale courante ( useLocale() ou getLocale() côté serveur).
Fichiers à vérifier : overview, timeline, heatmap, genres, artists, pdf/annual-report, etc.
```

### Prompt 5.2 – aria-label et title

```
Recherche tous les aria-label="..." et title="..." dans le projet.
S'assurer qu'ils sont internationalisés (t() ou useTranslations).
Fichiers à modifier :
- lib/components/sidebar.tsx : "Ouvrir le menu"
- app/dashboard/heatmap/page.tsx : "Fermer les détails"
- lib/components/artist-network-graph.tsx : "Légende des types de connexion"
- lib/components/calendar-heatmap.tsx : aria-label dynamique (count > 0)
- app/dashboard/pricing/page.tsx : "Basculer entre mensuel et annuel"
- lib/components/date-range-filter.tsx : voir Prompt 1.2 (title des boutons)
- lib/components/empty-state.tsx : aria-label={message} — s'assurer que message est traduit
```

---

## Phase 6 : Swagger / API docs

### Prompt 6.1 – Swagger config

```
Le fichier swagger.config.js contient des descriptions en français.
Options :
A) Garder Swagger en anglais (convention pour les API) ✅ IMPLÉMENTÉ
B) Créer swagger.config.en.js et swagger.config.fr.js et charger selon un paramètre
Recommandation : A) pour la doc API technique.
Si tu choisis B, documente comment charger la config selon la locale.
```

**Implémentation (option A)** : `swagger.config.js` et toutes les annotations `@swagger` JSDoc dans les routes API (`app/api/**/*.ts`) sont en anglais. La route `/api/swagger` retourne la spec générée par `swagger.config.js`. Voir `docs/API_I18N.md` pour la convention.

---

## Phase 7 : Tests

### Prompt 7.1 – E2E Playwright ✅ IMPLÉMENTÉ

```
Adapte __tests__/e2e/dashboard.spec.ts pour le multi-langue :
- Les tests doivent fonctionner quelle que soit la locale
- Option : tester avec locale /en explicitement (page.goto('/en/dashboard/overview'))
- Ou : tester que la page se charge et que le contenu principal est visible (sans vérifier le texte exact)
- Mettre à jour les commentaires en anglais si nécessaire
```

**Implémentation** : Tous les tests utilisent `/en/` explicitement. Les commentaires et la config Playwright sont en anglais. Les assertions vérifient la structure et la visibilité, pas le texte traduit.

### Prompt 7.2 – Tests unitaires ✅ PAS DE CHANGEMENT NÉCESSAIRE

```
Les tests dans __tests__/ et lib/services/**/__tests__/ peuvent contenir des chaînes françaises en dur (fixtures, assertions).
Priorité basse : si un test échoue à cause d'un texte attendu en français, adapter pour utiliser la clé de traduction ou un mock.
```

**Implémentation** : Tous les tests unitaires passent (333/333). Aucun échec lié au texte français ; aucune adaptation requise. Les validators API retournent encore des messages en français ; les tests qui les ciblent restent cohérents.

---

## Phase 8 : Espagnol (après anglais)

### Prompt 8.1 – Remplir messages/es.json

```
Une fois messages/en.json complet et validé :
1. Créer/copier messages/es.json avec toutes les clés
2. Traduire chaque valeur en espagnol (es-ES)
3. Tester manuellement les pages principales avec ?locale=es ou /es/
4. Vérifier le formatage (dates, nombres) avec Intl pour es-ES
```

### Prompt 8.2 – Services AI espagnol

```
S'assurer que les services AI (taste-profile, analytics-summarizer, taste-evolution-commentary, listening-habit-explainer) supportent locale="es".
Adapter les prompts si des instructions spécifiques à la langue existent.
```

---

## Checklist de vérification finale

À exécuter après chaque phase ou à la fin :

```
1. Navigation : toutes les pages s'affichent sans erreur en /fr, /en, /es
2. Sidebar : tous les liens et labels traduits
3. Filtres : DateRangeFilter, PeriodSelector traduits
4. États vides : EmptyState, ErrorState affichent les bons messages
5. Graphiques : tooltips et labels dans la bonne langue
6. Dates/nombres : format correct (fr-FR, en-US, es-ES)
7. PDF export : rapport généré dans la langue active
8. AI : résumés et profils générés dans la langue active
9. Metadata : title et description par page selon la locale
10. aria-label et title : tous traduits
11. Pas de chaîne en dur oubliée : grep pour les patterns français courants (é, è, ê, à, ç, " d'", " l'", etc.)
```

---

## Commandes utiles

```bash
# Rechercher les chaînes potentiellement non traduites (français)
rg -n "[\"'][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇa-zàâäéèêëïîôùûüÿç\s']{10,}[\"']" --type-add 'code:*.{ts,tsx,js,jsx}' -t code app lib

# Lister les clés d'un fichier messages
jq 'keys' messages/fr.json
```

---

## Notes techniques

- **next-intl** : `useTranslations(namespace)` pour les composants client, `getTranslations` pour les Server Components.
- **Locale dans les hooks** : `useLocale()` retourne la locale active.
- **Metadata** : `generateMetadata` peut recevoir `params: { locale }`.
- **API et locale** : préférer `Accept-Language` header ou `?locale=` en query pour les routes qui génèrent du contenu (AI).
- **PDF** : pas de hooks, passer `locale` et `messages` en props depuis le composant parent qui les obtient.
