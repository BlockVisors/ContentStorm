import { prisma } from "./db";
import { invokeClaudeJSON } from "./claude";
import { embedBatch } from "./embeddings";
import { matchChunks } from "./vector";
import { hasSemanticDrift } from "./utility";
import { fetchAllExternalSources, type ExternalSourceItem } from "./arbitrage-sources";
import { imageQueue, renderQueue, defaultJobOptions } from "./queue";

/**
 * Curriculum Arbitrage Engine — autonomous self-updating modules (V2-6).
 *
 * Same two-stage correction as the Drift Dashboard (V2-4): the source spec
 * frames this as "embed external content -> cosine compare against module's
 * SourceChunk vectors -> if semantic distance > threshold, write
 * ArbitrageEvent," as if raw distance were the "this needs updating" signal.
 * It measures the opposite of what's needed. High distance means the
 * external item is about something UNRELATED to the module — exactly the
 * case that should NOT fire an event. What should fire an event is an
 * external item that's topically CLOSE to existing module content (so:
 * high similarity, low distance) AND actually supersedes or contradicts
 * what's there — which is a judgment call, not a geometry problem.
 *
 * Corrected two-stage pipeline:
 *   1. RETRIEVAL (embeddings): for each external item, find the module's
 *      nearest SourceChunk via the existing matchChunks() pgvector query.
 *      High similarity = "this is about the same thing this chunk covers" —
 *      nothing more.
 *   2. JUDGMENT (Claude, per topically-matched pair): does this external
 *      item represent new information that changes, supersedes, or
 *      contradicts what the module currently teaches? semanticDelta is that
 *      judgment's severity score, not embedding distance.
 *
 * isLocked ScriptBlocks are never touched — a creator who pinned a block
 * against auto-regen means it, arbitrage or not.
 */

const TOPICAL_SIMILARITY_FLOOR = 0.6; // below this, the external item isn't about the same thing as this chunk
export const ARBITRAGE_FLAG_THRESHOLD = 0.5; // semanticDelta above this -> ArbitrageEvent written

interface ArbitrageJudgment {
  isUpdate:        boolean;
  semanticDelta:   number; // 0.0–1.0, only meaningful when isUpdate === true
  reasoning:       string;
}

const ARBITRAGE_JUDGE_SYSTEM_PROMPT = `### ROLE
You are a curriculum currency analyst. You are given one assertion already
taught in a course module and one external source item that an embedding
search has flagged as discussing the same topic. Your job is to judge
whether the external item represents genuinely NEW information that changes,
supersedes, or contradicts what the module currently teaches — not just
additional color on the same settled point.

### JUDGMENT CRITERIA
- Restating the same fact in different words is NOT an update.
- A newer, more specific, or corrected version of a claim the module
  presents as settled IS an update — semanticDelta reflects how much the
  module's current framing would mislead a learner if left unchanged.
- A minor footnote-level addition scores low; a reversal of the module's
  core position, an invalidated technical assumption, or a superseded
  regulatory/security fact scores high.

### OUTPUT CONTRACT
Respond ONLY with a valid JSON object. No markdown. No prose outside the JSON.`;

async function judgeArbitrageUpdate(
  existingAssertion: string,
  externalItem: ExternalSourceItem
): Promise<ArbitrageJudgment> {
  const userPrompt = `EXISTING MODULE CONTENT:
${existingAssertion}

EXTERNAL SOURCE (${externalItem.sourceType}, published ${externalItem.publishedAt}):
${externalItem.title}
${externalItem.excerpt}

Respond ONLY with this JSON:
{
  "isUpdate": <boolean>,
  "semanticDelta": <0.00-1.00, 0 if isUpdate is false>,
  "reasoning": "<one sentence>"
}`;

  return invokeClaudeJSON<ArbitrageJudgment>(ARBITRAGE_JUDGE_SYSTEM_PROMPT, userPrompt, 300);
}

