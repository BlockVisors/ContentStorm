import OpenAI from "openai";

/**
 * Embedding layer. text-embedding-3-small returns 1536-dim vectors, matching
 * SourceChunk.embedding's declared dimension. Inputs are batched per call to
 * cut request overhead; the API caps batch size, so callers chunk to <= 96.
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIM = 1536;
export const MAX_BATCH = 96;

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length > MAX_BATCH) {
    throw new Error(`embedBatch received ${texts.length} > ${MAX_BATCH}`);
  }
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  // Sort by index to guarantee alignment with the input order.
  return res.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
