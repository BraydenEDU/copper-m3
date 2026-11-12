import type { EmbeddingModelId, ModelId } from "@/lib/ai/models";

// US dollars per million tokens: Google's list prices as of 2026-10.
// Billing may differ slightly; these are for cost estimates.
export const PRICING: Record<
  ModelId | EmbeddingModelId,
  { input: number; output: number }
> = {
  // Embeddings are priced on input only.
  "google/gemini-embedding-001": { input: 0.15, output: 0 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "google/gemini-3-flash": { input: 0.5, output: 3 },
  // Not checked against Google's price list: assume Gemini 3 Flash pricing.
  "google/gemini-3.5-flash": { input: 0.5, output: 3 },
  "google/gemini-3.8-flash": { input: 0.5, output: 3 },
};

export function costUsd(
  model: ModelId | EmbeddingModelId,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = PRICING[model];
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}
