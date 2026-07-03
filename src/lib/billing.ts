import type { BillingModel, SubscriptionTier } from "@prisma/client";

/**
 * Tier and add-on metadata — V2-3 single source of truth.
 *
 * Every place that needs to know "what does this tier cost" or "which Stripe
 * Price ID maps to which tier/add-on" reads from here: the checkout route
 * (building a Checkout Session), the webhook (mapping an incoming Price ID
 * back to a tier or add-on), the add-on route, and the billing dashboard.
 * One definition, four consumers — a price change or a new tier only needs
 * editing in this file.
 */

export type AddonKey =
  | "hasArbitrageAddon"
  | "hasOnChainCredentialAddon"
  | "hasPremiumComputeAddon"
  | "hasFederatedEdgeAddon"
  | "hasClipperAddon";

export const ADDON_KEYS: AddonKey[] = [
  "hasArbitrageAddon",
  "hasOnChainCredentialAddon",
  "hasPremiumComputeAddon",
  "hasFederatedEdgeAddon",
  "hasClipperAddon",
];

export interface TierMeta {
  tier:          SubscriptionTier;
  label:         string;
  priceDisplay:  string;
  billingModel:  BillingModel;
  /** Can this tier be purchased through /api/billing/checkout? False for
   *  FREE (nothing to buy) and SOVEREIGN (custom contract, sales-assisted). */
  checkoutEnabled: boolean;
  /** Stripe Price ID from env. Null for FREE/SOVEREIGN. */
  priceId: string | null;
}

export const TIER_ORDER: SubscriptionTier[] = [
  "FREE", "PRO", "ARCHITECT", "ENTERPRISE_SANDBOX", "SOVEREIGN",
];

export const TIER_META: Record<SubscriptionTier, TierMeta> = {
  FREE: {
    tier: "FREE", label: "Free", priceDisplay: "$0/mo",
    billingModel: "FLAT", checkoutEnabled: false, priceId: null,
  },
  PRO: {
    tier: "PRO", label: "Pro", priceDisplay: "$49/mo",
    billingModel: "FLAT", checkoutEnabled: true,
    priceId: process.env.STRIPE_PRICE_PRO ?? null,
  },
  ARCHITECT: {
    tier: "ARCHITECT", label: "Architect", priceDisplay: "$79–149/mo · metered",
    billingModel: "METERED", checkoutEnabled: true,
    priceId: process.env.STRIPE_PRICE_ARCHITECT ?? null,
  },
  ENTERPRISE_SANDBOX: {
    tier: "ENTERPRISE_SANDBOX", label: "Enterprise Sandbox", priceDisplay: "$40–75/seat/mo",
    billingModel: "SEAT", checkoutEnabled: true,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE_SANDBOX ?? null,
  },
  SOVEREIGN: {
    tier: "SOVEREIGN", label: "Sovereign", priceDisplay: "custom · $150k–500k+ ACV",
    billingModel: "CUSTOM", checkoutEnabled: false, priceId: null,
  },
};

/** Enterprise Sandbox enforces an annual-minimum seat floor at checkout. */
export const ENTERPRISE_SANDBOX_MIN_SEATS = 5;

export interface AddonMeta {
  key:          AddonKey;
  label:        string;
  priceDisplay: string;
  priceId:      string | null;
  /** False = Federated Edge — provisions a real VPC tunnel, not a self-serve
   *  toggle. The flag is still purchasable, but /api/billing/addons routes it
   *  to a sales-assisted flow instead of an immediate Stripe subscription item. */
  selfServe: boolean;
}

export const ADDON_META: Record<AddonKey, AddonMeta> = {
  hasArbitrageAddon: {
    key: "hasArbitrageAddon", label: "Curriculum Arbitrage", priceDisplay: "+$49/mo",
    priceId: process.env.STRIPE_PRICE_ADDON_ARBITRAGE ?? null, selfServe: true,
  },
  hasOnChainCredentialAddon: {
    key: "hasOnChainCredentialAddon", label: "On-Chain SRS Credentials", priceDisplay: "+$29/mo",
    priceId: process.env.STRIPE_PRICE_ADDON_ONCHAIN ?? null, selfServe: true,
  },
  hasPremiumComputeAddon: {
    key: "hasPremiumComputeAddon", label: "High-Tier Adversarial Compute", priceDisplay: "+$39/mo",
    priceId: process.env.STRIPE_PRICE_ADDON_PREMIUM_COMPUTE ?? null, selfServe: true,
  },
  hasFederatedEdgeAddon: {
    key: "hasFederatedEdgeAddon", label: "Federated Edge Runtime", priceDisplay: "custom quote",
    priceId: process.env.STRIPE_PRICE_ADDON_FEDERATED_EDGE ?? null, selfServe: false,
  },
  hasClipperAddon: {
    key: "hasClipperAddon", label: "The Arbitrage Clipper", priceDisplay: "+$39/mo",
    priceId: process.env.STRIPE_PRICE_ADDON_CLIPPER ?? null, selfServe: true,
  },
};

/** Reverse lookup used by the Stripe webhook: incoming Price ID → tier. */
export function tierFromPriceId(priceId: string | null | undefined): SubscriptionTier | null {
  if (!priceId) return null;
  for (const meta of Object.values(TIER_META)) {
    if (meta.priceId === priceId) return meta.tier;
  }
  return null;
}

/** Reverse lookup used by the Stripe webhook: incoming Price ID → add-on flag. */
export function addonFromPriceId(priceId: string | null | undefined): AddonKey | null {
  if (!priceId) return null;
  for (const meta of Object.values(ADDON_META)) {
    if (meta.priceId === priceId) return meta.key;
  }
  return null;
}
