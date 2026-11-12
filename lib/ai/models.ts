// The course's approved models. Calls go straight to Google with a Google AI
// Studio key, which is free and needs no credit card.
export const MODELS = [
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash (fast, shows its thinking)",
    // Google's own name for it, used when calling Google.
    googleId: "gemini-2.5-flash",
  },
  {
    id: "google/gemini-3-flash",
    label: "Gemini 3 Flash (newer, thinks out loud less often)",
    googleId: "gemini-3-flash-preview",
  },
  {
    id: "google/gemini-3.5-flash-lite",
    label:
      "Gemini 3.5 Flash-Lite (fast; a fallback when the free daily limit runs out)",
    googleId: "gemini-3.5-flash-lite",
  },
  {
    id: "google/gemini-3.8-flash",
    label: "Gemini 3.8 Flash (newest, open to new AI Studio keys)",
    googleId: "gemini-3.8-flash",
  },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

/**
 * The model that turns text into an embedding: a list of numbers that places
 * text with a similar meaning close together, so passages can be searched by
 * meaning instead of exact words.
 */
export const EMBEDDING_MODEL = {
  id: "google/gemini-embedding-001",
  googleId: "gemini-embedding-001",
  /** Shorter than the 3072-number default: a smaller file, nearly the same search quality. */
  dimensions: 768,
} as const;

export type EmbeddingModelId = (typeof EMBEDDING_MODEL)["id"];

/**
 * The model used when a call doesn't name one. Google no longer opens
 * gemini-2.5-flash to new AI Studio keys, so new keys default to 3.8 Flash.
 * Set AI_MODEL to pick another approved model.
 */
export const DEFAULT_MODEL: ModelId = "google/gemini-3.8-flash";

/** AI_MODEL if it names an approved model, otherwise the default. */
export function defaultModel(): ModelId {
  const id = process.env.AI_MODEL;
  return MODELS.find((m) => m.id === id)?.id ?? DEFAULT_MODEL;
}
