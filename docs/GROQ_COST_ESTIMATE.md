# Estimation des coûts Groq (ordres de grandeur)

**Objectif :** fournir une grille d’analyse pour estimer la dépense **mensuelle** liée à l’IA Groq en fonction du **nombre d’utilisateurs actifs**, du **nombre d’appels réels** (hors cache) et du **volume de tokens**.

**Important :** ce document ne remplace pas la **facture** ni le [tableau des modèles Groq](https://console.groq.com/docs/models) — les prix et limites peuvent changer. Recoupe toujours avec la console ([Billing](https://console.groq.com/), [Limits](https://console.groq.com/settings/limits)).

**Modèle considéré :** `llama-3.1-8b-instant` (celui utilisé dans le code : `GROQ_DEFAULT_MODEL`).

---

## 1. Tarifs unitaires de référence (Developer / production)

D’après la documentation publique des modèles Groq (section *Production Models*), pour `llama-3.1-8b-instant` :

| Poste | Prix indicatif |
|--------|----------------|
| **Input** | **0,05 USD** par **1 million** de tokens |
| **Output** | **0,08 USD** par **1 million** de tokens |

Source : [Supported Models — GroqDocs](https://console.groq.com/docs/models) (vérifier la ligne du modèle à jour).

**Formule de coût pour un appel :**

\[
\text{Coût (USD)} = \frac{T_{\text{in}}}{10^6} \times 0{,}05 + \frac{T_{\text{out}}}{10^6} \times 0{,}08
\]

où \(T_{\text{in}}\) et \(T_{\text{out}}\) sont les tokens **réellement facturés** (pas seulement `max_tokens`).

---

## 2. Ce que l’app appelle (extrait du code)

Chaque **requête** Groq correspond à un `createGroqChatCompletion` avec un plafond de sortie (`max_tokens`) :

| Fonction / zone | Fichier / API | `max_tokens` | Remarque |
|-----------------|---------------|----------------|----------|
| Insights analytics | `llm-service` → `/api/ai/insights` | 500 | 1 appel par génération |
| Profil de goût | `taste-profile-service` → `/api/ai/taste-profile` | 800 | 1 appel |
| Évolution du goût (commentaire) | `taste-evolution-commentary` → `/api/analytics/taste-evolution` | 400 | **Jusqu’à 2 appels** (version « technique » + « light ») si les deux sont demandés |
| Tendances genres (commentaire) | `genre-trends-commentary` → `/api/ai/genre-trends-commentary` | 450 | **Jusqu’à 2 appels** (technical + light) |
| Prédiction habitude d’écoute | `listening-habit-explainer` → `/api/predictions/listening-habit` | 200 | 1 appel si explication activée |

**Réduction réelle des coûts :** le cache Redis (et le cache React côté client) fait que **beaucoup d’appels ne touchent pas Groq** si les paramètres sont identiques. Le coût dépend donc surtout du **taux de cache miss** et des **nouveaux filtres / nouveaux utilisateurs**.

---

## 3. Hypothèses de tokens (pour estimer sans facture détaillée)

Les APIs facturent des tokens **réels** (tokenisation du modèle). En l’absence de logs `usage` en prod, on utilise des **fourchettes** :

### 3.1 Entrée (prompt)

Règle grossière déjà utilisée dans le limiteur : `≈ caractères / 4` pour le texte des messages.

| Niveau | Tokens d’entrée \(T_{\text{in}}\) | Interprétation |
|--------|-----------------------------------|----------------|
| Faible | 1 500 | Résumés courts, peu de contexte |
| Moyen | 3 000 | Cas typique (résumé + instructions) |
| Élevé | 6 000 | Prompts longs (ex. timelines denses pour genres) |

### 3.2 Sortie (completion)

Le `max_tokens` est un **plafond**. En pratique, la sortie est souvent **inférieure** (sauf cas limite).

| Niveau | Utilisation du plafond | Exemple pour `max_tokens = 500` |
|--------|-------------------------|-----------------------------------|
| Faible | 30 % | ~150 tokens de sortie |
| Moyen | 50 % | ~250 tokens |
| Élevé | 80 % | ~400 tokens |

---

## 4. Coût marginal **par appel** (USD)

Calcul avec les tarifs **0,05 / 0,08 USD par million** (input / output), scénario **entrée moyenne = 3 000 tokens** et **sortie = 50 % du max_tokens** (sauf où indiqué).

| Feature | max_out | \(T_{\text{out}}\) retenu (50 %) | \(T_{\text{in}}\) | Coût / appel (USD) |
|---------|---------|----------------------------------|-------------------|---------------------|
| Insights | 500 | 250 | 3 000 | ≈ **0,00017** |
| Taste profile | 800 | 400 | 3 000 | ≈ **0,00018** |
| Taste evolution (×1) | 400 | 200 | 3 000 | ≈ **0,00016** |
| Genre trends (×1) | 450 | 225 | 3 000 | ≈ **0,00017** |
| Listening habit | 200 | 100 | 1 500 | ≈ **0,00008** |

**Formule Excel / tableur (une ligne) :**  
`=(T_in/1000000)*0.05 + (T_out/1000000)*0.08`

**Pages avec 2 variantes (technical + light) :** multiplier par **2** si les deux appels partent **sans cache** (ex. genre trends ou taste evolution) : ordre de grandeur **~0,00032 – 0,00034 USD** par « double génération » complète.

---

## 5. Agrégation : coût mensuel simplifié

### 5.1 Notation

| Symbole | Signification |
|---------|----------------|
| \(U\) | Utilisateurs **actifs** par mois (MAU) ou par jour (DAU) — préciser |
| \(S\) | Sessions (ou jours) où l’utilisateur déclenche au moins une feature IA |
| \(A\) | **Appels Groq réussis** (facturés) **par utilisateur et par mois** (moyenne) |
| \(H\) | Taux de **cache hit** (0 à 1) : fraction des requêtes **sans** appel Groq |

**Appels réels vers Groq par mois (approx.) :**

\[
\text{Appels} \approx U \times A \times (1 - H)
\]

**Coût mensuel (approx.) :**

\[
\text{USD/mois} \approx \text{Appels} \times \text{coût moyen par appel}
\]

Le **coût moyen par appel** dépend du mix (insights vs genres ×2, etc.). Utilise la section 4 ou une moyenne pondérée.

### 5.2 Exemple chiffré (hypothétique)

**Hypothèses :**

- \(U = 1\,000\) utilisateurs actifs / mois  
- Chaque utilisateur déclenche en moyenne **4 appels Groq « équivalent insights »** par mois (mix simple)  
- Coût moyen par appel ≈ **0,00017 USD** (ligne « Insights » du tableau)  
- Cache : **50 %** des requêtes ne rappellent pas Groq (\(H = 0{,}5\))

\[
\text{Appels} \approx 1000 \times 4 \times (1 - 0{,}5) = 2000
\]

\[
\text{Coût} \approx 2000 \times 0{,}00017 \approx \mathbf{0{,}34\ \text{USD/mois}}
\]

**Même scénario sans cache (\(H=0\)) :**

\[
4000 \times 0{,}00017 \approx \mathbf{0{,}68\ \text{USD/mois}}
\]

**Même scénario avec des pages à 2× Groq (genres) à chaque session :** multiplier \(A\) par ~2 pour la part concernée, ou utiliser un coût moyen par utilisateur plus élevé (ex. **0,0003 USD** par « action complète »).

---

## 6. Tableaux de sensibilité (à recopier dans un tableur)

### 6.1 Coût mensuel selon MAU et appels utilisateur / mois

Coût moyen par appel fixé à **0,00017 USD**, **sans cache** (\(H=0\)) :

| MAU \\ Appels / user / mois | 2 | 4 | 10 | 20 |
|-----------------------------|---|----|----|-----|
| 100 | 0,03 $ | 0,07 $ | 0,17 $ | 0,34 $ |
| 1 000 | 0,34 $ | 0,68 $ | 1,70 $ | 3,40 $ |
| 10 000 | 3,40 $ | 6,80 $ | 17,00 $ | 34,00 $ |
| 100 000 | 34 $ | 68 $ | 170 $ | 340 $ |

Avec **50 % cache** (\(H=0{,}5\)) : **diviser par 2** les montants.

### 6.2 Impact d’un prompt plus long (TPM plus élevé = même prix **par token**, mais plus de tokens)

Si \(T_{\text{in}}\) passe de 3 000 à **6 000** pour le même appel, le coût input double (+0,00015 USD par appel environ). Sur 10 000 appels/mois : **~+1,5 USD/mois** uniquement pour la partie input.

---

## 7. Limites de cette estimation

1. **Tarifs** : ceux du tableau « Production » peuvent différer des promos / anciens plans ; vérifier [Models](https://console.groq.com/docs/models).  
2. **Plan Free vs Developer** : le gratuit peut être **sans facturation** au sens classique mais avec des **plafonds TPM/RPM** bas ([Rate limits](https://console.groq.com/docs/rate-limits)) — le coût « en dollars » devient pertinent surtout après passage à un plan payant.  
3. **Tokens réels** : seuls les champs `usage` des réponses API donnent le détail exact ; le projet peut être étendu pour logger `prompt_tokens` / `completion_tokens` (voir playbook scaling).  
4. **Appels refusés (429)** : en général pas de completion facturée comme une requête réussie ; vérifier les conditions actuelles.  
5. **Autres modèles** : changer de modèle change **prix** et **limites** (ex. 70B).

---

## 8. Comment affiner avec tes vraies données

1. **Mesurer** pendant 7 jours : nombre d’appels par route `/api/ai/*` et `/api/analytics/*` (logs, analytics).  
2. **Estimer \(H\)** : ratio « cache hit » Redis sur les clés de commentaires / insights.  
3. **Recalculer** la section 5 avec ton mix réel (proportion insights vs genre trends ×2, etc.).  
4. **Comparer** au dashboard Groq usage / billing le mois suivant.

---

## 9. Références internes

- [`GROQ_RATE_LIMITING.md`](./GROQ_RATE_LIMITING.md) — limiteur TPM, variables `GROQ_TPM_*`  
- [`GROQ_SCALING_PLAYBOOK.md`](./GROQ_SCALING_PLAYBOOK.md) — stratégie charge, quotas, cache  
- [`GROQ_LOGS_ANALYSIS_SAMPLE.md`](./GROQ_LOGS_ANALYSIS_SAMPLE.md) — exemple d’analyse à partir d’un export [Logs Groq](https://console.groq.com/dashboard/logs) (tokens réels, 429/413, coût estimé)  

---

*Document généré pour analyse budgétaire — à mettre à jour lors d’un changement de modèle ou de tarifs Groq.*
