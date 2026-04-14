# Workflow Base de Donnees (Dev / Prod) — Prisma

Ce document fixe un workflow simple pour eviter toute perte de donnees.

## Objectif

- Isoler les environnements (dev, staging, prod)
- Eviter `prisma migrate dev` sur une base avec vraies donnees
- Garder un process previsible pour les changements de schema

## Regle d'or

- Base avec donnees importantes: **jamais** `migrate dev`
- Base locale jetable uniquement: `migrate dev`
- Base partagee/staging/prod: `migrate deploy`
- Avant changement schema en base partagee: backup

## Environnements recommandes

Au minimum:

1. `APP_DB_DEV` (locale ou Neon dev)
2. `APP_DB_STAGING` (optionnel mais recommande)
3. `APP_DB_PROD` (utilisateurs reels)

Ne pas reutiliser la meme URL pour dev et prod.

## Variables d'environnement conseillees

### Local developpement (`.env.local`)

```env
DATABASE_URL="postgresql://.../apple_music_analytics_dev"
```

### Production (plateforme de deploiement)

Definir `DATABASE_URL` dans les variables d'environnement de la plateforme, avec l'URL prod uniquement.

## Quick commands (copier-coller)

Si vous avez defini cet alias dans `~/.zshrc`:

```bash
alias prismadev='set -a; source .env.local; set +a; npx prisma'
alias prismaenv='unset DATABASE_URL; set -a; source .env; set +a; npx prisma'
```

Utilisez ensuite:

```bash
# Etat migration sur DB dev
prismadev migrate status

# Creer/appliquer migration en dev local
# IMPORTANT: remplacez le nom, ne gardez pas les chevrons.
prismadev migrate dev --name add_palette_decisions

# Regenerer client Prisma
prismadev generate
```

Production / staging (DB avec donnees importantes):

```bash
# Backup avant changement schema
mkdir -p backups && pg_dump "$DATABASE_URL" -Fc -f "backups/pre-change-$(date +%Y%m%d-%H%M%S).dump"

# Appliquer migrations versionnees
prismaenv migrate deploy

# Verifier etat
prismaenv migrate status
```

## Cas specifique: migration de reconciliation (resolve)

Quand une migration a ete creee pour reconcilier l'historique (ex: sandbox), il peut etre necessaire de la marquer comme appliquee sur une DB qui possede deja les objets SQL.

```bash
prismaenv migrate resolve --applied <migration_id>
prismaenv migrate status
```

Exemple:

```bash
prismaenv migrate resolve --applied 20260414162826_sanity_check_sandbox
prismaenv migrate status
```

Si Prisma retourne `P3008` ("already recorded as applied"), c'est normal: rien a faire de plus.

## Do / Don't (ultra visible)

### Do

- Utiliser `prismadev ...` en local pour etre certain de cibler `.env.local`
- Utiliser `prismaenv ...` pour les operations explicites base `.env` (prod/staging)
- Garder une DB dev separee de prod
- Faire un backup avant tout changement schema sur DB partagee/prod
- Utiliser `migrate deploy` en staging/prod

### Don't

- Ne pas lancer `npx prisma migrate dev` sur prod/staging
- Ne pas reutiliser la meme `DATABASE_URL` pour dev et prod
- Ne pas ignorer un message de drift/reset sans backup
- Ne pas modifier le schema directement en prod sans migration/revue

## Commandes: quand utiliser quoi

### 1) Changer le schema en local (base dev seulement)

```bash
npx prisma migrate dev --name add_xxx
```

Utiliser cette commande uniquement sur une base developpement isolee.

### 2) Deployer des migrations en staging/prod

```bash
npx prisma migrate deploy
```

Cette commande applique les migrations existantes sans comportement interactif de reset.

### 3) Synchronisation rapide (cas exceptionnel)

```bash
npx prisma db push
```

Utiliser surtout en phase prototype ou pour un patch urgent, avec backup prealable si la base contient des donnees importantes.

## Playbook zero perte de donnees

1. Backup:

```bash
mkdir -p backups && pg_dump "$DATABASE_URL" -Fc -f "backups/pre-change-$(date +%Y%m%d-%H%M%S).dump"
```

2. Verifier l'etat migration:

```bash
npx prisma migrate status
```

3. Appliquer les migrations versionnees:

```bash
npx prisma migrate deploy
```

4. Regenerer le client:

```bash
npx prisma generate
```

5. Verifier:

```bash
npx prisma migrate status
```

## Pourquoi Prisma peut proposer un reset (`public schema`)

`migrate dev` compare:

- les fichiers `prisma/migrations`
- la table `_prisma_migrations` en base
- le schema reel de la base

Si ces etats divergent (drift), Prisma peut proposer un reset pour realigner l'ensemble.
Sur une base avec donnees importantes, refuser et passer par le workflow backup + `migrate deploy`.

## Checklist PR (schema)

- [ ] Changement schema revu dans `prisma/schema.prisma`
- [ ] Migration creee en local dev (base isolee)
- [ ] SQL migration verifie
- [ ] Backup prevu avant staging/prod
- [ ] Deploiement via `migrate deploy`
- [ ] `prisma generate` execute
- [ ] Verification post-deploiement OK

## Notes de version Prisma

Les comportements exacts peuvent evoluer entre versions Prisma (notamment sur config/migrations). En cas de doute, verifier la documentation officielle Prisma et les release notes de la version utilisee par le projet.
