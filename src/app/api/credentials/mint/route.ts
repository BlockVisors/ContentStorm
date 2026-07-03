import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { tenantRoute, assertOrg, assertAddon } from "@/lib/tenancy";
import { mintCredentialQueue, defaultJobOptions } from "@/lib/queue";

const MintBody = z.object({
  sessionId: z.string().uuid(),
});

/**
 * POST /api/credentials/mint
 *
 * Gated by hasOnChainCredentialAddon. Requires a COMPLETED session scored
 * under the canonical SRS (legacy sessions — srsScore null — can't mint;
 * there's no defined mapping from the V1 5-vector matrix to this schema's
 * fields, and minting a credential nobody can reproduce the math for would
 * undercut the entire "auditable, mathematically-grounded proof" pitch).
 *
 * Creates the OnChainCredential row synchronously (PENDING) so the UI has
 * something to poll immediately, then queues the actual mint — a blockchain
 * transaction is not something to do inside a request/response cycle.
 */
export const POST = tenantRoute(async (ctx, req: Request) => {
  const org = await prisma.organization.findUniqueOrThrow({
    where:  { id: ctx.orgId },
    select: { hasOnChainCredentialAddon: true },
  });
  assertAddon(org.hasOnChainCredentialAddon, "hasOnChainCredentialAddon");

  const parsed = MintBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const session = await prisma.assessmentSession.findUnique({
    where:  { id: parsed.data.sessionId },
    select: {
      id: true,
      status: true,
      srsScore: true,
      moduleId: true,
      module: { select: { orgId: true } },
      credential: { select: { id: true, status: true } },
    },
  });
  if (!session) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  assertOrg(session.module.orgId, ctx);

  if (session.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "SESSION_NOT_COMPLETED", message: "Only completed Challenge Chamber sessions can mint a credential." },
      { status: 409 }
    );
  }
  if (session.srsScore === null) {
    return NextResponse.json(
      {
        error: "LEGACY_SESSION",
        message: "This session predates the canonical SRS formula and can't be minted. Retake the Challenge Chamber to earn a mintable score.",
      },
      { status: 409 }
    );
  }
  if (session.credential) {
    if (session.credential.status === "MINTED") {
      return NextResponse.json({ error: "ALREADY_MINTED", credentialId: session.credential.id }, { status: 409 });
    }
    if (session.credential.status === "PROCESSING" || session.credential.status === "PENDING") {
      return NextResponse.json({ error: "MINT_IN_PROGRESS", credentialId: session.credential.id }, { status: 409 });
    }
    // FAILED — fall through and re-queue using the existing row rather than
    // creating a duplicate; sessionId is @unique on OnChainCredential.
  }

  const credential = await prisma.onChainCredential.upsert({
    where:  { sessionId: session.id },
    create: {
      sessionId:             session.id,
      userVerificationHash:  "", // filled in by the worker once minted — deterministic from learnerId+sessionId+srsScore, not knowable/needed before that
      moduleAnchor:          `CS-MOD-${session.moduleId}`,
      finalSrs:              session.srsScore,
      skepticDeflection:     0,
      sourceGrounding:       0,
      biasEquilibrium:       0,
      status:                "PENDING",
    },
    update: { status: "PENDING", failureReason: null },
  });

  await mintCredentialQueue().add(
    `mint-${credential.id}`,
    { credentialId: credential.id, sessionId: session.id, orgId: ctx.orgId },
    { ...defaultJobOptions, jobId: `mint-${credential.id}-${Date.now()}` } // timestamp suffix: a retried FAILED mint needs a fresh jobId, BullMQ dedupes on jobId otherwise
  );

  return NextResponse.json({ credentialId: credential.id, status: "PENDING" }, { status: 202 });
});
