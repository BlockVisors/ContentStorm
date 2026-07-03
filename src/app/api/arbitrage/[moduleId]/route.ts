import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tenantRoute, assertOrg } from "@/lib/tenancy";

type Ctx = { params: Promise<{ moduleId: string }> };

/**
 * GET /api/arbitrage/[moduleId]
 *
 * Lists ArbitrageEvent rows for one module, newest first. Not addon-gated —
 * detection runs regardless of hasArbitrageAddon (§7.5 of the V2 doc: "if
 * not authorized: fire dashboard notification"), so a non-addon org still
 * needs to be able to SEE the PENDING events this route returns; the addon
 * only gates the automatic/manual rewrite action.
 */
export const GET = tenantRoute(async (ctx, _req: Request, { params }: Ctx) => {
  const { moduleId } = await params;

  const module = await prisma.courseModule.findUnique({
    where:  { id: moduleId },
    select: { orgId: true },
  });
  if (!module) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  assertOrg(module.orgId, ctx);

  const events = await prisma.arbitrageEvent.findMany({
    where:   { moduleId },
    orderBy: [{ status: "asc" }, { semanticDelta: "desc" }],
    select: {
      id: true,
      sourceUrl: true,
      sourceType: true,
      sourceExcerpt: true,
      semanticDelta: true,
      affectedBlocks: true,
      status: true,
      detectedAt: true,
      resolvedAt: true,
    },
  });

  return NextResponse.json({ events });
});
