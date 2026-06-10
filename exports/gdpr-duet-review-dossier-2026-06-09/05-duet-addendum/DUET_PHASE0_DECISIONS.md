# Duet — Phase 0 : décisions produit & copy UX

> **Project Duet** · Résumé : [DUET.md](./DUET.md) · Playbook : [DUET_PLAYBOOK.md](./DUET_PLAYBOOK.md) · Index : [IDEAS_BAG.md](../IDEAS_BAG.md)

**Statut** : ✅ **Phase 0 validée** (2026-06-09) — recommandations par défaut retenues pour D1–D10.  
**Prochaine étape** : [Phase 1 — Fondation données](./DUET_PLAYBOOK.md#phase-1--fondation-données).

---

## 1. Décisions D1–D10

Cocher ou remplir la colonne **Décision finale** une fois tranché. Les valeurs par défaut reprennent les recommandations du [playbook §5](./DUET_PLAYBOOK.md#5-décisions-produit-à-trancher-phase-0).

| # | Question | Recommandation par défaut | Décision finale |
|---|----------|---------------------------|-----------------|
| D1 | Opt-in par ami ou global seul ? | **Par ami** — `shareScope` sur chaque `Friendship`, complété par des settings globales (`DuetShareSettings`) | ✅ Par ami + settings globales |
| D2 | Niveaux de partage | **`aggregates`** (timeline, tops, genres) et **`full`** (comparaisons ciblées artiste / titre / genre) | ✅ `aggregates` + `full` |
| D3 | Canal invitation MVP | **Email** uniquement (lookup `User.email`) | ✅ Email uniquement |
| D4 | Réponse si email inconnu | **Message uniforme** — pas de « compte introuvable » (anti-énumération) | ✅ Message uniforme |
| D5 | Invitations si compte absent | **v2** — MVP : invitation uniquement si un `User` existe déjà | ✅ MVP : User existant seulement |
| D6 | Métriques MVP | **Timeline dual** (2 séries sur un graphe) + **head-to-head artiste** | ✅ Timeline dual + head-to-head artiste |
| D7 | Accès démo publique | **Fermé** — session authentifiée obligatoire (alignement Breakwater) | ✅ Fermé (auth obligatoire) |
| D8 | Plafond amis | **50** par utilisateur | ✅ 50 |
| D9 | Quota invitations / jour | **10** par utilisateur | ✅ 10 / jour |
| D10 | Texte légal consentement partage | **À rédiger / valider juridiquement** — voir §3 et [GDPR_LEGAL_REVIEW_CHECKLIST.md](./GDPR_LEGAL_REVIEW_CHECKLIST.md) §6 | ✅ Brouillon §2.3 pour le dev — **revue juridique avant prod UE** |

### Notes de cadrage (rappel)

- **D1 + D2** : à l’acceptation, l’utilisateur choisit le niveau de partage pour *cette* relation. Il peut le modifier ou révoquer plus tard dans Paramètres → Partage Duet.
- **D4 + D5** : l’API renvoie toujours « invitation traitée » ; pas de distinction visible entre email inconnu et invitation envoyée.
- **D10** : le texte court §3.3 sert de brouillon UX ; la version légale définitive alimente `DUET_SHARING_CONSENT_VERSION` (Phase 2) et la politique de confidentialité.

### Checklist validation

- [x] D1 validée
- [x] D2 validée
- [x] D3 validée
- [x] D4 validée
- [x] D5 validée
- [x] D6 validée
- [x] D7 validée
- [x] D8 validée
- [x] D9 validée
- [x] D10 validée (brouillon dev) — revue juridique **en attente** avant prod UE

---

## 2. Copy UX — brouillons i18n

Clés proposées pour le namespace `duet` (Phase 4). Ton : clair, engageant, sans sur-promesse. Les textes légaux (D10) restent **indicatifs** — à valider par conseil / DPO.

### 2.1 Écran d’acceptation d’invitation (`aggregates` / `full`)

Contexte : l’utilisateur B reçoit une demande d’ami de A. Avant d’accepter, B choisit ce qu’il partage avec A.

#### Français (FR)

| Clé | Texte |
|-----|-------|
| `duet.inviteAccept.title` | Demande d’ami |
| `duet.inviteAccept.subtitle` | **{requesterName}** souhaite vous ajouter en ami et comparer vos stats d’écoute. |
| `duet.inviteAccept.sharePrompt` | Que souhaitez-vous partager avec cet ami ? |
| `duet.inviteAccept.scopeAggregates.label` | Statistiques agrégées |
| `duet.inviteAccept.scopeAggregates.description` | Courbes d’écoute, tops artistes et genres sur une période — sans détail des morceaux. |
| `duet.inviteAccept.scopeFull.label` | Comparaisons détaillées |
| `duet.inviteAccept.scopeFull.description` | Tout ce qui précède, plus les défis « qui écoute le plus » sur un artiste, un titre ou un genre. |
| `duet.inviteAccept.consentHint` | En acceptant, vous autorisez le partage choisi avec **{requesterName}**. Vous pourrez modifier ou révoquer ce partage à tout moment. |
| `duet.inviteAccept.accept` | Accepter et partager |
| `duet.inviteAccept.decline` | Refuser |
| `duet.inviteAccept.defaultScopeNote` | Votre choix par défaut pour les prochains amis est « {defaultScope} » — modifiable dans Paramètres. |

#### English (EN)

| Key | Text |
|-----|------|
| `duet.inviteAccept.title` | Friend request |
| `duet.inviteAccept.subtitle` | **{requesterName}** wants to add you as a friend and compare listening stats. |
| `duet.inviteAccept.sharePrompt` | What would you like to share with this friend? |
| `duet.inviteAccept.scopeAggregates.label` | Aggregated stats |
| `duet.inviteAccept.scopeAggregates.description` | Listening trends, top artists and genres over a period — no individual track details. |
| `duet.inviteAccept.scopeFull.label` | Detailed comparisons |
| `duet.inviteAccept.scopeFull.description` | Everything above, plus head-to-head « who listened more » for an artist, track or genre. |
| `duet.inviteAccept.consentHint` | By accepting, you allow the selected sharing with **{requesterName}**. You can change or revoke this at any time. |
| `duet.inviteAccept.accept` | Accept and share |
| `duet.inviteAccept.decline` | Decline |
| `duet.inviteAccept.defaultScopeNote` | Your default for future friends is « {defaultScope} » — change it in Settings. |

#### Español (ES)

| Clave | Texto |
|-------|-------|
| `duet.inviteAccept.title` | Solicitud de amistad |
| `duet.inviteAccept.subtitle` | **{requesterName}** quiere añadirte como amigo y comparar estadísticas de escucha. |
| `duet.inviteAccept.sharePrompt` | ¿Qué quieres compartir con este amigo? |
| `duet.inviteAccept.scopeAggregates.label` | Estadísticas agregadas |
| `duet.inviteAccept.scopeAggregates.description` | Tendencias de escucha, artistas y géneros más escuchados en un periodo — sin detalle de canciones. |
| `duet.inviteAccept.scopeFull.label` | Comparaciones detalladas |
| `duet.inviteAccept.scopeFull.description` | Todo lo anterior, más retos « quién escuchó más » por artista, canción o género. |
| `duet.inviteAccept.consentHint` | Al aceptar, autorizas el nivel de compartición elegido con **{requesterName}**. Puedes cambiarlo o revocarlo en cualquier momento. |
| `duet.inviteAccept.accept` | Aceptar y compartir |
| `duet.inviteAccept.decline` | Rechazar |
| `duet.inviteAccept.defaultScopeNote` | Tu opción predeterminada para futuros amigos es « {defaultScope} » — cámbiala en Ajustes. |

---

### 2.2 Bandeau « données ami incomplètes »

Contexte : page Comparer — `/api/duet/compare/metadata` signale des historiques ou sources différentes entre viewer et ami.

#### Français (FR)

| Clé | Texte |
|-----|-------|
| `duet.metadataBanner.title` | Données incomplètes pour une comparaison équitable |
| `duet.metadataBanner.body` | **{friendName}** n’a pas la même couverture que vous : {reasons}. Les chiffres peuvent être trompeurs sur la période sélectionnée. |
| `duet.metadataBanner.reasonShorterHistory` | historique plus court ({friendFrom} → {friendTo} vs {selfFrom} → {selfTo}) |
| `duet.metadataBanner.reasonFewerListens` | moins d’écoutes enregistrées ({friendTotal} vs {selfTotal}) |
| `duet.metadataBanner.reasonDifferentSources` | sources différentes ({friendSources} vs {selfSources}) |
| `duet.metadataBanner.reasonSeparator` | · |
| `duet.metadataBanner.dismiss` | Compris |
| `duet.metadataBanner.learnMore` | En savoir plus |

#### English (EN)

| Key | Text |
|-----|------|
| `duet.metadataBanner.title` | Incomplete data for a fair comparison |
| `duet.metadataBanner.body` | **{friendName}** doesn’t have the same coverage as you: {reasons}. Numbers may be misleading for the selected period. |
| `duet.metadataBanner.reasonShorterHistory` | shorter history ({friendFrom} → {friendTo} vs {selfFrom} → {selfTo}) |
| `duet.metadataBanner.reasonFewerListens` | fewer listens recorded ({friendTotal} vs {selfTotal}) |
| `duet.metadataBanner.reasonDifferentSources` | different sources ({friendSources} vs {selfSources}) |
| `duet.metadataBanner.reasonSeparator` | · |
| `duet.metadataBanner.dismiss` | Got it |
| `duet.metadataBanner.learnMore` | Learn more |

#### Español (ES)

| Clave | Texto |
|-------|-------|
| `duet.metadataBanner.title` | Datos incompletos para una comparación justa |
| `duet.metadataBanner.body` | **{friendName}** no tiene la misma cobertura que tú: {reasons}. Las cifras pueden ser engañosas en el periodo seleccionado. |
| `duet.metadataBanner.reasonShorterHistory` | historial más corto ({friendFrom} → {friendTo} vs {selfFrom} → {selfTo}) |
| `duet.metadataBanner.reasonFewerListens` | menos escuchas registradas ({friendTotal} vs {selfTotal}) |
| `duet.metadataBanner.reasonDifferentSources` | fuentes distintas ({friendSources} vs {selfSources}) |
| `duet.metadataBanner.reasonSeparator` | · |
| `duet.metadataBanner.dismiss` | Entendido |
| `duet.metadataBanner.learnMore` | Más información |

---

### 2.3 Mention consentement court

Contexte : ligne sous le bouton « Accepter » ou dans Paramètres → Partage Duet. **Brouillon non juridique** — D10 requiert validation légale avant prod UE.

#### Français (FR)

| Clé | Texte |
|-----|-------|
| `duet.consent.short` | En activant le partage Duet, vous acceptez que vos statistiques d’écoute agrégées soient visibles par les amis que vous autorisez, selon le niveau choisi. Vous pouvez retirer votre consentement en révoquant un ami ou en désactivant le partage dans Paramètres. |
| `duet.consent.linkPrivacy` | Politique de confidentialité |
| `duet.consent.versionNote` | Consentement enregistré (version {version}). |

#### English (EN)

| Key | Text |
|-----|------|
| `duet.consent.short` | By enabling Duet sharing, you agree that your aggregated listening statistics may be visible to friends you authorize, according to the level you choose. You can withdraw consent by revoking a friend or disabling sharing in Settings. |
| `duet.consent.linkPrivacy` | Privacy policy |
| `duet.consent.versionNote` | Consent recorded (version {version}). |

#### Español (ES)

| Clave | Texto |
|-------|-------|
| `duet.consent.short` | Al activar el compartir Duet, aceptas que tus estadísticas de escucha agregadas puedan ser visibles para los amigos que autorices, según el nivel elegido. Puedes retirar el consentimiento revocando a un amigo o desactivando el compartir en Ajustes. |
| `duet.consent.linkPrivacy` | Política de privacidad |
| `duet.consent.versionNote` | Consentimiento registrado (versión {version}). |

---

## 3. Prochaines étapes

| Livrable Phase 0 | Statut |
|------------------|--------|
| 0.1 Fiche décisions D1–D10 | ✅ Validée |
| 0.2 Schéma Prisma validé | ✅ Aligné sur [DUET_PLAYBOOK.md §3](./DUET_PLAYBOOK.md#3-architecture-cible) |
| 0.3 Brouillon texte consentement | ✅ §2.3 — revue juridique avant prod |
| 0.4 Entrée sidebar (libellé + icône) | Phase 4 — suggestion : groupe « Social », icône `Users` ou `GitCompare` |

**Actions humaines restantes** (non bloquantes Phase 1) : revue RGPD + ROPA — voir [DUET_PLAYBOOK.md §7.1](./DUET_PLAYBOOK.md#71-phase-0--cadrage-et-juridique).

**Phase suivante** : [Phase 1 — Fondation données](./DUET_PLAYBOOK.md#phase-1--fondation-données).

---

*Dernière mise à jour : 2026-06-09 — Phase 0 validée.*
