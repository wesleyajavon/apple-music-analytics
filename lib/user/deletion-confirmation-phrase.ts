/**
 * Phrase de confirmation pour effacer les analytics : prénom-nom normalisé
 * (ex. "Jean Dupont" → "jean-dupont"), alignée entre UI et API.
 */

function normalizeSegment(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Normalise la saisie utilisateur pour comparaison avec la phrase attendue. */
export function normalizeDeletionConfirmationInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Construit la phrase à saisir à partir du nom affiché ou, à défaut, de l’email
 * (partie locale : premier et dernier segment séparés par . _ + -).
 */
export function buildExpectedDeletionPhrase(
  name: string | null | undefined,
  email: string | null | undefined
): string | null {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = normalizeSegment(parts[0]);
      const last = normalizeSegment(parts[parts.length - 1]);
      if (first && last) return `${first}-${last}`;
    }
    const single = normalizeSegment(parts[0] ?? "");
    if (single) return single;
  }

  const em = email?.trim();
  if (em && em.includes("@")) {
    const local = (em.split("@")[0] ?? "").trim();
    const segs = local.split(/[._+-]+/).filter(Boolean);
    const norm = segs.map(normalizeSegment).filter(Boolean);
    if (norm.length >= 2) return `${norm[0]}-${norm[norm.length - 1]}`;
    if (norm.length === 1) return norm[0];
  }

  return null;
}

export function deletionPhrasesMatch(input: string, expected: string): boolean {
  return normalizeDeletionConfirmationInput(input) === expected;
}
