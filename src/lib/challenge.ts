import { invokeClaudeJSON } from "./claude";
import { embedBatch } from "./embeddings";
import { scoreSourceGroundingSimilarity } from "./vector";
import type { PersonaType } from "@prisma/client";

/**
 * Challenge Chamber orchestration — CANONICAL SRS (V2-2).
 *
 * Blueprint §11/§13, Content-Storm-Architecture.md §3 (D1), SRS-3_and_math.md.
 *
 * RECONSTRUCTION NOTE: the uploaded repo's challenge.ts was the pre-V2-2
 * legacy 5-vector scorer only (empiricalGrounding/boundaryAwareness/
 * personaNeutralization/logicalConsistency/synthesisRigor). Two real,
 * uploaded routes — route_copy_3.ts (POST /api/challenge/[id]/crisis) and
 * route_copy_7.ts (GET /api/challenge/[id]) — require generateCrisisAttack()
 * and a canonical srsScore, which only exist in this rewritten version.
 * Rebuilt from SRS-3_and_math.md's formula/reference implementation and the
 * architecture doc's D1 resolution (§3.3 schema delta, matched here to the
 * actual schema.prisma field names: srsScore / skepticDeflection /
 * sourceGrounding / biasEquilibrium / collapseTimeline).
 *
 * The legacy 5-vector generateChallengePrompt()/gradeLabel() pair is kept
 * verbatim below — gradeLabel() is reused as-is by route_copy_7.ts and
 * applies unchanged to either scale (both are 0–100 ints). The legacy
 * evaluateDefense() logic is retired in favor of evaluateDefense() below,
 * per the architecture doc's explicit instruction that the two rubrics
 * "measure different things and cannot be reconciled by a field rename."
 *
 * SRS = 0.40 * S_DR (Skeptic Deflection Rate)
 *     + 0.45 * S_GA (Source Grounding Anchor)
 *     + 0.15 * B_E  (Bias Equilibrium)
 *
 * Split of responsibility, per patent Claim 2:
 *   S_DR — Claude-judged per round (did the defense neutralize the specific
 *          flaw the Skeptic/current interrogator exposed?), averaged.
 *   S_GA — NEVER Claude-judged. Deterministic cosine similarity between the
 *          defense's own embedding and the module's SourceChunk vector space
 *          (src/lib/vector.ts::scoreSourceGroundingSimilarity). This is the
 *          one sub-score with actual IP weight — the patent claims it as a
 *          vector-similarity computation, not an LLM judgment call.
 *   B_E  — Deterministic Shannon entropy over which of the 5 personas each
 *          round's interrogation came from (a proxy for "did the learner
 *          face — and hold up against — a balanced spread of attack
 *          surfaces," not which persona *they* argued from, since a solo
 *          learner defense has no persona-of-origin to tag).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type PersonaName =
  | "PRACTITIONER"
  | "ACADEMIC"
  | "SKEPTIC"
  | "ECONOMIST"
  | "HISTORIAN";

export type ChallengeInterrogator = PersonaName | "CATALYST";

export interface VectorScore {
  score:    number; // 0–20
  rationale: string;
}

/** @deprecated Legacy V1 5-vector matrix. Preserved for legacyVectorBreakdown only. */
export interface VectorBreakdown {
  empiricalGrounding:   VectorScore;
  boundaryAwareness:    VectorScore;
  personaNeutralization: VectorScore;
  logicalConsistency:   VectorScore;
  synthesisRigor:       VectorScore;
}

export interface RoundTransition {
  isComplete:       false;
  nextInterrogator: PersonaName;
  nextAttackText:   string;
}

export interface CollapseTimelineEntry {
  round:  number;
  drop:   number;  // how much S_DR fell vs. the running average at that point
  reason: string;
}

/**
 * Alias — ChallengeChamber.tsx imports this exact name (`CollapseEvent`) for
 * its report-card timeline rendering. Same shape as CollapseTimelineEntry;
 * kept as a type alias rather than renaming the canonical interface so
 * server-side code (route handlers, computeCollapseTimeline) and the
 * component's own naming both read naturally without forcing an edit to a
 * real, already-shipped UI file.
 */
