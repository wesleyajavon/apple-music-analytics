# Prompts Agent – Thèmes et Theme Switcher (Apple Music Analytics)

Ce document contient tous les prompts à transmettre à l’agent pour implémenter un système de thèmes avec un sélecteur de thème. L’application utilise actuellement Tailwind avec des classes `dark:` et des variables CSS `--background` / `--foreground` dans `globals.css`.

**Stack technique :** Next.js 14 App Router, Tailwind CSS, TypeScript.

**Référence :** Le composant `LanguageSwitcher` dans `lib/components/language-switcher.tsx` et la sidebar sont de bons modèles pour l’UI du Theme Switcher.

---

## Ordre d’exécution recommandé

1. **Phase 0** (obligatoire en premier) : config Tailwind dark mode, puis infrastructure thèmes (provider, storage, variables CSS)
2. **Phase 1** : composant Theme Switcher
3. **Phase 2** : intégration dans la sidebar et le layout
4. **Phase 3** : internationalisation des labels (i18n)
5. **Phase 4** : thèmes additionnels (optionnel – si plus que light/dark/system)
6. **Phase 5** : tests et vérifications

---

## Phase 0 : Infrastructure thèmes

### Prompt 0.0 – Configuration Tailwind dark mode (prérequis)

```
Configure Tailwind pour que le mode sombre soit contrôlé par une classe (et non par prefers-color-scheme) :

1. Dans tailwind.config.ts, ajouter : darkMode: 'class'
   - Par défaut Tailwind utilise 'media' (prefers-color-scheme)
   - Avec 'class', les variantes dark: s'activent quand un ancêtre a la classe "dark"
   - On appliquera la classe "dark" sur <html> selon le choix utilisateur

2. Vérifier que le build fonctionne après cette modification
```

### Prompt 0.1 – Theme Provider et contexte

```
Crée l'infrastructure pour gérer les thèmes dans l'application Next.js 14 App Router :

1. Créer lib/contexts/theme-context.tsx (ou lib/providers/theme-provider.tsx) :
   - Contexte React avec : theme ('light' | 'dark' | 'system'), setTheme, resolvedTheme ('light' | 'dark')
   - resolvedTheme = theme === 'system' ? préférence système (matchMedia) : theme
   - Appliquer la classe "dark" sur <html> quand resolvedTheme === 'dark'
   - Écouter les changements de prefers-color-scheme si theme === 'system'

2. Persister le choix dans localStorage (clé : "apple-music-analytics-theme")

3. Éviter le flash de thème incorrect au chargement (FOUC) :
   - Soit un script inline dans app/layout.tsx qui lit localStorage avant le premier paint
   - Soit utiliser suppressHydrationWarning sur <html> et appliquer la classe côté client dès le mount

4. Intégrer le ThemeProvider dans app/providers.tsx (wrapper autour des enfants)
```

### Prompt 0.2 – Variables CSS par thème

```
Adapte app/globals.css pour supporter les thèmes light et dark de manière explicite :

1. Définir les variables CSS pour le thème light :
   - :root ou [data-theme="light"] : --background, --foreground, et si utile --card, --border, --muted

2. Définir les variables pour le thème dark :
   - .dark ou [data-theme="dark"] : mêmes variables avec valeurs sombres

3. Ne plus dépendre uniquement de @media (prefers-color-scheme: dark) pour le dark :
   - Le thème doit être contrôlé par la classe "dark" sur <html> (ou data-theme) selon le choix utilisateur

4. Garder la cohérence avec tailwind.config.ts qui utilise var(--background) et var(--foreground)
```

---

## Phase 1 : Composant Theme Switcher

### Prompt 1.1 – Theme Switcher UI

```
Crée lib/components/theme-switcher.tsx :

1. Composant client ("use client") qui consomme le ThemeContext

2. UI : dropdown similaire à LanguageSwitcher :
   - Bouton déclencheur avec icône (soleil/lune/système) et label du thème actif
   - Liste déroulante avec 3 options : Light, Dark, System
   - Placement configurable (placement?: 'top' | 'bottom') pour s'adapter à la sidebar

3. Icônes :
   - Light : soleil
   - Dark : lune
   - System : écran/monitor ou icône "auto"

4. Styles cohérents avec le reste de l'app (rounded-xl, transitions, accent-violet pour l'option active)

5. aria-label et aria-expanded pour l'accessibilité

6. Gérer le click outside pour fermer le dropdown (comme LanguageSwitcher)
```

---

## Phase 2 : Intégration

### Prompt 2.1 – Sidebar et layout

