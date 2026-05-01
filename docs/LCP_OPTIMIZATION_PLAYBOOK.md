# LCP Optimization Playbook

Objectif: améliorer le score Vercel Speed Insights, en priorité le LCP actuellement observe autour de 12.99s.

Ce document avance étape par étape. Chaque étape contient un objectif, les fichiers ou zones probables, le résultat attendu, et un prompt réutilisable pour piloter le travail.

> Note: les pratiques Next.js, Vercel Speed Insights et Core Web Vitals évoluent régulièrement. Avant les changements structurants, vérifier les docs officielles Next.js/Vercel et les release notes de la version utilisée par le projet.

## Étape 1 - Identifier la route et l'élément LCP exacts

Avant de modifier le code, confirmer où le mauvais LCP est mesuré. Un LCP global à 12.99s peut venir d'une route dashboard lourde, d'une homepage mobile lente, ou d'une API qui bloque le rendu initial.

À relever dans Vercel Speed Insights:

- route concernée (`/`, `/en`, `/fr`, `/dashboard/overview`, etc.);
- device (`mobile` ou `desktop`);
- pays ou réseau dominant;
- élément LCP si disponible;
- répartition TTFB / load delay / render delay si disponible.

Résultat attendu: une route cible prioritaire et une hypothèse claire, par exemple "le LCP vient du hero logo sur mobile" ou "le LCP vient du dashboard overview après attente des données".

Prompt:

```text
Analyse les données Vercel Speed Insights pour ce projet. Identifie la route, le device, l'élément LCP probable et la phase dominante du LCP (TTFB, load delay, render delay ou client rendering). Donne une hypothèse prioritaire et les 3 premières vérifications à faire dans le code Next.js.
```

## Étape 2 - Mesurer localement avant changement

Créer une baseline locale pour éviter d'optimiser à l'aveugle. Speed Insights donne des données terrain, mais Lighthouse et DevTools aident à comprendre pourquoi une route est lente.

À faire:

- lancer un build production;
- tester la route cible avec Lighthouse en mode mobile;
- regarder le waterfall réseau;
- noter le LCP element, le JS initial, les appels API et le TTFB;
- comparer homepage et dashboard si Vercel ne donne pas une route évidente.

Résultat attendu: une baseline écrite avec valeurs approximatives avant optimisation.

Prompt:

```text
Établis une baseline de performance pour la route LCP cible. Lance l'app en mode production si possible, mesure avec Lighthouse/DevTools, puis résume le LCP element, TTFB, taille JS initiale, requêtes API critiques et tout blocage visible dans le waterfall. Ne modifie pas encore le code.
```

## Étape 3 - Quick win image: optimiser le logo hero

Le composant `SoundprintLogo` utilise déjà `next/image` et accepte `priority`. C'est bon pour un élément hero potentiel, mais il manque un `sizes` explicite pour aider Next à choisir la bonne ressource selon le viewport.

Zones probables:

- `lib/components/soundprint-logo.tsx`
- `public/brand/soundprint-ai-logo.png`
- `app/page.tsx`
- `app/[locale]/page.tsx`

Changements possibles:

- ajouter une prop `sizes` à `SoundprintLogo`;
- passer un `sizes` précis sur les usages hero;
- convertir le PNG hero en WebP/AVIF si le fichier est lourd;
- garder `priority` uniquement sur l'image au-dessus de la ligne de flottaison.

Résultat attendu: moins d'octets image et moins d'incertitude sur la ressource LCP.

Prompt:

```text
Optimise l'image hero potentiellement responsable du LCP. Inspecte `SoundprintLogo`, ses usages sur les pages d'accueil, et les assets dans `public/brand`. Ajoute `sizes` de façon compatible avec les tailles Tailwind existantes, garde `priority` seulement pour le hero, et propose une conversion WebP/AVIF si le PNG est trop lourd.
```

## Étape 4 - Réduire le client rendering de la homepage localisée

`app/[locale]/page.tsx` est actuellement un Client Component complet. Pour une page marketing/home, cela augmente le JS et retarde souvent le rendu utile. Le contenu statique du hero peut être rendu côté serveur; seule la personnalisation auth/prénom nécessite du client.

Zones probables:

- `app/[locale]/page.tsx`
- `lib/components/home-*` si un nouveau composant est créé
- `lib/supabase/client`

Changements possibles:

