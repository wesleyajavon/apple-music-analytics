# DPIA — Traitements IA via Groq (LLM)

Document interne — Soundprint-AI. Dernière révision : 2026-06-09.

> **Analyse d’impact relative à la protection des données (Art. 35 RGPD)** pour les fonctionnalités qui envoient des données d’écoute à **Groq** (modèles LLM).  
> Statut : **brouillon opérationnel** — à valider par un conseil / DPO externe (voir [GDPR_LEGAL_REVIEW_CHECKLIST.md](./GDPR_LEGAL_REVIEW_CHECKLIST.md)).

---

## 1. Identification du traitement

| Champ | Valeur |
|-------|--------|
| **Nom** | Fonctionnalités IA Soundprint-AI (Groq) |
| **Responsable** | Wesley Ajavon (Soundprint-AI) |
| **Sous-traitant** | Groq, Inc. (États-Unis) — API `https://api.groq.com` |
| **Date DPIA** | 2026-06-09 |
| **Révision prévue** | À chaque nouvelle route IA ou changement de modèle / prestataire |

### Fonctionnalités concernées (opt-in requis)

| Fonctionnalité | Route / module | Données envoyées à Groq |
|----------------|----------------|-------------------------|
| Insights dashboard | `POST /api/ai/insights` | Agrégats (genres, top artistes, créneaux horaires) — pas d’historique brut ligne par ligne |
| Profil de goûts | `POST /api/ai/taste-profile` | Résumé déterministe des stats |
| Ask your Soundprint / chat | `POST /api/ai/music-chat` | Messages utilisateur + contexte agrégé / outils limités |
| Commentaires tendances | `/api/ai/*-commentary`, `/api/analytics/taste-evolution` | Agrégats artistes / genres |
| Prédictions habitudes | `/api/predictions/listening-habit` (explain) | Résumé de prédiction |
| Classification genres post-import | Jobs `importGenreBackfill` | **Titres artistes et morceaux** sans genre |

### Garde-fous produit (état actuel)

- Consentement explicite : `groq_genre` dans `UserConsent`, toggle Paramètres
- Vérification centralisée : `getGroqAiUnavailableReason()` (env + cookie `ai_master_disabled` + consentement)
- Quota utilisateur : `GROQ_USER_DAILY_QUOTA` (défaut 40)
- Pas de SQL libre généré par le LLM ; outils Maestro bornés
- Cache des réponses IA pour limiter les re-appels
- Révocation : arrêt des jobs Groq en cours + désactivation immédiate des nouvelles requêtes

---

## 2. Nécessité et proportionnalité

### Finalités

- Enrichir l’expérience analytics (commentaires, insights, chat musical)
- Compléter les genres manquants après import

### Base légale proposée

**Consentement explicite** (Art. 6(1)(a) + Art. 9 non applicable sauf si données sensibles inférées — à valider par conseil).

L’utilisateur peut utiliser le dashboard **sans IA** : imports, graphiques, palette, export — sans appel Groq.

### Proportionnalité

| Mesure | Justification |
|--------|---------------|
| Opt-in par défaut (IA off) | Minimise les transferts non sollicités |
| Agrégation avant envoi (insights, taste-profile) | Réduit la granularité vs historique brut |
| Quota journalier | Limite coût et surface d’exposition |
| Pas d’entraînement annoncé côté Groq consumer API | Vérifier DPA Groq (usage inférence uniquement) |
| Modèle par défaut `llama-3.1-8b-instant` | Modèle documenté Groq ; pas de modèle « reasoning » lourd par défaut |

### Alternatives écartées

| Alternative | Raison de l’écart |
|-------------|-------------------|
| IA 100 % locale | Coût infra / qualité insuffisante pour MVP |
| IA activée par défaut | Non conforme à l’approche consentement-first retenue |
| Pas de chat libre | Produit dégradé ; mitigé par garde-fous et quota |

---