```
Intègre le Theme Switcher dans l'interface :

1. Dans lib/components/sidebar.tsx :
   - Ajouter une section "Apparence" ou "Thème" au-dessus ou en dessous du Language Switcher
   - Inclure le composant ThemeSwitcher avec placement="top"
   - Structure similaire à la section "Langue" : label uppercase, puis le switcher

2. S'assurer que le ThemeProvider enveloppe bien toute l'app (vérifier app/providers.tsx et app/layout.tsx)

3. Vérifier que le layout dashboard (app/[locale]/dashboard/layout.tsx) et les pages héritent correctement du thème
```

### Prompt 2.2 – Page d'accueil et layout racine

```
Vérifie que le thème s'applique partout :

1. app/[locale]/page.tsx (landing) : doit respecter le thème
2. app/layout.tsx (ou app/[locale]/layout.tsx) : le ThemeProvider doit être au bon niveau
3. Pas de conflit avec les classes dark: en dur : le thème doit les activer/désactiver via la classe sur <html>
```

---

## Phase 3 : Internationalisation (i18n)

### Prompt 3.1 – Messages thème

```
Internationalise le Theme Switcher :

1. Ajouter dans messages/fr.json, messages/en.json, messages/es.json une section themeSwitcher :
   - themeSwitcher.ariaLabel : "Changer le thème" / "Change theme" / "Cambiar tema"
   - themeSwitcher.light : "Clair" / "Light" / "Claro"
   - themeSwitcher.dark : "Sombre" / "Dark" / "Oscuro"
   - themeSwitcher.system : "Système" / "System" / "Sistema"

2. Mettre à jour lib/components/theme-switcher.tsx pour utiliser useTranslations("themeSwitcher")
```

---

## Phase 4 : Thèmes additionnels (optionnel)

### Prompt 4.1 – Thèmes de couleur (ex. Blue, Rose)

```
Si tu veux aller au-delà de light/dark, ajoute des thèmes de couleur optionnels :

1. Étendre le type theme : 'light' | 'dark' | 'system' | 'light-blue' | 'dark-rose' etc.

2. Dans globals.css, définir des palettes pour chaque thème via data-theme ou classes sur html

3. Adapter le Theme Switcher pour afficher ces options (peut-être un sous-menu ou une section séparée)

4. Documenter la structure des variables CSS pour faciliter l'ajout de nouveaux thèmes

Note : Cette phase est optionnelle. Si l'objectif est uniquement light/dark/system, la sauter.
```

---

## Phase 5 : Tests et vérifications

### Prompt 5.1 – Tests E2E

```
Adapte ou ajoute des tests Playwright pour le Theme Switcher :

1. Vérifier que le Theme Switcher est visible dans la sidebar (sur /en/dashboard/overview)
2. Tester le clic sur le bouton : le dropdown s'ouvre
3. Tester la sélection d'une option (ex. Dark) : la page change d'apparence (vérifier une classe ou un attribut sur html)
4. Tester la persistance : recharger la page, le thème sélectionné doit être conservé
```

### Prompt 5.2 – Vérifications manuelles

```
Checklist à valider manuellement :

1. Pas de flash de thème incorrect au premier chargement (FOUC)
2. Le thème "System" suit bien la préférence du système (changer dans les paramètres OS)
3. Toutes les pages (landing, dashboard, sous-pages) respectent le thème
4. Les graphiques (Recharts), tooltips (.chart-tooltip-accessible) restent lisibles dans les deux thèmes
5. Le Toaster (sonner) s'affiche correctement en light et dark
6. localStorage : la clé "apple-music-analytics-theme" est bien mise à jour
```

---

## Notes techniques

- **Tailwind dark mode** : Le projet utilise probablement `class` dans tailwind.config (vérifier). Si `media` est utilisé, passer à `class` pour que le thème soit contrôlé par la classe `dark` sur `<html>`.
- **next-themes** : Une alternative est d’utiliser le package `next-themes` qui gère provider, storage, FOUC et `prefers-color-scheme`. Si tu préfères une implémentation custom, les prompts ci-dessus restent valides.
- **Compatibilité i18n** : Le thème est indépendant de la locale. Le Theme Switcher peut être placé à côté du Language Switcher dans la sidebar.
- **Graphiques** : Les tooltips Recharts ont des styles forcés (`.chart-tooltip-accessible`). Vérifier qu’ils restent lisibles en dark (fond clair conservé pour le contraste).

---

## Commandes utiles

```bash
# Vérifier que la classe dark est appliquée sur html
# Dans la console du navigateur :
document.documentElement.classList.contains('dark')

# Vérifier la valeur dans localStorage
localStorage.getItem('apple-music-analytics-theme')
```

---

## Références

- [Tailwind Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [next-themes](https://github.com/pacocoursey/next-themes) (option)
- `lib/components/language-switcher.tsx` : modèle d’UI pour le dropdown
