import { Worker, type Job } from "bullmq";
import { connection, QUEUE, arbitrageScanQueue, defaultJobOptions, type ArbitrageScanJobData } from "../lib/queue";
import { scanModuleForArbitrage, scanAllEligibleModules } from "../lib/arbitrage";

/**
 * Arbitrage-scan worker — Curriculum Arbitrage Engine (V2-6).
 *
 * Queued, not synchronous — each scan makes a batch of external API calls
 * (GitHub, arXiv, Federal Register, PatentsView), an embedding call, and a
 * Claude judgment call per topically-matched candidate. None of that belongs
 * in a request/response cycle, same reasoning as drift-scan.worker.ts.
 *
 * Two modes, both landing on this one worker:
 *   - job.data.moduleId set   → scan that one module (on-demand, from
 *     POST /api/arbitrage/[moduleId]/scan)
 *   - job.data.moduleId unset → sweep every module belonging to an org with
 *     hasArbitrageAddon enabled (the SCRAPER_INTERVAL_HOURS cron sweep)
 */

const worker = new Worker<ArbitrageScanJobData>(
  QUEUE.ARBITRAGE_SCAN,
  async (job: Job<ArbitrageScanJobData>) => {
    if (job.data.moduleId) {
      const result = await scanModuleForArbitrage(job.data.moduleId);
      return { moduleId: job.data.moduleId, ...result };
    }
    const result = await scanAllEligibleModules();
    return result;
  },
  { connection, concurrency: 1 } // sequential — external API rate limits (GitHub especially) don't tolerate parallel sweeps well
);

worker.on("failed", (job, err) => {
  console.error(`[arbitrage-scan] job failed (moduleId=${job?.data.moduleId ?? "sweep"}):`, err?.message);
});

worker.on("completed", (job, result) => {
  console.log(`[arbitrage-scan] completed (moduleId=${job.data.moduleId ?? "sweep"}):`, result);
});

/**
 * Cron sweep entrypoint — call from whatever's running scheduling
 * (SCRAPER_INTERVAL_HOURS, default 6h per the env var this project already
 * documents for this feature). Same pattern as drift-scan.worker.ts's
 * scheduleDailyDriftScans: this worker process doesn't self-schedule, a
 * cron caller does.
 */
export async function scheduleArbitrageSweep(): Promise<void> {
  await arbitrageScanQueue().add(
    `arbitrage-sweep-${new Date().toISOString()}`,
    {},
    defaultJobOptions
  );
}

console.log(`[worker] arbitrage-scan worker online — queue "${QUEUE.ARBITRAGE_SCAN}"`);
