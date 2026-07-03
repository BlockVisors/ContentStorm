import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { tenantRoute, assertOrg } from "@/lib/tenancy";
import { ingestQueue, defaultJobOptions, type IngestSource } from "@/lib/queue";

type Ctx = { params: Promise<{ id: string }> };

const IngestSourceSchema = z.object({
  kind:  z.enum(["pdf", "url", "text"]),
  label: z.string().min(1),
  s3Key: z.string().optional(),
  url:   z.string().url().optional(),
  raw:   z.string().optional(),
}).refine(
  (s) =>
    (s.kind === "pdf" && !!s.s3Key) ||
    (s.kind === "url" && !!s.url) ||
    (s.kind === "text" && !!s.raw),
  { message: "Each source must supply the field matching its kind (s3Key/url/raw)." }
);

const IngestBody = z.object({
  sources: z.array(IngestSourceSchema).min(1).max(20),
});

/**
 * POST /api/notebooks/[id]/ingest
 *
 * The Vault (Blueprint §5.1). Enqueues a single ingest job covering every
 * supplied source — the worker itself iterates sources and upserts
 * SourceChunk rows per source, clearing each source's previously-produced
 * chunks first (idempotent on BullMQ retry, keyed `ingest-<notebookId>` at
 * the queue layer via job id below, so a notebook can only have one ingest
 * in flight at a time).
 *
 * Flips Notebook.vectorStatus to PROCESSING immediately so the dashboard can
 * reflect ingest-in-progress without waiting on the worker to pick up the job.
 */
export const POST = tenantRoute(async (ctx, req: Request, { params }: Ctx) => {
  const { id: notebookId } = await params;

  const notebook = await prisma.notebook.findUnique({
    where: { id: notebookId },
    select: { id: true, orgId: true, vectorStatus: true },
  });
  if (!notebook) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  assertOrg(notebook.orgId, ctx);

  if (notebook.vectorStatus === "PROCESSING") {
    return NextResponse.json(
      { error: "INGEST_IN_PROGRESS", message: "This notebook already has an ingest job running." },
      { status: 409 }
    );
  }

  const parsed = IngestBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  await prisma.notebook.update({
    where: { id: notebookId },
    data: { vectorStatus: "PROCESSING" },
  });

  await ingestQueue().add(
    `ingest-${notebookId}`,
    {
      notebookId,
      orgId: ctx.orgId,
      sources: parsed.data.sources as IngestSource[],
    },
    { ...defaultJobOptions, jobId: `ingest-${notebookId}` }
  );

  return NextResponse.json({ notebookId, vectorStatus: "PROCESSING" }, { status: 202 });
});
