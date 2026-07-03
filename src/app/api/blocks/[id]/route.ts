import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { tenantRoute, assertOrg } from "@/lib/tenancy";
import { hasSemanticDrift } from "@/lib/utility";
import { imageQueue, defaultJobOptions } from "@/lib/queue";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/blocks/[id]
 *
 * SWR conditional-polling target (Blueprint §9): the block editor polls this
 * every 3s only while mediaStatus is PENDING or PROCESSING, and stops
 * permanently once it observes COMPLETED or FAILED. Intentionally minimal —
 * a single-row read with no joins beyond the tenancy check — since it's
 * called on a tight interval per in-flight block.
 */
export const GET = tenantRoute(async (ctx, _req: Request, { params }: Ctx) => {
  const { id: blockId } = await params;

  const block = await prisma.scriptBlock.findUnique({
    where: { id: blockId },
    include: { module: { select: { orgId: true } } },
  });
  if (!block) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  assertOrg(block.module.orgId, ctx);

  const { module: _module, ...blockData } = block;
  return NextResponse.json(blockData);
});

const PatchBody = z.object({
  textContent: z.string().min(1).max(20_000).optional(),
  sectionTitle: z.string().min(1).max(200).optional(),
  videoStyle:  z.enum(["AVATAR", "WHITEBOARD", "FACELESS"]).optional(),
  isLocked:    z.boolean().optional(),
}).refine((b) => Object.keys(b).length > 0, { message: "Empty patch body." });

/**
 * PATCH /api/blocks/[id]
 *
 * Core architectural rule (mandate + Blueprint §9): editing one block fires
 * a discrete PATCH for that block alone — never a full-document rewrite.
 *
 * Flow:
 *   1. If textContent is unchanged from what's stored → early-return, no
 *      write, no queue call (saves tokens on a no-op save).
 *   2. Otherwise update the block. If textContent changed AND the block
 *      isn't isLocked AND hasSemanticDrift() says the edit is substantial →
 *      set mediaStatus PROCESSING and enqueue image-generation. A trivial
 *      wording fix updates the DB but never touches the image pipeline.
 *   3. isLocked blocks always skip regen regardless of drift — pinned
 *      against auto-regen by design (§9).
 */
export const PATCH = tenantRoute(async (ctx, req: Request, { params }: Ctx) => {
  const { id: blockId } = await params;

  const block = await prisma.scriptBlock.findUnique({
    where: { id: blockId },
    include: { module: { select: { id: true, orgId: true, title: true } } },
  });
  if (!block) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  assertOrg(block.module.orgId, ctx);

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const patch = parsed.data;

  // Early-return on a no-op text save — no DB write, no queue call.
  const textUnchanged =
    patch.textContent === undefined || patch.textContent === block.textContent;
  if (textUnchanged && Object.keys(patch).every((k) => k === "textContent")) {
    return NextResponse.json(block);
  }

  const shouldConsiderRegen =
    patch.textContent !== undefined &&
    !textUnchanged &&
    !block.isLocked &&
    patch.isLocked !== true; // a PATCH that locks the block in the same call also skips regen

  const willRegen =
    shouldConsiderRegen &&
    (await hasSemanticDrift(block.textContent, patch.textContent as string));

  const updated = await prisma.scriptBlock.update({
    where: { id: blockId },
    data: {
      ...(patch.textContent !== undefined ? { textContent: patch.textContent } : {}),
      ...(patch.sectionTitle !== undefined ? { sectionTitle: patch.sectionTitle } : {}),
      ...(patch.videoStyle !== undefined ? { videoStyle: patch.videoStyle } : {}),
      ...(patch.isLocked !== undefined ? { isLocked: patch.isLocked } : {}),
      ...(willRegen ? { mediaStatus: "PROCESSING" } : {}),
    },
  });

  if (willRegen) {
    await imageQueue().add(
      `image-gen-${blockId}-${Date.now()}`,
      {
        blockId,
        moduleId: block.module.id,
        orgId: ctx.orgId,
        textContent: updated.textContent,
        videoStyle: updated.videoStyle,
        target: "LMS_16_9",
      },
      defaultJobOptions
    );
  }

  return NextResponse.json(updated);
});
