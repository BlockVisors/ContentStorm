import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { evaluateDefense, type PersonaName, type ChallengeInterrogator } from "@/lib/challenge";
import { submitGradePassback, emitXapiStatements } from "@/lib/lti";

type Ctx = { params: Promise<{ id: string }> };

const ALL_PERSONAS: PersonaName[] = [
  "PRACTITIONER",
  "ACADEMIC",
  "SKEPTIC",
  "ECONOMIST",
  "HISTORIAN",
];

const RespondBody = z.object({
  roundId:     z.string().uuid().optional(), // present after start(); absent on the very first respond() call
  userDefense: z.string().min(10).max(6000),
});

/**
 * POST /api/challenge/[id]/respond
 *
 * [id] = sessionId. The core Challenge Chamber loop (Blueprint §11).
 *
 * Runs synchronously in the request/response cycle by design — no worker,
 * no queue (per the build summary's V2-2 note: this is the one credit-free,
 * zero-latency-tolerance feature in the platform).
 *
 * Round bookkeeping: the FIRST call after start() has no prior ChallengeRound
 * to attach a defense to — it creates round 1 (interrogator = a persona
 * chosen from the full set, since none have gone yet) using the session's
 * own challengePrompt as the "attack." Every subsequent call updates the
 * most recent round's userDefense, then (if not final) creates the next
 * round from evaluateDefense()'s chosen interrogator + attack text.
 *
 * On the final round: computes canonical SRS, persists it, flips status to
 * COMPLETED, and fires LTI grade passback + xAPI statements (fire-and-forget
 * — failures are logged in lti.ts, never surfaced to the learner here).
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id: sessionId } = await params;

  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      rounds: { orderBy: { createdAt: "asc" } },
      module: {
        select: {
          id: true,
          title: true,
          notebookId: true,
          deployment: true,
        },
      },
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
  if (session.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "SESSION_NOT_IN_PROGRESS", status: session.status }, { status: 409 });
  }
  if (!session.module.notebookId) {
    return NextResponse.json({ error: "NO_NOTEBOOK" }, { status: 409 });
  }

  const parsed = RespondBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { userDefense } = parsed.data;

  // ── Resolve which round this defense belongs to ────────────────────────────
  const lastRound = session.rounds.at(-1);
  const isVeryFirstResponse = !lastRound;

  let currentInterrogator: ChallengeInterrogator;
  let attackText: string;
  let roundToUpdateId: string;

  if (isVeryFirstResponse) {
    // Round 1: no ChallengeRound exists yet. The session's own
    // challengePrompt IS the opening attack; pick the first standing
    // interrogator to formally attribute it to.
    currentInterrogator = ALL_PERSONAS[0];
    attackText = session.challengePrompt;
    const created = await prisma.challengeRound.create({
      data: {
        sessionId,
        interrogator: currentInterrogator,
        agentAttack: attackText,
        userDefense,
      },
    });
    roundToUpdateId = created.id;
  } else if (!lastRound.userDefense) {
    // Round already exists (created by a prior respond() call's evaluation)
    // but hasn't been answered yet — attach this defense to it.
    currentInterrogator = lastRound.interrogator as ChallengeInterrogator;
    attackText = lastRound.agentAttack;
    await prisma.challengeRound.update({
      where: { id: lastRound.id },
      data: { userDefense },
    });
    roundToUpdateId = lastRound.id;
  } else {
    return NextResponse.json(
      { error: "ROUND_ALREADY_ANSWERED", message: "Awaiting the next attack — nothing to respond to yet." },
      { status: 409 }
    );
  }

  const answeredRounds = await prisma.challengeRound.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  const remainingPersonas = ALL_PERSONAS.filter(
    (p) => !answeredRounds.some((r) => r.interrogator === p)
  );

  const result = await evaluateDefense({
    challengePrompt: session.challengePrompt,
    userInitialThesis: session.userInitialThesis ?? "",
    notebookId: session.module.notebookId,
    isCrisisMode: session.isCrisisMode,
    previousRounds: answeredRounds.slice(0, -1).map((r) => ({
      interrogator: r.interrogator as ChallengeInterrogator,
      agentAttack: r.agentAttack,
      userDefense: r.userDefense,
    })),
    currentDefense: userDefense,
    currentInterrogator,
    remainingPersonas,
  });

  if (!result.isComplete) {
    const nextRound = await prisma.challengeRound.create({
      data: {
        sessionId,
        interrogator: result.nextInterrogator,
        agentAttack: result.nextAttackText,
      },
    });
    return NextResponse.json({
      isComplete: false,
      roundId: nextRound.id,
      interrogator: nextRound.interrogator,
      attack: nextRound.agentAttack,
    });
  }

  // ── Final round: persist canonical SRS, complete the session ──────────────
  const updated = await prisma.assessmentSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      srsScore: result.srsScore,
      skepticDeflection: result.skepticDeflection,
      sourceGrounding: result.sourceGrounding,
      biasEquilibrium: result.biasEquilibrium,
      collapseTimeline: result.collapseTimeline as any,
      professorCritique: result.professorCritique,
    },
    include: { rounds: { orderBy: { createdAt: "asc" } } },
  });

  // Fire-and-forget: LTI grade passback + xAPI, only if this module has a
  // DeploymentProfile configured for them. Never blocks or fails the
  // learner-facing response — lti.ts logs failures internally.
  if (session.module.deployment) {
    void submitGradePassback(updated, session.module.deployment);
    void emitXapiStatements(updated, session.module.deployment, session.module.id);
  }

  return NextResponse.json({
    isComplete: true,
    session: updated,
  });
}
