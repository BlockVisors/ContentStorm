import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import type { MemberRole, User } from "@prisma/client";

/**
 * Tenancy spine (Blueprint §16). Every tenant-scoped API route resolves the
 * caller through getTenant() and filters by orgId. Supabase RLS sits behind
 * this as defense-in-depth, but the application boundary is enforced here.
 */

export class TenantError extends Error {
  constructor(
    public code:
      | "UNAUTHENTICATED"
      | "USER_NOT_PROVISIONED"
      | "FORBIDDEN"
      | "ADDON_REQUIRED",
    public status: number,
    public detail?: Record<string, unknown>
  ) {
    super(code);
    this.name = "TenantError";
  }
}

export interface TenantContext {
  userId: string;
  orgId: string;
  user: User;
}

/** Resolve the authenticated caller. Throws TenantError on any failure. */
export async function getTenant(): Promise<TenantContext> {
  const { userId } = await auth();
  if (!userId) throw new TenantError("UNAUTHENTICATED", 401);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  // A signed-in Clerk user with no DB row means the provisioning webhook has
  // not landed yet (race on first sign-in) or failed. Treat as not-provisioned.
  if (!user) throw new TenantError("USER_NOT_PROVISIONED", 403);

  return { userId, orgId: user.orgId, user };
}

/** Assert a resource belongs to the caller's org before reading/mutating it. */
export function assertOrg(resourceOrgId: string, ctx: TenantContext): void {
  if (resourceOrgId !== ctx.orgId) throw new TenantError("FORBIDDEN", 403);
}

/** Assert the caller holds at least one of the given roles. */
export function assertRole(ctx: TenantContext, roles: MemberRole[]): void {
  if (!roles.includes(ctx.user.role)) throw new TenantError("FORBIDDEN", 403);
}

/**
 * Assert an org-level à la carte add-on flag is enabled before letting a
 * route proceed (Organization.hasArbitrageAddon, hasOnChainCredentialAddon,
 * hasPremiumComputeAddon, hasFederatedEdgeAddon, hasClipperAddon — V2-3, §4.3).
 * Every paid tier can toggle any add-on independently, so this is a flag
 * check, not a tier check — callers pass the specific boolean field they're
 * gating on, not the Organization row itself, to keep call sites explicit
 * about which add-on a route requires:
 *
 *   assertAddon(org.hasClipperAddon, "hasClipperAddon");
 */
export function assertAddon(flag: boolean, addonName: string): void {
  if (!flag) {
    throw new TenantError("ADDON_REQUIRED", 403, { addon: addonName });
  }
}

/**
 * Route wrapper. Use to keep handlers free of auth/error boilerplate:
 *
 *   export const GET = tenantRoute(async (ctx, req) => {
 *     const notebooks = await prisma.notebook.findMany({ where: { orgId: ctx.orgId } });
 *     return NextResponse.json(notebooks);
 *   });
 */
export function tenantRoute<Args extends unknown[]>(
  handler: (ctx: TenantContext, ...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    let ctx: TenantContext;
    try {
      ctx = await getTenant();
    } catch (err) {
      if (err instanceof TenantError) {
        return NextResponse.json(
          { error: err.code, ...(err.detail ?? {}) },
          { status: err.status }
        );
      }
      throw err;
    }
    try {
      return await handler(ctx, ...args);
    } catch (err) {
      if (err instanceof TenantError) {
        return NextResponse.json(
          { error: err.code, ...(err.detail ?? {}) },
          { status: err.status }
        );
      }
      console.error("Unhandled route error:", err);
      return NextResponse.json(
        { error: "INTERNAL_SERVER_ERROR" },
        { status: 500 }
      );
    }
  };
}
