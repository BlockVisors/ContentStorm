import { Worker, type Job } from "bullmq";
import { connection, QUEUE, driftScanQueue, defaultJobOptions, type DriftScanJobData } from "../lib/queue";
import { prisma } from "../lib/db";
import { runDriftScan } from "../lib/drift";

/**
 * Drift-scan worker — Drift Dashboard (V2-4, Sovereign only).
 *
 * Queued, not synchronous — a full cross-silo scan does O(notebooks²) work
 * with an LLM judgment call per topically-similar assertion pair, which for
 * an org with several departments' worth of documentation can run to dozens
 * of Claude calls. Nothing about that belongs in a request/response cycle.
 *
 * Triggered two ways, both landing here:
 *   - POST /api/drift/detect — on-demand, user-initiated
 *   - Daily cron (see scheduleDailyDriftScans below) — automatic sweep
 */

const worker = new Worker<DriftScanJobData>(
  QUEUE.DRIFT_SCAN,
  async (job: Job<DriftScanJobData>) => {
    const { orgId } = job.data;
    const result = await runDriftScan(orgId);
    return { orgId, ...result };
  },
  { connection, concurrency: 2 }
);

worker.on("failed", (job, err) => {
  console.error(`[drift-scan] job failed for org ${job?.data.orgId}:`, err?.message);
});

worker.on("completed", (_job, result) => {
  console.log(
    `[drift-scan] org ${result.orgId}: scanned ${result.scanned} notebooks, ` +
    `flagged ${result.flagged} risks, auto-remediated ${result.autoRemediated}`
  );
});

/**
 * Daily sweep — enqueues one scan job per Sovereign org. Call this from a
 * cron entrypoint (e.g. a Vercel Cron hitting a route that calls this, or a
 * standalone `node -e` invocation on a scheduler) — it is NOT wired to run
 * automatically just by this worker process starting up, since "daily" is a
 * scheduling concern that belongs to whatever's running cron, not to a
 * long-lived worker process.
 */
export async function scheduleDailyDriftScans(): Promise<number> {
  const sovereignOrgs = await prisma.organization.findMany({
    where:  { tier: "SOVEREIGN" },
    select: { id: true },
  });

  const queue = driftScanQueue();
  await Promise.all(
    sovereignOrgs.map((org) =>
      queue.add(
        `drift-scan-${org.id}-${new Date().toISOString().slice(0, 10)}`, // one per org per day — dedup key
        { orgId: org.id },
        defaultJobOptions
      )
    )
  );

  return sovereignOrgs.length;
}

console.log(`[worker] drift-scan worker online — queue "${QUEUE.DRIFT_SCAN}"`);