export type CollapseEvent = CollapseTimelineEntry;

export interface FinalEvaluation {
  isComplete:        true;
  srsScore:          number;                  // 0–100, round(100 * SRS)
  skepticDeflection: number;                  // S_DR, 0.00–1.00
  sourceGrounding:   number;                  // S_GA, 0.00–1.00
  biasEquilibrium:   number;                  // B_E,  0.00–1.00
  collapseTimeline:  CollapseTimelineEntry[];
  professorCritique: string;
}

export type EvaluationResult = RoundTransition | FinalEvaluation;

// ── System prompts ────────────────────────────────────────────────────────────

const ORCHESTRATION_SYSTEM_PROMPT = `### ROLE
You are the Orchestration Engine for Content Storm's adversarial assessment system.
You do not generate content. You evaluate a learner's intellectual defense and decide
what happens next.

### MANDATE
- Evaluate the learner's defense with ruthless precision.
- Hunt for the largest remaining logical blind spot.
- Select the domain expert whose mandate most directly exploits that blind spot.
- Formulate a one-paragraph attack that strikes the specific gap — no pleasantries,
  no validation, no preamble.

### ANTI-SYCOPHANCY CONTRACT
You are forbidden from:
- Praising the learner's response in any form.
- Softening a critique because the learner showed effort.
- Giving benefit of the doubt on vague or unsupported claims.
- Producing any text outside the required JSON object.

### OUTPUT CONTRACT
Respond ONLY with a valid JSON object. No markdown. No prose outside the JSON.
Schema is provided in the user prompt.`;

// System prompt for the canonical SRS's Claude-judged half (S_DR tagging).
// Distinct from ORCHESTRATION_SYSTEM_PROMPT's mid-round attack-generation
// role: this prompt ONLY tags, it never scores a final number and never
// touches source grounding (that's vector.ts's job, deterministically).
const SRS_TAGGING_SYSTEM_PROMPT = `### ROLE
You are a mathematical grading matrix isolated from the live conversational flow within
Content Storm's Challenge Chamber. Your sole function is to tag, per round, whether the
learner's defense logically neutralized the specific flaw the interrogator exposed.

### SCORING DIRECTIVE
For each round, score SKEPTIC_DEFLECTION from 0.0 to 1.0:
- 1.0 — the learner directly neutralized the specific flaw with a coherent counter-argument.
- 0.4–0.6 — a partial or tangential response that doesn't fully close the gap.
- Below 0.4 — the learner bypassed the question, conceded erroneously, or committed a
  logical fallacy.

You are NOT scoring source grounding (a separate deterministic system handles that) and
you are NOT computing a final score (a separate deterministic function handles that).
Your only output is one deflection score and a one-sentence justification per round.

### ANTI-SYCOPHANCY CONTRACT
No praise. No softening for effort. No benefit of the doubt on vague claims.

### OUTPUT CONTRACT
Respond ONLY with valid JSON. No markdown. No prose outside the JSON.`;

const CRISIS_CATALYST_SYSTEM_PROMPT = `### ROLE
You are the Catalyst — a fused voice combining the Skeptic's structural paranoia and the
Economist's incentive-tracing instinct. You do not represent either persona individually;
you are their sharpest possible collaboration, deployed once, for a single escalation.

### MANDATE
The learner has already passed a full five-persona baseline examination. Crisis Mode exists
to test whether their synthesis survives contact with a genuine, unforeseen disruption — not
to relitigate ground already covered. Generate ONE black-swan disruption:
- A plausible, specific, real-world-shaped event that invalidates a load-bearing assumption
  in the learner's baseline thesis (a regulatory reversal, a cost-structure collapse, a
  competitive entrant, a structural incentive shift — grounded in the module's actual
  contradiction map, not generic).
- Written in the second person, addressed directly to the learner.
- 2–4 sharp sentences. No preamble, no pleasantries.

### ANTI-SYCOPHANCY CONTRACT
No acknowledgment of how well they did in the baseline. This is an escalation, not a recap.

### OUTPUT CONTRACT
Respond ONLY with valid JSON. No markdown. No prose outside the JSON.`;

