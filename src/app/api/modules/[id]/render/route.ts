import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { tenantRoute, assertOrg } from "@/lib/tenancy";
import { renderQueue, defaultJobOptions } from "@/lib/queue";

type Ctx = { params: Promise<{ id: string }> };

const RenderBody = z.object({
  target: z.enum(["LMS_16_9", "MOBILE_9_16", "SQUARE_1_1"]).default("LMS_16_9"),
});

/**
 * POST /api/modules/[id]/render
 *
 * Manual render trigger — the primary fan-in gate is automatic (each
 * image-generation.worker.ts completion checks whether every ScriptBlock for
 * the module is now COMPLETED and enqueues render itself, per Blueprint §8).
 * This route exists for: (a) an explicit "Render Now" action once blocks are
 * already complete, and (b) re-rendering at a different RenderTarget without
 * re-running the image pipeline.
 *
 * Refuses to enqueue if any block is still PENDING/PROCESSING/FAILED — a
 * render against an incomplete block set would either 404 on a missing
 * imageUrl mid-composition or silently render stale/placeholder frames.
 */
export const POST = tenantRoute(async (ctx, req: Request, { params }: Ctx) => {
  const { id: moduleId } = await params;

  const module_ = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: { scriptBlocks: { select: { mediaStatus: true } }, renderJob: true },
  });
  if (!module_) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  assertOrg(module_.orgId, ctx);

  if (module_.scriptBlocks.length === 0) {
    return NextResponse.json({ error: "NO_SCRIPT_BLOCKS" }, { status: 409 });
  }
  const incomplete = module_.scriptBlocks.filter((b) => b.mediaStatus !== "COMPLETED");
  if (incomplete.length > 0) {
    return NextResponse.json(
      {
        error: "BLOCKS_NOT_READY",
        message: `${incomplete.length} of ${module_.scriptBlocks.length} blocks are not yet COMPLETED.`,
        incompleteCount: incomplete.length,
      },
      { status: 409 }
    );
  }
  if (module_.renderJob?.status === "PROCESSING") {
    return NextResponse.json({ error: "RENDER_IN_PROGRESS" }, { status: 409 });
  }

  const parsed = RenderBody.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  await prisma.renderJob.upsert({
    where: { moduleId },
    create: { moduleId, status: "PENDING", target: parsed.data.target, progress: 0 },
    update: { status: "PENDING", target: parsed.data.target, progress: 0 },
  });

  await renderQueue().add(
    `render-${moduleId}`,
    { moduleId, orgId: ctx.orgId, target: parsed.data.target },
    { ...defaultJobOptions, jobId: `render-${moduleId}-${Date.now()}` }
  );

  return NextResponse.json({ moduleId, status: "PENDING" }, { status: 202 });
});
