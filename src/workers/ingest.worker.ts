import { Worker, type Job } from "bullmq";
import { connection, QUEUE, type IngestJobData } from "../lib/queue";
import { prisma } from "../lib/db";
import { extractText } from "../lib/extract";
import { chunkText } from "../lib/chunking";
import { embedBatch, MAX_BATCH } from "../lib/embeddings";
import { setChunkEmbedding } from "../lib/vector";

/**
 * The Vault ingest worker (Blueprint §5.1, §8). Run as its own process:
 *   npm run worker:ingest
 *
 * Idempotency: each source clears its previously-produced chunks before
 * re-inserting, so a BullMQ retry overwrites rather than duplicates. The job is
 * keyed `ingest-<notebookId>`, so a notebook can only have one ingest in flight.
 */

async function processSource(
  notebookId: string,
  source: IngestJobData["sources"][number]
): Promise<number> {
  const text = await extractText(source);
  const sourceRef = source.label;

  // Idempotent overwrite: drop any chunks this source produced on a prior run.
  await prisma.sourceChunk.deleteMany({
    where: { notebookId, sourceRef: { startsWith: `${sourceRef}#` } },
  });

  const chunks = chunkText(text);
  if (chunks.length === 0) return 0;

  let stored = 0;
  for (let i = 0; i < chunks.length; i += MAX_BATCH) {
    const slice = chunks.slice(i, i + MAX_BATCH);
    const embeddings = await embedBatch(slice);
    for (let j = 0; j < slice.length; j++) {
      const row = await prisma.sourceChunk.create({
        data: {
          notebookId,
          content: slice[j],
          sourceRef: `${sourceRef}#${i + j}`,
        },
      });
      await setChunkEmbedding(row.id, embeddings[j]);
      stored++;
    }
  }
  return stored;
}

const worker = new Worker<IngestJobData>(
  QUEUE.INGEST,
  async (job: Job<IngestJobData>) => {
    const { notebookId, sources } = job.data;

    await prisma.notebook.update({
      where: { id: notebookId },
      data: { vectorStatus: "PROCESSING" },
    });

    let total = 0;
    for (const source of sources) {
      total += await processSource(notebookId, source);
      await job.updateProgress(
        Math.round(((sources.indexOf(source) + 1) / sources.length) * 100)
      );
    }

    await prisma.notebook.update({
      where: { id: notebookId },
      data: { vectorStatus: "COMPLETED" },
    });

    return { chunks: total };
  },
  { connection, concurrency: 3 }
);

// Only flip to FAILED once retries are exhausted; mid-retry it stays PROCESSING.
worker.on("failed", async (job, err) => {
  console.error(`ingest job ${job?.id} failed:`, err?.message);
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await prisma.notebook
      .update({
        where: { id: job.data.notebookId },
        data: { vectorStatus: "FAILED" },
      })
      .catch(() => {});
  }
});

worker.on("completed", (job, result) => {
  console.log(`ingest job ${job.id} completed:`, result);
});

console.log(`[worker] ingest worker online — queue "${QUEUE.INGEST}"`);
