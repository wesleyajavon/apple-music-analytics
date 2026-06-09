# Checklist — revue juridique externe (RGPD)

Document interne — Soundprint-AI. Dernière révision : 2026-06-09.

> **Objectif** : préparer et tracer une revue par un avocat / DPO externe avant mise en production UE à échelle, ou après changement majeur (IA, profil public, social).
>
> **Pas urgent ?** Les actions différées (conseil, DPA, DSAR, etc.) sont listées dans [GDPR_BACKLOG.md](./GDPR_BACKLOG.md).

Documents associés :

- [GDPR_ROPA.md](./GDPR_ROPA.md) — registre des traitements
- [GDPR_DPIA_AI.md](./GDPR_DPIA_AI.md) — analyse d’impact IA
- [GDPR_DATA_BREACH_PROCEDURE.md](./GDPR_DATA_BREACH_PROCEDURE.md) — procédure violation de données
- Politique publique : `/legal/privacy`, `/legal/cookies`, `/legal/terms`

---

## 1. Périmètre de la revue

| Élément | À valider par le conseil |
|---------|-------------------------|
| Statut du responsable de traitement (personne physique / micro-entreprise) | ☐ |
| Bases légales par traitement (contrat, consentement, intérêt légitime) | ☐ |
| Politique de confidentialité (clarté, exhaustivité Art. 13–14) | ☐ |
| Politique cookies + bannière (ePrivacy / CNIL) | ☐ |
| CGU (limitation de responsabilité, propriété des données) | ☐ |
| Transferts hors UE (Groq, Sentry, Vercel, Supabase) + SCC/DPA | ☐ |
| DPIA IA Groq (voir doc dédié) | ☐ |
| Contrats sous-traitants (DPA Supabase, Groq, Vercel, Sentry) | ☐ |
| Durées de conservation annoncées vs pratiques réelles | ☐ |
| Droits des personnes (délais de réponse, gratuité, identité du demandeur) | ☐ |
| Mineurs (service 16+ / 13+ ? clause d’âge) | ☐ |
| Profil public démo (`NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID`) si activé | ☐ |

---

## 2. Artefacts à transmettre au conseil

Fournir un dossier zip ou accès lecture seule contenant :

1. **Pages légales** — exports ou URLs staging : privacy, cookies, terms
2. **ROPA** — `docs/GDPR_ROPA.md`
3. **DPIA IA** — `docs/GDPR_DPIA_AI.md` (brouillon complété)
4. **Procédure breach** — `docs/GDPR_DATA_BREACH_PROCEDURE.md`
5. **Schéma technique simplifié** :
   - Supabase (auth + Postgres + Storage avatars)
   - Groq (API LLM, opt-in)
   - Vercel (hosting + analytics optionnel)
   - Sentry (erreurs optionnel)
6. **Liste des routes sensibles** — `docs/API.md` (sections export, delete-account, consent)
7. **Modèle `UserConsent`** — migration `20260605140000_add_user_consent`
8. **Variables d’environnement** — `env.example` (sans secrets)
9. **Captures d’écran** : bannière cookies, Paramètres → Données et confidentialité, opt-in IA Groq, `/accept-terms`

---

## 3. Questions types pour le conseil

### Responsabilité & gouvernance

- Le responsable doit-il désigner un DPO (Art. 37) compte tenu du volume et de la nature des données ?
- Faut-il enregistrer une activité auprès de la CNIL (ex-CNIL formalités) ?

### Consentement & IA

- Le consentement granulaire IA (Paramètres) + toggle navigateur est-il suffisant pour Groq ?
- La « grandfather » supprimée et le re-consentement par version sont-ils conformes ?
- Le chat libre (Maestro / Ask your Soundprint) change-t-il l’analyse de risque ?

### Transferts

- Les SCC 2021 + DPA Groq/Vercel/Sentry couvrent-ils le schéma actuel ?
- Supabase : région du projet (EU vs US) — impact sur le dossier ?

### Droits & processus

- Délai de 30 jours pour répondre aux demandes — qui traite `GDPR_CONTACT_EMAIL` ?
- Preuve du consentement (`UserConsent`) : durée de conservation des logs ?

### Profil public & démo

- Le profil démo anonyme (`userId` en query) est-il un traitement à part ?
- Faut-il une base légale distincte ou un contrat d’adhésion spécifique ?

---

## 4. Livrables attendus du conseil

| Livrable | Statut | Date | Notes |
|----------|--------|------|-------|
| Avis écrit sur les bases légales | ☐ | | |
| Revue des textes légaux (redlines ou OK) | ☐ | | |
| Validation / compléments DPIA IA | ☐ | | |
| Liste des actions correctives priorisées | ☐ | | |
| Modèle de réponse aux demandes RGPD (DSAR) | ☐ | | |
| Recommandation DPO / représentant UE (Art. 27) si besoin | ☐ | | |

---

## 5. Actions correctives (à remplir après revue)

| # | Recommandation conseil | Priorité | Responsable | Échéance | Statut |
|---|------------------------|----------|-------------|----------|--------|
| 1 | | | | | ☐ |
| 2 | | | | | ☐ |
| 3 | | | | | ☐ |

---

## 6. Déclencheurs de nouvelle revue

Planifier une revue complète ou ciblée si :

- Nouveau sous-traitant ou changement de région d’hébergement
- Ouverture Maestro / chat au public sans authentification
- Fonctionnalités sociales (partage, contacts, découverte)
- Collecte de nouvelles catégories de données (géolocalisation, contacts téléphone, etc.)
- Incident de sécurité ou plainte CNIL
- Bump majeur des politiques légales sans équivalent produit

---

## 7. Contacts & budget (interne)

| Rôle | Nom | Coordonnées | Notes |
|------|-----|-------------|-------|
| Responsable du traitement | Wesley Ajavon | | |
| Conseil / DPO externe | _À désigner_ | | |
| Contact demandes RGPD | `GDPR_CONTACT_EMAIL` | Voir `.env` | |
| Autorité de contrôle | CNIL (France) | https://www.cnil.fr | |

**Estimation** : prévoir 2–5 h de conseil pour une première revue sur dossier préparé ; DPIA IA peut nécessiter 1–2 h supplémentaires.
