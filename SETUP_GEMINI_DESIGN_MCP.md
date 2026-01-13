# Configuration Gemini Design MCP

Ce guide explique comment configurer Gemini Design MCP dans Cursor pour ce projet.

## 📋 Prérequis

1. **Clé API Gemini Design** :
   - Créez un compte sur [https://gemini-design-mcp.com](https://gemini-design-mcp.com)
   - Générez une clé API depuis le dashboard (gratuit : 10K tokens/mois)
   - Copiez votre clé API

2. **Node.js** (pour le mode local uniquement) :
   - Version >= 18 requise
   - Ce projet utilise Node.js v20.19.6 ✅

## 🔧 Configuration

### Option 1 : Mode Local (Recommandé pour le développement)

Le mode local s'exécute directement sur votre machine. Plus rapide, fonctionne hors ligne une fois installé.

#### Étapes

1. **Ouvrir les paramètres Cursor** :
   - `Cmd + ,` (macOS) ou `Ctrl + ,` (Windows/Linux)
   - Ou via le menu : Cursor → Settings

2. **Naviguer vers la configuration MCP** :
   - Allez dans "Tools & Integrations" ou "MCP Servers"
   - Cliquez sur "Add Server" ou "+"

3. **Configurer le serveur** :

   **Option A : Via l'interface Cursor**
   
   Ajoutez une nouvelle configuration MCP avec :
   - **Nom** : `gemini-design-mcp`
   - **Type** : Command/Executable
   - **Commande** : `npx`
   - **Arguments** : `-y gemini-design-mcp@latest`
   - **Variables d'environnement** :
     ```
     API_KEY=votre_clé_api_ici
     ```

   **Option B : Via le fichier de configuration**

   Éditez le fichier de configuration Cursor :
   - **macOS/Linux** : `~/.cursor/mcp.json`
   - **Windows** : `%USERPROFILE%\.cursor\mcp.json`

   Ajoutez cette configuration (en utilisant une variable d'environnement) :
   ```json
   {
     "mcpServers": {
       "gemini-design-mcp": {
         "command": "npx",
         "args": ["-y", "gemini-design-mcp@latest"],
         "env": {
           "API_KEY": "${GEMINI_DESIGN_API_KEY}"
         }
       }
     }
   }
   ```

   **Important** : Vous devez définir la variable d'environnement `GEMINI_DESIGN_API_KEY` dans votre environnement système (voir section "Configuration de la variable d'environnement" ci-dessous).

   **Note** : Si la syntaxe `${GEMINI_DESIGN_API_KEY}` ne fonctionne pas dans Cursor, vous pouvez :
   - Vérifier que la variable est bien définie dans votre environnement système
   - Redémarrer Cursor après avoir défini la variable
   - Consulter la documentation Cursor pour la substitution de variables dans les fichiers JSON

4. **Redémarrer Cursor** pour que les changements prennent effet.

### Option 2 : Mode Remote Server

Le mode remote ne nécessite aucune installation locale, mais nécessite une connexion internet.

#### Étapes

1. **Ouvrir les paramètres Cursor** (comme ci-dessus)

2. **Ajouter la configuration remote** :

   ```json
   {
     "mcpServers": {
       "gemini-design-mcp": {
         "url": "https://gemini-design-mcp-server-production.up.railway.app/mcp",
         "headers": {
           "Authorization": "Bearer votre_clé_api_ici"
         }
       }
     }
   }
   ```

   Ou si Cursor utilise `mcp-remote` :
   ```json
   {
     "mcpServers": {
       "gemini-design-mcp": {
         "command": "npx",
         "args": ["-y", "mcp-remote"],
         "env": {
           "MCP_SERVER_URL": "https://gemini-design-mcp-server-production.up.railway.app/mcp",
           "API_KEY": "votre_clé_api_ici"
         }
       }
     }
   }
   ```

3. **Redémarrer Cursor**

## 🔐 Configuration de la variable d'environnement

Pour utiliser la variable d'environnement `GEMINI_DESIGN_API_KEY` dans la configuration MCP, vous devez la définir dans votre environnement système :

### macOS / Linux

1. Ouvrez votre fichier de shell (`~/.zshrc` pour zsh ou `~/.bashrc` pour bash) :
   ```bash
   nano ~/.zshrc  # ou ~/.bashrc
   ```

2. Ajoutez la ligne suivante (remplacez par votre vraie clé API) :
   ```bash
   export GEMINI_DESIGN_API_KEY="gd_votre_clé_api_ici"
   ```

3. Rechargez votre shell :
   ```bash
   source ~/.zshrc  # ou source ~/.bashrc
   ```

4. Vérifiez que la variable est définie :
   ```bash
   echo $GEMINI_DESIGN_API_KEY
   ```

### Windows

1. Ouvrez les **Paramètres système** → **Variables d'environnement**
2. Cliquez sur **Nouveau** dans la section "Variables utilisateur"
3. Nom : `GEMINI_DESIGN_API_KEY`
4. Valeur : `gd_votre_clé_api_ici`
5. Cliquez sur **OK** et redémarrez Cursor

### Alternative : Fichier .env du projet

Si vous préférez utiliser le fichier `.env.local` du projet (pour référence uniquement, car Cursor ne le lit pas automatiquement), ajoutez :

```
GEMINI_DESIGN_API_KEY=gd_votre_clé_api_ici
```

Puis copiez cette valeur dans votre environnement système ou directement dans `mcp.json` si nécessaire.

## 🔒 Sécurité

⚠️ **Important** : Ne commitez jamais votre clé API dans le dépôt git.

- Le fichier `~/.cursor/mcp.json` est dans votre répertoire utilisateur, pas dans le projet ✅
- La variable d'environnement `GEMINI_DESIGN_API_KEY` est stockée dans votre système, pas dans le projet ✅
- Le fichier `env.example` ne contient que des exemples, pas de vraies clés ✅

## ✅ Vérification

Pour vérifier que la configuration fonctionne :

1. Redémarrez Cursor
2. Ouvrez le panneau de chat AI
3. Demandez : "Crée une carte de pricing avec 3 tiers"
4. Gemini Design devrait générer le code automatiquement

## 📚 Utilisation

Consultez le fichier `.cursorrules/gemini-design.md` pour les instructions d'utilisation et les meilleures pratiques.

## 🔗 Ressources

- Documentation officielle : [https://gemini-design-mcp.com/docs](https://gemini-design-mcp.com/docs)
- Dashboard API : [https://gemini-design-mcp.com](https://gemini-design-mcp.com)
- Support : Discord (lien sur le site)

## 💡 Notes

- **Free tier** : 10K tokens/mois (environ 6-10 générations de composants)
- **Stack supporté** : React + Tailwind CSS (parfait pour ce projet Next.js)
- **Isolation du contexte** : Seul le contexte frontend nécessaire est envoyé à Gemini, votre code backend reste local
- **Responsive par défaut** : Tous les composants générés sont optimisés mobile/tablet/desktop
