# Menu des genres (saisie interactive)

Ce fichier est **généré** — ne l’éditez pas à la main. Pour mettre à jour après un changement de normalisation :

```bash
node scripts/generate-genre-pick-menu-doc.mjs
```

Source des libellés : `lib/data/genre-normalization.json` (champ `canonical` de chaque groupe, dans l’ordre). Le script `interactive-map-top-unknown-artists.js` charge **ce fichier** `GENRE_PICK_MENU.md` pour les numéros de saisie.

## Utilisation avec le script interactif

```bash
node scripts/interactive-map-top-unknown-artists.js
node scripts/interactive-map-top-unknown-artists.js --limit 200
npm run genres:map-top-unknown:200
```

Pour chaque artiste parmi les **N** plus écoutés encore en « Unknown » (défaut `N=10`, option `--limit`), entrez le **numéro** de la ligne ci-dessous (ou `0` pour ignorer cet artiste).

## Table

| # | Genre (canonique) |
| --- | --- |
| 1 | Hip hop |
| 2 | New Gen Rap |
| 3 | Afrobeats |
| 4 | French Afrobeats |
| 5 | Cameroon music |
| 6 | R&B and soul |
| 7 | Pop |
| 8 | Rock |
| 9 | Electronic |
| 10 | Jazz |
| 11 | Metal |
| 12 | Folk |
| 13 | Country |
| 14 | Indie |
| 15 | French |
| 16 | Latin |
| 17 | Reggae |
| 18 | African music |
| 19 | Classical |
| 20 | Soundtrack |
| 21 | Gospel |
| 22 | Punk |
| 23 | Dance |
| 24 | Vocal |
| 25 | Various |
| 26 | World |

---
*Généré le 2026-03-30*
