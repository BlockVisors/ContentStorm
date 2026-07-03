import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tenantRoute, assertOrg } from "@/lib/tenancy";

type Ctx = { params: Promise<{ moduleId: string }> };

/**
 * POST /api/export/[moduleId]
 *
 * The Port, vector 3 (Blueprint §13): raw asset extraction. Gated to
 * Pro+ (Free tier gets watermarked MP4 only, no raw stems — §14, D2) via
 * Organization.tier, since raw export is a base tier entitlement, not an
 * à la carte add-on.
 *
 * RECONSTRUCTION NOTE: the stems ZIP is already built as a post-render step
 * inside render.worker.ts (buildStemsZip → RenderJob.rawAssetsArchive,
 * stored as a full public S3 URL — see render.worker.ts's own comment:
 * "Stems ZIP failure is non-fatal — the MP4 is the primary deliverable").
 * This route does not rebuild it; it validates entitlement and returns what
 * the render pipeline already produced. If a module's render predates stems
 * support or the post-render zip step failed non-fatally, rawAssetsArchive
 * is an empty string and this route surfaces that as a clear 409 rather than
 * silently returning a broken link.
 */
export const POST = tenantRoute(async (ctx, _req: Request, { params }: Ctx) => {
  const { moduleId } = await params;

  const module_ = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: {
      org: { select: { tier: true } },
      renderJob: true,
    },
  });
  if (!module_) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  assertOrg(module_.orgId, ctx);

  if (module_.org.tier === "FREE") {
    return NextResponse.json(
      { error: "UPGRADE_REQUIRED", message: "Raw asset export requires Pro or higher." },
      { status: 403 }
    );
  }
  if (!module_.renderJob || module_.renderJob.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "RENDER_NOT_COMPLETE", status: module_.renderJob?.status ?? "NOT_STARTED" },
      { status: 409 }
    );
  }
  if (!module_.renderJob.rawAssetsArchive) {
    return NextResponse.json(
      {
        error: "STEMS_NOT_AVAILABLE",
        message: "The render completed, but stem export failed or hasn't run for this module yet.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    moduleId,
    downloadUrl: module_.renderJob.rawAssetsArchive,
    compiledVideoUrl: module_.renderJob.compiledVideoUrl,
    audioTrackUrl: module_.renderJob.audioTrackUrl,
  });
});
