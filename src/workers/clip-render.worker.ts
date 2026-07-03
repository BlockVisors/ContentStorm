import { Worker, type Job } from "bullmq";
import { connection, QUEUE, type ClipRenderJobData } from "../lib/queue";
import { prisma } from "../lib/db";
import type { AwsRegion } from "@remotion/lambda/client";

/**
 * Clip render worker — The Arbitrage Clipper (V2-10).
 *
 * Mirrors render.worker.ts's Lambda lifecycle, scoped to a single ClipAsset
 * row instead of a per-module RenderJob:
 *   1. Mark ClipAsset PROCESSING.
 *   2. renderMediaOnLambda against the "ContentStormClip" composition
 *      (always MOBILE_9_16 — clips are vertical by definition) → poll
 *      progress → write progress to the ClipAsset row.
 *   3. Mark COMPLETED with compiledVideoUrl, or FAILED on error.
 *
 * No stems ZIP step — unlike the main lecture, a clip has no separate raw
 * asset bundle to build; the compiled MP4 is the only deliverable.
 *
 * Same Lambda env vars as render.worker.ts (REMOTION_AWS_REGION,
 * REMOTION_LAMBDA_FUNCTION, REMOTION_SERVE_URL, S3_BUCKET) — one deployed
 * Remotion site serves both compositions.
 */

// Remotion's renderMediaOnLambda/getRenderProgress type `region` as the
// literal AwsRegion union, not `string` — env vars are inherently untyped
// strings, so this cast is the correct narrowing point rather than a type
// escape hatch. A misconfigured REMOTION_AWS_REGION fails loudly at the
// actual Lambda call with a clear AWS error; this cast doesn't hide that.
const REMOTION_REGION = (process.env.REMOTION_AWS_REGION ?? process.env.AWS_REGION ?? "us-east-1") as AwsRegion;
const LAMBDA_FUNCTION    = process.env.REMOTION_LAMBDA_FUNCTION ?? "";
const REMOTION_SERVE_URL = process.env.REMOTION_SERVE_URL      ?? "";
const S3_BUCKET          = process.env.S3_BUCKET               ?? "content-storm-assets";

async function renderClipOnLambda(
  clipAssetId: string,
  moduleId:    string,
  clipProps: {
    sectionTitle:  string;
    beats:         string[];
    ctaText:       string | null;
    platformMode:  "RETAINER" | "EDUCATOR" | "DEEP_DIVER";
    sourceImageUrl: string | null;
    videoStyle:    "AVATAR" | "WHITEBOARD" | "FACELESS";
  },
  watermark: boolean,
  onProgress: (pct: number) => Promise<void>
): Promise<string> {
  if (!LAMBDA_FUNCTION || !REMOTION_SERVE_URL) {
    throw new Error(
      "REMOTION_LAMBDA_FUNCTION and REMOTION_SERVE_URL must be set. " +
      "Deploy with: cd remotion && npm run lambda:deploy"
    );
  }

  const { renderMediaOnLambda, getRenderProgress } = await import("@remotion/lambda/client");

  // Composition destructures { props }: { props: ClipInputProps } (see
  // remotion/src/ClipperSequence.tsx) — inputProps here must be wrapped to
  // match, same convention every sub-sequence in this project already uses.
  const inputProps = {
    props: {
      moduleId,
      clipAssetId,
      ...clipProps,
      watermark,
    },
  };

  const { renderId, bucketName } = await renderMediaOnLambda({
    region:       REMOTION_REGION,
    functionName: LAMBDA_FUNCTION,
    serveUrl:     REMOTION_SERVE_URL,
    composition:  "ContentStormClip",
    inputProps,
    codec:        "h264",
    imageFormat:  "jpeg",
    outName:      `modules/${moduleId}/clips/${clipAssetId}.mp4`,
    // See render.worker.ts for why this is forceBucketName, not bucketName.
    forceBucketName: S3_BUCKET,
  });

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
        `Remotion Lambda fatal error (clip ${clipAssetId}): ${progress.errors?.map((e) => e.message).join("; ")}`
      );
    } else {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  return `https://${S3_BUCKET}.s3.${REMOTION_REGION}.amazonaws.com/modules/${moduleId}/clips/${clipAssetId}.mp4`;
}

const worker = new Worker<ClipRenderJobData>(
  QUEUE.CLIP_RENDER,
  async (job: Job<ClipRenderJobData>) => {
    const { clipAssetId, moduleId } = job.data;

    // ── 1. Mark PROCESSING ─────────────────────────────────────────────────
    await prisma.clipAsset.update({
      where: { id: clipAssetId },
      data:  { mediaStatus: "PROCESSING", progress: 0 },
    });

    // ── 2. Fetch clip data + org watermark policy ───────────────────────────
    const clip = await prisma.clipAsset.findUniqueOrThrow({
      where:  { id: clipAssetId },
      select: {
        sectionTitle: true,
        beats:        true,
        ctaText:      true,
        platformMode: true,
        sourceImageUrl: true,
        videoStyle:   true,
        module: { select: { deployment: { select: { watermarkEnabled: true } } } },
      },
    });
    const watermark = clip.module.deployment?.watermarkEnabled ?? true;

    // ── 3. Render on Lambda ──────────────────────────────────────────────────
    const compiledVideoUrl = await renderClipOnLambda(
      clipAssetId,
      moduleId,
      {
        sectionTitle:   clip.sectionTitle,
        beats:          clip.beats as string[],
        ctaText:        clip.ctaText,
        platformMode:   clip.platformMode,
        sourceImageUrl: clip.sourceImageUrl,
        videoStyle:     clip.videoStyle,
      },
      watermark,
      async (pct) => {
        await prisma.clipAsset.update({
          where: { id: clipAssetId },
          data:  { progress: pct },
        });
        await job.updateProgress(pct);
      }
    );

    // ── 4. Mark COMPLETED ──────────────────────────────────────────────────
    await prisma.clipAsset.update({
      where: { id: clipAssetId },
      data:  { mediaStatus: "COMPLETED", progress: 100, compiledVideoUrl },
    });

    return { clipAssetId, url: compiledVideoUrl };
  },
  { connection, concurrency: 2 }
);

worker.on("failed", async (job, err) => {
  console.error(`[clip-render] job failed for clip ${job?.data.clipAssetId}:`, err?.message);
  if (job) {
    await prisma.clipAsset
      .update({ where: { id: job.data.clipAssetId }, data: { mediaStatus: "FAILED" } })
      .catch(() => {});
  }
});

worker.on("completed", (_job, result) => {
  console.log(`[clip-render] compile complete for clip ${result.clipAssetId}: ${result.url}`);
});

console.log(`[worker] clip-render worker online — queue "${QUEUE.CLIP_RENDER}"`);
