export type AssistantChatBlock =
  | { type: "paragraph"; text: string }
  | { type: "bulletList"; items: string[] }
  | { type: "orderedList"; items: string[] };

const BULLET_LINE = /^(\s*[-*•]|\s*\d+\.)\s+(.*)$/;

/** New bullet when a statistic year starts (" - 2025:"). */
const YEAR_SUB_BULLET = /\s+-\s+(?=\d{4}\s*:)/g;

/**
 * "1451 - Unique tracks:" / "(224 listens) - Yearly breakdown:" — new line + bullet before label:value.
 * Unicode uppercase = start of a field label (works for EN/FR/ES answers).
 */
const LABEL_VALUE_BULLET =
  /\s+-\s+(?=[\p{Lu}\p{Lt}](?:[\p{L}\p{M}\p{N}\s,.()%-]|[&"'«»‘’]){0,80}:)/gu;

/** Packed top-track rows: "(330 listens) - NEXT TITLE …" → one bullet per track. */
const TRACK_ROW_BREAK =
  /(\(\d+\s+(?:listens|écoutes|escuchas)\))\s+-\s+/gi;

/**
 * Summary sentence glued after the last "(N listens)" tail (easy to miss in UI).
 */
const TRAILING_SPAN_AFTER_TOP_TRACKS =
  /(\(\d+\s+(?:listens|écoutes|escuchas)\))\s+((?:Your listening history with|Your history with|Votre historique d['']écoute avec|Ton historique d['']écoute avec|Tu historial de escucha con)\b[\s\S]*?\.\s*)/gi;

/**
 * Lines that start a closing note after facts (no period before "Note that").
 * Keeps false positives low with word boundaries.
 */
const INLINE_NOTE = /([\w%)»"'])\s+(Note that\b|Nota que\b|Remarque\s*:|À noter que\b)/gi;

/**
 * LLMs often emit one line: "Intro: - a - b - c". Expand into real newlines + bullets.
 */
function unpackDenseInlineBullets(text: string): string {
  let s = text.replace(/\r\n/g, "\n");

  s = s.replace(TRACK_ROW_BREAK, "$1\n- ");
  s = s.replace(TRAILING_SPAN_AFTER_TOP_TRACKS, "$1\n\n$2");

  let prev = "";
  while (prev !== s) {
    prev = s;
    // "summary: - Total" → summary + blank line + bullet list
    s = s.replace(/:\s*-\s+/g, ":\n\n- ");
  }

  prev = "";
  for (let i = 0; i < 16 && prev !== s; i += 1) {
    prev = s;
    s = s.replace(LABEL_VALUE_BULLET, "\n- ");
  }

  s = s.replace(YEAR_SUB_BULLET, "\n- ");
  s = s.replace(INLINE_NOTE, "$1\n\n$2");

  // Trailing caveat introduced with " - Note that …" on same mega-line
  s = s.replace(
    /\s+-\s+(Note that\b|Nota que\b|Remarquez que\b|À noter que\b)/gi,
    "\n\n$2"
  );

  return s;
}

function stripBulletPrefix(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+\.)\s+/, "").trim();
}

function blockToSegments(block: string): AssistantChatBlock[] {
  const lines = block
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const isBullet = (line: string) => BULLET_LINE.test(line);
  const isOrdered = (line: string) => /^\s*\d+\.\s+/.test(line);

  const firstBulletIdx = lines.findIndex(isBullet);
  if (firstBulletIdx === -1) {
    return [{ type: "paragraph", text: lines.join("\n") }];
  }

  let runEnd = firstBulletIdx;
  while (runEnd < lines.length && isBullet(lines[runEnd])) {
    runEnd += 1;
  }

  const head = lines.slice(0, firstBulletIdx).join("\n").trim();
  const bulletLines = lines.slice(firstBulletIdx, runEnd);
  const tail = lines.slice(runEnd).join("\n").trim();

  if (bulletLines.length === 0) {
    return [{ type: "paragraph", text: lines.join("\n") }];
  }

  const ordered = bulletLines.every(isOrdered);
  const items = bulletLines.map(stripBulletPrefix);

  const out: AssistantChatBlock[] = [];
  if (head) {
    out.push({ type: "paragraph", text: head });
  }
  out.push(
    ordered
      ? { type: "orderedList", items }
      : { type: "bulletList", items }
  );
  if (tail) {
    out.push({ type: "paragraph", text: tail });
  }
  return out;
}

/**
 * Turns assistant plain-text replies into blocks for readable UI: paragraphs
 * (split on blank lines) and simple markdown-like bullet / numbered lists.
 * Also unpacks common "packed" model patterns ("Intro: - a - b" on one line).
 */
export function parseAssistantChatContent(raw: string): AssistantChatBlock[] {
  const expanded = unpackDenseInlineBullets(raw).trim();
  if (!expanded) return [];

  const blocks = expanded
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const segments: AssistantChatBlock[] = [];
  for (const block of blocks) {
    segments.push(...blockToSegments(block));
  }
  return segments;
}
