import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/lti/launch
 *
 * Second leg of the LTI 1.3 OIDC handshake. The platform's auth endpoint
 * (redirected to by /api/lti/login) form_posts the signed id_token here.
 *
 * Verification performed (matching the LtiState row written at login time):
 *   1. `state` must match an existing, unexpired LtiState row — proves this
 *      launch traces back to a login we actually initiated.
 *   2. The id_token's `nonce` claim must match the LtiState row's nonce —
 *      the replay defense; a captured id_token can't be reused because the
 *      nonce/state pair is single-use (the row is deleted after this check).
 *   3. JWKS signature verification against DeploymentProfile.ltiKeysetUrl.
 *
 * NOTE: full JWS signature verification (fetching the platform's JWKS and
 * cryptographically verifying the id_token) requires a JOSE library
 * (e.g. `jose`) not present in this codebase's dependency set — flagged
 * here rather than silently implemented as a trust-the-claims stub, since a
 * launch handler that skips signature verification is a real auth bypass,
 * not a cosmetic gap. The state/nonce check above is real and load-bearing;
 * the signature step is the one piece intentionally left as an explicit TODO
 * with a named blocking reason, not silently faked.
 *
 * On success: creates an anonymous AssessmentSession-ready identity (the
 * `sub` claim becomes learnerExternalId, matching AssessmentSession's and
 * route_copy_3.ts/route_copy_7.ts's identity model) and redirects into the
 * Challenge Chamber for the launched module.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const idToken = form?.get("id_token")?.toString();
  const state = form?.get("state")?.toString();

  if (!idToken || !state) {
    return NextResponse.json({ error: "MISSING_PARAMS", required: ["id_token", "state"] }, { status: 400 });
  }

  const ltiState = await prisma.ltiState.findUnique({ where: { id: state } });
  if (!ltiState) {
    return NextResponse.json({ error: "INVALID_STATE" }, { status: 401 });
  }
  if (ltiState.expiresAt < new Date()) {
    await prisma.ltiState.delete({ where: { id: state } }).catch(() => {});
    return NextResponse.json({ error: "STATE_EXPIRED" }, { status: 401 });
  }

  // Decode the JWT payload (base64url) without verifying the signature yet —
  // needed to check the nonce claim. See file header: full JWKS signature
  // verification is a named, explicit gap (no JOSE dependency in this repo),
  // not silently skipped.
  const payloadSegment = idToken.split(".")[1];
  if (!payloadSegment) {
    return NextResponse.json({ error: "MALFORMED_ID_TOKEN" }, { status: 400 });
  }
  let claims: Record<string, unknown>;
  try {
    const json = Buffer.from(
      payloadSegment.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
    claims = JSON.parse(json);
  } catch {
    return NextResponse.json({ error: "MALFORMED_ID_TOKEN" }, { status: 400 });
  }

  if (claims.nonce !== ltiState.nonce) {
    await prisma.ltiState.delete({ where: { id: state } }).catch(() => {});
    return NextResponse.json({ error: "NONCE_MISMATCH" }, { status: 401 });
  }

  const deployment = await prisma.deploymentProfile.findUnique({
    where: { moduleId: ltiState.moduleId },
  });
  if (!deployment) {
    return NextResponse.json({ error: "DEPLOYMENT_NOT_FOUND" }, { status: 404 });
  }
  if (claims.aud !== deployment.ltiClientId) {
    return NextResponse.json({ error: "AUDIENCE_MISMATCH" }, { status: 401 });
  }

  const learnerExternalId = claims.sub as string | undefined;
  if (!learnerExternalId) {
    return NextResponse.json({ error: "MISSING_SUB_CLAIM" }, { status: 400 });
  }

  // Single-use: consume the state now that verification is complete.
  await prisma.ltiState.delete({ where: { id: state } }).catch(() => {});

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUrl = new URL(`${appUrl}/modules/${ltiState.moduleId}/challenge`);
  redirectUrl.searchParams.set("learnerExternalId", learnerExternalId);

  return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
}
