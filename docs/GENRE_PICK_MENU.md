# Menu des genres (saisie interactive)

Ce fichier est **généré** — ne l’éditez pas à la main. Pour mettre à jour après un changement de normalisation :

```bash
node scripts/generate-genre-pick-menu-doc.mjs
```

Source : `lib/data/genre-normalization.json` (champ `canonical` de chaque groupe, dans l’ordre).

## Utilisation avec le script interactif

```bash
node scripts/interactive-map-top-unknown-artists.js
node scripts/interactive-map-top-unknown-artists.js --limit 200
npm run genres:map-top-unknown:200
```

Pour chaque artiste parmi les **N** plus écoutés encore en « Unknown » (défaut `N=10`, ou `--limit 200`, etc.), entrez le **numéro** de la ligne ci-dessous (ou `0` pour ignorer cet artiste).

## Table

| # | Genre (canonique) |
| --- | --- |
| 1 | Hip hop |
| 2 | Afrobeats |
| 3 | Cameroon music |
| 4 | R&B and soul |
| 5 | Pop |
| 6 | Rock |
| 7 | Electronic |
| 8 | Jazz |
| 9 | Metal |
| 10 | Folk |
| 11 | Country |
| 12 | Indie |
| 13 | French |
| 14 | Latin |
| 15 | Reggae |
| 16 | African music |
| 17 | Classical |
| 18 | Soundtrack |
| 19 | Gospel |
| 20 | Punk |
| 21 | Dance |
| 22 | Vocal |
| 23 | Various |
| 24 | World |

---
*Généré le 2026-03-28*
