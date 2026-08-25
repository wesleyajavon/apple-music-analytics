# DPIA — Partage social Duet (comparaison et consultation entre amis)

Document interne — Soundprint-AI. Dernière révision : 2026-08-25.

> **Analyse d’impact relative à la protection des données (Art. 35 RGPD)** pour **Duet** : relations amis, invitations, comparaison de statistiques d’écoute, et consultation lecture seule du hub analytics d’un ami accepté (Your Music), toujours hors découverte publique.  
> Statut : **auto-évaluation interne** — revue externe non retenue pour le MVP ; responsable du traitement assume la conformité.

Documents associés : [GDPR_ROPA.md](./GDPR_ROPA.md), [DUET_PLAYBOOK.md](./DUET_PLAYBOOK.md), [DUET_PHASE0_DECISIONS.md](./DUET_PHASE0_DECISIONS.md).

---

## 1. Identification du traitement

| Champ | Valeur |
|-------|--------|
| **Nom** | Duet — partage comparatif et consultation lecture seule avec amis acceptés |
| **Responsable** | Wesley Ajavon (Soundprint-AI) |
| **Sous-traitants** | Supabase (stockage relations + données d’écoute) — pas de nouveau prestataire |
| **Date DPIA** | 2026-06-09 |
| **Révision prévue** | Ouverture publique à grande échelle, découverte d’inconnus, groupes >2, ou plainte CNIL |

### Périmètre fonctionnel (MVP)

| Élément | Détail |
|---------|--------|
| Invitations | Par email (lookup compte existant uniquement) ; message uniforme anti-énumération |
| Relation | Demande → acceptation / refus ; statut `Friendship` ; blocage |
| Partage | Opt-in **par ami** à l’acceptation ; scopes `aggregates` ou `full` (mapping D2, pas de nouvel enum) |
| Comparaisons | Timeline dual, tops/genres agrégés ; head-to-head artiste / titre / genre (scope `full`) |
| Consultation Your Music ami | Lecture seule du hub analytics de l’ami (`/dashboard/duet/music`, **pas** Overview) : KPIs, timeline, tops artistes et genres si `aggregates` ; + tops titres si `full`. Pas de heatmap, pas d’IA. Toujours entre amis `accepted`. |
| Exclusions MVP | Pas de découverte publique, pas de fil, pas de follow, pas de profil public, pas de « view as » dashboard, pas de démo anonyme, pas de chat, pas de groupes |

### Données traitées

| Catégorie | Exemples | Visible par l’ami ? |
|-----------|----------|---------------------|
| Relation | IDs, statut, `shareScope`, date | Non (métadonnée interne) |
| Profil minimal | Nom, avatar | Oui (identification de l’ami) |
| Stats d’écoute | Agrégats timeline, tops, genres ; détail artiste/titre selon scope. Le hub Your Music ami **réutilise ces catégories** (présentation en lecture seule, pas un nouveau jeu de données). | Oui, selon scope choisi par la personne qui partage |
| Email (invitation) | Lookup `User.email` | Non exposé à l’ami |

---

## 2. Nécessité et proportionnalité

### Finalités

Permettre à des utilisateurs de **comparer** leurs habitudes d’écoute **et de consulter en lecture seule** le hub analytics (Your Music) d’un ami qui a **accepté explicitement** le partage, selon le `shareScope` de la relation, dans le cadre du tableau de bord analytics.

### Base légale retenue (auto-évaluation)

**Consentement explicite** (Art. 6(1)(a) RGPD) :

- enregistré à l’**acceptation** de la demande d’ami (`UserConsent`, type `duet_sharing`, version `DUET_SHARING_CONSENT_VERSION`) ;
- granularité par relation (`shareScope`) ;
- retrait à tout moment (révocation ami, modification scope, Paramètres → Partage Duet).

L’inviteur ne voit les stats de l’invité que si celui-ci accepte et choisit un niveau de partage. Pas de partage par défaut.

### Proportionnalité

| Mesure | Justification |
|--------|---------------|
| Opt-in par ami (pas global forcé) | Minimisation ; pas de partage implicite |
| Scope `aggregates` par défaut recommandé | Niveau le moins intrusif pour comparaisons générales |
| Pas de découverte / profil public Duet | Réduit exposition et abus |
| Plafonds (50 amis, 10 invitations/jour) | Limite spam et surface de fuite |
| Auth obligatoire | Pas d’accès anonyme aux données d’autrui |
| Couche d’autorisation dédiée (`assertDuetFriendAccess`) | Pas de réutilisation du paramètre `userId` analytics |

### Alternatives écartées

| Alternative | Raison |
|-------------|--------|
| Intérêt légitime seul | Partage vers **autres personnes identifiables** — consentement préféré |
| Partage activé par défaut | Non retenu (Phase 0 D1) |
| Export / lien public | Hors périmètre MVP |

---

## 3. Analyse des risques

Échelle : **Probabilité** (1–3) × **Gravité** (1–3) = **Score**

