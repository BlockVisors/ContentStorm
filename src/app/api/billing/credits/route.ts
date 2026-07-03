import { NextResponse } from "next/server";
import { tenantRoute } from "@/lib/tenancy";
import { getCreditSummary } from "@/lib/credits";

/**
 * GET /api/billing/credits
 * Returns the caller's current balance, tier, monthly grant, and recent ledger.
 * Used by the billing dashboard and the command rail credit display.
 */
export const GET = tenantRoute(async (ctx) => {
  const summary = await getCreditSummary(ctx.userId);
  return NextResponse.json(summary);
});
