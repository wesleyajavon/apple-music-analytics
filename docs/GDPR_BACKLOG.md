# Backlog RGPD — actions différées (priorité basse)

Document interne — Soundprint-AI. Dernière révision : 2026-06-09.

> **À faire plus tard**, quand tu ouvres en prod « sérieux », que le volume d’utilisateurs UE augmente, ou après un changement majeur (social, Maestro public, nouveau sous-traitant).
>
> Le socle technique RGPD est en place ; cette liste couvre surtout des **actions humaines / juridiques / opérationnelles** non urgentes pour un MVP ou une beta restreinte.

**Recherche rapide** : chercher `GDPR_BACKLOG` dans le repo, ou suivre le lien depuis `env.example` (section GDPR).

---

## Quand s’en occuper ?

| Déclencheur | Actions concernées |
|-------------|-------------------|
| Ouverture publique UE à échelle | Revue juridique, DPA, DSAR |
| Première plainte ou demande RGPD par email | Modèle DSAR, processus interne |
| Incident de sécurité | Registre incidents, breach procedure |
| Fonctionnalités sociales / partage | Revue ROPA + DPIA ciblée |
| Croissance logs / backups | Rétention automatisée |

---

## 1. Revue juridique externe (conseil / DPO)

**Statut** : ☐ Non planifié — **priorité basse**

**Concrètement** :

1. Choisir un avocat RGPD ou DPO freelance (pas obligatoirement un DPO à temps plein au début).
2. Lui envoyer le dossier listé dans [GDPR_LEGAL_REVIEW_CHECKLIST.md](./GDPR_LEGAL_REVIEW_CHECKLIST.md) §2 :
   - `docs/GDPR_ROPA.md`
   - `docs/GDPR_DPIA_AI.md`
   - `docs/GDPR_DATA_BREACH_PROCEDURE.md`
   - Pages `/legal/privacy`, `/legal/cookies`, `/legal/terms`
   - `env.example` (sans secrets)
   - Captures : bannière cookies, Paramètres → Données et confidentialité, opt-in IA, `/accept-terms`
3. Obtenir un avis écrit + liste d’actions correctives.
4. Remplir la section 5 de la checklist juridique avec les recommandations.

**Budget indicatif** : 2–5 h de conseil sur dossier préparé ; +1–2 h si validation DPIA IA approfondie.

**Référence détaillée** : [GDPR_LEGAL_REVIEW_CHECKLIST.md](./GDPR_LEGAL_REVIEW_CHECKLIST.md)

---

## 2. Archivage des DPA / SCC sous-traitants

**Statut** : ☐ Non fait — **priorité basse**

Télécharger et archiver (dossier local ou cloud privé, hors git) les contrats de sous-traitance :

| Prestataire | Où les trouver | Statut |
|-------------|----------------|--------|
| Supabase | Dashboard projet → Legal / DPA | ☐ |
| Groq | Console / conditions + DPA si disponible | ☐ |
| Vercel | Account → Legal | ☐ |
| Sentry | Organization → Legal & Compliance | ☐ |
| Redis (si prod) | Fournisseur hébergement | ☐ |

**Note** : les DPA sont déjà mentionnés dans la politique de confidentialité ; l’archivage sert de preuve en cas de contrôle.

---

## 3. Modèle de réponse aux demandes RGPD (DSAR)

**Statut** : ☐ Non fait — **priorité basse**

Préparer un modèle d’email pour répondre aux demandes reçues sur `GDPR_CONTACT_EMAIL` :

- Accusé de réception (délai max 30 jours)
- Vérification d’identité (compte connecté vs email)
- Réponse type : export déjà disponible dans l’app, suppression, rectification
- Refus motivé si demande manifestement infondée ou excessive

Peut être fourni par le conseil (livrable §4 de la checklist juridique) ou rédigé en interne puis validé plus tard.

---

## 4. Rétention automatisée des données

**Statut** : ☐ Non fait — **priorité basse**

Automatiser ou documenter explicitement la purge :

- Logs Sentry (durée de rétention org)
- Backups Supabase / snapshots
- Données `UserConsent` / audit après suppression de compte (déjà partiellement géré côté delete-account)
- Fenêtres rate-limit Redis

Aligner les durées réelles avec ce qui est annoncé dans la politique de confidentialité et le ROPA.

---

## 5. Registre des incidents (`docs/incidents/`)

**Statut** : ☐ Non fait — **priorité basse**

Créer un dossier interne (hors git public si sensible) pour tracer les incidents :

- Date, gravité, nature
- Mesures prises
- Notification CNIL / personnes concernées (oui/non, date)
- Lien avec [GDPR_DATA_BREACH_PROCEDURE.md](./GDPR_DATA_BREACH_PROCEDURE.md)

À utiliser seulement en cas d’incident réel — pas besoin de le préremplir à l’avance.

---

## 6. Revue RGPD avant fonctionnalités sociales

**Statut** : ☐ Non applicable tant que social désactivé — **priorité basse**

Avant tout partage public, contacts, découverte d’amis, etc. :

- Mettre à jour le ROPA
- Revoir bases légales et paramètres de confidentialité
- Possible nouvelle revue juridique ciblée

---

## 7. Contacts à compléter (quand revue juridique faite)

| Rôle | Statut | Notes |
|------|--------|-------|
| Conseil / DPO externe | ☐ À désigner | Voir §1 |
| Conseil juridique (breach) | ☐ À compléter | Champ dans `GDPR_DATA_BREACH_PROCEDURE.md` |

`GDPR_CONTACT_EMAIL` : configuré côté app pour les demandes utilisateurs.

---

## Documents associés

- [GDPR_ROPA.md](./GDPR_ROPA.md) — registre des traitements
- [GDPR_DPIA_AI.md](./GDPR_DPIA_AI.md) — DPIA IA (brouillon)
- [GDPR_LEGAL_REVIEW_CHECKLIST.md](./GDPR_LEGAL_REVIEW_CHECKLIST.md) — checklist revue externe
- [GDPR_DATA_BREACH_PROCEDURE.md](./GDPR_DATA_BREACH_PROCEDURE.md) — procédure violation
