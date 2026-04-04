# Analyse des logs Groq (échantillon exporté)

**Source des données :** fichier `groq-logs-Default_Project-1d-2026-04-04-03-36-30.csv` (export depuis [Dashboard Groq → Logs](https://console.groq.com/dashboard/logs)).

**Modèle :** `llama-3.1-8b-instant` (seul modèle présent dans l’export).

**Date de l’analyse documentaire :** 2026-04-04 (les chiffres ci-dessous proviennent **uniquement** de ce fichier — à régénérer après un nouvel export).

---

## 1. Synthèse des statuts HTTP

| Code | Interprétation | Nombre | % du total |
|------|----------------|--------|------------|
| **200** | Requête réussie, tokens facturables | **161** | **47,6 %** |
| **429** | Rate limit (souvent TPM minute dépassé) | **163** | **48,2 %** |
| **413** | Requête refusée : **message trop gros** pour la limite TPM du tier (ex. « Request too large… Requested 6879 » vs limite 6000) | **14** | **4,1 %** |
| **Total** | | **338** | 100 % |

**Lecture rapide :** près de la moitié des appels se soldent par un **429** — cohérent avec une charge de dev (plusieurs appels parallèles, commentaires genre trends ×2, etc.). Les **413** indiquent des prompts dont la **taille estimée dépasse le plafond TPM** du plan *on demand* pour une **seule** requête (à distinguer du 429 « minute pleine »).

---

## 2. Tokens sur les requêtes réussies (200 uniquement)

Les lignes 429/413 ont `input_tokens = 0` et `output_tokens = 0` dans l’export — **seules les lignes 200** alimentent la facturation tokens.

| Métrique | Valeur |
|----------|--------|
| Somme **input** | **129 535** tokens |
| Somme **output** | **30 123** tokens |
| **Moyenne input** / requête | **~805** tokens |
| **Moyenne output** / requête | **~187** tokens |
| Médiane input (approx.) | **745** tokens |
| P90 input (approx.) | **~1 135** tokens |
| Min / max **input** | 307 → **2 292** |
| Min / max **output** | 74 → **327** |

Ces ordres de grandeur sont **alignés** avec des prompts moyennement longs (résumés + timelines pour les genres) et des réponses courtes par rapport aux `max_tokens` du code.

---

## 3. Estimation de coût (Developer / tarif public au million)

Tarifs de référence [Supported Models — Groq](https://console.groq.com/docs/models) pour `llama-3.1-8b-instant` :

- **0,05 USD** / 1M tokens **input**
- **0,08 USD** / 1M tokens **output**

**Sur cet export uniquement (161 requêtes 200) :**

\[
\text{Coût} \approx \frac{129535}{10^6} \times 0{,}05 + \frac{30123}{10^6} \times 0{,}08 \approx \mathbf{0{,}009\ \text{USD}}
\]

(Ordre de grandeur **~0,01 USD** pour la période couverte par les **succès** — le plan **Free** peut ne pas facturer de la même façon ; la facturation réelle apparaît sur [Billing](https://console.groq.com/) une fois en plan payant.)

**Coût moyen par complétion réussie dans cet échantillon :**

\[
\approx 0{,}009 / 161 \approx \mathbf{5{,}5 \times 10^{-5}\ \text{USD}} \quad (\text{soit ~0{,}006 ¢})
\]

---

## 4. Fenêtre temporelle dans l’export

Écart entre le **premier** et le **dernier** `created_at` dans le fichier : **~6,8 heures** (activité concentrée, pas nécessairement 24 h pleines).

Ne pas extrapoler « coût par jour » en multipliant par 24/6,8 sans mesurer le **nombre d’heures réelles** d’usage de l’app sur une journée complète.

---

## 5. Extrapolation prudente (ordres de grandeur)

En notant \(C \approx 5{,}5 \times 10^{-5}\) USD par requête **200** (cet échantillon) :

| Scénario | Hypothèse | Coût tokens / mois (ordre de grandeur) |
|----------|-----------|----------------------------------------|
| A | **1 000** complétions **200** / mois (usage léger) | \(1000 \times C \approx\) **0,06 USD** |
| B | **10 000** / mois | **~0,55 USD** |
| C | **100 000** / mois | **~5,5 USD** |

**Important :** si le taux de **429** reste élevé, le **ressenti** est « l’API ne répond pas », alors que le **coût** ne porte que sur les **200**. Il faut donc **réduire les 429** (limiteur, cache, moins d’appels parallèles) en parallèle du budget.

Les **413** ne facturent pas des tokens dans ce log, mais **bloquent** la fonctionnalité : il faut **réduire la taille du prompt** (moins de lignes dans la timeline, plafond plus bas que `MAX_TIMELINE_BUCKETS`, etc.).

---

## 6. Actions recommandées (liées à cet export)

1. **429** — Poursuivre cache Redis + limiteur TPM (`GROQ_RATE_LIMITING.md`) ; éviter deux appels simultanés non nécessaires (technical + light) au même chargement si possible.
2. **413** — Analyser les requêtes dont le message dépasse ~6000 tokens **demandés** en une fois : réduire le payload compact genre trends ou scinder l’appel (voir messages d’erreur dans les lignes 413 du CSV).
3. **Suivi** — Refaire un export après correctifs ; viser **200 ≫ 429** sur une journée représentative.

---

## 7. Fichiers et liens

| Ressource | Lien |
|-----------|------|
| Logs Groq | [console.groq.com/dashboard/logs](https://console.groq.com/dashboard/logs) |
| Limiteur dans le projet | [`GROQ_RATE_LIMITING.md`](./GROQ_RATE_LIMITING.md) |
| Estimation théorique | [`GROQ_COST_ESTIMATE.md`](./GROQ_COST_ESTIMATE.md) |

---

## 8. Méthode de calcul (reproductible)

Agrégation sur les lignes dont le statut est **200** : extraction des champs `input_tokens` (8ᵉ champ logique) et `output_tokens` (avant la colonne `error`).

Les lignes **429** et **413** contribuent **0** aux sommes de tokens dans cet export.

Pour refaire le calcul après un nouvel export CSV, tu peux réutiliser un script local ou importer le CSV dans un tableur (filtrer `status_code = 200`, sommer les colonnes tokens).

---

## 9. Comportement HTTP côté app (référence) — 429 vs 413

Ce tableau décrit **le code actuel** (pas seulement les logs Groq). Les réponses **Groq** en 429/413 sont levées par le SDK (`groq-sdk`) ; le comportement **route Next** dépend des `try/catch` et de `handleApiError`.

| Feature | Route API (ex.) | Après échec Groq **429** (retries SDK + limiteur + retries métier genre trends) | Après échec Groq **413** (pas de retry SDK pour 413) |
|---------|-----------------|----------------------------------------------------------------------------------|-----------------------------------------------------|
| Commentaires tendances genres | `/api/ai/genre-trends-commentary` | Souvent **200** JSON : commentaires `null` si épuisement ; retries métier dans `generateGenreTrendsCommentary` peuvent retourner `""`. | **200** : `catch` route → `console.warn`, commentaires **null** (pas de retry « prompt plus petit »). |
| Évolution du goût (commentaires) | `/api/analytics/taste-evolution` | **200** : `catch` → warn, commentaires **null**. | **200** : idem. |
| Insights | `/api/ai/insights` | **500** via `handleApiError` si l’exception remonte. | **500** : idem. |
| Profil de goût | `/api/ai/taste-profile` | **500**. | **500**. |
| Explication prédiction écoute | `/api/predictions/listening-habit` | **500**. | **500**. |

**Synthèse :**

- **429** : limiter + retries SDK ; **genre trends** a des retries métier ; plusieurs routes **avalent** l’échec → **200** sans texte IA.  
- **413** : **aucune** logique « réduire le prompt et réessayer » aujourd’hui ; genre trends / taste evolution → **200** sans IA ; insights / profil / habit → plutôt **500**.

Pour **réduire** les 429/413 en prod, s’appuyer sur [`GROQ_RATE_LIMITING.md`](./GROQ_RATE_LIMITING.md) et [`GROQ_SCALING_PLAYBOOK.md`](./GROQ_SCALING_PLAYBOOK.md) ; pour **413**, il manque encore une **implémentation** (retry avec payload réduit ou scission d’appel) — voir la piste « 413 » dans le playbook.

---

*Document basé sur un export utilisateur ; ne pas committer de clés API ou données sensibles dans le dépôt.*
