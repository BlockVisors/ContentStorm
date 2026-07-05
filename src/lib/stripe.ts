import Stripe from "stripe";

/**
 * Stripe client singleton — V2-3.
 *
 * V1 had three separate `new Stripe(...)` instantiations (checkout, portal,
 * webhook routes). Consolidated here to match the singleton pattern already
 * used for Prisma (src/lib/db.ts) and the Anthropic client (src/lib/claude.ts).
 * Also gives the add-on toggle route (§4.3) and the metered-overage reporter
 * (src/lib/credits.ts) a single place to import from.
 */

const g = globalThis as unknown as { _csStripe?: Stripe };

export const stripe =
  g._csStripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    // FLAGGED, NOT AUTO-FIXED: this literal must match your actual Stripe
    // account's pinned API version, not whatever the installed `stripe`
    // package happens to ship types for. The installed SDK version in this
    // repo's package.json may type-check against a different literal
    // (e.g. "2025-02-24.acacia") than what's pinned below — that's expected
    // and not a bug to silently "fix" by picking whichever the SDK types
    // want. Confirm your Stripe Dashboard's API version before deploying,
    // then either update this string to match or bump the `stripe` package.
    apiVersion: "2025-04-30.basil" as any,
  });

if (process.env.NODE_ENV !== "production") g._csStripe = stripe;
