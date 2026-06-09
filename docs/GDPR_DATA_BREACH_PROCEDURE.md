# Procédure — violation de données personnelles

Document interne — Soundprint-AI. Dernière révision : 2026-06-09.

> **Objectif** : réagir de façon structurée à une violation de données (Art. 33–34 RGPD) : confinement, évaluation, notification CNIL (**72 h**), information des personnes si risque élevé.

Documents associés : [GDPR_ROPA.md](./GDPR_ROPA.md), [GDPR_DPIA_AI.md](./GDPR_DPIA_AI.md)

---

## 1. Définition & exemples

Une **violation de données** = destruction, perte, altération, divulgation non autorisée ou accès non autorisé à des données personnelles.

### Exemples applicables à Soundprint-AI

| Scénario | Gravité indicative |
|----------|-------------------|
| Fuite `DATABASE_URL` ou dump Postgres public | **Élevée** |
| Fuite `SUPABASE_SERVICE_ROLE_KEY` | **Élevée** |
| Fuite `GROQ_API_KEY` (prompts possibles côté Groq) | **Moyenne à élevée** |
| RLS Supabase mal configurée → lecture cross-user | **Élevée** |
| Export admin sans contrôle vers mauvais destinataire | **Élevée** |
| Log accidentel d’emails / écoutes dans Sentry | **Moyenne** (selon volume) |
| Accès non autorisé au bucket avatars | **Moyenne** |
| Phishing compte admin | **Variable** |

---

## 2. Rôles

| Rôle | Responsabilité | Contact |
|------|----------------|---------|
| **Responsable incident** | Wesley Ajavon — décision finale, notification autorité | |
| **Support technique** | Même personne (MVP) — confinement, logs, correctifs | |
| **Conseil externe** | Avocat / DPO si disponible | _À compléter_ |
| **Contact RGPD utilisateurs** | `GDPR_CONTACT_EMAIL` | Voir `.env` |

---

## 3. Phases de réponse

```
DÉTECTION → CONFINEMENT (0–4 h) → ÉVALUATION (4–24 h) → DÉCISION (24–72 h) → NOTIFICATION → POST-MORTEM
```

### Phase A — Détection & signalement (T+0)

**Sources possibles** : alerte Sentry, utilisateur, scan sécurité, fournisseur (Supabase, Vercel), audit git.

1. Noter **date/heure de découverte** (horodatage UTC).
2. Ouvrir un **registre d’incident** (issue GitHub privée ou doc interne) avec ID : `INC-YYYY-MM-DD-001`.
3. Ne pas supprimer de preuves (logs, captures, commits).

### Phase B — Confinement immédiat (T+0 à 4 h)

Actions selon le type :

| Type | Actions |
|------|---------|
| Clé API / secret exposé | Révoquer / rotate immédiatement (Groq, Supabase, Vercel, Redis, `IMPORT_ADMIN_KEY`) |
| Accès DB | Changer mot de passe DB ; vérifier RLS ; révoquer sessions suspectes Supabase |
| Failles app | Déployer correctif ou `AI_MASTER_ENABLED=false` ; désactiver route concernée |
| Fuite avatars | Policy Storage ; supprimer fichiers exposés |

Checklist rapide :

- [ ] Secret révoqué / rotaté
- [ ] Accès non autorisé bloqué
- [ ] Preuves conservées (logs, IP, userIds concernés)
- [ ] Équipe / conseil alertés si gravité ≥ moyenne

### Phase C — Évaluation (T+4 h à 24 h)

Documenter dans le registre d’incident :

1. **Nature** : confidentialité / intégrité / disponibilité
2. **Catégories de données** : compte, écoutes, consentements, tokens Spotify, etc.
3. **Volume** : nb utilisateurs / enregistrements estimés
4. **Causes** : erreur humaine, config, attaque, sous-traitant
5. **Conséquences probables** pour les personnes (usurpation, discrimination, atteinte réputation, etc.)
6. **Mesures déjà prises** (phase B)

**Grille de notification CNIL (Art. 33)** — notification **obligatoire sous 72 h** sauf si risque **improbable** pour les droits et libertés :

| Critère | Oui → probable notification |
|---------|----------------------------|
| Données d’écoute / email exposées | ✓ |
| > 100 personnes concernées | ✓ |
| Données non chiffrées sur internet public | ✓ |
| Clé service_role / DATABASE_URL publique | ✓ |
| Violation interne contenue, 1 compte test, corrigée | Peut-être non |