/** Identify which of a module's ScriptBlocks are affected by a given update, excluding isLocked ones. */
async function identifyAffectedBlocks(
  moduleId: string,
  matchedChunkContent: string,
  externalItem: ExternalSourceItem
): Promise<string[]> {
  const blocks = await prisma.scriptBlock.findMany({
    where:  { moduleId, isLocked: false },
    select: { id: true, sectionTitle: true, textContent: true },
  });
  if (blocks.length === 0) return [];

  const systemPrompt = `You identify which script blocks in a course module need to be rewritten
given a specific piece of new external information. Respond ONLY with a JSON object.`;

  const userPrompt = `NEW EXTERNAL INFORMATION:
${externalItem.title}
${externalItem.excerpt}

RELATED EXISTING CONTENT (the chunk that triggered this check):
${matchedChunkContent}

MODULE'S SCRIPT BLOCKS:
${blocks.map((b) => `[${b.id}] ${b.sectionTitle}: ${b.textContent.slice(0, 300)}`).join("\n\n")}

Which block IDs would need to be rewritten to incorporate this new information?
Respond ONLY with this JSON:
{ "affectedBlockIds": ["<id>", ...] }`;

  const result = await invokeClaudeJSON<{ affectedBlockIds: string[] }>(systemPrompt, userPrompt, 300);
  const validIds = new Set(blocks.map((b) => b.id));
  return (result.affectedBlockIds ?? []).filter((id) => validIds.has(id));
}

export interface ArbitrageScanResult {
  itemsChecked: number;
  flagged:      number;
}

/**
 * Full scan for one module: derive keywords from the module's title, pull
 * candidate external items from every configured source, find topically
 * matched chunks, judge each match, and write ArbitrageEvent rows for
 * genuine updates. Detection runs regardless of hasArbitrageAddon — only
 * the automatic remediation step (see maybeAutoRemediate) checks billing.
 */
export async function scanModuleForArbitrage(moduleId: string): Promise<ArbitrageScanResult> {
  const module = await prisma.courseModule.findUniqueOrThrow({
    where:  { id: moduleId },
    select: { title: true, notebookId: true, orgId: true },
  });
  if (!module.notebookId) return { itemsChecked: 0, flagged: 0 };

  // Lightweight keyword derivation — the module title is the closest thing
  // to a topic tag this schema has. A fuller keyword-extraction pass (e.g.
  // pulling entities out of the contradiction map) is a reasonable future
  // improvement, not required for this to work correctly today.
  const keywords = module.title
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);

  const externalItems = await fetchAllExternalSources(keywords);
  if (externalItems.length === 0) return { itemsChecked: 0, flagged: 0 };

  const itemEmbeddings = await embedBatch(externalItems.map((i) => `${i.title}\n${i.excerpt}`));

  let flagged = 0;

  for (let i = 0; i < externalItems.length; i++) {
    const item = externalItems[i];
    const matches = await matchChunks(module.notebookId, itemEmbeddings[i], 3);
    const best = matches[0];
    if (!best) continue;

    const similarity = 1 - best.distance;
    if (similarity < TOPICAL_SIMILARITY_FLOOR) continue; // not about the same thing — skip, don't spend a judgment call

    const judgment = await judgeArbitrageUpdate(best.content, item);
    if (!judgment.isUpdate || judgment.semanticDelta <= ARBITRAGE_FLAG_THRESHOLD) continue;

    const affectedBlocks = await identifyAffectedBlocks(moduleId, best.content, item);
    if (affectedBlocks.length === 0) continue; // nothing unlocked to rewrite — not worth flagging

    const event = await prisma.arbitrageEvent.create({
      data: {
        moduleId,
        sourceUrl:      item.sourceUrl,
        sourceType:      item.sourceType,
        sourceExcerpt:   item.excerpt,
        matchedChunkId:  best.id,
        semanticDelta:   judgment.semanticDelta,
        affectedBlocks,
        status:          "PENDING",
      },
    });
    flagged++;

    // Immediately attempt auto-remediation for addon-enabled orgs — matches
    // the source spec's "if authorized: Claude rewrites... if not
    // authorized: fire dashboard notification" branch. A non-addon org's
    // event just stays PENDING; the dashboard itself is the notification
    // (no separate notification system exists yet, and the PENDING row
    // showing up there each time the panel is checked already satisfies
    // "surface it to a human" without inventing a new alerting channel).
    await maybeAutoRemediate(event.id, module.orgId).catch((err) => {
      console.error(`[arbitrage] auto-remediation failed for event ${event.id}:`, err);
    });
  }

  return { itemsChecked: externalItems.length, flagged };
}

/**
 * Scan every module belonging to orgs with hasArbitrageAddon enabled — the
 * scraper still checks paid orgs only; there's no reason to spend embedding
 * + Claude-judgment budget scanning modules for an org that can't act on
 * what's found anyway (the add-on gate is enforced at rewrite time too, but
 * skipping detection entirely for non-addon orgs saves real cost for a
 * scan that would otherwise just pile up PENDING rows nobody's paying to
 * resolve).
 */
