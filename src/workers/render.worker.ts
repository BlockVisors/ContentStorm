import { Worker, type Job } from "bullmq";
import { connection, QUEUE, type RenderJobData } from "../lib/queue";
import { prisma } from "../lib/db";
import { buildStemsZip } from "../lib/stems";
import type { AwsRegion } from "@remotion/lambda/client";

/**
 * Render worker (Blueprint §8, §10).
 *
 * Full lifecycle:
 *   1. Upsert RenderJob (PROCESSING).
 *   2. Fetch blocks + watermark flag.
 *   3. renderMediaOnLambda → poll progress → write progress to DB.
 *   4. buildStemsZip (post-render) → rawAssetsArchive URL.
 *   5. Mark RenderJob COMPLETED.
 *
 * Lambda env vars required:
 *   REMOTION_AWS_REGION          — Lambda region (defaults to AWS_REGION)
 *   REMOTION_LAMBDA_FUNCTION     — deployed function name
 *   REMOTION_SERVE_URL           — deployed site serve URL
 *   S3_BUCKET                    — output bucket (shared with asset storage)
 *
 * Deploy the Lambda function and site before running in production:
 *   cd remotion && npm run lambda:deploy
 */

// See clip-render.worker.ts for why this cast is correct (env vars are
// plain strings; renderMediaOnLambda expects Remotion's literal AwsRegion).
const REMOTION_REGION   = (process.env.REMOTION_AWS_REGION   ?? process.env.AWS_REGION   ?? "us-east-1") as AwsRegion;
const LAMBDA_FUNCTION   = process.env.REMOTION_LAMBDA_FUNCTION ?? "";
const REMOTION_SERVE_URL = process.env.REMOTION_SERVE_URL      ?? "";
const S3_BUCKET         = process.env.S3_BUCKET                ?? "content-storm-assets";

// ── Lambda render ─────────────────────────────────────────────────────────────

interface RemotionRenderResult {
  compiledVideoUrl: string;
  audioTrackUrl:    string;
  rawAssetsArchive: string;
}

async function renderOnLambda(
  moduleId:   string,
  title:      string,
  blocks:     Array<{
    id: string; order: number; sectionTitle: string;
    textContent: string; videoStyle: string; imageUrl: string | null;
  }>,
  target:     "LMS_16_9" | "MOBILE_9_16" | "SQUARE_1_1",
  watermark:  boolean,
  onProgress: (pct: number) => Promise<void>
): Promise<RemotionRenderResult> {
  if (!LAMBDA_FUNCTION || !REMOTION_SERVE_URL) {
    throw new Error(
      "REMOTION_LAMBDA_FUNCTION and REMOTION_SERVE_URL must be set. " +
      "Deploy with: cd remotion && npm run lambda:deploy"
    );
  }

  // Dynamic import keeps @remotion/lambda out of the module graph when Lambda
  // is not configured (dev environments using the stub).
  const { renderMediaOnLambda, getRenderProgress } =
    await import("@remotion/lambda/client");

  const inputProps = { moduleId, title, blocks, target, watermark };

  // ── Kick off the render ───────────────────────────────────────────────────
  const { renderId, bucketName } = await renderMediaOnLambda({
    region:       REMOTION_REGION,
    functionName: LAMBDA_FUNCTION,
    serveUrl:     REMOTION_SERVE_URL,
    composition:  "ContentStormLecture",
    inputProps,
    codec:        "h264",
    imageFormat:  "jpeg",
    // Write directly to our shared S3 bucket under a stable prefix.
    outName: `modules/${moduleId}/lecture.mp4`,
    // Pass our bucket so Remotion writes there (requires the role to have
    // s3:PutObject). The input field is `forceBucketName`, not `bucketName`
    // — `bucketName` only exists on the call's *output* (the auto-managed
    // bucket Remotion actually used), confirmed against the installed
    // @remotion/lambda-client's real RenderMediaOnLambdaInput type.
    forceBucketName: S3_BUCKET,
  });

  // ── Poll progress ─────────────────────────────────────────────────────────
  let done = false;
  while (!done) {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      region:       REMOTION_REGION,
      functionName: LAMBDA_FUNCTION,
    });

    await onProgress(Math.round(progress.overallProgress * 100));

    if (progress.done) {
      done = true;
    } else if (progress.fatalErrorEncountered) {
      throw new Error(
        `Remotion Lambda fatal error: ${progress.errors?.map((e) => e.message).join("; ")}`
      );
    } else {
      // Poll every 3s — Lambda renders are typically 30s–3min.
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const mp4Url  = `https://${S3_BUCKET}.s3.${REMOTION_REGION}.amazonaws.com/modules/${moduleId}/lecture.mp4`;
  // ElevenLabs audio is embedded in the MP4 by the Remotion composition.
  // A separate WAV stem would require a dedicated ElevenLabs pipeline (future sprint).
  const wavUrl  = `https://${S3_BUCKET}.s3.${REMOTION_REGION}.amazonaws.com/modules/${moduleId}/audio.wav`;

  return {
    compiledVideoUrl: mp4Url,
    audioTrackUrl:    wavUrl,
    rawAssetsArchive: "", // filled in after buildStemsZip below
  };
}

