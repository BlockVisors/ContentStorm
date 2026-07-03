import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tenantRoute, assertRole } from "@/lib/tenancy";
import { driftScanQueue, defaultJobOptions } from "@/lib/queue";

/**
 * POST /api/drift/detect
 *
 * Sovereign-only, admin-only. Tier-gated directly (tier === "SOVEREIGN"),
 * not via an add-on flag — Drift Dashboard was never part of the à la carte
 * menu (V2 architecture doc §4.2/§5): it scans an org's entire documentation
 * corpus across every notebook, which only makes sense at the tier that
 * already implies "we trust you with cross-department analysis," not
 * something an individual Architect seat should be able to toggle on.
 */
export const POST = tenantRoute(async (ctx) => {
  assertRole(ctx, ["OWNER", "ADMIN"]);

  const org = await prisma.organization.findUniqueOrThrow({
    where:  { id: ctx.orgId },
    select: { tier: true },
  });
  if (org.tier !== "SOVEREIGN") {
    return NextResponse.json(
      { error: "SOVEREIGN_REQUIRED", message: "The Drift Dashboard is a Sovereign-tier capability." },
      { status: 403 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  await driftScanQueue().add(
    `drift-scan-${ctx.orgId}-${today}-manual`,
    { orgId: ctx.orgId },
    { ...defaultJobOptions, jobId: `drift-scan-${ctx.orgId}-${today}-manual-${Date.now()}` }
  );

  return NextResponse.json({ queued: true }, { status: 202 });
});
