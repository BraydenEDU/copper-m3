// Copper cites the customer documents like [Copper Home User Guide, p. 9].
// This finds those citations in a reply so the chat panel can turn each one
// into a link that opens the PDF at that page. Plain data, so the client
// component can import it.
import { DOCUMENTS } from "@/lib/copper/documents";

export type ReplyPart =
  | { type: "text"; text: string }
  | { type: "cite"; text: string; title: string; page: number; url: string };

/** How a passage is cited: "[Copper Home User Guide, p. 9]". */
export function citationFor(title: string, page: number) {
  return `[${title}, p. ${page}]`;
}

/** The link for a citation, or null when the title isn't one of our documents. */
export function citationUrl(title: string, page: number): string | null {
  const doc = DOCUMENTS.find(
    (d) => d.title.toLowerCase() === title.trim().toLowerCase(),
  );
  return doc && page > 0 ? `${doc.file}#page=${page}` : null;
}

// "[Title, p. 9]", also accepting "p 9", "p.9" and "page 9".
const CITATION = /\[([^[\]]+?),\s*(?:p\.?|page)\s*(\d+)\]/gi;

/** Splits a reply into plain text and linked citations. */
export function splitCitations(reply: string): ReplyPart[] {
  const parts: ReplyPart[] = [];
  let last = 0;
  for (const match of reply.matchAll(CITATION)) {
    const [text, title, pageText] = match;
    const page = Number(pageText);
    const url = citationUrl(title, page);
    if (!url) continue;
    if (match.index > last)
      parts.push({ type: "text", text: reply.slice(last, match.index) });
    parts.push({ type: "cite", text, title: title.trim(), page, url });
    last = match.index + text.length;
  }
  if (last < reply.length)
    parts.push({ type: "text", text: reply.slice(last) });
  return parts;
}
