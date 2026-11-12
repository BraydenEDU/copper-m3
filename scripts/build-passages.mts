// npm run passages: reads every PDF in DOCUMENTS from public/docs/, splits
// each page into passages of a few sentences, embeds them all with Gemini, and
// writes lib/copper/data/passages.json, which the app loads when it starts.
// Run it again whenever a PDF changes. It reads the key from .env.local.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import { callEmbedMany } from "@/lib/ai/call";
import { EMBEDDING_MODEL } from "@/lib/ai/models";
import { DOCUMENTS } from "@/lib/copper/documents";
import type { Passage, PassagesFile } from "@/lib/copper/passages";
import {
  cleanPage,
  groupSentences,
  passageText,
} from "@/lib/copper/split-passages";

const OUT = join(process.cwd(), "lib/copper/data/passages.json");

type Draft = Omit<Passage, "embedding">;

async function readPages(file: string): Promise<string[]> {
  const bytes = await readFile(join(process.cwd(), "public", file));
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return text;
}

const drafts: Draft[] = [];
const counts: { title: string; pages: number; passages: number }[] = [];

for (const doc of DOCUMENTS) {
  const pages = await readPages(doc.file);
  let made = 0;
  pages.forEach((raw, i) => {
    const page = i + 1;
    groupSentences(cleanPage(raw, doc.title)).forEach((body, n) => {
      drafts.push({
        id: `${doc.id}-p${page}-${n + 1}`,
        documentId: doc.id,
        title: doc.title,
        page,
        text: passageText(doc.title, page, body),
      });
      made++;
    });
  });
  counts.push({ title: doc.title, pages: pages.length, passages: made });
}

// Google's free tier embeds at most 100 texts a minute, so send them in
// batches and wait a minute between batches.
const BATCH = 80;
const embeddings: number[][] = [];
for (let start = 0; start < drafts.length; start += BATCH) {
  if (start > 0) {
    console.log("Waiting a minute for Google's free-tier limit...");
    await new Promise((resolve) => setTimeout(resolve, 61_000));
  }
  const batch = drafts.slice(start, start + BATCH);
  embeddings.push(
    ...(await callEmbedMany(
      { module: 3, feature: "embed-passages" },
      batch.map((d) => d.text),
      "document",
    )),
  );
  console.log(`Embedded ${embeddings.length} of ${drafts.length} passages`);
}

// Six decimal places is plenty for search and keeps the file small.
const round = (x: number) => Math.round(x * 1e6) / 1e6;

const out: PassagesFile = {
  model: EMBEDDING_MODEL.id,
  dimensions: EMBEDDING_MODEL.dimensions,
  createdAt: new Date().toISOString(),
  passages: drafts.map((d, i) => ({
    ...d,
    embedding: embeddings[i].map(round),
  })),
};
await writeFile(OUT, JSON.stringify(out) + "\n");

console.table(counts);
console.log(
  `Wrote ${out.passages.length} passages (${out.dimensions} numbers each) to lib/copper/data/passages.json`,
);
