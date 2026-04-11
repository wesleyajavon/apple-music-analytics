# Palette — atelier genres « Unknown » (cadrage produit)

**Statut** : idée documentée — **pas d’implémentation** pour l’instant.

**Problème** : après import (Last.fm, CSV, backfills), une part importante des morceaux reste en **genre inconnu / non mappé** (« Unknown », tags bruts inutilisables). Les graphiques genres et filtres perdent en crédibilité. L’utilisateur n’a pas toujours le temps de corriger au moment de l’import.

**Objectif** : offrir un **parcours optionnel, ré-entrant** où l’utilisateur **améliore lui-même** sa taxonomie de genres, en commençant par ce qui a le **plus d’impact** (top artistes par nombre d’écoutes). Le tout doit être **léger, ludique et gratifiant**, pas une corvée administrative.

---

## Principe métier (MVP genres)

1. **Ordre de traitement** : partir des **artistes les plus écoutés** (tri décroissant par volume d’écoutes de l’utilisateur), comme le script CLI interactif existant (`genres:map-top-unknown` — même logique « ROI » : une action débloque beaucoup de listens).
2. **Une « carte » à la fois** : présenter un artiste (visuel : nom, éventuellement avatar / image si dispo, compteur d’écoutes, extrait du contexte « pourquoi maintenant »).
3. **Choix de genre** :
   - sélection parmi les **genres déjà présents** dans le corpus de l’utilisateur (liste filtrable, recherche) ;
   - saisie **libre** pour créer / normaliser un libellé (avec suggestions et alignement futur sur la normalisation existante `genres:normalize` si pertinent).
4. **Persistance** : la décision s’applique aux **tracks** concernées (ou au modèle artiste selon ton schéma futur) — détail technique laissé à l’implémentation ; ici on spécifie l’**intention** : « ce que je choisis met à jour mes stats genres ». Voir **Feedback visuel et persistance** pour le rythme d’écriture et l’UI temps réel.
5. **Reprise plus tard** : file d’attente sauvegardée (ex. « il te reste 47 artistes à colorier »), accessible depuis le dashboard ou une bannière non intrusive après import.

---

## Expérience utilisateur : « fun & enjoyable »

- **Ton** : atelier créatif (« colore ta bibliothèque »), pas formulaire fiscal.
- **Feedback immédiat** : après chaque mapping, micro-récompense — % de « Unknown » qui baisse, barre de progression, **petit graphique** (voir section suivante), ou une courte animation (sans lourdeur).
- **Contrôle** : **Passer** / « je ne sais pas » sans culpabiliser ; **Revenir en arrière** sur le dernier choix si possible.
- **Rythme** : sessions courtes (« 5 artistes » ou « 2 minutes ») + CTA « continuer plus tard ».
- **Clarté** : montrer **combien d’écoutes** ce choix influence pour que l’utilisateur comprenne l’impact.
- **Accessibilité** : clavier, focus, contrastes — le ludique ne doit pas sacrifier l’a11y.

*(Animations, son, confettis : optionnels ; à valider selon identité produit.)*

---

## Feedback visuel et persistance

### Mini-graphique (comme l’esprit `/dashboard/genres/trends`)

- Afficher un **graphique de petite taille** pendant le parcours pour que l’utilisateur **voie ses stats évoluer** pendant qu’il mappe (même stack visuelle que le dashboard, ex. Recharts + `ResponsiveContainer` en hauteur réduite).
- **Pas besoin** de reproduire tout le line chart multi-genres des tendances : un **bloc compact** suffit (ex. part Unknown vs mappé en anneau ou barre empilée, ou une métrique unique qui bouge à chaque action).
- La sensation « temps réel » repose surtout sur l’**UI** : mettre à jour le graphique **immédiatement** après chaque choix (état local ou invalidation / cache optimiste), **sans** attendre la fin du round-trip base pour l’animation.

### Écritures en base (par artiste vs lots)

- **Défaut recommandé** : **une sauvegarde serveur par mapping d’artiste** — une action utilisateur = une unité métier, moins de perte si l’onglet se ferme, « annuler le dernier » plus simple ; côté SQL/Prisma, une **seule transaction** peut déjà mettre à jour **toutes les tracks** de cet artiste (éviter une écriture par morceau).
- **Lots (ex. 10–20 mappings)** : à envisager **seulement** si la charge ou la latence réseau le justifie en prod ; imposer alors une **file côté client**, un **flush** à la fermeture / changement d’onglet (`visibilitychange`, `sendBeacon`, etc.) et un état « synchronisation en cours » pour ne pas sur-promettre la durabilité.
- **Import / parsing de fichiers** : hors flux Palette ; là, **batch / bulk** côté serveur reste la norme (ne pas confondre avec le mapping interactif une carte à la fois).

---

## Déclencheurs (quand proposer Palette)

- Après import si le **taux Unknown** dépasse un seuil (configurable, ex. > N % ou > N morceaux).
- Lien permanent dans les **paramètres** ou la page **Genres** : « Améliorer mes genres ».
- **Jamais bloquant** : l’import et la lecture du dashboard restent possibles sans avoir fini Palette.

---

## Périmètre évolutif (hors MVP documentaire)

- Étendre le même paradigme à d’autres champs « bruts » (ex. nettoyage Headliner / alias artiste) — **autre codename** si le périmètre dérape.
- Suggestions assistées (LLM ou MusicBrainz) en **couche optionnelle**, pas requis pour le plaisir du flux manuel.

---

## Rapport avec le repo aujourd’hui

- **CLI** : `npm run genres:map-top-unknown` (et variantes) — logique proche ; Palette en serait la **version produit** dans l’app, persistante par `userId`, avec UI soignée.
- **Docs** : `docs/GENRE_PICK_MENU.md`, scripts `genres:*` — à réutiliser comme source de vérité pour la liste de genres « connus » du projet si on veut éviter la divergence.

---

## Prompt agent (brouillon, quand tu voudras implémenter)

> Conçois une feature « Palette » : file d’artistes triés par listens avec genre unknown, UI une carte à la fois, combo autocomplete genres existants + input libre, progression et reprise session. Inclure un **mini-graphique** (même famille que `/dashboard/genres/trends`, version compacte) mis à jour de façon **optimiste** pendant le flux ; **persistance** : par défaut **une requête / transaction par artiste mappé** (bulk update des tracks de l’artiste), pas une écriture par morceau. Réutilise la logique métier proche de `scripts/interactive-map-top-unknown-artists.js` côté API + Prisma, avec routes dédiées et état utilisateur. Ne pas bloquer le dashboard ; seuil d’invitation post-import optionnel.