// ── Worker ────────────────────────────────────────────────────────────────────

const worker = new Worker<RenderJobData>(
  QUEUE.RENDER,
  async (job: Job<RenderJobData>) => {
    const { moduleId, target } = job.data;

    // ── 1. Upsert RenderJob ───────────────────────────────────────────────────
    await prisma.renderJob.upsert({
      where:  { moduleId },
      create: { moduleId, status: "PROCESSING", progress: 0, target },
      update: { status: "PROCESSING", progress: 0, target },
    });

    // ── 2. Fetch blocks + module title ────────────────────────────────────────
    const module = await prisma.courseModule.findUniqueOrThrow({
      where:  { id: moduleId },
      select: { title: true },
    });

    const blocks = await prisma.scriptBlock.findMany({
      where:   { moduleId },
      orderBy: { order: "asc" },
      select:  { id: true, order: true, sectionTitle: true, imageUrl: true, videoStyle: true, textContent: true },
    });

    // ── 3. Watermark flag ─────────────────────────────────────────────────────
    const deployment = await prisma.deploymentProfile.findUnique({
      where:  { moduleId },
      select: { watermarkEnabled: true },
    });
    const watermark = deployment?.watermarkEnabled ?? true;

    // ── 4. Render on Lambda ───────────────────────────────────────────────────
    const result = await renderOnLambda(
      moduleId,
      module.title,
      blocks,
      target,
      watermark,
      async (pct) => {
        await prisma.renderJob.update({
          where: { moduleId },
          data:  { progress: pct },
        });
        await job.updateProgress(pct);
      }
    );

    // ── 5. Build stems ZIP (post-render) ──────────────────────────────────────
    let stemsUrl = "";
    try {
      const zipKey = await buildStemsZip(moduleId, blocks);
      stemsUrl = `https://${S3_BUCKET}.s3.${REMOTION_REGION}.amazonaws.com/${zipKey}`;
    } catch (err) {
      // Stems ZIP failure is non-fatal — the MP4 is the primary deliverable.
      console.error(`[render] stems zip failed for ${moduleId}:`, err);
    }

    // ── 6. Mark COMPLETED ─────────────────────────────────────────────────────
    await prisma.renderJob.update({
      where: { moduleId },
      data: {
        status:           "COMPLETED",
        progress:         100,
        compiledVideoUrl: result.compiledVideoUrl,
        audioTrackUrl:    result.audioTrackUrl,
        rawAssetsArchive: stemsUrl,
      },
    });

    return { moduleId, url: result.compiledVideoUrl };
  },
  { connection, concurrency: 2 }
);

worker.on("failed", async (job, err) => {
  console.error(`[render] job failed for module ${job?.data.moduleId}:`, err?.message);
  if (job) {
    await prisma.renderJob
      .update({
        where: { moduleId: job.data.moduleId },
        data:  { status: "FAILED" },
      })
      .catch(() => {});
  }
});

worker.on("completed", (_job, result) => {
  console.log(`[render] compile complete for module ${result.moduleId}: ${result.url}`);
});

console.log(`[worker] render worker online — queue "${QUEUE.RENDER}"`);