> En cas de doute : **consulter le conseil** ou notifier par principe.

### Phase D — Notification autorité (T ≤ 72 h)

**Autorité (France)** : [CNIL — notifier une violation](https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles)

Informations à préparer (Art. 33(3)) :

1. Nature de la violation
2. Coordonnées DPO / contact (`GDPR_CONTACT_EMAIL`)
3. Conséquences probables
4. Mesures proposées / prises
5. Si info incomplète à 72 h : notification initiale + compléments ultérieurs **sans retard indu**

**Modèle interne (brouillon)** :

```
Objet : Notification violation de données — Soundprint-AI — INC-____

1. Date/heure découverte : 
2. Date/heure incident (estimée) : 
3. Description : 
4. Catégories de données : 
5. Nombre approximatif de personnes : 
6. Conséquences probables : 
7. Mesures de confinement : 
8. Mesures pour atténuer / éviter récidive : 
9. Contact : GDPR_CONTACT_EMAIL
```

### Phase E — Information des personnes (Art. 34)

**Obligatoire** si la violation est susceptible d’engendrer un **risque élevé** pour leurs droits et libertés.

**Dispenses possibles** (Art. 34(3)) — à valider juridiquement :

- Mesures de protection rendent le risque improbable (ex. chiffrement fort clé non compromise)
- Mesures ultérieures éliminent le risque élevé
- Effort disproportionné → communication publique ou communication ciblée

**Canaux** : email utilisateurs concernés (via Supabase / export contrôlé), bannière in-app, ou page statut.

**Contenu minimum** :

- Nature de l’incident en langage clair
- Coordonnées contact
- Conséquences probables
- Mesures prises
- Recommandations utilisateur (changer mot de passe, révoquer Spotify, etc.)

### Phase F — Post-mortem (T+7 jours)

- [ ] Cause racine documentée
- [ ] Correctifs déployés et vérifiés
- [ ] Mise à jour ROPA / DPIA si nécessaire
- [ ] Mise à jour procédure si lacune identifiée
- [ ] Rotation secrets planifiée
- [ ] Clôture registre incident

---

## 4. Registre des violations (Art. 33(5))

Tenir un registre **interne** de toutes les violations, y compris celles non notifiées à la CNIL.

| ID | Date découverte | Description | Données | Personnes | Notifié CNIL ? | Notifié users ? | Mesures | Clôturé |
|----|-----------------|-------------|---------|-----------|----------------|-----------------|---------|---------|
| _exemple_ | — | — | — | — | Non | Non | — | — |

Fichier suggéré : `docs/incidents/` (gitignored) ou issue tracker privé.

---

## 5. Scénarios playbook

### S1 — `GROQ_API_KEY` commitée sur GitHub public

1. Révoquer clé Groq console immédiatement
2. Générer nouvelle clé ; mettre à jour Vercel env
3. `git filter-repo` ou considérer repo compromis ; GitHub secret scanning
4. Évaluer : prompts passés via compte — contacter Groq support si logs côté eux
5. DPIA : incident R6/R8 — post-mortem

### S2 — RLS désactivée par erreur sur `Listen`

1. Réappliquer `scripts/setup-supabase-rls.sql`
2. Auditer logs Supabase / accès API période exposition
3. Identifier userIds potentiellement lus
4. Notification CNIL + users si accès cross-user confirmé

### S3 — Fuite export JSON vers mauvais destinataire

1. Contacter destinataire ; demander suppression certifiée
2. Notifier utilisateur concerné
3. Revue process export (ré-auth récente déjà en place)

---

## 6. Contacts utiles

| Entité | Usage |
|--------|-------|
| **CNIL** | Notification violation (France) |
| **Supabase Support** | Incident infra / auth |
| **Vercel Support** | Incident hosting / env leak |
| **Groq** | Incident clé API / data processing |
| **Conseil juridique** | _À compléter_ |

---

## 7. Révision de ce document

Réviser après :

- Premier incident réel ou exercice table-top
- Changement d’hébergement ou sous-traitant majeur
- Recommandations de la revue juridique externe

**Prochaine revue planifiée** : _À planifier (ex. 2026-12)_
