# Registre des activités de traitement (ROPA)

Document interne — Soundprint-AI. Dernière révision : 2026-06-09 (Duet).

> Ce registre complète la [politique de confidentialité](/legal/privacy) publique. Il n’est pas destiné aux utilisateurs finaux.

## Responsable du traitement

- **Identité** : Wesley Ajavon (Soundprint-AI)
- **Contact RGPD** : variable `GDPR_CONTACT_EMAIL` (voir `env.example`)

## Traitements principaux

| Traitement | Finalité | Base légale (indicative) | Données | Durée | Destinataires |
|------------|----------|--------------------------|---------|-------|---------------|
| Compte utilisateur | Auth, profil, paramètres | Exécution du contrat | Email, nom, avatar, id Supabase | Durée du compte | Supabase |
| Historique d’écoute | Dashboard analytics | Exécution du contrat | Artistes, titres, dates, genres | Durée du compte | Supabase |
| Imports Replay / fichiers | Alimenter les stats | Exécution du contrat | Exports Apple/Spotify/Last.fm | Durée du compte | Supabase |
| Connexion Spotify OAuth | Sync optionnelle | Exécution du contrat + consentement connecteur | Tokens chiffrés, métadonnées Spotify | Jusqu’à révocation | Supabase, Spotify |
| Consentements (UserConsent) | Preuve RGPD / ePrivacy | Obligation légale + consentement | Type, version, catégories, ipHash, userAgent | Audit ; lié au compte | Supabase |
| IA Groq (opt-in) | Insights, chat, genres LLM | **Consentement explicite** | Titres artistes/morceaux, agrégats d’écoute | Tant que consentement actif | Groq (US) |
| Cookies analytics | Mesure d’usage | Consentement (bannière) | Pages vues, agrégats | Selon Vercel | Vercel |
| Error monitoring / replay | Stabilité produit | Consentement (bannière) | Erreurs scrubées, replay masqué | Selon Sentry | Sentry (US/EU) |
| Rate limiting | Sécurité, anti-abus | Intérêt légitime | IP hash / identifiants requête | Fenêtre glissante courte | Redis (si configuré) |
| **Partage Duet (amis)** | Comparaison de stats d’écoute entre utilisateurs connectés ayant accepté une relation | **Consentement explicite** (acceptation invitation + choix `shareScope` par ami) | Statut relation, scope partage ; nom/avatar ami ; agrégats d’écoute (timeline, tops, genres) ; comparaisons artiste/titre/genre si scope `full` | Durée du compte ; relation et accès supprimés à la révocation, au blocage ou à la suppression de compte | Supabase ; **autres utilisateurs amis autorisés** (accès lecture selon scope) |

## Droits des personnes (mise en œuvre produit)

| Droit | Mécanisme dans l’app |
|-------|----------------------|
| Accès / portabilité | `GET /api/user/export` — Paramètres → Données et confidentialité |
| Rectification | Profil (nom, avatar) |
| Effacement partiel | `POST /api/user/clear-analytics` |
| Effacement complet | `DELETE /api/user/delete-account` |
| Opposition / retrait consentement | Paramètres (IA Groq), bannière cookies, toggle IA navigateur |
| Retrait partage Duet | Révoquer un ami, modifier le scope, ou désactiver le partage — Paramètres → Partage Duet ; preuve consentement `UserConsent` type `duet_sharing` |
| Retrait consentement CGU | Suppression de compte (pas de service sans CGU à jour) |

## Transferts hors UE

- **Groq**, **Sentry**, **Vercel** : possible traitement aux États-Unis ou hors EEE.
- **Garanties** : DPA / SCC des prestataires ; IA et Sentry uniquement sur opt-in ou cookies acceptés.

## Mesures techniques (résumé)

- RLS Supabase (`scripts/setup-supabase-rls.sql`)
- Session-scoped data access (pas d’usurpation `userId`)
- Ré-auth récente pour export / suppression
- Scrubbing Sentry ; pas d’envoi massif d’écoutes au LLM
- Versions de consentement (`legal-consent.ts`, `cookie-consent.ts`) → re-consentement si bump
- Duet : autorisation dédiée cross-user (`assertDuetFriendAccess`) — pas de paramètre `userId` analytics pour cibler un ami
- Duet : rate limit invitations (10/jour) et plafond amis (50) ; pas d’accès en démo publique anonyme

## Documents associés

- [GDPR_DPIA_AI.md](./GDPR_DPIA_AI.md) — analyse d’impact IA (Groq)
- [GDPR_DPIA_DUET.md](./GDPR_DPIA_DUET.md) — analyse d’impact Duet (partage social)
- [GDPR_LEGAL_REVIEW_CHECKLIST.md](./GDPR_LEGAL_REVIEW_CHECKLIST.md) — checklist revue juridique externe
- [GDPR_DATA_BREACH_PROCEDURE.md](./GDPR_DATA_BREACH_PROCEDURE.md) — procédure violation de données
- [GDPR_BACKLOG.md](./GDPR_BACKLOG.md) — actions différées (priorité basse)

## Révision

Réviser ce document lors de :

- Nouvelle fonctionnalité traitant des données personnelles (social, partage, Maestro public, etc.)
- Nouveau sous-traitant
- Changement de politique légale (bump des constantes de version)
