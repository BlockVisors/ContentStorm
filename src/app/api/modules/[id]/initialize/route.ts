import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tenantRoute, assertOrg } from "@/lib/tenancy";
import { personaScanQueue, defaultJobOptions } from "@/lib/queue";
import type { PersonaType } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

const ALL_PERSONAS: PersonaType[] = [
  "PRACTITIONER",
  "ACADEMIC",
  "SKEPTIC",
  "ECONOMIST",
  "HISTORIAN",
];

/**
 * POST /api/modules/[id]/initialize
 *
 * The Nexus (Blueprint §5.2). Fires five parallel persona-scan jobs, one per
 * PersonaType. Each job independently RAG-queries the module's notebook and
 * writes its own ExpertPerspective row — source-bias prevention means no
 * persona ever sees another's output at this stage, so nothing here waits on
 * or sequences the five jobs relative to each other.
 *
 * Once all five ExpertPerspective rows exist, persona-scan.worker.ts's own
 * fan-in check enqueues the contradiction-map job automatically — this route
 * does not need to poll for completion or chain the next stage itself.
 *
 * Requires the module to have a notebook with vectorStatus COMPLETED —
 * initializing against an unembedded or still-processing notebook would let
 * every persona ground on an empty chunk set.
 */
export const POST = tenantRoute(async (ctx, _req: Request, { params }: Ctx) => {
  const { id: moduleId } = await params;

  const module_ = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: {
      notebook: { select: { id: true, vectorStatus: true } },
      perspectives: { select: { persona: true } },
    },
  });
  if (!module_) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  assertOrg(module_.orgId, ctx);

  if (!module_.notebookId || !module_.notebook) {
    return NextResponse.json(
      { error: "NO_NOTEBOOK", message: "Attach a notebook to this module before initializing." },
      { status: 409 }
    );
  }
  if (module_.notebook.vectorStatus !== "COMPLETED") {
    return NextResponse.json(
      {
        error: "NOTEBOOK_NOT_READY",
        message: `Notebook ingest is ${module_.notebook.vectorStatus.toLowerCase()}, not complete.`,
        vectorStatus: module_.notebook.vectorStatus,
      },
      { status: 409 }
    );
  }
  if (module_.perspectives.length > 0) {
    return NextResponse.json(
      { error: "ALREADY_INITIALIZED", perspectiveCount: module_.perspectives.length },
      { status: 409 }
    );
  }

  await Promise.all(
    ALL_PERSONAS.map((persona) =>
      personaScanQueue().add(
        `persona-scan-${moduleId}-${persona}`,
        {
          moduleId,
          notebookId: module_.notebookId as string,
          orgId: ctx.orgId,
          persona,
        },
        { ...defaultJobOptions, jobId: `persona-scan-${moduleId}-${persona}` }
      )
    )
  );

  return NextResponse.json(
    { moduleId, personasQueued: ALL_PERSONAS },
    { status: 202 }
  );
});
