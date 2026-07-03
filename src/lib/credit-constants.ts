import type { SubscriptionTier } from "@prisma/client";

/**
 * Credit constants — deliberately dependency-free.
 *
 * src/lib/credits.ts imports prisma (src/lib/db.ts) and stripe
 * (src/lib/stripe.ts), both server-only. V1's BillingDashboard.tsx imported
 * MONTHLY_GRANT/CREDIT_COST directly from credits.ts — harmless when
 * credits.ts only touched Prisma, but now that it also imports the `stripe`
 * SDK, that import chain drags real server dependencies into a "use client"
 * bundle. These two constants have no business needing either, so they live
 * here; credits.ts and BillingDashboard.tsx both import from this file
 * instead of one importing from the other.
 *
 * The `SubscriptionTier` import above is `import type` — erased at compile
 * time, so it costs the client bundle nothing.
 */

export const CREDIT_COST = {
  IMAGE_GEN:  1,   // one image asset regeneration
  RENDER:     5,   // one full Remotion video compile
  NEXUS_SCAN: 0,   // text generation is free on all tiers
  CHALLENGE:  0,   // challenge chamber is free on all tiers
} as const;

// ENTERPRISE_SANDBOX's value is PER SEAT — see computeMonthlyGrant() in
// credits.ts. SOVEREIGN's value is a nominal ceiling for the credit-gauge UI,
// not a real cap; Sovereign capacity is negotiated per contract.
export const MONTHLY_GRANT: Record<SubscriptionTier, number> = {
  FREE:               50,
  PRO:                500,
  ARCHITECT:          1500,
  ENTERPRISE_SANDBOX: 800,
  SOVEREIGN:          50_000,
};

// FREE tier caps total image_gen credits per month (enforced at spend time
// via ledger sum — not a hard column so it stays auditable).
export const FREE_MONTHLY_IMAGE_CAP = 30;
