import { Worker, type Job } from "bullmq";
import { connection, QUEUE, type MintCredentialJobData } from "../lib/queue";
import { prisma } from "../lib/db";
import { mintCredential } from "../lib/onchain";

/**
 * Mint-credential worker — On-Chain Credentials (V2-5).
 *
 * Minting is queued, not synchronous — a real blockchain transaction takes
 * several seconds to confirm and can fail for reasons entirely outside the
 * app (RPC hiccup, gas spike, network congestion), which is exactly the
 * shape of work BullMQ's retry/backoff policy (src/lib/queue.ts's
 * defaultJobOptions — 3 attempts, exponential backoff) exists for. A
 * synchronous request handler holding a connection open for a Base or
 * Polygon confirmation would be a bad idea regardless of how fast EAS itself
 * is.
 *
 * Network fallback (Base → Polygon) happens inside src/lib/onchain.ts's
 * mintCredential() — this worker just calls it once and records whichever
 * network actually succeeded.
 */

const worker = new Worker<MintCredentialJobData>(
  QUEUE.MINT_CREDENTIAL,
  async (job: Job<MintCredentialJobData>) => {
    const { credentialId, sessionId } = job.data;

    // ── 1. Mark PROCESSING ────────────────────────────────────────────────
    await prisma.onChainCredential.update({
      where: { id: credentialId },
      data:  { status: "PROCESSING" },
    });

    // ── 2. Fetch the session's canonical SRS + learner identity ────────────
    const session = await prisma.assessmentSession.findUniqueOrThrow({
      where:  { id: sessionId },
      select: {
        moduleId: true,
        learnerInternalId: true,
        learnerExternalId: true,
        srsScore: true,
        skepticDeflection: true,
        sourceGrounding: true,
        biasEquilibrium: true,
      },
    });

    if (session.srsScore === null) {
      throw new Error(`Session ${sessionId} has no canonical SRS score — cannot mint a legacy-scored session.`);
    }

    const learnerId = session.learnerInternalId ?? session.learnerExternalId ?? "anonymous";

    // ── 3. Mint (Base primary, Polygon fallback — inside mintCredential) ───
    const result = await mintCredential({
      sessionId,
      learnerId,
      moduleAnchor:      `CS-MOD-${session.moduleId}`,
      srsScore:          session.srsScore,
      skepticDeflection: session.skepticDeflection ?? 0,
      sourceGrounding:   session.sourceGrounding ?? 0,
      biasEquilibrium:   session.biasEquilibrium ?? 0,
    });

    // ── 4. Mark MINTED ───────────────────────────────────────────────────
    await prisma.onChainCredential.update({
      where: { id: credentialId },
      data: {
        status:               "MINTED",
        network:              result.network,
        txHash:                result.txHash,
        attestationUID:        result.attestationUID,
        userVerificationHash:  result.verificationHash,
        mintedAt:              new Date(),
      },
    });

    return { credentialId, network: result.network, attestationUID: result.attestationUID };
  },
  { connection, concurrency: 1 } // one at a time — nonce ordering on a single signer wallet, avoid racing transactions
);

worker.on("failed", async (job, err) => {
  console.error(`[mint-credential] job failed for credential ${job?.data.credentialId}:`, err?.message);
  if (job) {
    await prisma.onChainCredential
      .update({
        where: { id: job.data.credentialId },
        data:  { status: "FAILED", failureReason: err?.message ?? "Unknown error" },
      })
      .catch(() => {});
  }
});

worker.on("completed", (_job, result) => {
  console.log(`[mint-credential] minted credential ${result.credentialId} on ${result.network}: ${result.attestationUID}`);
});

console.log(`[worker] mint-credential worker online — queue "${QUEUE.MINT_CREDENTIAL}"`);