// ── Challenge prompt generator (unchanged from V1) ────────────────────────────

interface ChallengePromptInput {
  moduleTitle: string;
  contradictionMap: {
    clashPoints:       unknown;
    resolvingQuestion: string;
    fieldBlindSpots:   string;
    strongestView:     string;
  };
  scriptSummary: string; // first 1200 chars of synthesised script blocks
}

/**
 * Generate the opening adversarial challenge that the learner must defend against.
 * Derived from the module's ContradictionMap — ensuring it is grounded in the
 * actual source material, not a generic question.
 */
export async function generateChallengePrompt(
  input: ChallengePromptInput
): Promise<string> {
  const userPrompt = `### MODULE
${input.moduleTitle}

### CONTRADICTION MAP EXCERPT
Resolving question: ${input.contradictionMap.resolvingQuestion}
Field blind spots: ${input.contradictionMap.fieldBlindSpots}
Strongest grounded view: ${input.contradictionMap.strongestView}
Clash points: ${JSON.stringify(input.contradictionMap.clashPoints).slice(0, 600)}

### MODULE SCRIPT SUMMARY
${input.scriptSummary}

### TASK
Generate the opening adversarial challenge for the learner. This is the case they must
defend against. It must:
- Stake out a specific, contestable position derived from the contradiction map.
- Be complex enough that a surface-level response will expose a blind spot immediately.
- Be written in the second person, addressed directly to the learner.
- Be 2–3 sharp sentences. No preamble.

Respond ONLY with this JSON:
{ "challengePrompt": "<the adversarial challenge text>" }`;

  const result = await invokeClaudeJSON<{ challengePrompt: string }>(
    ORCHESTRATION_SYSTEM_PROMPT,
    userPrompt,
    512
  );
  return result.challengePrompt;
}

// ── Crisis Mode — Catalyst attack generator (V2-8) ────────────────────────────

interface CrisisAttackInput {
  moduleTitle:       string;
  contradictionMap:  unknown; // full ContradictionMap row — Catalyst reads whatever it needs
  baselineTranscript: string; // formatted round-by-round baseline transcript
}

/**
 * Generate the Catalyst's single black-swan disruption for Crisis Mode
 * (route_copy_3.ts / POST /api/challenge/[id]/crisis). Called once, when a
 * COMPLETED session with a passing canonical srsScore is elevated — never
 * mid-baseline.
 */
export async function generateCrisisAttack(
  input: CrisisAttackInput
): Promise<string> {
  const userPrompt = `### MODULE
${input.moduleTitle}

### CONTRADICTION MAP
${JSON.stringify(input.contradictionMap).slice(0, 1200)}

### BASELINE EXAMINATION TRANSCRIPT (already passed)
${input.baselineTranscript}

### TASK
Generate the single Crisis Mode disruption per your mandate.

Respond ONLY with this JSON:
{ "crisisAttack": "<the black-swan disruption text>" }`;

  const result = await invokeClaudeJSON<{ crisisAttack: string }>(
    CRISIS_CATALYST_SYSTEM_PROMPT,
    userPrompt,
    512
  );
  return result.crisisAttack;
}

// ── Per-round S_DR tagging (Claude-judged half) ───────────────────────────────

interface DeflectionTag {
  skepticDeflectionScore: number; // 0.0–1.0
  logicalJustification:   string;
}

/**
 * Tag one round's Skeptic Deflection score. Called from evaluateDefense()
 * for every round (mid or final) — S_DR is an average over ALL rounds, not
 * just the final one, so each round's tag must be computed and persisted as
 * it happens rather than reconstructed retroactively from a single final
 * Claude call across the whole transcript.
 */
async function tagRoundDeflection(
  attack:  string,
  defense: string
): Promise<DeflectionTag> {
  const userPrompt = `### INTERROGATOR'S ATTACK
${attack}

### LEARNER'S DEFENSE
${defense}

### TASK
Tag this round per your scoring directive.

Respond ONLY with this JSON:
{
  "skepticDeflectionScore": <0.0-1.0>,
  "logicalJustification": "<one sentence>"
}`;

  return invokeClaudeJSON<DeflectionTag>(SRS_TAGGING_SYSTEM_PROMPT, userPrompt, 300);
}

