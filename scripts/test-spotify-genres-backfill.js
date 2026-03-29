#!/usr/bin/env node

/**
 * Test du backfill genres Spotify : au plus **5** requêtes GET vers `api.spotify.com`
 * (voir `--max-api-requests` dans `backfill-track-genres-spotify.js`).
 *
 * Par défaut : `--limit 10` (sauf si tu passes déjà `--limit` / `--limit=`).
 * Les autres arguments sont transmis au script principal, ex. :
 *   node scripts/test-spotify-genres-backfill.js --dry-run
 */

const { spawnSync } = require('child_process');
const path = require('path');

const mainScript = path.join(__dirname, 'backfill-track-genres-spotify.js');
const userArgs = process.argv.slice(2);
const hasLimit = userArgs.some(
  (a) => a === '--limit' || a.startsWith('--limit=')
);
/** Évite de charger toute la table en mémoire ; surchageable avec `--limit`. */
const prefix = ['--max-api-requests', '5'];
if (!hasLimit) {
  prefix.push('--limit', '10');
}
const forwarded = [...prefix, ...userArgs];

const result = spawnSync(process.execPath, [mainScript, ...forwarded], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
