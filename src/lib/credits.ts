import { prisma } from "./db";
import { CREDIT_COST, MONTHLY_GRANT, FREE_MONTHLY_IMAGE_CAP } from "./credit-constants";

/**
 * Storm Credits engine (Blueprint §14, §16).
 *
 * `User.stormCredits` is a denormalized cache of the running balance.
 * `CreditLedger` is the auditable source of truth.
 * All mutations go through this module — never update either field directly.
 *
 * Atomic guarantee: every debit/credit uses a serializable Prisma transaction
 * that reads the current balance, validates it, and writes the ledger row +
 * updates the cached balance in one commit. Concurrent requests cannot race
 * past a zero balance.
 *
 * CREDIT_COST / MONTHLY_GRANT / FREE_MONTHLY_IMAGE_CAP live in
 * credit-constants.ts, not here — that file's own header comment explains
 * why (BillingDashboard.tsx is a "use client" component that needs these
 * constants without pulling this file's server-only `prisma`/`stripe`
 * imports into its bundle). This file re-exports them for convenience so
 * existing server-side call sites can still `import { CREDIT_COST } from
 * "./credits"` without knowing about the split.
 */
export { CREDIT_COST, MONTHLY_GRANT, FREE_MONTHLY_IMAGE_CAP };

// ── Error class ───────────────────────────────────────────────────────────────
export class InsufficientCreditsError extends Error {
  constructor(
    public available: number,
    public required:  number,
    public reason:    string
  ) {
    super(`Insufficient credits: need ${required}, have ${available} (${reason})`);
    this.name = "InsufficientCreditsError";
  }
}

// ── Core operations ───────────────────────────────────────────────────────────

/**
 * Debit credits from a user atomically.
 * Throws InsufficientCreditsError if balance is too low.
 * Returns the new balance.
 */
export async function debitCredits(
  userId:  string,
  amount:  number,
  reason:  string,
  refId?:  string
): Promise<number> {
  if (amount <= 0) throw new Error(`debitCredits: amount must be > 0, got ${amount}`);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where:  { id: userId },
      select: { stormCredits: true },
    });

    if (user.stormCredits < amount) {
      throw new InsufficientCreditsError(user.stormCredits, amount, reason);
    }

    const newBalance = user.stormCredits - amount;

    await tx.creditLedger.create({
      data: { userId, delta: -amount, reason, refId: refId ?? null },
    });

    await tx.user.update({
      where: { id: userId },
      data:  { stormCredits: newBalance },
    });

    return newBalance;
  }, { isolationLevel: "Serializable" });
}

/**
 * Grant credits to a user atomically (monthly refresh, Stripe upgrade, etc.).
 * Returns the new balance.
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  refId?: string
): Promise<number> {
  if (amount <= 0) throw new Error(`grantCredits: amount must be > 0, got ${amount}`);

  return prisma.$transaction(async (tx) => {
    await tx.creditLedger.create({
      data: { userId, delta: amount, reason, refId: refId ?? null },
    });

    const updated = await tx.user.update({
      where: { id: userId },
      data:  { stormCredits: { increment: amount } },
      select: { stormCredits: true },
    });

    return updated.stormCredits;
  }, { isolationLevel: "Serializable" });
}

/**
 * Set a user's credit balance to exactly `amount`, recording the delta as a
 * ledger entry. Used for monthly resets where we replace, not increment.
 */
export async function resetCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where:  { id: userId },
      select: { stormCredits: true },
    });

    const delta = amount - user.stormCredits;
    if (delta === 0) return amount;

    await tx.creditLedger.create({
      data: { userId, delta, reason },
    });

    const updated = await tx.user.update({
      where: { id: userId },
      data:  { stormCredits: amount },
      select: { stormCredits: true },
    });

    return updated.stormCredits;
  }, { isolationLevel: "Serializable" });
}

/**
 * Read current balance + recent ledger entries for the billing UI.
 * Never use this as the authoritative balance in a debit check —
 * use the Serializable transaction in debitCredits.
 */
export async function getCreditSummary(userId: string) {
  const [user, recent] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where:  { id: userId },
      select: { stormCredits: true, org: { select: { tier: true } } },
    }),
    prisma.creditLedger.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    20,
      select:  { id: true, delta: true, reason: true, refId: true, createdAt: true },
    }),
  ]);

  return {
    balance:      user.stormCredits,
    tier:         user.org.tier,
    monthlyGrant: MONTHLY_GRANT[user.org.tier],
    recent,
  };
}
