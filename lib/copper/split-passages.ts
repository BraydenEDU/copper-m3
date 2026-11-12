// Splits one page of a customer document into passages of a few sentences,
// small enough that each one is about a single thing. Each passage starts with
// its document title and page, so it still makes sense when it's found alone.

/** At most this many sentences per passage. */
export const SENTENCES_PER_PASSAGE = 3;
/** And at most about this many characters, for pages full of tables. */
export const MAX_PASSAGE_CHARS = 500;
/** A passage shorter than this joins the one before it on the same page. */
export const MIN_PASSAGE_CHARS = 100;

/**
 * Drops each page's running header: the company name or document title line,
 * the document number line ("CSL-..."), and the copyright line.
 */
export function cleanPage(raw: string, title: string): string {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines
    .filter((line, i) => {
      if (line.startsWith("CSL-") || line.startsWith("©")) return false;
      if (i === 0 && (line === "COPPER STATE LABS" || line.startsWith(title)))
        return false;
      return true;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits text into sentences, also breaking before each bullet point. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=["“(]?[A-Z0-9])|\s+(?=• )/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Cuts a run of text with no sentence breaks (a table) at word boundaries. */
function cutLong(text: string): string[] {
  if (text.length <= MAX_PASSAGE_CHARS) return [text];
  const pieces: string[] = [];
  let piece = "";
  for (const word of text.split(" ")) {
    if (piece && piece.length + word.length + 1 > MAX_PASSAGE_CHARS) {
      pieces.push(piece);
      piece = "";
    }
    piece = piece ? `${piece} ${word}` : word;
  }
  if (piece) pieces.push(piece);
  return pieces;
}

/** Groups a page's sentences into passage bodies of a few sentences each. */
export function groupSentences(text: string): string[] {
  const groups: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length) groups.push(current.join(" "));
    current = [];
  };
  for (const sentence of sentences(text).flatMap(cutLong)) {
    const length = current.join(" ").length + sentence.length + 1;
    if (
      current.length >= SENTENCES_PER_PASSAGE ||
      (current.length && length > MAX_PASSAGE_CHARS)
    )
      flush();
    current.push(sentence);
  }
  flush();
  // A short leftover (one stray sentence) joins the passage before it.
  return groups.reduce<string[]>((merged, group) => {
    const last = merged.at(-1);
    if (
      last &&
      group.length < MIN_PASSAGE_CHARS &&
      last.length + group.length < MAX_PASSAGE_CHARS + MIN_PASSAGE_CHARS
    )
      merged[merged.length - 1] = `${last} ${group}`;
    else merged.push(group);
    return merged;
  }, []);
}

/** The passage text: document title and page first, then the sentences. */
export function passageText(title: string, page: number, body: string) {
  return `${title}, page ${page}: ${body}`;
}
