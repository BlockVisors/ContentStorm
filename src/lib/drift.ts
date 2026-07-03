import { prisma } from "./db";
import { invokeClaudeJSON } from "./claude";
import { embedBatch } from "./embeddings";
import { setChunkEmbedding } from "./vector";
import { chunkText } from "./chunking";
import { extractCoreAssertions } from "./utility";
import { personaScanQueue, defaultJobOptions, type PersonaScanJobData } from "./queue";

/**
 * Drift Dashboard — cross-silo inconsistency detection (V2-4, Sovereign only).
 *
 * The source spec frames this as "run cross-repository cosine similarity ->
 * flag divergenceScore > 0.7" as if raw embedding distance were the
 * divergence signal. It isn't, and using it that way would be actively
 * wrong: two directly CONTRADICTORY assertions about the same policy
 * ("refunds within 30 days" vs. "no refunds") are semantically CLOSE — same
 * topic, same entities, high cosine similarity — while two assertions about
 * unrelated topics are semantically FAR APART regardless of whether either
 * one is even true. Raw distance measures topic, not agreement.
 *
 * Correct two-stage pipeline, matching the Hybrid Audit Protocol principle
 * used everywhere else in this codebase (embeddings for deterministic
 * retrieval, the reasoning model for actual judgment):
 *
 *   1. RETRIEVAL (embeddings, cheap, deterministic): extract each notebook's
 *      core assertions (utility model), embed them, and find cross-notebook
 *      assertion PAIRS above a topical-similarity floor — "these two are
 *      talking about the same thing," nothing more.
 *   2. JUDGMENT (Claude, per candidate pair): does this pair actually
 *      contradict, and if so, how severely? divergenceScore is an LLM
 *      judgment of contradiction severity, computed only for pairs that
 *      already passed the topical-relevance filter — not raw embedding
 *      distance.
 *
 * This also bounds cost correctly: the expensive judgment call only ever
 * runs on pairs embeddings have already confirmed are worth checking, not
 * on the full cross product of every assertion against every other.
 */

export const DRIFT_FLAG_THRESHOLD = 0.7;           // divergenceScore above this → DriftRisk row
export const DRIFT_AUTO_REMEDIATE_THRESHOLD = 0.85; // above this → auto-compile a remediation module
const TOPICAL_SIMILARITY_FLOOR = 0.55;              // below this, two assertions aren't worth an LLM judgment call

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface NotebookAssertions {
  notebookId:    string;
  notebookTitle: string;
  assertions:    string[];
  embeddings:    number[][]; // aligned with assertions, same index
}

async function extractAndEmbed(notebookId: string, notebookTitle: string): Promise<NotebookAssertions> {
  const chunks = await prisma.sourceChunk.findMany({
    where:  { notebookId },
    select: { content: true },
    take:   20, // representative sample — a full-corpus read isn't needed to surface core assertions
  });
  if (chunks.length === 0) {
    return { notebookId, notebookTitle, assertions: [], embeddings: [] };
  }

  const combinedText = chunks.map((c) => c.content).join("\n\n");
  const assertions   = await extractCoreAssertions(combinedText);
  if (assertions.length === 0) {
    return { notebookId, notebookTitle, assertions: [], embeddings: [] };
  }

  const embeddings = await embedBatch(assertions);
  return { notebookId, notebookTitle, assertions, embeddings };
}

interface ContradictionJudgment {
  contradicts:      boolean;
  divergenceScore:  number; // 0.0–1.0, only meaningful when contradicts === true
  financialImpact:  string;
  remediationPlan:  string;
}

const DRIFT_JUDGE_SYSTEM_PROMPT = `### ROLE
You are a cross-departmental risk analyst. You are given two assertions,
pulled from two different documentation silos within the same organization,
that an embedding-similarity pass has already flagged as discussing the same
underlying topic. Your job is to judge whether they actually contradict each
other — not just cover similar ground — and if so, how costly that
contradiction is likely to be in practice.

### JUDGMENT CRITERIA
- Two assertions can discuss the same topic without contradicting (one is
  more specific, one is outdated-but-compatible, one is a subset of the
  other) — these are NOT contradictions.
- A real contradiction means: if one silo's assertion is acted on, someone
  operating on the other silo's assertion would be wrong, blocked, or exposed
  to risk they don't know about.
- divergenceScore reflects severity: a minor wording inconsistency scores
  low; a contradiction that would cause a customer-facing error, a compliance
  violation, or a broken commitment scores high.

### OUTPUT CONTRACT
Respond ONLY with a valid JSON object. No markdown. No prose outside the JSON.`;

async function judgeContradiction(
  siloA: string, assertionA: string,
  siloB: string, assertionB: string
): Promise<ContradictionJudgment> {
  const userPrompt = `SILO A (${siloA}): ${assertionA}
SILO B (${siloB}): ${assertionB}

Respond ONLY with this JSON:
{
  "contradicts": <boolean>,
  "divergenceScore": <0.00-1.00, 0 if contradicts is false>,
  "financialImpact": "<one sentence, human-readable risk-overhead estimate — empty string if contradicts is false>",
  "remediationPlan": "<one sentence, concrete next step to reconcile the two silos — empty string if contradicts is false>"
}`;

  return invokeClaudeJSON<ContradictionJudgment>(DRIFT_JUDGE_SYSTEM_PROMPT, userPrompt, 400);
}

export interface DriftScanResult {
  scanned:  number; // notebooks scanned
  flagged:  number; // DriftRisk rows written
  autoRemediated: number;
}

/**
 * Full cross-silo scan for an org. Called by the drift-scan worker
 * (POST /api/drift/detect or a daily cron — either enqueues the same job).
 */