- convertir la page en Server Component;
- déplacer `useEffect`, Supabase browser client et état auth dans un petit composant client;
- afficher un CTA statique par défaut côté serveur;
- hydrater seulement la zone qui change selon l'utilisateur connecté.

Résultat attendu: moins de JS initial, HTML utile disponible plus tôt, meilleur LCP sur la homepage.

Prompt:

```text
Refactorise `app/[locale]/page.tsx` pour réduire le rendu client initial. Garde le hero, le logo, les textes traduits, les feature cards et le layout principal en Server Component. Déplace uniquement la détection Supabase auth/prénom et les CTA dépendants de l'auth dans un petit Client Component. Préserve le comportement utilisateur et les traductions existantes.
```

## Étape 5 - Alléger le layout racine et les providers globaux

Le root layout charge des providers globaux, Sentry, WebVitals, Analytics, Speed Insights, thème et toaster. Ces éléments sont normaux, mais il faut vérifier qu'ils ne forcent pas trop de JS sur toutes les routes.

Zones probables:

- `app/layout.tsx`
- `app/providers.tsx`
- `lib/components/sentry-init.tsx`
- `lib/components/web-vitals.tsx`
- `lib/components/ai-master-toggle.tsx`

Changements possibles:

- confirmer que `SpeedInsights` et `Analytics` restent non bloquants;
- déplacer les composants vraiment dashboard-only hors du root layout si possible;
- vérifier si `AiMasterToggle` doit être global ou seulement dashboard/admin;
- éviter les providers lourds sur les pages publiques si elles n'en ont pas besoin.

Résultat attendu: moins de JS global pour les routes publiques et moins de travail d'hydratation.

Prompt:

```text
Audite `app/layout.tsx` et les providers globaux pour réduire le JavaScript initial. Identifie les composants qui n'ont pas besoin d'être chargés sur toutes les routes publiques, en particulier `AiMasterToggle`, Sentry init, WebVitals, Analytics, Speed Insights, ThemeProvider, QueryClientProvider et Toaster. Propose puis applique uniquement les déplacements sûrs qui préservent le comportement.
```

## Étape 6 - Dashboard overview: séparer le hero critique des widgets lourds

Si la route lente est `/dashboard/overview`, le problème vient probablement du client bundle et du nombre de widgets/appels API. Le fichier importe `recharts`, plusieurs widgets, hooks React Query, et rend un dashboard très riche.

Zones probables:

- `app/[locale]/dashboard/(main)/overview/page.tsx`
- widgets dans `lib/components/*summary-widget.tsx`
- `lib/components/heatmap-calendar-overview-widget.tsx`
- `lib/components/overview-stats-section.tsx`

Changements possibles:

- garder le hero/skeleton critique léger;
- déplacer les charts Recharts dans des composants dynamiques;
- lazy-loader les widgets sous la ligne de flottaison;
- retarder les appels API non nécessaires au premier viewport;
- éviter que `isLoading` de la stat principale bloque toute la page si un shell peut être affiché immédiatement.

Résultat attendu: la première zone visible se peint vite, même si les graphiques continuent de charger après.

Prompt:

```text
Optimise `/dashboard/overview` pour le LCP. Sépare le contenu critique au-dessus de la ligne de flottaison des graphiques et widgets lourds. Lazy-load les composants Recharts et les widgets sous le hero, garde des skeletons stables, et évite que les appels API non critiques bloquent le premier rendu. Préserve les filtres, traductions et liens existants.
```

## Étape 7 - Dashboard overview: réduire les appels API initiaux

La page overview déclenche plusieurs requêtes dès le montage: overview stats, previous period, timeline, genres, tracks, widgets summary, heatmap, AI insights. Même en parallèle, cela peut dégrader le LCP par saturation réseau, CPU ou DB.

Zones probables:

- `app/[locale]/dashboard/(main)/overview/page.tsx`
- `lib/hooks/use-listening.ts`
- `lib/hooks/use-tracks.ts`
- widgets overview

Changements possibles:

- désactiver les requêtes de comparaison quand aucune période précédente n'est visible;
- charger les widgets secondaires à l'intersection viewport;
- fusionner certaines données si un endpoint overview peut retourner le nécessaire au hero;
- réduire les données demandées au premier rendu.

Résultat attendu: moins de requêtes critiques avant le premier rendu utile.

Prompt:

