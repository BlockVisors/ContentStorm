/**
 * Semantic chunker (Blueprint §5.1). Splits on paragraph boundaries, packs to a
 * target size with overlap so retrieval keeps local context, and falls back to
 * sentence splitting for paragraphs that exceed the hard cap.
 *
 * Sizing is character-based (~4 chars/token) to avoid a tokenizer dependency:
 * TARGET ~= 750 tokens, HARD_MAX ~= 1000 tokens. Swap in a real tokenizer here
 * if exact token budgets ever matter for the embedding model.
 */

const TARGET = 3000; // ~750 tokens
const OVERLAP = 400; // ~100 tokens of trailing context carried forward
const HARD_MAX = 4000; // ~1000 tokens

const SENTENCE_RE = /[^.!?]+[.!?]+(?:\s|$)|\S[^.!?]*$/g;

export function chunkText(input: string): string[] {
  const clean = input
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim());
    buf = "";
  };

  for (const para of paragraphs) {
    // Oversized paragraph: flush, then split it by sentence into its own chunks.
    if (para.length > HARD_MAX) {
      flush();
      const sentences = para.match(SENTENCE_RE) ?? [para];
      let sbuf = "";
      for (const s of sentences) {
        if ((sbuf + s).length > TARGET) {
          if (sbuf.trim()) chunks.push(sbuf.trim());
          sbuf = s;
        } else {
          sbuf += s;
        }
      }
      if (sbuf.trim()) chunks.push(sbuf.trim());
      continue;
    }

    const candidate = buf ? `${buf}\n\n${para}` : para;
    if (candidate.length > TARGET) {
      flush();
      const prevTail = chunks.length ? chunks[chunks.length - 1].slice(-OVERLAP) : "";
      buf = prevTail ? `${prevTail}\n\n${para}` : para;
    } else {
      buf = candidate;
    }
  }
  flush();

  return chunks;
}
