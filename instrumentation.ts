// Runs once when a Next.js server starts, before it handles any request.
// Loads the embedded document passages into memory so the first question
// doesn't wait for them, and prints how many there are.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { PASSAGES, PASSAGES_MODEL } = await import("@/lib/copper/passages");
  const documents = new Set(PASSAGES.map((p) => p.documentId)).size;
  console.info(
    `[passages] Loaded ${PASSAGES.length} passages from ${documents} documents (${PASSAGES_MODEL})`,
  );
}
