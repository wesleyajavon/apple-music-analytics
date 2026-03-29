#!/usr/bin/env node
/** Valide genre-normalization.json (clés uniques après trim+lower). */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'lib', 'data', 'genre-normalization.json');
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
const seen = new Map();
function nk(s) {
  return String(s).trim().toLowerCase();
}
for (const g of data.groups || []) {
  const c = String(g.canonical).trim();
  const keys = new Set([nk(c), ...(g.aliases || []).map(nk)]);
  for (const k of keys) {
    if (!k) continue;
    if (seen.has(k)) {
      console.error(`Conflit: "${k}" → "${seen.get(k)}" et "${c}"`);
      process.exit(1);
    }
    seen.set(k, c);
  }
}
console.log(`OK — ${data.groups.length} groupes, ${seen.size} clés uniques.`);
