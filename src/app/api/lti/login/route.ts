import { NextResponse } from "next/server";
import { randomUUID, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

/**
 * POST /api/lti/login
 *
 * LTI 1.3 third-party initiated login (IMS Security Framework §5.1.1) — the
 * first leg of the OIDC handshake. The LMS platform (Canvas/Workday/Honen)
 * POSTs here with `iss`, `login_hint`, `target_link_uri`, and either
 * `client_id` or a resolvable deployment; this route:
 *
 *   1. Resolves which module/deployment the platform is launching by parsing
 *      target_link_uri (expected shape: {appUrl}/lti/launch/{moduleId}).
 *   2. Generates `state` (also used as the LtiState row's id — a single
 *      random value serves both roles safely, since the row is the only
 *      place `state` is looked up) and `nonce`.
 *   3. Persists an LtiState row (5-minute TTL) so /api/lti/launch can verify
 *      the id_token's nonce actually corresponds to a login we initiated —
 *      the core CSRF/replay defense of the OIDC flow.
 *   4. 302-redirects the browser to the platform's OIDC auth endpoint
 *      (DeploymentProfile.ltiPlatformOidcUrl) with the required auth params.
 *
 * Platform-initiated only — this is never called by our own frontend.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const loginHint = form.get("login_hint")?.toString();
  const targetLinkUri = form.get("target_link_uri")?.toString();
  const platformClientId = form.get("client_id")?.toString();

  if (!loginHint || !targetLinkUri) {
    return NextResponse.json(
      { error: "MISSING_PARAMS", required: ["login_hint", "target_link_uri"] },
      { status: 400 }
    );
  }

  // Expected target_link_uri shape: {appUrl}/lti/launch/{moduleId}
  const moduleIdMatch = targetLinkUri.match(/\/lti\/launch\/([^/?#]+)/);
  const moduleId = moduleIdMatch?.[1];
  if (!moduleId) {
    return NextResponse.json(
      { error: "UNRESOLVABLE_TARGET", message: "target_link_uri did not contain a recognizable module id." },
      { status: 400 }
    );
  }

  const deployment = await prisma.deploymentProfile.findUnique({
    where: { moduleId },
  });
  if (!deployment || !deployment.ltiPlatformOidcUrl || !deployment.ltiClientId || !deployment.ltiDeploymentId) {
    return NextResponse.json(
      { error: "LTI_NOT_CONFIGURED", moduleId },
      { status: 409 }
    );
  }
  if (platformClientId && platformClientId !== deployment.ltiClientId) {
    return NextResponse.json({ error: "CLIENT_ID_MISMATCH" }, { status: 401 });
  }

  const state = randomUUID();
  const nonce = randomBytes(16).toString("hex");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/lti/launch`;

  await prisma.ltiState.create({
    data: {
      id: state,
      nonce,
      moduleId,
      deploymentId: deployment.ltiDeploymentId,
      redirectUri,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const authUrl = new URL(deployment.ltiPlatformOidcUrl);
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("response_type", "id_token");
  authUrl.searchParams.set("response_mode", "form_post");
  authUrl.searchParams.set("prompt", "none");
  authUrl.searchParams.set("client_id", deployment.ltiClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("login_hint", loginHint);
  const ltiMessageHint = form.get("lti_message_hint")?.toString();
  if (ltiMessageHint) authUrl.searchParams.set("lti_message_hint", ltiMessageHint);

  return NextResponse.redirect(authUrl.toString(), { status: 302 });
}