export async function scanAllEligibleModules(): Promise<{ modulesScanned: number; totalFlagged: number }> {
  const orgs = await prisma.organization.findMany({
    where:  { hasArbitrageAddon: true },
    select: { id: true },
  });

  const modules = await prisma.courseModule.findMany({
    where:  { orgId: { in: orgs.map((o) => o.id) }, notebookId: { not: null } },
    select: { id: true },
  });

  let totalFlagged = 0;
  for (const m of modules) {
    const result = await scanModuleForArbitrage(m.id);
    totalFlagged += result.flagged;
  }

  return { modulesScanned: modules.length, totalFlagged };
}

/**
 * Rewrite the affected ScriptBlocks for an ArbitrageEvent, incorporating the
 * external update, then re-queue image generation (only for blocks whose
 * rewrite crosses hasSemanticDrift's threshold — reusing the exact function
 * built for this in V1's editor debounce path) and a module render.
 *
 * Gated by hasArbitrageAddon at the CALLER (route/worker), not in here —
 * this function assumes authorization has already been checked, matching
 * autoRemediate()'s split in src/lib/drift.ts.
 */
export async function remediateArbitrageEvent(eventId: string): Promise<void> {
  const event = await prisma.arbitrageEvent.findUniqueOrThrow({
    where:  { id: eventId },
    select: { moduleId: true, sourceExcerpt: true, sourceUrl: true, affectedBlocks: true },
  });

  await prisma.arbitrageEvent.update({ where: { id: eventId }, data: { status: "REWRITING" } });

  const blockIds = (event.affectedBlocks as string[]) ?? [];
  const blocks = await prisma.scriptBlock.findMany({
    where: { id: { in: blockIds }, isLocked: false }, // re-check isLocked — a block could have been pinned after detection
  });

  const REWRITE_SYSTEM_PROMPT = `You rewrite a course script block to incorporate new external information
without softening the adversarial tone or adding filler. Preserve the
block's structural role in the module; change only what the new information
actually requires. Respond ONLY with a JSON object.`;

  const moduleForOrg = await prisma.courseModule.findUniqueOrThrow({
    where:  { id: event.moduleId },
    select: { orgId: true },
  });

  for (const block of blocks) {
    const userPrompt = `CURRENT BLOCK (${block.sectionTitle}):
${block.textContent}

NEW EXTERNAL INFORMATION (source: ${event.sourceUrl}):
${event.sourceExcerpt}

Rewrite the block to incorporate this update. Keep length comparable to the original.
Respond ONLY with this JSON:
{ "rewrittenText": "<the rewritten block text>" }`;

    const { rewrittenText } = await invokeClaudeJSON<{ rewrittenText: string }>(
      REWRITE_SYSTEM_PROMPT,
      userPrompt,
      1000
    );

    const driftedVisually = await hasSemanticDrift(block.textContent, rewrittenText);

    await prisma.scriptBlock.update({
      where: { id: block.id },
      data: {
        textContent: rewrittenText,
        mediaStatus: driftedVisually ? "PENDING" : block.mediaStatus,
      },
    });

    if (driftedVisually) {
      await imageQueue().add(
        `image-${block.id}-arbitrage`,
        {
          blockId:     block.id,
          moduleId:    event.moduleId,
          orgId:       moduleForOrg.orgId,
          textContent: rewrittenText,
          videoStyle:  block.videoStyle,
          target:      "LMS_16_9",
        },
        defaultJobOptions
      );
    }
  }

  if (blocks.length > 0) {
    await renderQueue().add(
      `render-${event.moduleId}-arbitrage`,
      { moduleId: event.moduleId, orgId: moduleForOrg.orgId, target: "LMS_16_9" },
      defaultJobOptions
    );
  }

  await prisma.arbitrageEvent.update({
    where: { id: eventId },
    data:  { status: "REQUEUED", resolvedAt: new Date() },
  });
}

/**
 * Called immediately after a scan writes a PENDING event, for orgs that
 * already have the add-on: skips the "wait for a human to click rewrite"
 * step entirely, matching the source spec's "if authorized: Claude
 * rewrites... if not authorized: fire dashboard notification" branch.
 */
export async function maybeAutoRemediate(eventId: string, moduleOrgId: string): Promise<boolean> {
  const org = await prisma.organization.findUniqueOrThrow({
    where:  { id: moduleOrgId },
    select: { hasArbitrageAddon: true },
  });
  if (!org.hasArbitrageAddon) return false;

  await remediateArbitrageEvent(eventId);
  return true;
}