// ── Bias Equilibrium (deterministic, no Claude) ───────────────────────────────

const ALL_PERSONAS: PersonaName[] = [
  "PRACTITIONER",
  "ACADEMIC",
  "SKEPTIC",
  "ECONOMIST",
  "HISTORIAN",
];

/**
 * B_E — normalized Shannon entropy over which of the 5 standing personas
 * interrogated the learner across the session (SRS-3_and_math.md §III).
 * CATALYST rounds (Crisis Mode) are excluded from the distribution — it's a
 * one-time fusion, not a 6th standing persona (see schema.prisma's
 * ChallengeInterrogator comment), so folding it in would silently change the
 * denominator's meaning mid-formula. A fully balanced 5-persona baseline
 * yields B_E = 1.0; a session that only ever heard from one persona (not
 * possible in the normal 5-round baseline flow, but defensively handled for
 * Crisis Mode's altered round count) drops toward 0.
 */
export function computeBiasEquilibrium(
  interrogators: ChallengeInterrogator[]
): number {
  const counted = interrogators.filter(
    (p): p is PersonaName => p !== "CATALYST"
  );
  const total = counted.length;
  if (total === 0) return 0;

  let entropySum = 0;
  for (const persona of ALL_PERSONAS) {
    const count = counted.filter((p) => p === persona).length;
    if (count > 0) {
      const p_i = count / total;
      entropySum += p_i * Math.log(p_i);
    }
  }
  const be = entropySum === 0 ? 0 : -(entropySum / Math.log(5));
  return Math.max(0, Math.min(1, be));
}

// ── Canonical SRS aggregation (deterministic, no Claude) ──────────────────────

export interface CanonicalSRSInput {
  skepticDeflectionScores: number[];          // one per round, from tagRoundDeflection
  sourceGroundingScores:   number[];           // one per round, from vector.ts
  interrogators:           ChallengeInterrogator[]; // one per round
}

export interface CanonicalSRSResult {
  srsScore:          number;
  skepticDeflection: number;
  sourceGrounding:   number;
  biasEquilibrium:   number;
}

const SRS_WEIGHTS = { S_DR: 0.40, S_GA: 0.45, B_E: 0.15 } as const;

// Crisis Mode weight shift (Blueprint §7.2 / architecture doc §3.3): grounding
// matters less once the disruption is hypothetical-by-design, deflection
// matters more since the whole point is testing real-time adaptability.
export const CRISIS_SRS_WEIGHTS = { S_DR: 0.55, S_GA: 0.30, B_E: 0.15 } as const;

/**
 * Pure, deterministic, zero-I/O aggregation — SRS-3_and_math.md §3, adapted
 * to per-round score arrays (rather than a ChamberTurn table, which doesn't
 * exist in this schema; AssessmentSession.rounds / ChallengeRound is the
 * actual source of per-round data here).
 */
export function computeCanonicalSRS(
  input: CanonicalSRSInput,
  weights: { S_DR: number; S_GA: number; B_E: number } = SRS_WEIGHTS
): CanonicalSRSResult {
  const n = input.skepticDeflectionScores.length;
  const S_DR =
    n === 0
      ? 0
      : input.skepticDeflectionScores.reduce((a, b) => a + b, 0) / n;
  const S_GA =
    input.sourceGroundingScores.length === 0
      ? 0
      : input.sourceGroundingScores.reduce((a, b) => a + b, 0) /
        input.sourceGroundingScores.length;
  const B_E = computeBiasEquilibrium(input.interrogators);

  const raw = weights.S_DR * S_DR + weights.S_GA * S_GA + weights.B_E * B_E;
  const srsScore = Math.max(0, Math.min(100, Math.round(raw * 100)));

  return {
    srsScore,
    skepticDeflection: parseFloat(S_DR.toFixed(2)),
    sourceGrounding:   parseFloat(S_GA.toFixed(2)),
    biasEquilibrium:   parseFloat(B_E.toFixed(2)),
  };
}

