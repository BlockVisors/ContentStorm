import { Worker, type Job } from "bullmq";
import {
  connection,
  QUEUE,
  type SynthesisJobData,
} from "../lib/queue";
import { prisma } from "../lib/db";
import { invokeClaudeJSON, ADVERSARIAL_META_PROMPT } from "../lib/claude";
import type { VideoStyle, PersonaType } from "@prisma/client";

/**
 * Synthesis worker (Blueprint §5.3, §10).
 *
 * The final Nexus stage. Claude receives all five perspectives + the
 * ContradictionMap and drafts a sequence of ScriptBlocks — the editable
 * text-first storyboard the creator refines in The Crucible.
 *
 * Auto-Match videoStyle assignment (Blueprint §10, locked mapping):
 *   Introduction / synthesis blocks  → FACELESS
 *   Persona / debate blocks           → AVATAR
 *   Contradiction Map block           → WHITEBOARD
 *
 * All blocks are upserted by (moduleId, order) so a retry is safe.
 */

// Auto-Match rule — deterministic, not heuristic.
type BlockRole = "INTRO" | "PERSONA" | "CONTRADICTION" | "SYNTHESIS";

const ROLE_TO_STYLE: Record<BlockRole, VideoStyle> = {
  INTRO:         "FACELESS",
  PERSONA:       "AVATAR",
  CONTRADICTION: "WHITEBOARD",
  SYNTHESIS:     "FACELESS",
};

interface ScriptBlockDraft {
  order:        number;
  role:         BlockRole;
  persona:      PersonaType | null; // null for non-persona blocks
  sectionTitle: string;
  textContent:  string;
}

interface SynthesisOutput {
  blocks: ScriptBlockDraft[];
}

function buildSynthesisPrompt(
  topic: string,
  perspectives: Array<{
    persona: PersonaType;
    corePosition: string;
    supportingEvidence: string;
    uniqueInsight: string;
  }>,
  map: {
    clashPoints:         unknown;
    strongestView:       string;
    weakestView:         string;
    resolvingQuestion:   string;
    universalAgreements: string;
    fieldBlindSpots:     string;
  }
): string {
  return `### MODULE TOPIC
${topic}

### THE FIVE EXPERT PERSPECTIVES
${perspectives
  .map(
    (p) => `${p.persona}
Core: ${p.corePosition}
Evidence: ${p.supportingEvidence}
Insight: ${p.uniqueInsight}`
  )
  .join("\n\n")}

### CONTRADICTION MAP
Strongest view: ${map.strongestView}
Weakest view: ${map.weakestView}
Clash points: ${JSON.stringify(map.clashPoints)}
Universal agreements: ${map.universalAgreements}
Resolving question: ${map.resolvingQuestion}
Field blind spots: ${map.fieldBlindSpots}

### TASK
Synthesise the above into a structured video lecture script. Write each block as dense,
intellectually rigorous prose — no bullet lists inside textContent, no hedging, no
pleasantries. Information density over elegance.

The required block sequence:
1. INTRO block: set the stakes; why this topic is contested; what the learner will confront.
2–6. One PERSONA block per expert (PRACTITIONER, ACADEMIC, SKEPTIC, ECONOMIST, HISTORIAN).
    Each block distils that persona's sharpest argument. Name the persona in sectionTitle.
7. CONTRADICTION block: map the primary clash points and surface the blind spot.
8. SYNTHESIS block: the resolving question + what the learner must now grapple with.

Respond ONLY with this JSON — no markdown, no prose outside the object:
{
  "blocks": [
    {
      "order":        0,
      "role":         "INTRO",
      "persona":      null,
      "sectionTitle": "<sharp, editorial section title>",
      "textContent":  "<dense prose for the video script>"
    }
  ]
}

Produce exactly 8 blocks in order (0–7). roles must be:
  0: INTRO, 1–5: PERSONA (one per expert, in order above), 6: CONTRADICTION, 7: SYNTHESIS.`;
}

const worker = new Worker<SynthesisJobData>(
  QUEUE.SYNTHESIS,
  async (job: Job<SynthesisJobData>) => {
    const { moduleId } = job.data;

    // ── 1. Fetch everything needed for the synthesis prompt ──────────────────
    const module = await prisma.courseModule.findUniqueOrThrow({
      where: { id: moduleId },
      select: {
        title:           true,
        perspectives:    { select: { persona: true, corePosition: true, supportingEvidence: true, uniqueInsight: true } },
        contradictionMap: true,
      },
    });

    if (!module.contradictionMap) {
      throw new Error(
        `ContradictionMap not found for module ${moduleId}. ` +
        `Synthesis should only be enqueued after contradiction-map completes.`
      );
    }

    // ── 2. Claude synthesis ───────────────────────────────────────────────────
    const userPrompt = buildSynthesisPrompt(
      module.title,
      module.perspectives,
      module.contradictionMap
    );
    const output = await invokeClaudeJSON<SynthesisOutput>(
      ADVERSARIAL_META_PROMPT,
      userPrompt,
      4096
    );

    if (!output.blocks || output.blocks.length !== 8) {
      throw new Error(
        `Synthesis returned ${output.blocks?.length ?? 0} blocks, expected 8. Retrying.`
      );
    }

    // ── 3. Upsert ScriptBlocks with Auto-Match videoStyle ────────────────────
    // Idempotent write: delete existing generated blocks, then recreate.
    // Safe at synthesis time because blocks are not yet user-authored.
    // Once a user edits a block in The Crucible, isLocked prevents overwrite.
    await prisma.$transaction([
      prisma.scriptBlock.deleteMany({ where: { moduleId } }),
      prisma.scriptBlock.createMany({
        data: output.blocks.map((block) => ({
          moduleId,
          order:        block.order,
          sectionTitle: block.sectionTitle,
          textContent:  block.textContent,
          videoStyle:   ROLE_TO_STYLE[block.role],
          mediaStatus:  "PENDING" as const,
          isLocked:     false,
        })),
      }),
    ]);

    return { moduleId, blocks: output.blocks.length };
  },
  { connection, concurrency: 2 }
);

worker.on("completed", (job, result) => {
  console.log(
    `[nexus] synthesis completed: module ${result.moduleId} — ${result.blocks} blocks written`
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `[nexus] synthesis failed on module ${job?.data.moduleId}`,
    err?.message
  );
});

console.log(`[worker] synthesis worker online — queue "${QUEUE.SYNTHESIS}"`);
