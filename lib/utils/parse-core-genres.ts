/**
 * Parses numbered or comma-separated genre lists from taste-profile AI output.
 * e.g. "1. Hip hop 2. Afrobeats 3. French 4. Pop"
 */
export function parseCoreGenres(text: string, max = 6): string[] {
  const numbered = [...text.matchAll(/\d+\.\s*([^,\d]+?)(?=\s*\d+\.|$)/g)];
  if (numbered.length > 0) {
    return numbered.map((match) => match[1].trim()).filter(Boolean).slice(0, max);
  }

  return text
    .split(/[,;|]/)
    .map((part) => part.replace(/^\d+\.\s*/, "").trim())
    .filter((part) => part.length > 0 && part.length < 48)
    .slice(0, max);
}
