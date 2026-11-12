// @vitest-environment node
import { describe, expect, it } from "vitest";
import { EMBEDDING_MODEL } from "@/lib/ai/models";
import { DOCUMENTS } from "@/lib/copper/documents";
import { PASSAGES, PASSAGES_MODEL } from "@/lib/copper/passages";
import {
  cleanPage,
  groupSentences,
  MAX_PASSAGE_CHARS,
  passageText,
  SENTENCES_PER_PASSAGE,
  sentences,
} from "@/lib/copper/split-passages";

describe("splitting a page into passages", () => {
  const page = [
    "Copper Home User Guide Set up Copper Home",
    "CSL-UG-0101-EN Rev. C 3",
    "© 2026 Copper State Labs, Inc. · Fictional company and documents, for educational use only.",
    "2 Set up Copper Home",
    "Plug in Copper Home. Open the Copper app. Tap Add Device.",
    "Pick your Wi-Fi network. Name the room.",
  ].join("\n");

  it("drops the running header, document number and copyright line", () => {
    const text = cleanPage(page, "Copper Home User Guide");
    expect(text).toMatch(/^2 Set up Copper Home Plug in/);
    expect(text).not.toContain("CSL-");
    expect(text).not.toContain("©");
  });

  it("breaks text into sentences and before bullet points", () => {
    expect(sentences("One here. Two here! • A bullet • Another")).toEqual([
      "One here.",
      "Two here!",
      "• A bullet",
      "• Another",
    ]);
  });

  it("groups a few sentences per passage", () => {
    const long = Array.from(
      { length: 6 },
      (_, i) =>
        `Sentence ${i + 1} explains one step of setting up Copper Home in enough words to count.`,
    ).join(" ");
    const groups = groupSentences(long);
    expect(groups).toHaveLength(2);
    for (const group of groups)
      expect(sentences(group)).toHaveLength(SENTENCES_PER_PASSAGE);
  });

  it("joins a short leftover onto the passage before it", () => {
    const groups = groupSentences(cleanPage(page, "Copper Home User Guide"));
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatch(/Name the room\.$/);
  });

  it("cuts long tables at word boundaries", () => {
    const table = Array.from({ length: 300 }, (_, i) => `cell${i}`).join(" ");
    for (const group of groupSentences(table))
      expect(group.length).toBeLessThanOrEqual(MAX_PASSAGE_CHARS);
  });

  it("starts the passage text with the document title and page", () => {
    expect(passageText("Copper Plus FAQ", 4, "Q How much can I record?")).toBe(
      "Copper Plus FAQ, page 4: Q How much can I record?",
    );
  });
});

describe("the embedded passages file", () => {
  it("has passages from every customer document", () => {
    for (const doc of DOCUMENTS)
      expect(PASSAGES.some((p) => p.documentId === doc.id)).toBe(true);
  });

  it("keeps the title and page with each passage, and starts its text with them", () => {
    for (const p of PASSAGES) {
      expect(p.page).toBeGreaterThan(0);
      expect(p.text.startsWith(`${p.title}, page ${p.page}: `)).toBe(true);
    }
  });

  it("embeds every passage with the app's embedding model", () => {
    expect(PASSAGES_MODEL).toBe(EMBEDDING_MODEL.id);
    for (const p of PASSAGES) {
      expect(p.embedding).toHaveLength(EMBEDDING_MODEL.dimensions);
      expect(Math.hypot(...p.embedding)).toBeCloseTo(1, 3);
    }
  });
});
