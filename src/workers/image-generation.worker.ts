import { Worker, type Job } from "bullmq";
import {
  connection,
  QUEUE,
  type ImageGenerationJobData,
  renderQueue,
  defaultJobOptions,
} from "../lib/queue";
import { prisma } from "../lib/db";
import { wrapImagePrompt } from "../lib/utility";

/**
 * Image-generation worker (Blueprint §9, §10).
 *
 * Execution path per job:
 *   1. Utility model (GPT-4o-mini) wraps block text into a Brutalist Sovereign
 *      style-matrix prompt via wrapImagePrompt().
 *   2. Write the imagePrompt to DB so the UI can show what was sent.
 *   3. Call the image generation API (Flux/Midjourney adapter — see note).
 *   4. Write imageUrl + mediaStatus: COMPLETED.
 *   5. Fan-in gate: if every ScriptBlock in the module is now COMPLETED,
 *      enqueue the render job.
 *
 * Image API note: a real Flux / Midjourney API adapter goes in src/lib/image-api.ts.
 * This worker calls generateImage() which is stubbed below. Swap the stub for
 * the real adapter without touching this worker.
 *
 * Idempotency: jobId = `regen-asset-<blockId>`. BullMQ deduplicates concurrent
 * regen requests; only the latest edit wins.
 */

// ── Image API adapter (stub — replace with Flux/Midjourney/Runway) ──────────
// Real signature is identical; this stub returns a deterministic placeholder
// so the worker is fully exercisable before the image API key is configured.

interface GenerateImageResult {
  url: string;
}

async function generateImage(
  prompt:         string,
  negativePrompt: string,
  style:          "AVATAR" | "WHITEBOARD" | "FACELESS",
  target:         "LMS_16_9" | "MOBILE_9_16" | "SQUARE_1_1"
): Promise<GenerateImageResult> {
  // ── STUB ──────────────────────────────────────────────────────────────────
  // Replace this block with a real API call, e.g.:
  //
  //   const fal = await import("@fal-ai/serverless-client");
  //   const result = await fal.subscribe("fal-ai/flux/dev", {
  //     input: {
  //       prompt,
  //       negative_prompt: negativePrompt,
  //       image_size: target === "MOBILE_9_16" ? "portrait_16_9" : "landscape_16_9",
  //       num_inference_steps: 28,
  //       guidance_scale: 3.5,
  //     },
  //   });
  //   return { url: result.images[0].url };
  //
  // For now, return a placeholder URL that encodes the prompt for debugging.
  const encoded = encodeURIComponent(prompt.slice(0, 100));
  return {
    url: `https://placehold.co/1280x720/07100F/2E6F6A?text=${encoded}`,
  };
  // ── END STUB ──────────────────────────────────────────────────────────────
}

// ── Worker ──────────────────────────────────────────────────────────────────

const worker = new Worker<ImageGenerationJobData>(
  QUEUE.IMAGE_GENERATION,
  async (job: Job<ImageGenerationJobData>) => {
    const { blockId, moduleId, textContent, videoStyle, target } = job.data;

    // ── 1. Prompt-wrap (utility LLM) ─────────────────────────────────────────
    const { prompt, negativePrompt } = await wrapImagePrompt(
      textContent,
      videoStyle,
      target
    );

    // ── 2. Persist the prompt so the UI can inspect it ───────────────────────
    await prisma.scriptBlock.update({
      where: { id: blockId },
      data:  { imagePrompt: prompt },
    });

    // ── 3. Generate the image ─────────────────────────────────────────────────
    const { url } = await generateImage(prompt, negativePrompt, videoStyle, target);

    // ── 4. Write result, mark COMPLETED ──────────────────────────────────────
    await prisma.scriptBlock.update({
      where: { id: blockId },
      data:  { imageUrl: url, mediaStatus: "COMPLETED" },
    });

    // ── 5. Render fan-in gate ─────────────────────────────────────────────────
    // Count blocks still pending/processing. If zero, all assets are ready —
    // enqueue the final Remotion compile. Stable jobId prevents duplicates.
    const pendingCount = await prisma.scriptBlock.count({
      where: {
        moduleId,
        mediaStatus: { in: ["PENDING", "PROCESSING", "FAILED"] },
      },
    });

    if (pendingCount === 0) {
      const renderJob = await prisma.renderJob.findUnique({
        where:  { moduleId },
        select: { target: true },
      });

      await renderQueue().add(
        `render-${moduleId}`,
        {
          moduleId,
          orgId:  job.data.orgId,
          target: renderJob?.target ?? "LMS_16_9",
        },
        {
          ...defaultJobOptions,
          jobId: `render-${moduleId}`,
        }
      );

      console.log(
        `[crucible] all blocks COMPLETED for module ${moduleId} — render job enqueued`
      );
    }

    return { blockId, url };
  },
  { connection, concurrency: 5 }
);

worker.on("failed", async (job, err) => {
  console.error(
    `[crucible] image-generation failed for block ${job?.data.blockId}:`,
    err?.message
  );
  // Mark the block FAILED so the UI shows the retry state.
  if (job) {
    await prisma.scriptBlock
      .update({
        where: { id: job.data.blockId },
        data:  { mediaStatus: "FAILED" },
      })
      .catch(() => {});
  }
});

worker.on("completed", (_job, result) => {
  console.log(`[crucible] image generated for block ${result.blockId}`);
});

console.log(
  `[worker] image-generation worker online — queue "${QUEUE.IMAGE_GENERATION}"`
);
