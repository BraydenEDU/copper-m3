# Architecture

How the Copper State Labs app fits together. Each module adds a section at the
end (see [Adding a module](#adding-a-module)) when it changes how the app
works: new pages, tables or AI calls.

_Fictional — for educational use._

## The starter app (Module 0)

A Next.js app that builds, runs and deploys with **no environment variables**.
A Google AI Studio key is optional until a module needs one.

| Piece | Where | What it does |
|---|---|---|
| Pages | `app/` | `layout.tsx` sets the fonts and theme; `page.tsx` is the placeholder home page |
| Brand components | `components/copper/` | `Logo`, `SiteHeader`, `SiteFooter`, `ModeToggle` |
| UI kit | `components/ui/` (shadcn), `components/ai-elements/` (AI Elements) | The only UI libraries the app uses |
| Setup card | `components/setup-required.tsx` | `<SetupRequired service="ai" />`, shown instead of a page whose service isn't configured |
| Company catalog | `lib/copper/catalog.ts`, `lib/copper/data/catalog.json` | Product, plan and privacy facts from the Product Bible (Sections 3, 4, 8 and 10). Pages read prices and plan details from here instead of typing them (added in the Module 1 starter) |
| AI wrapper | `lib/ai/call.ts` | `callText` and `callObject`: every model call goes through these and is logged to the terminal |
| Models and prices | `lib/ai/models.ts`, `lib/ai/pricing.ts` | The approved Gemini models and their token prices |

## Data flow

1. A user opens a page in `app/`.
2. Server code checks what's configured (`isAiConfigured()`). If the key is
   missing, the page renders `<SetupRequired />` instead of crashing.
3. Data comes from files under `lib/copper/data/`.
4. AI requests go through `callText` / `callObject` in `lib/ai/call.ts`, which
   calls Google and then prints one `[ai_calls]` line: `module`, `feature`,
   `model`, tokens, `cost_usd`, `latency_ms`, `ok`.

```ts
const { text } = await callText(
  { module: 2, feature: "ask-copper" },
  { prompt },
);
```

## Two kinds of "AI tiers"

Don't mix these up:

- **Copper State Labs' product tiers** (On-device, Raw Ore, Refined, the
  Copper Cloud) are part of the fictional company. They are facts in the
  [Product Bible](copper-state-labs/product-bible.md) and rows in the `ai_tiers`
  table.
- **The models this app calls** are real Claude models listed in
  `lib/ai/models.ts`. Their cost is logged in `ai_calls`.

## Decisions

- **No environment variables required.** Every service is optional, so a fresh
  clone builds and deploys before any accounts are set up.
- **One AI wrapper.** Routing every call through `lib/ai/call.ts` gives one
  place to log cost and latency per module and feature.
- **No authentication or row-level security yet.** They arrive in a later
  module.

## Adding a module

When a module changes how the app fits together, add a section here:

```md
## Module N: <feature name>

**Summary:** one or two sentences: what this adds and why.

| Piece | Where | What it does |
|---|---|---|
| Page / route | `app/...` | |
| Components | `components/...` | |
| Data | `lib/copper/data/...` | Data files added |
| AI calls | `lib/ai/call.ts` (module, feature) | Model, prompt purpose, expected cost per call |

**Data flow:** user action → page → server code → database / model → response.

**Decisions and trade-offs:** what you chose, the alternatives, and why.

**Risks and open questions:** cost, privacy, accuracy or safety risks, and how
you handle them.
```

## Module 3 starter: Ask Copper

**Summary:** Ask Copper, the Module 2 shopping chatbot, finished: a floating
chat panel that answers prices, totals and stock with four tools and shows
each step. Module 3 teaches it to answer from the customer documents.

| Piece | Where | What it does |
|---|---|---|
| Component | `components/copper/ask-copper.tsx` | The launcher and chat panel, mounted from `app/page.tsx` and opened by the header's `#ask` link. Draws each answer as stations: the tools on offer, thinking, each tool call, then the reply |
| Server Action | `lib/copper/assistant/ask.ts` | `askCopper()`: streams the conversation with `callStream`, up to 5 steps, and sends each step back as a live `Progress` |
| Tools | `lib/copper/assistant/tools.ts` | `copperTools`: `get_products`, `get_prices`, `calculate_cost`, `check_availability` |
| Instructions | `lib/copper/assistant/instructions.ts` | `COPPER_INSTRUCTIONS`. Copper says it can't help yet with warranty, setup, troubleshooting or privacy |
| Data | `lib/copper/inventory.ts`, `lib/copper/documents.ts` | Stock from `lib/copper/data/inventory.json`; `DOCUMENTS`: the four customer documents and their PDF paths under `public/docs/`. The PDFs are added in class |
| AI calls | `{ module: 2, feature: "ask-copper" }` | One streamed call per question |

## Module 3: Document passages and embeddings

**Summary:** The four customer PDFs are split into passages of a few sentences
and embedded with Gemini ahead of time, so Ask Copper can later find the
passages that answer a question by meaning, and cite the page they came from.

| Piece | Where | What it does |
|---|---|---|
| PDFs | `public/docs/` | The four customer documents listed in `DOCUMENTS`, served at their `file` paths |
| Splitter | `lib/copper/split-passages.ts` | Drops each page's running header, breaks the text into sentences, and groups them 3 at a time (at most about 500 characters). Each passage's text starts with "*Title*, page *N*:" |
| Build script | `scripts/build-passages.mts` (`npm run passages`) | Reads every PDF page with `unpdf`, splits it, embeds every passage and writes `lib/copper/data/passages.json`. Sends 80 passages a minute to stay under Google's free-tier limit of 100 |
| Data | `lib/copper/data/passages.json` | 117 passages: `id`, `documentId`, `title`, `page`, `text` and a 768-number `embedding` (about 0.9 MB). Generated, so Prettier skips it |
| Loader | `lib/copper/passages.ts`, `instrumentation.ts` | `PASSAGES` imports the JSON once; `instrumentation.ts` loads it when the server starts and prints `[passages] Loaded …` |
| AI calls | `lib/ai/call.ts` `callEmbedMany` / `callEmbed` | `gemini-embedding-001` at 768 dimensions, vectors normalized to length 1. `{ module: 3, feature: "embed-passages" }` runs only from the build script; well under a cent for all passages |

**Data flow:** `npm run passages` → PDFs → pages → passages → Gemini
embeddings → `passages.json` → loaded into memory at server start.

**Decisions and trade-offs:** Embeddings are made once, offline, and shipped as
a JSON file instead of a vector database: 117 passages fit easily in memory and
search needs no extra service. 768 dimensions instead of 3072 keeps the file
small with little loss in search quality. Passages are embedded as
`RETRIEVAL_DOCUMENT`; questions should be embedded as `RETRIEVAL_QUERY` with
the same model.

**Risks and open questions:** If a PDF changes, run `npm run passages` again or
answers will cite stale text. Google doesn't report token counts for
embeddings, so their `ai_calls` rows have no cost.
