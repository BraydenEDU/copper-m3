// Module 3: searches the customer documents by meaning. The question is
// embedded with the same model as the passages, then compared with every
// passage in memory (lib/copper/passages.ts); the closest ones come back with
// where they're from and a link that opens the PDF at that page.
import { callEmbed } from "@/lib/ai/call";
import { citationFor } from "@/lib/copper/citations";
import { DOCUMENTS } from "@/lib/copper/documents";
import { PASSAGES, type Passage } from "@/lib/copper/passages";

/** How many passages a search returns. */
export const SEARCH_RESULTS = 5;

export type DocMatch = {
  title: string;
  page: number;
  /** The passage, without the "Title, page N:" it starts with. */
  text: string;
  /** Opens the PDF at the passage's page, e.g. "/docs/copper-plus-faq.pdf#page=4". */
  url: string;
  /** How Copper cites it in a reply, e.g. "[Copper Plus FAQ, p. 4]". */
  cite: string;
  /** How close the passage is to the question, from 0 to 1. Higher is closer. */
  score: number;
};

export type DocSearch = { question: string; passages: DocMatch[] };

/** Both vectors are normalized, so this is their cosine similarity. */
function similarity(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** The PDF link for a page: browsers open a PDF at `#page=N`. */
export function pageUrl(passage: Pick<Passage, "documentId" | "page">) {
  const file = DOCUMENTS.find((d) => d.id === passage.documentId)?.file;
  return `${file}#page=${passage.page}`;
}

/** The closest passages to an already-embedded question. */
export function closestPassages(
  embedding: readonly number[],
  limit = SEARCH_RESULTS,
): DocMatch[] {
  return PASSAGES.map((passage) => ({
    passage,
    score: similarity(embedding, passage.embedding),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ passage, score }) => ({
      title: passage.title,
      page: passage.page,
      text: passage.text.slice(
        `${passage.title}, page ${passage.page}: `.length,
      ),
      url: pageUrl(passage),
      cite: citationFor(passage.title, passage.page),
      score: Math.round(score * 1000) / 1000,
    }));
}

/** search_docs: embeds the question and returns the 5 closest passages. */
export async function searchDocs(question: string): Promise<DocSearch> {
  const embedding = await callEmbed(
    { module: 3, feature: "search-docs" },
    question,
    "query",
  );
  return { question, passages: closestPassages(embedding) };
}