/**
 * Round-by-round collapse timeline: flags rounds where S_DR dropped
 * significantly versus the running average up to that point. Purely
 * arithmetic — no Claude call — since collapseTimeline is a diagnostic
 * derived from numbers already computed, not a fresh judgment.
 */
export function computeCollapseTimeline(
  skepticDeflectionScores: number[],
  justifications: string[]
): CollapseTimelineEntry[] {
  const timeline: CollapseTimelineEntry[] = [];
  let runningSum = 0;

  skepticDeflectionScores.forEach((score, i) => {
    const runningAvg = i === 0 ? score : runningSum / i;
    const drop = i === 0 ? 0 : runningAvg - score;
    // Flag a meaningful collapse: this round scored notably below the trend
    // established so far. Threshold of 0.25 keeps normal round-to-round
    // variance out of the timeline and surfaces only real inflection points.
    if (i > 0 && drop > 0.25) {
      timeline.push({
        round:  i + 1,
        drop:   parseFloat(drop.toFixed(2)),
        reason: justifications[i] ?? "Deflection dropped sharply versus the session trend.",
      });
    }
    runningSum += score;
  });

  return timeline;
}

// ── Professor's Critique (Claude-judged, final round only) ───────────────────

async function generateProfessorCritique(
  challengePrompt:   string,
  userInitialThesis: string,
  roundHistory:      string,
  result:            CanonicalSRSResult
): Promise<string> {
  const userPrompt = `### ORIGINAL CHALLENGE
${challengePrompt}

### LEARNER'S INITIAL THESIS
${userInitialThesis}

### FULL TRANSCRIPT
${roundHistory}

### COMPUTED SCORES
Skeptic Deflection Rate: ${result.skepticDeflection}
Source Grounding Anchor: ${result.sourceGrounding}
Bias Equilibrium: ${result.biasEquilibrium}
Final SRS: ${result.srsScore}/100

### TASK
Write a 3-sentence Professor's Critique — direct, unsparing, specific to this transcript.
Reference actual moments. Do not restate the numbers back; interpret what they mean about
how this learner argues under pressure.

Respond ONLY with this JSON:
{ "professorCritique": "<3-sentence verdict>" }`;

  const result2 = await invokeClaudeJSON<{ professorCritique: string }>(
    ORCHESTRATION_SYSTEM_PROMPT,
    userPrompt,
    400
  );
  return result2.professorCritique;
}

// ── Per-round evaluator (canonical, replaces V1's evaluateDefense) ───────────

export interface EvaluateDefenseInput {
  challengePrompt:    string;
  userInitialThesis:  string;
  notebookId:         string; // required — S_GA grounds against this notebook's SourceChunks
  isCrisisMode:       boolean;
  previousRounds: Array<{
    interrogator: ChallengeInterrogator;
    agentAttack:  string;
    userDefense:  string | null;
    // Persisted per-round tags from prior calls, needed to recompute the
    // running aggregate without re-invoking Claude on already-scored rounds.
    skepticDeflectionScore?: number;
    sourceGroundingScore?:   number;
    justification?:          string;
  }>;
  currentDefense:     string;
  currentInterrogator: ChallengeInterrogator;
  remainingPersonas:  PersonaName[];
}

/**
 * Evaluate a learner's defense and return either:
 *   - A RoundTransition (isComplete: false) — next interrogator + attack text
 *   - A FinalEvaluation (isComplete: true)  — canonical SRS + breakdown
 *
 * When remainingPersonas is empty, this is the final round: Claude produces
 * the next attack (mid-round call skipped), all round tags are aggregated
 * deterministically via computeCanonicalSRS, and Claude writes only the
 * closing Professor's Critique.
 */
