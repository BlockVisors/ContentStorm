import type { AssessmentSession, DeploymentProfile } from "@prisma/client";

/**
 * LTI Advantage Grade Passback + xAPI event stream (Blueprint §13).
 *
 * Both are fire-and-forget: called after AssessmentSession.status flips to
 * COMPLETED. Failures are logged but never surface to the learner.
 *
 * RECONSTRUCTION NOTE: the uploaded version of this file still read the
 * pre-V2-2 fields (session.resilienceScore / vectorBreakdown / weakestLink),
 * which schema.prisma no longer treats as primary — those are now
 * legacyResilienceScore / legacyVectorBreakdown / legacyWeakestLink, with
 * srsScore / collapseTimeline / professorCritique as canonical. Updated here
 * to the same fallback pattern route_copy_7.ts already establishes
 * (finalScore = srsScore ?? legacyResilienceScore) so a session's grade
 * passback and xAPI statements are correct whichever scoring era it's from.
 *
 * Grade passback: LTI Advantage Assignment and Grade Services (AGS).
 *   - POST to deployment.ltiLineItemUrl + "/scores"
 *   - Score is finalScore / 100 (LTI expects 0.0–1.0)
 *   - Includes the Professor's Critique as a comment
 *
 * xAPI: emits one statement per ChallengeRound + one completion statement.
 *   - Verb: "http://adlnet.gov/expapi/verbs/answered" per round
 *   - Verb: "http://adlnet.gov/expapi/verbs/completed" on session end
 *   - Each statement encodes the interrogator, score vector, and outcome
 */

/** A session's grade on the unified 0–100 scale, whichever era produced it. */
function resolveFinalScore(session: AssessmentSession): number | null {
  return session.srsScore ?? session.legacyResilienceScore ?? null;
}

// ── LTI Grade Passback ────────────────────────────────────────────────────────

interface AGSScore {
  userId:          string; // learnerExternalId (sub claim)
  scoreGiven:      number; // 0.0 – 1.0
  scoreMaximum:    number; // always 1.0
  comment:         string;
  activityProgress: "Completed";
  gradingProgress:  "FullyGraded";
  timestamp:       string; // ISO 8601
}

