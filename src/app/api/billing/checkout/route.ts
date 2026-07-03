import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { tenantRoute, assertRole } from "@/lib/tenancy";
import { TIER_META, TIER_ORDER, ENTERPRISE_SANDBOX_MIN_SEATS } from "@/lib/billing";
import type { SubscriptionTier } from "@prisma/client";

const CheckoutBody = z.object({
  plan: z.enum(["PRO", "ARCHITECT", "ENTERPRISE_SANDBOX", "SOVEREIGN"]),
  // Only meaningful for ENTERPRISE_SANDBOX — ignored otherwise.
  seats: z.number().int().min(1).max(10_000).optional(),
});

/** Ordinal position in the 5-tier ladder — used to tell an upgrade from a downgrade. */
function tierRank(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier);
}

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for a plan purchase or upgrade.
 * Only OWNER/ADMIN can initiate a purchase.
 *
 * SOVEREIGN is deliberately absent from CheckoutBody's enum — it's a custom
 * enterprise contract (§4.1), not a self-serve Stripe Price. A request for it
 * gets a CONTACT_SALES response instead of a Checkout Session.
 *
 * ENTERPRISE_SANDBOX is seat-based: `seats` sets the Checkout line item
 * quantity and is enforced against the annual-minimum seat floor.
 *
 * Returns { url } — the client redirects to this Stripe-hosted checkout page.
 */
export const POST = tenantRoute(async (ctx, req: Request) => {
  assertRole(ctx, ["OWNER", "ADMIN"]);

  const parsed = CheckoutBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { plan } = parsed.data;

  if (plan === "SOVEREIGN") {
    // Custom enterprise contract, not a self-serve Stripe Price (§4.1). The
    // dashboard should route this to a "Contact Sales" CTA rather than ever
    // calling checkout, but handle it explicitly here too — a clear signal
    // beats an opaque 500 from a missing price ID.
    return NextResponse.json(
      { error: "CONTACT_SALES", message: "Sovereign is a custom contract — reach out to sales@contentstorm.ai." },
      { status: 409 }
    );
  }

  const tierMeta = TIER_META[plan];

  if (!tierMeta.checkoutEnabled || !tierMeta.priceId) {
    return NextResponse.json(
      { error: "PRICE_NOT_CONFIGURED", plan },
      { status: 500 }
    );
  }

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: ctx.orgId },
    select: { stripeCustomerId: true, tier: true },
  });

  if (org.tier === plan) {
    return NextResponse.json({ error: "ALREADY_ON_PLAN", tier: org.tier }, { status: 409 });
  }
  if (tierRank(org.tier) > tierRank(plan)) {
    // Downgrades go through the Stripe Customer Portal (§/api/billing/portal),
    // not Checkout — Checkout is a purchase flow, not a plan-change flow.
    return NextResponse.json(
      { error: "USE_PORTAL_TO_DOWNGRADE", currentTier: org.tier },
      { status: 409 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // ── Line item shape depends on billing model ────────────────────────────
  // FLAT (Pro) and METERED (Architect) prices take no client-supplied quantity
  // — metered prices in particular report usage separately (src/lib/credits.ts)
  // and reject an explicit quantity at Checkout time. SEAT (Enterprise Sandbox)
  // is the only tier where the caller sets quantity, floored at the contract minimum.
  let quantity: number | undefined;
  if (tierMeta.billingModel === "SEAT") {
    quantity = Math.max(parsed.data.seats ?? ENTERPRISE_SANDBOX_MIN_SEATS, ENTERPRISE_SANDBOX_MIN_SEATS);
  }

  const session = await stripe.checkout.sessions.create({
    mode:               "subscription",
    payment_method_types: ["card"],
    line_items: [
      quantity !== undefined
        ? { price: tierMeta.priceId, quantity }
        : { price: tierMeta.priceId },
    ],
    success_url:        `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:          `${appUrl}/billing?canceled=true`,
    // Pass existing customer so Stripe doesn't create a duplicate.
    ...(org.stripeCustomerId
      ? { customer: org.stripeCustomerId }
      : {
          customer_creation: "always",
          customer_email:    ctx.user.email,
        }),
    metadata: {
      orgId:  ctx.orgId,
      userId: ctx.userId,
      plan,
    },
    subscription_data: {
      metadata: { orgId: ctx.orgId, userId: ctx.userId, plan },
    },
  });

  return NextResponse.json({ url: session.url });
});
