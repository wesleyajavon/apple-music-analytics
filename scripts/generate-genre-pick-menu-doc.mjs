#!/usr/bin/env node
/**
 * Régénère docs/GENRE_PICK_MENU.md à partir de lib/data/genre-normalization.json
 * (ordre des groupes = numéros utilisés par scripts/interactive-map-top-unknown-artists.js).
 *
 *   node scripts/generate-genre-pick-menu-doc.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const jsonPath = path.join(root, 'lib', 'data', 'genre-normalization.json');
const outPath = path.join(root, 'docs', 'GENRE_PICK_MENU.md');

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const rows = (data.groups || []).map((g, i) => ({
  n: i + 1,
  genre: g.canonical,
}));

const table = [
  '| # | Genre (canonique) |',
  '| --- | --- |',
  ...rows.map((r) => `| ${r.n} | ${r.genre.replace(/\|/g, '\\|')} |`),
].join('\n');

const md = `# Menu des genres (saisie interactive)

Ce fichier est **généré** — ne l’éditez pas à la main. Pour mettre à jour après un changement de normalisation :

\`\`\`bash
node scripts/generate-genre-pick-menu-doc.mjs
\`\`\`

Source : \`lib/data/genre-normalization.json\` (champ \`canonical\` de chaque groupe, dans l’ordre).

## Utilisation avec le script interactif

\`\`\`bash
node scripts/interactive-map-top-unknown-artists.js
node scripts/interactive-map-top-unknown-artists.js --limit 200
npm run genres:map-top-unknown:200
\`\`\`

Pour chaque artiste parmi les **N** plus écoutés encore en « Unknown » (défaut \`N=10\`, option \`--limit\`), entrez le **numéro** de la ligne ci-dessous (ou \`0\` pour ignorer cet artiste).

## Table

${table}

---
*Généré le ${new Date().toISOString().slice(0, 10)}*
`;

fs.writeFileSync(outPath, md, 'utf8');
console.log(`Écrit ${outPath} (${rows.length} genres).`);