## 3. Analyse des risques

Échelle : **Probabilité** (1 faible – 3 élevée) × **Gravité** (1 faible – 3 élevée) = **Score**

| # | Risque | P | G | Score | Mesures existantes | Mesures résiduelles |
|---|--------|---|---|-------|-------------------|---------------------|
| R1 | Fuite de titres / artistes via prompt ou logs Groq | 2 | 2 | 4 | Opt-in ; pas d’envoi masse ; scrubbing Sentry | Vérifier DPA Groq ; pas de log prompt côté app en prod |
| R2 | Ré-identification via combinaison agrégats + chat | 2 | 2 | 4 | Agrégation ; rate limit ; session auth | Limiter longueur messages ; pas de profil public IA |
| R3 | Transfert US sans garanties adéquates | 2 | 3 | 6 | Mention politique ; SCC prestataire | Obtenir / archiver DPA + SCC Groq signés |
| R4 | Utilisateur non informé (consentement invalide) | 1 | 3 | 3 | Bannière + Paramètres + version consent | Revue juridique textes ; re-consent si bump version |
| R5 | Hallucinations IA → décisions utilisateur | 2 | 1 | 2 | Ton « data-grounded » ; pas d’action automatique | Disclaimers UI ; pas de conseils santé / financiers |
| R6 | Abus API (coût, scraping via compte) | 2 | 2 | 4 | Rate limit ; quota Groq ; auth requise | Monitoring alertes quota |
| R7 | Prompt injection via chat | 2 | 2 | 4 | Outils limités ; pas d’exécution SQL | Revue sécurité Maestro à chaque upgrade |
| R8 | Conservation excessive côté Groq | 2 | 2 | 4 | Politique Groq (à vérifier) | Clause contractuelle zero-retention / no-training |

**Seuil DPIA** : score ≥ 6 → traitement prioritaire (R3). DPIA requise et validée avant scale UE.

---

## 4. Mesures techniques et organisationnelles (TOMs)

### Techniques (implémentées)

- [x] Consentement versionné (`UserConsent`, `GROQ_GENRE_CONSENT_VERSION`)
- [x] Kill-switch env `AI_MASTER_ENABLED=false`
- [x] Cookie opt-out navigateur `ai_master_disabled`
- [x] Quota utilisateur Groq
- [x] Cache réponses IA (hash summary)
- [x] Auth obligatoire sur routes IA utilisateur
- [x] Export JSON inclut historique consentements

### Organisationnelles (à maintenir)

- [ ] DPA Groq signé et archivé
- [ ] Revue juridique externe (checklist)
- [ ] Formation : ne jamais logguer prompts complets en prod
- [ ] Procédure breach incluant scénario « fuite clé API Groq »
- [ ] Revue DPIA annuelle ou à changement majeur

---

## 5. Consultation & validation

| Partie | Consultée | Date | Avis |
|--------|-----------|------|------|
| Responsable traitement | Wesley Ajavon | 2026-06-09 | Brouillon approuvé pour revue externe |
| DPO / conseil externe | _À désigner_ | | ☐ Validé ☐ Réserves ☐ Refusé |
| Utilisateurs (intérêts) | N/A MVP | | Feedback support si plaintes |

---

## 6. Décision

| Décision | ☐ Poursuivre le traitement ☐ Poursuivre avec mesures additionnelles ☐ Ne pas poursuivre |
|----------|---|
| **Conditions** | DPA Groq + revue juridique OK ; pas d’ouverture chat public sans nouvelle DPIA |
| **Signataire** | _________________________ **Date** : __________ |

---

## 7. Révision

| Version | Date | Changement |
|---------|------|------------|
| 0.1 | 2026-06-09 | Création initiale alignée implémentation consent-first |

**Prochaine revue** : lors de l’ajout de Maestro public, nouveaux modèles Groq, ou changement de finalité (ex. entraînement modèle propriétaire).
