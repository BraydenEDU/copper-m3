// The customer documents, split into passages and embedded ahead of time by
// `npm run passages`. The JSON file is imported once, so every passage and its
// embedding is in memory from the moment the server starts: searching them
// needs no database and no extra request.
import data from "./data/passages.json";

/** One passage: a few sentences from one page of one document. */
export type Passage = {
  /** Stable id, e.g. "copper-home-user-guide-p3-2". */
  id: string;
  /** Matches an `id` in DOCUMENTS (lib/copper/documents.ts). */
  documentId: string;
  /** The document's title, e.g. "Copper Home User Guide". */
  title: string;
  /** The PDF page the passage came from, starting at 1. */
  page: number;
  /** Starts with the title and page: "Copper Home User Guide, page 3: ...". */
  text: string;
  /** Gemini embedding of `text`, normalized to length 1. */
  embedding: number[];
};

export type PassagesFile = {
  /** The embedding model that made every embedding in the file. */
  model: string;
  dimensions: number;
  createdAt: string;
  passages: Passage[];
};

const file = data as PassagesFile;

/** Every passage from every customer document, loaded when the app starts. */
export const PASSAGES: readonly Passage[] = file.passages;

/** The embedding model the passages were made with; questions must use it too. */
export const PASSAGES_MODEL = file.model;