export async function runDriftScan(orgId: string): Promise<DriftScanResult> {
  const notebooks = await prisma.notebook.findMany({
    where:  { orgId, vectorStatus: "COMPLETED" },
    select: { id: true, title: true },
  });

  if (notebooks.length < 2) {
    return { scanned: notebooks.length, flagged: 0, autoRemediated: 0 };
  }

  const perNotebook = await Promise.all(
    notebooks.map((nb) => extractAndEmbed(nb.id, nb.title))
  );

  let flagged = 0;
  let autoRemediated = 0;

  // Cross-notebook pairs only — comparing a silo against itself isn't drift.
  for (let i = 0; i < perNotebook.length; i++) {
    for (let j = i + 1; j < perNotebook.length; j++) {
      const nbA = perNotebook[i];
      const nbB = perNotebook[j];

      for (let ai = 0; ai < nbA.assertions.length; ai++) {
        for (let bi = 0; bi < nbB.assertions.length; bi++) {
          const similarity = cosineSimilarity(nbA.embeddings[ai], nbB.embeddings[bi]);
          if (similarity < TOPICAL_SIMILARITY_FLOOR) continue; // not the same topic — skip, don't spend a judgment call

          const judgment = await judgeContradiction(
            nbA.notebookTitle, nbA.assertions[ai],
            nbB.notebookTitle, nbB.assertions[bi]
          );

          if (!judgment.contradicts || judgment.divergenceScore <= DRIFT_FLAG_THRESHOLD) continue;

          const risk = await prisma.driftRisk.create({
            data: {
              orgId,
              notebookAId: nbA.notebookId,
              siloA:       nbA.notebookTitle,
              assertionA:  nbA.assertions[ai],
              notebookBId: nbB.notebookId,
              siloB:       nbB.notebookTitle,
              assertionB:  nbB.assertions[bi],
              divergenceScore: judgment.divergenceScore,
              financialImpact: judgment.financialImpact,
              remediationPlan: judgment.remediationPlan,
              status: "OPEN",
            },
          });
          flagged++;

          if (judgment.divergenceScore > DRIFT_AUTO_REMEDIATE_THRESHOLD) {
            await autoRemediate(risk.id).catch((err) => {
              // Auto-remediation failing doesn't invalidate the detected
              // risk — the row stays OPEN and is still visible/actionable
              // on the dashboard even if the auto-compile step errors.
              console.error(`[drift] auto-remediation failed for risk ${risk.id}:`, err);
            });
            autoRemediated++;
          }
        }
      }
    }
  }

  return { scanned: notebooks.length, flagged, autoRemediated };
}

/**
 * Auto-generate a targeted remediation module for a DriftRisk. Reuses the
 * existing ingest → persona-scan pipeline rather than inventing a parallel
 * content-generation path: the two conflicting assertions become the source
 * material for a small, purpose-built Notebook, and the standard 5-persona
 * scan runs against it exactly as it would for any manually created module.
 *
 * Runs inline (not queued) — chunking and embedding two short assertion
 * paragraphs takes well under a second, nothing like the multi-minute PDF
 * ingests the async ingest queue exists for. Called both automatically
 * (runDriftScan, divergenceScore > 0.85) and manually
 * (POST /api/drift/[id]/remediate).
 */
export async function autoRemediate(driftRiskId: string): Promise<{ moduleId: string }> {
  const risk = await prisma.driftRisk.findUniqueOrThrow({ where: { id: driftRiskId } });

  const notebook = await prisma.notebook.create({
    data: {
      orgId:        risk.orgId,
      title:        `Remediation — ${risk.siloA} × ${risk.siloB}`,
      vectorStatus: "PROCESSING",
    },
  });

  const sourceText =
    `SILO A (${risk.siloA}) ASSERTS:\n${risk.assertionA}\n\n` +
    `SILO B (${risk.siloB}) ASSERTS:\n${risk.assertionB}\n\n` +
    `DETECTED CONTRADICTION — REMEDIATION TARGET:\n${risk.remediationPlan}`;

  const chunks     = chunkText(sourceText);
  const embeddings = await embedBatch(chunks);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = await prisma.sourceChunk.create({
      data: {
        notebookId: notebook.id,
        content:    chunks[i],
        sourceRef:  `drift-risk:${risk.id}`,
      },
    });
    await setChunkEmbedding(chunk.id, embeddings[i]);
  }

  await prisma.notebook.update({
    where: { id: notebook.id },
    data:  { vectorStatus: "COMPLETED" },
  });

  const module = await prisma.courseModule.create({
    data: {
      orgId:      risk.orgId,
      notebookId: notebook.id,
      title:      `Reconciliation: ${risk.siloA} vs ${risk.siloB}`,
    },
  });

  // Fan out the standard 5 persona-scan jobs — identical to what
  // /api/modules/[id]/initialize does for a manually created module.
  const ALL_PERSONAS: PersonaScanJobData["persona"][] = [
    "PRACTITIONER", "ACADEMIC", "SKEPTIC", "ECONOMIST", "HISTORIAN",
  ];
  const queue = personaScanQueue();
  await Promise.all(
    ALL_PERSONAS.map((persona) =>
      queue.add(
        `scan-${module.id}-${persona}`,
        { moduleId: module.id, notebookId: notebook.id, orgId: risk.orgId, persona },
        { ...defaultJobOptions, jobId: `scan-${module.id}-${persona}` }
      )
    )
  );

  await prisma.driftRisk.update({
    where: { id: driftRiskId },
    data:  { remediationModuleId: module.id, status: "REMEDIATED" },
  });

  return { moduleId: module.id };
}