async function getAccessToken(
  tokenUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:            "client_credentials",
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_id:             clientId,
      client_secret:         clientSecret,
      scope:                 "https://purl.imsglobal.org/spec/lti-ags/scope/score",
    }),
  });
  if (!res.ok) throw new Error(`AGS token fetch failed: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

export async function submitGradePassback(
  session: AssessmentSession,
  deployment: DeploymentProfile & { ltiAccessTokenUrl?: string | null; ltiLineItemUrl?: string | null; ltiClientId?: string | null }
): Promise<void> {
  const finalScore = resolveFinalScore(session);

  if (
    !deployment.ltiLineItemUrl ||
    !deployment.ltiAccessTokenUrl ||
    !deployment.ltiClientId ||
    !session.learnerExternalId ||
    finalScore === null
  ) return;

  try {
    const token = await getAccessToken(
      deployment.ltiAccessTokenUrl,
      deployment.ltiClientId,
      process.env.LTI_CLIENT_SECRET ?? ""
    );

    const score: AGSScore = {
      userId:           session.learnerExternalId,
      scoreGiven:       finalScore / 100,
      scoreMaximum:     1.0,
      comment:          session.professorCritique ?? `Resilience Score: ${finalScore}/100`,
      activityProgress: "Completed",
      gradingProgress:  "FullyGraded",
      timestamp:        new Date().toISOString(),
    };

    const res = await fetch(`${deployment.ltiLineItemUrl}/scores`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/vnd.ims.lis.v1.score+json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(score),
    });

    if (!res.ok) {
      console.error(`[lti] grade passback failed: ${res.status} ${await res.text()}`);
    } else {
      console.log(`[lti] grade passback: ${finalScore}/100 → ${deployment.ltiLineItemUrl}`);
    }
  } catch (err) {
    console.error("[lti] grade passback error:", err);
  }
}

// ── xAPI Statement Emitter ────────────────────────────────────────────────────

interface XApiActor {
  objectType: "Agent";
  name:       string;
  account:    { homePage: string; name: string };
}

interface XApiStatement {
  actor:   XApiActor;
  verb:    { id: string; display: { "en-US": string } };
  object:  { objectType: "Activity"; id: string; definition: { name: { "en-US": string }; type: string } };
  result?: { score?: { scaled: number; min: number; max: number }; success?: boolean; completion?: boolean; response?: string; extensions?: Record<string, unknown> };
  context?: { extensions?: Record<string, unknown> };
  timestamp: string;
}

function buildActor(learnerId: string): XApiActor {
  return {
    objectType: "Agent",
    name:       learnerId,
    account:    { homePage: "https://app.contentstorm.ai", name: learnerId },
  };
}

type RoundForXapi = {
  interrogator: string;
  agentAttack:  string;
  userDefense:  string | null;
};

export async function emitXapiStatements(
  session: AssessmentSession & { rounds: RoundForXapi[] },
  deployment: DeploymentProfile,
  moduleId:   string
): Promise<void> {
  if (!deployment.lrsEndpoint || !deployment.lrsKey) return;

  const learnerId = session.learnerInternalId ?? session.learnerExternalId ?? "anonymous";
  const actor     = buildActor(learnerId);
  const moduleUri = `https://app.contentstorm.ai/modules/${moduleId}`;
  const now       = new Date().toISOString();
  const finalScore = resolveFinalScore(session);

  const scoreExtensions = session.srsScore !== null
    ? {
        "https://app.contentstorm.ai/xapi/extensions/skeptic_deflection": session.skepticDeflection,
        "https://app.contentstorm.ai/xapi/extensions/source_grounding":   session.sourceGrounding,
        "https://app.contentstorm.ai/xapi/extensions/bias_equilibrium":   session.biasEquilibrium,
        "https://app.contentstorm.ai/xapi/extensions/collapse_timeline":  session.collapseTimeline,
      }
    : session.legacyVectorBreakdown
      ? {
          "https://app.contentstorm.ai/xapi/extensions/vector_breakdown": session.legacyVectorBreakdown,
          "https://app.contentstorm.ai/xapi/extensions/weakest_link":     session.legacyWeakestLink,
        }
      : undefined;

  const statements: XApiStatement[] = [];

  for (const round of session.rounds) {
    if (!round.userDefense) continue;
    statements.push({
      actor,
      verb: {
        id:      "http://adlnet.gov/expapi/verbs/answered",
        display: { "en-US": "answered" },
      },
      object: {
        objectType: "Activity",
        id:         `${moduleUri}/challenge/${session.id}/round/${round.interrogator}`,
        definition: {
          name: { "en-US": `Challenge Chamber · ${round.interrogator} interrogation` },
          type: "http://adlnet.gov/expapi/activities/interaction",
        },
      },
      result: {
        response: round.userDefense,
        completion: true,
      },
      context: {
        extensions: {
          "https://app.contentstorm.ai/xapi/extensions/interrogator":  round.interrogator,
          "https://app.contentstorm.ai/xapi/extensions/agent_attack":  round.agentAttack,
        },
      },
      timestamp: now,
    });
  }

  if (session.status === "COMPLETED" && finalScore !== null) {
    statements.push({
      actor,
      verb: {
        id:      "http://adlnet.gov/expapi/verbs/completed",
        display: { "en-US": "completed" },
      },
      object: {
        objectType: "Activity",
        id:         `${moduleUri}/challenge/${session.id}`,
        definition: {
          name: { "en-US": "Content Storm Challenge Chamber" },
          type: "http://adlnet.gov/expapi/activities/assessment",
        },
      },
      result: {
        score:      { scaled: finalScore / 100, min: 0, max: 1 },
        success:    finalScore >= 60,
        completion: true,
        response:   session.professorCritique ?? undefined,
        extensions: scoreExtensions,
      },
      timestamp: now,
    });
  }

  if (statements.length === 0) return;

  try {
    const res = await fetch(`${deployment.lrsEndpoint.replace(/\/$/, "")}/statements`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "X-Experience-API-Version": "1.0.3",
        "Authorization": deployment.lrsKey.startsWith("Bearer ")
          ? deployment.lrsKey
          : `Basic ${Buffer.from(deployment.lrsKey).toString("base64")}`,
      },
      body: JSON.stringify(statements),
    });

    if (!res.ok) {
      console.error(`[xapi] statement batch failed: ${res.status}`);
    } else {
      console.log(`[xapi] ${statements.length} statements emitted for session ${session.id}`);
    }
  } catch (err) {
    console.error("[xapi] emit error:", err);
  }
}