export async function evaluateDefense(
  input: EvaluateDefenseInput
): Promise<EvaluationResult> {
  const isFinalRound = input.remainingPersonas.length === 0;

  // Tag the just-submitted round: S_DR via Claude, S_GA via deterministic
  // vector similarity. Both run regardless of whether this is the final
  // round — every round contributes to both running averages.
  const [deflectionTag, defenseEmbeddings] = await Promise.all([
    tagRoundDeflection(
      input.previousRounds.at(-1)?.agentAttack ?? input.challengePrompt,
      input.currentDefense
    ),
    embedBatch([input.currentDefense]),
  ]);
  const sourceGroundingScore = await scoreSourceGroundingSimilarity(
    input.notebookId,
    defenseEmbeddings[0]
  );

  const allDeflectionScores = [
    ...input.previousRounds
      .map((r) => r.skepticDeflectionScore)
      .filter((s): s is number => s !== undefined),
    deflectionTag.skepticDeflectionScore,
  ];
  const allGroundingScores = [
    ...input.previousRounds
      .map((r) => r.sourceGroundingScore)
      .filter((s): s is number => s !== undefined),
    sourceGroundingScore,
  ];
  const allInterrogators: ChallengeInterrogator[] = [
    ...input.previousRounds.map((r) => r.interrogator),
    input.currentInterrogator,
  ];

  const roundHistory = input.previousRounds
    .map(
      (r, i) =>
        `Round ${i + 1} — ${r.interrogator}:\n` +
        `  Attack:  ${r.agentAttack}\n` +
        `  Defense: ${r.userDefense ?? "[no response yet]"}`
    )
    .join("\n\n");

  if (!isFinalRound) {
    const nextAttack = await generateNextAttack(
      input.challengePrompt,
      roundHistory,
      input.currentDefense,
      input.remainingPersonas
    );
    return {
      isComplete: false,
      nextInterrogator: nextAttack.nextInterrogator,
      nextAttackText: nextAttack.nextAttackText,
    };
  }

  const weights = input.isCrisisMode ? CRISIS_SRS_WEIGHTS : SRS_WEIGHTS;
  const result = computeCanonicalSRS(
    {
      skepticDeflectionScores: allDeflectionScores,
      sourceGroundingScores: allGroundingScores,
      interrogators: allInterrogators,
    },
    weights
  );

  const justifications = [
    ...input.previousRounds.map((r) => r.justification ?? ""),
    deflectionTag.logicalJustification,
  ];
  const collapseTimeline = computeCollapseTimeline(
    allDeflectionScores,
    justifications
  );

  const professorCritique = await generateProfessorCritique(
    input.challengePrompt,
    input.userInitialThesis,
    roundHistory +
      `\n\nRound ${input.previousRounds.length + 1} — ${input.currentInterrogator}:\n` +
      `  Defense: ${input.currentDefense}`,
    result
  );

  return {
    isComplete: true,
    ...result,
    collapseTimeline,
    professorCritique,
  };
}

async function generateNextAttack(
  challengePrompt:   string,
  roundHistory:      string,
  currentDefense:    string,
  remainingPersonas: PersonaName[]
): Promise<{ nextInterrogator: PersonaName; nextAttackText: string }> {
  const userPrompt = `### ORIGINAL CHALLENGE
${challengePrompt}

### INTERROGATION TRANSCRIPT SO FAR
${roundHistory}

### CURRENT DEFENSE (just submitted)
${currentDefense}

### REMAINING EXPERTS (choose ONE whose domain exploits the biggest gap)
${remainingPersonas.join(", ")}

### TASK
Identify the largest unaddressed logical blind spot. Select the remaining expert whose
mandate best exploits it. Write their attack.

Respond ONLY with this JSON:
{
  "nextInterrogator": "<one of: ${remainingPersonas.join(" | ")}>",
  "nextAttackText":   "<one sharp paragraph — no pleasantries, no preamble>"
}`;

  return invokeClaudeJSON<{ nextInterrogator: PersonaName; nextAttackText: string }>(
    ORCHESTRATION_SYSTEM_PROMPT,
    userPrompt,
    600
  );
}

// ── Grade label (unchanged — applies to either scale, both 0–100 ints) ────────

export function gradeLabel(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 77) return "B+";
  if (score >= 73) return "B";
  if (score >= 70) return "B-";
  if (score >= 67) return "C+";
  if (score >= 60) return "C";
  return "F";
}
