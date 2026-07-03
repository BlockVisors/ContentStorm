import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { tenantRoute, assertOrg } from "@/lib/tenancy";

type Ctx = { params: Promise<{ deploymentId: string }> };

/**
 * POST /api/webhooks/[deploymentId]
 *
 * The Port, vector 2 (Blueprint §13): headless webhook. The host platform
 * POSTs a trigger (any body, ignored beyond existence — this is a "fetch and
 * push" pattern, not a data-receiving webhook), and this route fires back
 * the full structured module payload (5 perspectives + contradiction map +
 * script blocks + challenge prompts context + asset URLs) to
 * DeploymentProfile.webhookUrl, HMAC-SHA256 signed with webhookSecret so the
 * receiving platform can verify authenticity.
 *
 * [deploymentId] is the DeploymentProfile id (not moduleId) — matches the
 * spec's own naming (POST /api/webhooks/[deploymentId]) and lets a
 * deployment be addressed independent of module id churn.
 *
 * Signature scheme: HMAC-SHA256 over the raw JSON body, hex-encoded, sent as
 * `X-ContentStorm-Signature`. Timing-safe comparison isn't needed on the
 * sending side (we're not verifying anything here, we're producing the
 * signature the receiver will verify) — included below only as the doc
 * comment for what the receiving platform must do, not code this route runs.
 */
export const POST = tenantRoute(async (ctx, _req: Request, { params }: Ctx) => {
  const { deploymentId } = await params;

  const deployment = await prisma.deploymentProfile.findUnique({
    where: { id: deploymentId },
    include: {
      module: {
        include: {
          perspectives: { orderBy: { persona: "asc" } },
          contradictionMap: true,
          scriptBlocks: { orderBy: { order: "asc" } },
          renderJob: true,
        },
      },
    },
  });
  if (!deployment) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  assertOrg(deployment.module.orgId, ctx);

  if (!deployment.webhookUrl) {
    return NextResponse.json(
      { error: "WEBHOOK_NOT_CONFIGURED", message: "This deployment has no webhookUrl set." },
      { status: 409 }
    );
  }

  const payload = {
    moduleId: deployment.module.id,
    title: deployment.module.title,
    perspectives: deployment.module.perspectives,
    contradictionMap: deployment.module.contradictionMap,
    scriptBlocks: deployment.module.scriptBlocks,
    compiledVideoUrl: deployment.module.renderJob?.compiledVideoUrl ?? null,
    isPublic: deployment.isPublic,
    watermarkEnabled: deployment.watermarkEnabled,
    firedAt: new Date().toISOString(),
  };
  const body = JSON.stringify(payload);

  const signature = deployment.webhookSecret
    ? createHmac("sha256", deployment.webhookSecret).update(body).digest("hex")
    : null;

  try {
    const res = await fetch(deployment.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature ? { "X-ContentStorm-Signature": signature } : {}),
      },
      body,
    });

    return NextResponse.json({
      fired: true,
      deploymentId,
      targetStatus: res.status,
      signed: signature !== null,
    });
  } catch (err) {
    console.error(`[webhook] fire failed for deployment ${deploymentId}:`, err);
    return NextResponse.json(
      { error: "DELIVERY_FAILED", message: (err as Error).message },
      { status: 502 }
    );
  }
});

/**
 * Reference implementation for the RECEIVING platform to verify the
 * signature above — not called by this route, documented here since it's
 * the other half of the contract this endpoint defines.
 */
export function verifyWebhookSignature(
  rawBody: string,
  secret: string,
  receivedSignatureHex: string
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(receivedSignatureHex, "hex");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
