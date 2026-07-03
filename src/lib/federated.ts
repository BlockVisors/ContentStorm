import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "./db";

/**
 * Federated Edge Runtime — routing + token management (V2-7).
 *
 * Two things live here:
 *   1. Node lifecycle: token issuance/verification, active-node lookup.
 *   2. Local-cluster inference: talking to a deployed node's model cluster
 *      instead of Content Storm's cloud APIs — the actual mechanism behind
 *      "source notebooks never leave the client's firewall." Assumes an
 *      OpenAI-compatible /v1/chat/completions endpoint, the standard
 *      self-hosted-model-server interface (vLLM, Ollama, LocalAI,
 *      text-generation-webui all expose this) rather than assuming a
 *      specific vendor's proprietary API shape.
 *
 * A node is considered routable only if ACTIVE *and* its last heartbeat is
 * recent — a node whose heartbeat has gone stale is treated exactly like no
 * node exists (routes fall back to the cloud) rather than silently sending
 * real traffic at a cluster that might be down. Recency is checked at read
 * time, not by a background job flipping status — simpler, always correct.
 */

const HEARTBEAT_STALE_MS = 10 * 60 * 1000; // 10 minutes

export interface FederatedRoutingTarget {
  nodeId:       string;
  endpoint:     string;
  modelCluster: string;
}

/**
 * The org's active, live Federated Edge node, if any. Null means "route to
 * Content Storm's cloud APIs" — the default for every org without this
 * add-on, and the fallback for an org whose node has gone stale.
 */
export async function getActiveFederatedNode(orgId: string): Promise<FederatedRoutingTarget | null> {
  const node = await prisma.federatedNode.findFirst({
    where:   { orgId, status: "ACTIVE" },
    orderBy: { lastHeartbeat: "desc" },
  });
  if (!node || !node.lastHeartbeat) return null;
  if (Date.now() - node.lastHeartbeat.getTime() > HEARTBEAT_STALE_MS) return null;

  return { nodeId: node.id, endpoint: node.nodeEndpoint, modelCluster: node.modelCluster };
}

// ── Token issuance/verification ───────────────────────────────────────────────

/** Issued once at registration. Raw token is returned to the caller and never stored — only its hash. */
export function generateNodeToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashNodeToken(token) };
}

export function hashNodeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison — heartbeat auth shouldn't leak timing info about a valid hash. */
export function verifyNodeToken(providedToken: string, storedHash: string): boolean {
  const providedHash = Buffer.from(hashNodeToken(providedToken));
  const stored        = Buffer.from(storedHash);
  if (providedHash.length !== stored.length) return false;
  return timingSafeEqual(providedHash, stored);
}

// ── Local-cluster inference ───────────────────────────────────────────────────

/**
 * Call a Federated Edge node's local model cluster instead of Anthropic's
 * cloud API. Same OpenAI-compatible chat-completions shape used by
 * src/lib/utility.ts, since that's what local model servers standardize on.
 */
export async function invokeLocalClusterText(
  target: FederatedRoutingTarget,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<string> {
  const res = await fetch(`${target.endpoint}/v1/chat/completions`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.FEDERATED_NODE_SECRET
        ? { Authorization: `Bearer ${process.env.FEDERATED_NODE_SECRET}` }
        : {}),
    },
    body: JSON.stringify({
      model:      target.modelCluster,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
    }),
    // Local clusters can be slower than a cloud API under load — generous
    // but bounded, so a dead node fails the job instead of hanging a worker.
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(
      `Federated node ${target.nodeId} inference failed: ${res.status} ${await res.text().catch(() => "")}`
    );
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}