```text
Analyse les requêtes déclenchées au premier rendu de `/dashboard/overview`. Classe-les en critiques pour le premier viewport ou secondaires. Modifie la page pour lancer immédiatement seulement les requêtes nécessaires au hero et au contenu visible, puis charge les widgets secondaires après le premier rendu ou à l'approche du viewport.
```

## Étape 8 - Profiler les endpoints API liés au LCP

Un LCP à 12.99s peut venir d'un TTFB ou d'appels API lents. Les endpoints overview, timeline, genres et tracks utilisent des agrégations SQL sur `Listen`, `Track` et `Artist`.

Zones probables:

- `app/api/overview/route.ts`
- `app/api/timeline/route.ts`
- `app/api/genres/route.ts`
- `app/api/tracks/route.ts`
- `lib/services/listening/listening-stats.ts`
- `lib/services/listening/listening-aggregation.ts`
- `lib/services/track/track-service.ts`

Changements possibles:

- ajouter temporairement des logs de durée par endpoint et sous-requête;
- mesurer les endpoints avec les mêmes query params que Speed Insights;
- identifier les requêtes SQL les plus lentes;
- retirer les logs temporaires après diagnostic ou les remplacer par instrumentation propre.

Résultat attendu: savoir si le LCP est dominé par le frontend ou par une API/DB lente.

Prompt:

```text
Profile les endpoints API utilisés par la route LCP cible. Ajoute une instrumentation temporaire ou locale pour mesurer la durée totale de chaque endpoint et la durée des principales requêtes SQL. Teste `/api/overview`, `/api/timeline`, `/api/genres` et `/api/tracks` avec les query params réels. Résume les endpoints les plus lents et retire toute instrumentation temporaire non destinée à la prod.
```

## Étape 9 - Vérifier les indexes Postgres

Les requêtes critiques filtrent souvent par `userId`, `playedAt`, `trackId`, puis groupent par track/artiste/genre. Sans indexes adaptés, les agrégations peuvent scanner trop de lignes.

Indexes à vérifier selon les plans:

- `Listen(userId, playedAt)`
- `Listen(userId, trackId)`
- `Listen(trackId)`
- indexes existants sur les clés étrangères `Track.artistId`
- indexes utiles pour les filtres de date si les requêtes sont souvent bornées

À ne pas faire sans preuve:

- ajouter des indexes au hasard;
- multiplier les indexes redondants;
- ignorer le coût d'écriture/import des écoutes.

Résultat attendu: plans SQL vérifiés et indexes ajoutés seulement s'ils réduisent réellement les requêtes lentes.

Prompt:

```text
Vérifie les indexes Postgres nécessaires pour les requêtes LCP critiques. Inspecte les requêtes SQL dans les services listening/tracks, récupère ou propose des EXPLAIN ANALYZE pour les cas lents, puis recommande uniquement les indexes justifiés. Prends en compte les filtres `userId`, `playedAt`, `trackId`, les joins vers `Track`/`Artist`, et le coût sur les imports.
```

## Étape 10 - Re-mesurer et comparer

Chaque optimisation doit être validée. Les données Vercel Speed Insights sont terrain et peuvent prendre du temps à se stabiliser; Lighthouse local sert surtout à vérifier la direction.

À faire après chaque lot de changements:

- build production;
- Lighthouse mobile sur la route cible;
- vérifier l'absence d'erreurs lint/type;
- comparer LCP, TTFB, JS initial, requêtes critiques;
- surveiller Vercel Speed Insights après déploiement.

Résultat attendu: une comparaison avant/après et une décision claire sur l'étape suivante.

Prompt:

```text
Re-mesure la performance après les changements LCP. Lance les vérifications disponibles dans le repo, mesure Lighthouse/DevTools sur la route cible, compare avec la baseline, et résume ce qui s'est amélioré, ce qui reste lent, et la prochaine étape la plus rentable. Mentionne les limites des mesures locales vs Vercel Speed Insights terrain.
```

## Ordre recommandé

1. Identifier route/device/élément LCP dans Vercel.
2. Faire une baseline locale.
3. Appliquer le quick win image/logo.
4. Refactoriser la homepage localisée si elle est concernée.
5. Auditer le root layout et les providers.
6. Optimiser `/dashboard/overview` si c'est la route lente.
7. Réduire les appels API initiaux.
8. Profiler les endpoints API.
9. Vérifier les indexes Postgres avec preuves.
10. Re-mesurer après chaque lot.