| # | Risque | P | G | Score | Mesures existantes / prévues |
|---|--------|---|---|-------|------------------------------|
| R1 | Accès non autorisé aux stats d’un autre user | 2 | 3 | 6 | Auth session ; autorisation Duet dédiée ; pas de `userId` query cross-user |
| R2 | Énumération d’emails via invitations | 2 | 2 | 4 | Réponse uniforme (D4) ; rate limit invitations |
| R3 | Sur-partage (scope `full` non compris) | 2 | 2 | 4 | UX choix scope à l’acceptation ; texte consentement + privacy |
| R4 | Inférence sensible via goûts musicaux | 1 | 2 | 2 | Agrégats par défaut ; pas de profilage automatisé à impact juridique |
| R5 | Conservation excessive des relations refusées | 2 | 1 | 2 | Suppression / anonymisation à définir en impl (invitations expirées) |
| R6 | Harcèlement (spam invitations) | 2 | 2 | 4 | Quota 10/jour ; blocage |
| R7 | Fuite via export JSON (`/api/user/export`) | 1 | 2 | 2 | Export inclut données du compte ; pas les stats des amis |

**Scores ≥ 6** : R1 — traitement prioritaire ; mitigations techniques Phase 1–5 du playbook.

### Art. 35 — DPIA obligatoire ?

| Critère CNIL / WP29 | Applicable MVP Duet ? |
|---------------------|----------------------|
| Évaluation / scoring systématique | Non |
| Traitement à grande échelle de données sensibles Art. 9 | Non (historique d’écoute = données personnelles, pas catégorie spéciale en principe) |
| Surveillance systématique à grande échelle | Non |
| Nouvelles technologies | Non |
| **Croisement / communication à des tiers** | **Oui, limité** — communication à d’**autres utilisateurs** amis identifiés |

**Conclusion** : risque modéré au MVP (volume limité, opt-in explicite, pas de public). **DPIA documentée** (ce fichier) et **mesures renforcées** sur l’autorisation cross-user. La consultation lecture seule du Your Music ami **n’est pas** un déclencheur « découverte d’inconnus » : mêmes destinataires (amis `accepted`), mêmes catégories D2, autre présentation. **Nouvelle revue obligatoire** si : découverte publique, scale massif UE, ou extension des données partagées (géoloc, contacts téléphone, heatmap jour par jour, IA sur données ami, etc.).

---

## 4. Mesures techniques et organisationnelles (TOMs)

### Techniques (roadmap Duet)

- [x] Consentement versionné (`duet_sharing`, `DUET_SHARING_CONSENT_VERSION`)
- [ ] Tables `Friendship` + contraintes d’intégrité
- [ ] `assertDuetFriendAccess` — autorisation distincte des routes analytics
- [ ] Rate limit routes `/api/duet/*`
- [ ] Révocation immédiate côté API (404 pour l’ami)
- [ ] Duet absent du profil démo public
- [ ] Export compte : pas d’inclusion des stats des amis

### Organisationnelles

- [x] ROPA mis à jour ([GDPR_ROPA.md](./GDPR_ROPA.md))
- [x] Politique de confidentialité — section Duet (`messages/*/legal.privacy`)
- [ ] Scénario QA 2 comptes (playbook §7.4) avant prod
- [ ] Revue externe si plainte, incident, ou ouverture à grande échelle

---

## 5. Consultation & validation

| Partie | Consultée | Date | Avis |
|--------|-----------|------|------|
| Responsable traitement | Wesley Ajavon | 2026-06-09 | Poursuite MVP avec mesures ci-dessus |
| DPO / conseil externe | Non retenu (MVP) | | Revue différée — voir [GDPR_BACKLOG.md](./GDPR_BACKLOG.md) |

---

## 6. Décision

| Décision | ☑ Poursuivre avec mesures additionnelles |
|----------|------------------------------------------|
| **Conditions** | Implémentation garde-fous Phase 1–5 ; pas de prod Duet sans ROPA + privacy à jour ; réévaluation si changement de périmètre |
| **Signataire** | Wesley Ajavon **Date** : 2026-06-09 |

---

## 7. Révision

| Version | Date | Changement |
|---------|------|------------|
| 0.1 | 2026-06-09 | Création — auto-évaluation Duet MVP |
| 0.2 | 2026-08-25 | Périmètre : consultation lecture seule du hub Your Music ami selon `shareScope` (D2 inchangé). Pas de bump `DUET_SHARING_CONSENT_VERSION`. Copy acceptation + privacy alignés. |

**Ce qui change pour l’utilisateur (0.2)**

- **Aujourd’hui :** pas de nouvel écran. Si tu acceptes une invitation (ou relis la privacy), le texte dit qu’un ami pourra ouvrir tes stats agrégées, pas seulement te comparer. `full` = aussi tes tops titres. Toujours pas de fil ni de profil public.
- **Inchangé :** niveau de partage (`aggregates` / `full`), révocation, pas de découverte d’inconnus, Overview = ta musique.
- **Pas de re-consentement :** version `2026-06-09` inchangée ; mêmes catégories de données qu’à l’acceptation initiale.
- **Plus tard (hors de cette révision docs) :** bouton « Voir sa musique » et page `/dashboard/duet/music`.

**Prochaine revue** : avant ouverture publique à grande échelle, ajout découverte d’inconnus, ou incident de sécurité cross-user.
