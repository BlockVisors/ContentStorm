import { Worker, type Job } from "bullmq";
import {
  connection,
  QUEUE,
  type PersonaScanJobData,
  contradictionQueue,
  defaultJobOptions,
} from "../lib/queue";
import { prisma } from "../lib/db";
import { matchChunks } from "../lib/vector";
import { embedBatch } from "../lib/embeddings";
import {
  invokeClaudeJSON,
  ADVERSARIAL_META_PROMPT,
} from "../lib/claude";

/**
 * Persona-scan worker (Blueprint §5.2, §7, §8).
 *
 * One job per persona per module. Five jobs run in parallel (concurrency: 5).
 * Each job:
 *   1. Embeds a persona-specific grounding query
 *   2. RAG-retrieves the k=10 most relevant notebook chunks
 *   3. Invokes Claude with the adversarial meta-prompt + retrieved context
 *   4. Upserts the ExpertPerspective row (idempotent on retry)
 *   5. Checks if all 5 personas are done → enqueues contradiction-map job
 *
 * Source-bias prevention: each persona retrieves independently using its own
 * grounding query. No persona sees another's output at this stage.
 */

// Per-persona RAG grounding queries — domain-focused so the retrieval vector
// targets the most relevant notebook sections for that expert's frame.
const PERSONA_QUERIES: Record<PersonaScanJobData["persona"], string> = {
  PRACTITIONER:
    "operational implementation challenges deployment friction real-world constraints technical limitations",
  ACADEMIC:
    "empirical evidence peer-reviewed research methodology formal study data analysis",
  SKEPTIC:
    "weaknesses risks edge cases failure modes security vulnerabilities contradictions",
  ECONOMIST:
    "financial incentives cost benefit market dynamics value capture business model revenue",
  HISTORIAN:
    "historical precedent technology cycles patterns past analogues adoption curve standards",
};

// Output schema Claude must return — maps directly onto ExpertPerspective columns.
interface PersonaOutput {
  corePosition: string;       // 2–3 sentence core thesis
  supportingEvidence: string; // grounded data points from retrieved chunks
  uniqueInsight: string;      // the domain-isolated insight no other persona holds
}

function buildUserPrompt(
  persona: PersonaScanJobData["persona"],
  topic: string,
  chunks: { content: string; sourceRef: string }[]
): string {
  const contextBlock = chunks
    .map((c, i) => `[SOURCE ${i + 1} — ${c.sourceRef}]\n${c.content}`)
    .join("\n\n---\n\n");

  return `### YOUR PERSONA
${persona}

### MODULE TOPIC
${topic}

### RETRIEVED SOURCE CONTEXT
${contextBlock}

### TASK
As the ${persona}, analyse the topic above using ONLY the source context provided.
Ground every claim in a specific source. Tag any assertion without source support as
[UNVERIFIED_ASSUMPTION].

Respond with ONLY this JSON object — no markdown, no prose outside the JSON:
{
  "corePosition":       "<2–3 sentence adversarial thesis from the ${persona} frame>",
  "supportingEvidence": "<3–5 specific, grounded data points from the sources>",
  "uniqueInsight":      "<the one insight only the ${persona} would surface — the angle the other four personas would miss>"
}`;
}

const ALL_PERSONAS: PersonaScanJobData["persona"][] = [
  "PRACTITIONER",
  "ACADEMIC",
  "SKEPTIC",
  "ECONOMIST",
  "HISTORIAN",
];

const worker = new Worker<PersonaScanJobData>(
  QUEUE.PERSONA_SCAN,
  async (job: Job<PersonaScanJobData>) => {
    const { moduleId, notebookId, persona } = job.data;

    // ── 1. Fetch the module title for the Claude prompt ──────────────────────
    const module = await prisma.courseModule.findUniqueOrThrow({
      where: { id: moduleId },
      select: { title: true },
    });

    // ── 2. RAG retrieval — persona-isolated ──────────────────────────────────
    const [queryEmbedding] = await embedBatch([PERSONA_QUERIES[persona]]);
    const chunks = await matchChunks(notebookId, queryEmbedding, 10);

    if (chunks.length === 0) {
      throw new Error(
        `No embedded chunks found for notebook ${notebookId}. ` +
        `Ensure ingest completed before initialising the Nexus.`
      );
    }

    // ── 3. Claude adversarial scan ───────────────────────────────────────────
    const userPrompt = buildUserPrompt(persona, module.title, chunks);
    const output = await invokeClaudeJSON<PersonaOutput>(
      ADVERSARIAL_META_PROMPT,
      userPrompt,
      1500
    );

    // ── 4. Upsert ExpertPerspective (idempotent on BullMQ retry) ────────────
    await prisma.expertPerspective.upsert({
      where: { moduleId_persona: { moduleId, persona } },
      create: {
        moduleId,
        persona,
        corePosition:       output.corePosition,
        supportingEvidence: output.supportingEvidence,
        uniqueInsight:      output.uniqueInsight,
      },
      update: {
        corePosition:       output.corePosition,
        supportingEvidence: output.supportingEvidence,
        uniqueInsight:      output.uniqueInsight,
      },
    });

    // ── 5. Fan-forward gate: all 5 done? → enqueue contradiction map ─────────
    const doneCount = await prisma.expertPerspective.count({
      where: { moduleId },
    });

    if (doneCount >= ALL_PERSONAS.length) {
      // Stable jobId prevents duplicate contradiction-map jobs if two
      // persona scans finish within the same tick.
      await contradictionQueue().add(
        `contradiction-${moduleId}`,
        { moduleId, orgId: job.data.orgId },
        { ...defaultJobOptions, jobId: `contradiction-${moduleId}` }
      );
    }

    return { persona, chunks: chunks.length };
  },
  // Five personas run in parallel — one concurrency slot per persona.
  { connection, concurrency: 5 }
);

worker.on("completed", (job, result) => {
  console.log(
    `[nexus] persona-scan completed: ${result.persona} — ${result.chunks} chunks retrieved`
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `[nexus] persona-scan failed: ${job?.data.persona} on module ${job?.data.moduleId}`,
    err?.message
  );
});

console.log(`[worker] persona-scan worker online — queue "${QUEUE.PERSONA_SCAN}"`);
