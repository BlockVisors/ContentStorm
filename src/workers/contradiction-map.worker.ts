import { Worker, type Job } from "bullmq";
import {
  connection,
  QUEUE,
  type ContradictionMapJobData,
  synthesisQueue,
  defaultJobOptions,
} from "../lib/queue";
import { prisma } from "../lib/db";
import { invokeClaudeJSON, ADVERSARIAL_META_PROMPT } from "../lib/claude";
import type { PersonaType } from "@prisma/client";

/**
 * Contradiction-map worker (Blueprint §5.3, §7).
 *
 * Triggered once — after all 5 persona-scan jobs complete. Claude receives
 * all five perspectives simultaneously and produces the ContradictionMap:
 * clashing claims, strongest/weakest grounding, universal agreements, and
 * the field blind spots none of the five addressed.
 *
 * Upserts the ContradictionMap row (idempotent on retry), then enqueues the
 * synthesis job.
 */

interface ClashPoint {
  personaA: PersonaType;
  personaB: PersonaType;
  claim: string;       // what they disagree on
  tensionSummary: string; // why the positions are logically irreconcilable
}

interface ContradictionMapOutput {
  clashPoints:         ClashPoint[];
  strongestView:       string; // persona with the most robustly evidenced position
  weakestView:         string; // persona with the weakest grounding
  resolvingQuestion:   string; // the single question that, if answered, resolves the core tension
  universalAgreements: string; // what all 5 agree on despite their differences
  fieldBlindSpots:     string; // what none of the 5 addressed — the structural gap
}

function buildContradictionPrompt(
  topic: string,
  perspectives: Array<{
    persona: PersonaType;
    corePosition: string;
    supportingEvidence: string;
    uniqueInsight: string;
  }>
): string {
  const perspeciveBlock = perspectives
    .map(
      (p) => `### ${p.persona}
CORE POSITION: ${p.corePosition}
EVIDENCE: ${p.supportingEvidence}
UNIQUE INSIGHT: ${p.uniqueInsight}`
    )
    .join("\n\n");

  return `### MODULE TOPIC
${topic}

### THE FIVE EXPERT PERSPECTIVES
${perspeciveBlock}

### TASK
You are the contradiction-mapping orchestrator. Analyse the five perspectives above with
surgical precision. Your mandate:

1. Identify every logically irreconcilable clash between pairs of perspectives.
2. Determine which perspective has the strongest evidential grounding and which is weakest.
3. Identify what all five agree on despite their differences — the inviolable common ground.
4. Surface the structural blind spot: what is absent from ALL five perspectives that would
   materially change the analysis if addressed?
5. Formulate the single resolving question — the one question that, if definitively answered,
   would collapse the most critical tension.

Amplify friction. Do not smooth contradictions. Do not seek consensus.

Respond ONLY with this JSON — no markdown, no prose outside the object:
{
  "clashPoints": [
    {
      "personaA": "<PERSONA_TYPE>",
      "personaB": "<PERSONA_TYPE>",
      "claim": "<what they disagree on in one sharp sentence>",
      "tensionSummary": "<why these positions are logically irreconcilable>"
    }
  ],
  "strongestView": "<PERSONA_TYPE and one sentence explaining the evidential superiority>",
  "weakestView": "<PERSONA_TYPE and one sentence explaining the grounding failure>",
  "resolvingQuestion": "<the single question that would collapse the primary tension>",
  "universalAgreements": "<what all five agree on — no more than 2–3 sentences>",
  "fieldBlindSpots": "<the structural gap none of the five addressed — be specific>"
}`;
}

const worker = new Worker<ContradictionMapJobData>(
  QUEUE.CONTRADICTION_MAP,
  async (job: Job<ContradictionMapJobData>) => {
    const { moduleId } = job.data;

    // ── 1. Fetch module + all 5 perspectives ─────────────────────────────────
    const module = await prisma.courseModule.findUniqueOrThrow({
      where: { id: moduleId },
      select: {
        title: true,
        perspectives: {
          select: {
            persona:            true,
            corePosition:       true,
            supportingEvidence: true,
            uniqueInsight:      true,
          },
        },
      },
    });

    if (module.perspectives.length < 5) {
      throw new Error(
        `Only ${module.perspectives.length}/5 perspectives ready for module ${moduleId}. ` +
        `This job should not have been enqueued yet.`
      );
    }

    // ── 2. Claude contradiction mapping ──────────────────────────────────────
    const userPrompt = buildContradictionPrompt(module.title, module.perspectives);
    const output = await invokeClaudeJSON<ContradictionMapOutput>(
      ADVERSARIAL_META_PROMPT,
      userPrompt,
      2048
    );

    // ── 3. Upsert ContradictionMap (idempotent on retry) ─────────────────────
    await prisma.contradictionMap.upsert({
      where:  { moduleId },
      create: {
        moduleId,
        clashPoints:         output.clashPoints as any,
        strongestView:       output.strongestView,
        weakestView:         output.weakestView,
        resolvingQuestion:   output.resolvingQuestion,
        universalAgreements: output.universalAgreements as any,
        fieldBlindSpots:     output.fieldBlindSpots as any,
      },
      update: {
        clashPoints:         output.clashPoints as any,
        strongestView:       output.strongestView,
        weakestView:         output.weakestView,
        resolvingQuestion:   output.resolvingQuestion,
        universalAgreements: output.universalAgreements as any,
        fieldBlindSpots:     output.fieldBlindSpots as any,
      },
    });

    // ── 4. Fan-forward to synthesis ───────────────────────────────────────────
    await synthesisQueue().add(
      `synthesis-${moduleId}`,
      { moduleId, orgId: job.data.orgId },
      { ...defaultJobOptions, jobId: `synthesis-${moduleId}` }
    );

    return { moduleId, clashes: output.clashPoints.length };
  },
  { connection, concurrency: 2 }
);

worker.on("completed", (job, result) => {
  console.log(
    `[nexus] contradiction-map completed: module ${result.moduleId} — ${result.clashes} clashes`
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `[nexus] contradiction-map failed on module ${job?.data.moduleId}`,
    err?.message
  );
});

console.log(
  `[worker] contradiction-map worker online — queue "${QUEUE.CONTRADICTION_MAP}"`
);
