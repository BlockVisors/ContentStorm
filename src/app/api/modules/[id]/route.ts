import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tenantRoute, assertOrg } from "@/lib/tenancy";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/modules/[id]
 *
 * Full dashboard state for one module — the read the Vault/Nexus/Crucible/
 * Port UI shells poll on load to decide which stage to render. Returns every
 * relation needed to compute progress without a second round-trip: the five
 * ExpertPerspective rows (Nexus), the ContradictionMap (Crucible mapping),
 * ordered ScriptBlocks with per-block mediaStatus (Crucible editor + async
 * image queue), the RenderJob (Port pre-flight), and the DeploymentProfile
 * (Port config).
 */
export const GET = tenantRoute(async (ctx, _req: Request, { params }: Ctx) => {
  const { id: moduleId } = await params;

  const module_ = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: {
      notebook: { select: { id: true, title: true, vectorStatus: true } },
      perspectives: { orderBy: { persona: "asc" } },
      contradictionMap: true,
      scriptBlocks: { orderBy: { order: "asc" } },
      renderJob: true,
      deployment: true,
    },
  });

  if (!module_) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  assertOrg(module_.orgId, ctx);

  // Cheap derived status the UI would otherwise recompute client-side on
  // every poll — five persona scan, one contradiction map, N script blocks.
  const stage =
    module_.perspectives.length < 5
      ? "NEXUS"
      : !module_.contradictionMap
        ? "MAPPING"
        : module_.scriptBlocks.length === 0
          ? "SYNTHESIS"
          : module_.scriptBlocks.some((b) => b.mediaStatus !== "COMPLETED")
            ? "CRUCIBLE_MEDIA_PENDING"
            : "CRUCIBLE_READY";

  return NextResponse.json({ ...module_, stage });
});
