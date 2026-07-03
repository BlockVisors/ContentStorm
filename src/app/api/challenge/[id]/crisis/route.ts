import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { generateCrisisAttack } from "@/lib/challenge";

type Ctx = { params: Promise<{ id: string }> };

// Matches gradeLabel()'s F cutoff in src/lib/challenge.ts — "passed baseline"
// means not an outright failure. Crisis Mode is an escalation for someone who
// held their ground, not a rescue mechanism for someone who didn't.
const CRISIS_ELIGIBILITY_MIN_SRS = 60;

/**
 * POST /api/challenge/[id]/crisis
 *
 * [id] = sessionId. Elevates a COMPLETED, passing, canonical-SRS session into
 * Crisis Mode (V2-8): generates the Catalyst's single black-swan disruption
 * (src/lib/challenge.ts::generateCrisisAttack — a fused Skeptic+Economist
 * voice, grounded in the module's contradiction map and the learner's own
 * baseline transcript), appends it as a new ChallengeRound, and flips the
 * session back to IN_PROGRESS with isCrisisMode = true.
 *
 * The existing POST /api/challenge/[id]/respond route needs no changes to
 * handle what happens next — it already reads session.isCrisisMode when
 * calling evaluateDefense (built that way in V2-2, ahead of this feature
 * actually using it), and remainingPersonas is already empty after 5 baseline
 * rounds, so the Catalyst round's defense naturally lands on the final-round
 * branch and re-scores the *entire* session (baseline + crisis) under
 * CRISIS_SRS_WEIGHTS. Crisis Mode escalates the existing session; it doesn't
 * start a parallel one.
 *
 * Same identity model as start/respond: internal Clerk session OR an
 * anonymous LTI learner tied to this specific session, not tenantRoute — a
 * learner isn't necessarily an org member.
 */
export async function POST(_req: Request, { params }: Ctx) {
  const { id: sessionId } = await params;

  const session = await prisma.assessmentSession.findUnique({
    where:   { id: sessionId },
    include: {
      rounds: { orderBy: { createdAt: "asc" } },
      module: { select: { title: true, notebookId: true, contradictionMap: true } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { userId } = await auth();
  const isOwner =
    (userId && session.learnerInternalId === userId) ||
    (!userId && session.learnerExternalId !== null);
  if (!isOwner) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (session.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "SESSION_NOT_COMPLETED", message: "Complete the baseline examination before elevating to Crisis Mode." },
      { status: 409 }
    );
  }
  if (session.srsScore === null) {
    return NextResponse.json(
      {
        error: "LEGACY_SESSION",
        message: "This session predates the canonical SRS formula. Crisis Mode's weight-shift math requires the three-factor breakdown — retake the baseline examination.",
      },
      { status: 409 }
    );
  }
  if (session.srsScore < CRISIS_ELIGIBILITY_MIN_SRS) {
    return NextResponse.json(
      {
        error: "BASELINE_NOT_PASSED",
        message: `Crisis Mode requires a passing baseline score (${CRISIS_ELIGIBILITY_MIN_SRS}+). Current: ${session.srsScore}.`,
        required: CRISIS_ELIGIBILITY_MIN_SRS,
        current: session.srsScore,
      },
      { status: 409 }
    );
  }
  if (session.isCrisisMode) {
    return NextResponse.json(
      { error: "ALREADY_ELEVATED", message: "This session has already been elevated to Crisis Mode." },
      { status: 409 }
    );
  }
  if (!session.module.notebookId) {
    // Same precondition start/route.ts enforces — the final-round evaluator
    // needs a notebook to ground S_GA against, crisis or not.
    return NextResponse.json({ error: "NO_NOTEBOOK" }, { status: 409 });
  }
  if (!session.module.contradictionMap) {
    return NextResponse.json({ error: "NO_CONTRADICTION_MAP" }, { status: 409 });
  }

  const baselineTranscript = session.rounds
    .map(
      (r, i) =>
        `Round ${i + 1} — ${r.interrogator}:\n` +
        `  Attack:  ${r.agentAttack}\n` +
        `  Defense: ${r.userDefense ?? "[none]"}`
    )
    .join("\n\n");

  const crisisAttack = await generateCrisisAttack({
    moduleTitle:      session.module.title,
    contradictionMap: session.module.contradictionMap,
    baselineTranscript,
  });

  const updated = await prisma.assessmentSession.update({
    where: { id: sessionId },
    data: {
      status:       "IN_PROGRESS",
      isCrisisMode: true,
      rounds: {
        create: { interrogator: "CATALYST", agentAttack: crisisAttack },
      },
    },
    include: { rounds: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(updated, { status: 201 });
}
