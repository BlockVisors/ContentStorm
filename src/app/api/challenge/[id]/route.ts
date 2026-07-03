import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { gradeLabel } from "@/lib/challenge";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/challenge/[id]
 *
 * [id] = sessionId.
 *
 * Returns the full session state — all rounds, current scores, status.
 * Used by the ChallengeChamber component for initial load and after each
 * SUBMIT REBUTTAL response.
 *
 * No SWR polling needed (the UI updates optimistically from the POST response),
 * but the endpoint is available for refresh/reconnect scenarios.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id: sessionId } = await params;

  const session = await prisma.assessmentSession.findUnique({
    where:   { id: sessionId },
    include: { rounds: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // ── Identity guard ────────────────────────────────────────────────────────
  const { userId } = await auth();
  const isOwner =
    (userId && session.learnerInternalId === userId) ||
    session.learnerExternalId !== null;
  if (!isOwner) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Attach computed grade label if session is complete. Canonical sessions
  // (V2-2+) use srsScore; older sessions fall back to their preserved
  // legacyResilienceScore — both are 0–100 int scales, so gradeLabel() applies
  // to either without modification.
  const finalScore = session.srsScore ?? session.legacyResilienceScore;
  const grade =
    session.status === "COMPLETED" && finalScore !== null
      ? gradeLabel(finalScore)
      : null;

  return NextResponse.json({ ...session, grade });
}
