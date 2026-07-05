import { Queue, type JobsOptions } from "bullmq";
import IORedis from "ioredis";

/**
 * Shared queue harness (Blueprint §4, §8). One Redis connection per process
 * (singleton across dev hot-reloads), one Queue instance per name, and a single
 * source of truth for the resilience policy every job inherits.
 *
 * RECONSTRUCTION NOTE: the uploaded repo contained four near-duplicate copies
 * of this file (queue.ts, queue_copy.ts, queue_copy_2.ts, queue_copy_3.ts),
 * each missing a different later addition. This is the merged union of all
 * four — 10 queues total. ARBITRAGE_SCAN / arbitrageScanQueue /
 * ArbitrageScanJobData were absent from every uploaded variant despite
 * arbitrage-scan.worker.ts importing all three; reconstructed here from that
 * worker's actual usage (QUEUE.ARBITRAGE_SCAN, job.data.moduleId optional).
 */

const g = globalThis as unknown as { _csRedis?: IORedis };

// BullMQ requires maxRetriesPerRequest = null on the connection.
const rawRedisUrl = process.env.REDIS_URL;
const isPlaceholder = rawRedisUrl?.includes("HOST:PORT") || rawRedisUrl?.includes("PASSWORD");
const resolvedRedisUrl = isPlaceholder ? "redis://127.0.0.1:6379" : (rawRedisUrl ?? "redis://127.0.0.1:6379");

export const connection: any =
  g._csRedis ??
  new IORedis(resolvedRedisUrl, {
    maxRetriesPerRequest: null,
  });
if (process.env.NODE_ENV !== "production") g._csRedis = connection;

export const QUEUE = {
  INGEST: "ingest",
  PERSONA_SCAN: "persona-scan",
  CONTRADICTION_MAP: "contradiction-map",
  SYNTHESIS: "synthesis",
  IMAGE_GENERATION: "image-generation",
  RENDER: "render",
  CLIP_RENDER: "clip-render",
  MINT_CREDENTIAL: "mint-credential",
  DRIFT_SCAN: "drift-scan",
  ARBITRAGE_SCAN: "arbitrage-scan",
} as const;

// §8 resilience contract: 3 attempts, exponential backoff from 5s, clean up on
// success, keep failures for inspection.
export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false,
};

// ---- job payloads ----------------------------------------------------------

export type IngestSourceKind = "pdf" | "url" | "text";

export interface IngestSource {
  kind: IngestSourceKind;
  label: string; // human label + the sourceRef prefix for produced chunks
  s3Key?: string; // for kind === "pdf"
  url?: string; // for kind === "url"
  raw?: string; // for kind === "text"
}

export interface IngestJobData {
  notebookId: string;
  orgId: string;
  sources: IngestSource[];
}

// ---- queue registry --------------------------------------------------------

const queues = new Map<string, Queue>();

function getQueue<T>(name: string): Queue<T> {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: connection as any, defaultJobOptions });
    queues.set(name, q);
  }
  return q as Queue<T>;
}

export const ingestQueue = () => getQueue<IngestJobData>(QUEUE.INGEST);

// ---- Nexus payloads --------------------------------------------------------

export interface PersonaScanJobData {
  moduleId: string;
  notebookId: string;
  orgId: string;
  persona: "PRACTITIONER" | "ACADEMIC" | "SKEPTIC" | "ECONOMIST" | "HISTORIAN";
}

export interface ContradictionMapJobData {
  moduleId: string;
  orgId: string;
}

export interface SynthesisJobData {
  moduleId: string;
  orgId: string;
}

export const personaScanQueue  = () => getQueue<PersonaScanJobData>(QUEUE.PERSONA_SCAN);
export const contradictionQueue = () => getQueue<ContradictionMapJobData>(QUEUE.CONTRADICTION_MAP);
export const synthesisQueue     = () => getQueue<SynthesisJobData>(QUEUE.SYNTHESIS);

// ---- Crucible payloads -----------------------------------------------------

export interface ImageGenerationJobData {
  blockId:    string;
  moduleId:   string;
  orgId:      string;
  textContent: string;
  videoStyle: "AVATAR" | "WHITEBOARD" | "FACELESS";
  target:     "LMS_16_9" | "MOBILE_9_16" | "SQUARE_1_1";
}

export interface RenderJobData {
  moduleId: string;
  orgId:    string;
  target:   "LMS_16_9" | "MOBILE_9_16" | "SQUARE_1_1";
}

export const imageQueue  = () => getQueue<ImageGenerationJobData>(QUEUE.IMAGE_GENERATION);
export const renderQueue = () => getQueue<RenderJobData>(QUEUE.RENDER);

// ---- Arbitrage Clipper payloads (V2-10) ────────────────────────────────────

export interface ClipRenderJobData {
  clipAssetId: string;
  moduleId:    string;
  orgId:       string;
}

export const clipRenderQueue = () => getQueue<ClipRenderJobData>(QUEUE.CLIP_RENDER);

// ---- On-Chain Credentials payloads (V2-5) ──────────────────────────────────

export interface MintCredentialJobData {
  credentialId: string;
  sessionId:    string;
  orgId:        string;
}

export const mintCredentialQueue = () => getQueue<MintCredentialJobData>(QUEUE.MINT_CREDENTIAL);

// ---- Drift Dashboard payloads (V2-4) ───────────────────────────────────────

export interface DriftScanJobData {
  orgId: string;
}

export const driftScanQueue = () => getQueue<DriftScanJobData>(QUEUE.DRIFT_SCAN);

// ---- Curriculum Arbitrage payloads (V2-6) ──────────────────────────────────
// Reconstructed from arbitrage-scan.worker.ts's actual usage — see file header.

export interface ArbitrageScanJobData {
  moduleId?: string; // scan one module; omitted = scan every eligible module (cron sweep)
}

export const arbitrageScanQueue = () => getQueue<ArbitrageScanJobData>(QUEUE.ARBITRAGE_SCAN);
