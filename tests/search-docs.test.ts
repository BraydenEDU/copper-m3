// @vitest-environment node
import { describe, expect, it } from "vitest";
import { copperTools } from "@/lib/copper/assistant/tools";
import { TOOL_LABELS } from "@/lib/copper/assistant/progress";
import { COPPER_INSTRUCTIONS } from "@/lib/copper/assistant/instructions";
import { splitCitations } from "@/lib/copper/citations";
import { PASSAGES } from "@/lib/copper/passages";
import {
  closestPassages,
  pageUrl,
  SEARCH_RESULTS,
} from "@/lib/copper/search-docs";

describe("search_docs", () => {
  it("is one of Copper's tools, with a label for the panel", () => {
    expect(copperTools.search_docs.description).toMatch(/troubleshooting/);
    expect(TOOL_LABELS.search_docs).toBeDefined();
  });

  it("is what Copper's instructions send setup, warranty and policy questions to", () => {
    expect(COPPER_INSTRUCTIONS).toContain("search_docs");
    expect(COPPER_INSTRUCTIONS).not.toMatch(/can't help with that yet/);
  });

  it("returns the 5 closest passages, closest first, with title, page and a PDF link", () => {
    const target = PASSAGES.find(
      (p) => p.documentId === "copper-plus-faq" && p.page === 4,
    )!;
    const matches = closestPassages(target.embedding);
    expect(matches).toHaveLength(SEARCH_RESULTS);
    expect(matches[0]).toMatchObject({
      title: "Copper Plus FAQ",
      page: 4,
      url: "/docs/copper-plus-faq.pdf#page=4",
    });
    expect(matches[0].score).toBeCloseTo(1, 2);
    expect(target.text.endsWith(matches[0].text)).toBe(true);
    expect(matches[0].text.startsWith("Copper Plus FAQ")).toBe(false);
    for (let i = 1; i < matches.length; i++)
      expect(matches[i].score).toBeLessThanOrEqual(matches[i - 1].score);
  });

  it("links each passage to its own PDF and page", () => {
    expect(pageUrl({ documentId: "copper-home-user-guide", page: 9 })).toBe(
      "/docs/copper-home-user-guide.pdf#page=9",
    );
  });
});

describe("citations in Copper's replies", () => {
  it("gives each passage a citation Copper can copy", () => {
    const target = PASSAGES.find(
      (p) => p.documentId === "copper-home-user-guide" && p.page === 9,
    )!;
    expect(closestPassages(target.embedding)[0].cite).toBe(
      "[Copper Home User Guide, p. 9]",
    );
  });

  it("turns each citation into a link to that page", () => {
    const parts = splitCitations(
      "Unplug it for 30 seconds [Copper Home User Guide, p. 9]. Refunds are prorated [Copper Plus FAQ, page 5].",
    );
    expect(parts.filter((p) => p.type === "cite")).toEqual([
      expect.objectContaining({
        title: "Copper Home User Guide",
        page: 9,
        url: "/docs/copper-home-user-guide.pdf#page=9",
      }),
      expect.objectContaining({
        title: "Copper Plus FAQ",
        page: 5,
        url: "/docs/copper-plus-faq.pdf#page=5",
      }),
    ]);
    expect(parts.map((p) => p.text).join("")).toContain(
      "Unplug it for 30 seconds",
    );
  });

  it("leaves brackets that aren't one of our documents as plain text", () => {
    expect(splitCitations("See [Some Other Manual, p. 3].")).toEqual([
      { type: "text", text: "See [Some Other Manual, p. 3]." },
    ]);
  });

  it("tells Copper to cite every sentence and never guess", () => {
    expect(COPPER_INSTRUCTIONS).toContain(
      "I couldn't find that in our support docs",
    );
    expect(COPPER_INSTRUCTIONS).toMatch(/Every sentence/);
    expect(COPPER_INSTRUCTIONS).toMatch(/Never guess/);
  });
});
