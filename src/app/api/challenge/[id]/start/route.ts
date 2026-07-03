import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { generateChallengePrompt } from "@/lib/challenge";

type Ctx = { params: Promise<{ id: string }> };

// [id] here is moduleId — a session doesn't exist yet at start time, unlike
// respond/crisis/GET where [id] is sessionId. Matches route_copy_3.ts and
// route_copy_7.ts's identity model: internal Clerk session OR an anonymous
// LTI learner, not tenantRoute — a learner defending a module isn't
// necessarily an org member (external LTI launches have no Clerk account,
// per DeploymentProfile's design and LtiState's launch flow).
const StartBody = z.object({
  userInitialThesis: z.string().min(10).max(4000),
  // Present for anonymous LTI launches (the `sub` claim from the platform's
  // id_token, resolved during /api/lti/launch and handed to the client).
  // Absent for internal learners — auth() resolves learnerInternalId instead.
  learnerExternalId: z.string().optional(),
});

/**
 * POST /api/challenge/[id]/start
 *
 * [id] = moduleId. Opens a new AssessmentSession: generates the opening
 * adversarial challenge from the module's ContradictionMap + a 1200-char
 * script summary, then creates the session with all 5 standing personas as
 * remainingPersonas for the first respond() call to draw from.
 *
 * Requires the module to have both a notebook (S_GA needs SourceChunks to
 * ground against, per challenge.ts's canonical evaluateDefense) and a
 * completed ContradictionMap (the challenge prompt is derived from it) —
 * same preconditions route_copy_3.ts's Crisis Mode enforces for consistency.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id: moduleId } = await params;

  const module_ = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: {
      contradictionMap: true,
      scriptBlocks: { orderBy: { order: "asc" }, take: 6, select: { textContent: true } },
    },
  });
  if (!module_) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!module_.notebookId) {
    return NextResponse.json({ error: "NO_NOTEBOOK" }, { status: 409 });
  }
  if (!module_.contradictionMap) {
    return NextResponse.json({ error: "NO_CONTRADICTION_MAP" }, { status: 409 });
  }

  const parsed = StartBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { userId } = await auth();
  const { userInitialThesis, learnerExternalId } = parsed.data;

  if (!userId && !learnerExternalId) {
    return NextResponse.json(
      { error: "NO_LEARNER_IDENTITY", message: "Sign in, or launch via LTI, before starting a session." },
      { status: 401 }
    );
  }

  const scriptSummary = module_.scriptBlocks
    .map((b) => b.textContent)
    .join("\n\n")
    .slice(0, 1200);

  const challengePrompt = await generateChallengePrompt({
    moduleTitle: module_.title,
    contradictionMap: {
      clashPoints:       module_.contradictionMap.clashPoints,
      resolvingQuestion: module_.contradictionMap.resolvingQuestion,
      fieldBlindSpots:   module_.contradictionMap.fieldBlindSpots,
      strongestView:     module_.contradictionMap.strongestView,
    },
    scriptSummary,
  });

  const session = await prisma.assessmentSession.create({
    data: {
      moduleId,
      learnerInternalId: userId ?? null,
      learnerExternalId: userId ? null : (learnerExternalId as string),
      challengePrompt,
      userInitialThesis,
      status: "IN_PROGRESS",
      isCrisisMode: false,
    },
  });

  return NextResponse.json(session, { status: 201 });
}
