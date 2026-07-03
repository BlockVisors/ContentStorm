import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * pgvector access layer (Blueprint §6 caveat, §5.1).
 *
 * Prisma's tagged-template $executeRaw / $queryRaw send each interpolated value
 * as a bound parameter ($1, $2 …). PostgreSQL cannot apply `::vector` to a
 * bound parameter — the cast must live inside the SQL string itself.
 *
 * Pattern: build the SQL string with Prisma.sql, inject the vector literal
 * using Prisma.raw (which splices into the SQL verbatim, not as a parameter).
 * The chunkId / notebookId / k values remain as safe bound parameters so only
 * the pre-validated vector literal is spliced raw.
 *
 * Embeddings are 1536-dim (text-embedding-3-small), matching the column
 * declaration `vector(1536)`.
 */

const EXPECTED_DIM = 1536;

/**
 * Validates dimension and returns the pgvector text literal `[x,y,...]`.
 * This string is spliced directly into SQL via Prisma.raw — never
 * user-supplied, always produced from the OpenAI API response.
 */
function toVectorLiteral(embedding: number[]): string {
  if (embedding.length !== EXPECTED_DIM) {
    throw new Error(
      `Embedding dimension mismatch: got ${embedding.length}, expected ${EXPECTED_DIM}`
    );
  }
  return `[${embedding.join(",")}]`;
}

/** Persist a chunk's embedding. The row must already exist (created by Prisma). */
export async function setChunkEmbedding(
  chunkId: string,
  embedding: number[]
): Promise<void> {
  const vecLiteral = Prisma.raw(`'${toVectorLiteral(embedding)}'::vector`);
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SourceChunk"
    SET    embedding = ${vecLiteral}
    WHERE  id        = ${chunkId}
  `);
}

export interface MatchedChunk {
  id: string;
  content: string;
  sourceRef: string;
  distance: number; // cosine distance — lower is closer
}

/**
 * RAG retrieval: the k nearest chunks to queryEmbedding within one notebook.
 * Notebook-scoped so a persona only ever grounds claims in its own sources.
 */
export async function matchChunks(
  notebookId: string,
  queryEmbedding: number[],
  k = 8
): Promise<MatchedChunk[]> {
  const vecLiteral = Prisma.raw(`'${toVectorLiteral(queryEmbedding)}'::vector`);
  return prisma.$queryRaw<MatchedChunk[]>(Prisma.sql`
    SELECT
      id,
      content,
      "sourceRef",
      (embedding <=> ${vecLiteral}) AS distance
    FROM  "SourceChunk"
    WHERE "notebookId" = ${notebookId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vecLiteral}
    LIMIT ${k}
  `);
}

/**
 * Source Grounding Anchor (S_GA) — Blueprint §3 (Canonical SRS, D1) /
 * SRS-3_and_math.md §II.
 *
 * Deliberately NOT LLM-judged. Patent Claim 2 specifically claims source
 * grounding as a vector-similarity computation — so this is the one SRS
 * sub-score Claude never touches, never sees, and cannot fudge. Cosine
 * *distance* (pgvector's `<=>`) is converted to cosine *similarity*
 * (1 − distance) and clamped to [0, 1] before returning, since a defense
 * that's nearly orthogonal to every source chunk should floor at 0, not go
 * negative and silently drag the weighted sum below what the UI expects.
 *
 * Uses the single nearest chunk (k=1): S_GA asks "is this specific claim
 * anchored in *some* real source passage," not an average over the whole
 * notebook — averaging across k>1 would reward a defense that's vaguely
 * on-topic everywhere over one that's precisely grounded in one passage.
 */
export async function scoreSourceGroundingSimilarity(
  notebookId: string,
  defenseEmbedding: number[]
): Promise<number> {
  const [nearest] = await matchChunks(notebookId, defenseEmbedding, 1);
  if (!nearest) return 0; // no embedded chunks yet — nothing to ground against
  const similarity = 1 - nearest.distance;
  return Math.max(0, Math.min(1, similarity));
}
