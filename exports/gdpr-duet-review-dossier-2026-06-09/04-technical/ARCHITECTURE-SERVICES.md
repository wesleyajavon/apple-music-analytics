# Schéma technique simplifié (Soundprint-AI)

| Service | Rôle | Données concernées | Région / transfert |
|---------|------|-------------------|-------------------|
| **Supabase** | Auth, Postgres (Prisma), Storage avatars | Compte, écoutes, consentements, avatars | Vérifier région projet (EU recommandé) |
| **Groq** | LLM (opt-in utilisateur) | Agrégats / métadonnées d’écoute | US — DPA + SCC |
| **Vercel** | Hosting, analytics web (cookies) | Logs, pages vues si consentement | Possible hors EEE |
| **Sentry** | Error monitoring / replay (opt-in cookies) | Erreurs scrubées | US/EU selon config |
| **Redis** (optionnel) | Rate limiting | IP hash / identifiants requête | Selon hébergeur |

Garde-fous produit :

- Accès données session-scoped (`resolveAuthorizedDataUserId`)
- RLS Supabase si Postgres unifié (`scripts/setup-supabase-rls.sql`)
- Export / suppression compte : routes documentées dans `API.md`
- Consentements versionnés (`UserConsent`)

**Duet (addendum)** : relations amis, partage comparatif opt-in par ami. Voir `05-duet-addendum/`.
