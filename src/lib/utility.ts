import OpenAI from "openai";
import type { VideoStyle } from "@prisma/client";

/**
 * Utility LLM layer (Blueprint §7).
 *
 * GPT-4o-mini handles the two mechanical tasks that must be lag-free and cheap:
 *   1. Prompt-wrapping: turn block text into a Brutalist Sovereign style-matrix
 *      image prompt for Flux/Midjourney.
 *   2. Semantic drift detection: decide whether a text edit is substantial enough
 *      to warrant regenerating the block's image asset.
 *
 * Never called from a route handler — only from the image-generation worker
 * and the PATCH route's debounce path.
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const UTILITY_MODEL = "gpt-4o-mini";

// ── Style matrices (Blueprint §10, platform-fluid image engine) ─────────────

const STYLE_MATRIX: Record<VideoStyle, string> = {
  FACELESS: [
    "minimalist editorial photography",
    "high-contrast architectural symmetry",
    "shot on 35mm film, sharp focus",
    "muted palette — deep dark teal, cotton lace, charcoal",
    "zero neon gradients, zero lens flare",
    "cinematic negative space for text overlay",
    "documentary-grade composition",
  ].join(", "),

  AVATAR: [
    "professional portrait lighting",
    "editorial magazine photography",
    "single subject, sharp focus, shallow depth of field",
    "dark teal background with high-contrast rim light",
    "authoritative, intellectual tone",
    "zero stock-photo aesthetics",
  ].join(", "),

  WHITEBOARD: [
    "clean technical diagram on dark background",
    "architectural line drawing style",
    "deep teal ink on near-black surface",
    "precise geometric nodes and connecting lines",
    "academic schematic quality",
    "zero decorative elements",
  ].join(", "),
};

const NEGATIVE_PROMPT =
  "cartoon, illustration, 3D render, neon colors, lens flare, " +
  "stock photography, watermark, text overlay, blurry, low quality, " +
  "oversaturated, generic AI art style, plastic, glossy";

/**
 * Wrap block text + video style into a Flux/Midjourney prompt.
 * Returns { prompt, negativePrompt } ready for the image generation API.
 */
export async function wrapImagePrompt(
  textContent: string,
  videoStyle: VideoStyle,
  platform: "LMS_16_9" | "MOBILE_9_16" | "SQUARE_1_1" = "LMS_16_9"
): Promise<{ prompt: string; negativePrompt: string }> {
  const aspectNote =
    platform === "LMS_16_9"
      ? "wide cinematic 16:9 composition with generous negative space on the left third for text overlay"
      : platform === "MOBILE_9_16"
      ? "vertical 9:16 composition, key visual centred, bold and immediate"
      : "square 1:1 composition, balanced";

  const systemPrompt = `You are a visual prompt engineer for a high-end educational video platform.
Your sole job: extract the single most powerful visual metaphor from the provided script text
and encode it as a precise image generation prompt. No generic imagery. No clichés.
Output ONLY a JSON object — no prose, no markdown.`;

  const userPrompt = `SCRIPT TEXT:
${textContent.slice(0, 800)}

STYLE CONSTRAINTS: ${STYLE_MATRIX[videoStyle]}
ASPECT: ${aspectNote}

Extract the sharpest visual concept from the text. Return:
{
  "subject": "<the specific visual subject — one noun phrase, no verbs>",
  "setting": "<environment or context that amplifies the concept>",
  "mood": "<one adjective that matches the intellectual tone>"
}`;

  const res = await openai.chat.completions.create({
    model: UTILITY_MODEL,
    temperature: 0.3,
    max_tokens: 200,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  let parsed: { subject: string; setting: string; mood: string };
  try {
    const raw = res.choices[0].message.content ?? "{}";
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    // Fallback: use the first 120 chars of the text as the subject.
    parsed = {
      subject: textContent.slice(0, 120),
      setting: "minimal dark studio",
      mood:    "authoritative",
    };
  }

  const prompt = [
    `${parsed.subject}, ${parsed.setting}`,
    parsed.mood,
    STYLE_MATRIX[videoStyle],
    aspectNote,
  ].join(", ");

  return { prompt, negativePrompt: NEGATIVE_PROMPT };
}

/**
 * The Arbitrage Clipper (V2-10) — script slicing.
 *
 * Takes a long-form ScriptBlock and re-cuts it into a vertical short at one
 * of three durations. Routed through this utility-model wrapper rather than
 * a standalone Anthropic SDK instance (the source spec's draft route
 * hand-rolled a fresh `new Anthropic(...)` client) — "extract the highest-
 * tension moment and reformat to a duration budget" is exactly the fast,
 * cheap, structured-output task this file exists for, consistent with the
 * stack mandate's utility-model tier. Keeping it on gpt-4o-mini also matters
 * economically: this runs on every clip a $39/mo add-on customer generates,
 * and a Claude Opus call per clip wouldn't clear margin at that price.
 */

export type ClipPlatformMode = "RETAINER" | "EDUCATOR" | "DEEP_DIVER";

/** Beat-count bounds per mode — constrains what the LLM is allowed to produce.
 *  Mirrored in remotion/src/types.ts as CLIP_BEAT_FRAMES (duration, not count) —
 *  the two files can't share a TS import (Remotion is a separate package), so
 *  they're kept in sync by convention, same as VideoStyle/RenderTarget already
 *  are between schema.prisma and remotion/src/types.ts. */
export const CLIP_MODE_SPEC: Record<
  ClipPlatformMode,
  { minBeats: number; maxBeats: number; hasCTA: boolean; pacingNote: string }
> = {
  RETAINER: {
    minBeats: 1,
    maxBeats: 1,
    hasCTA: false,
    pacingNote:
      "The output must read in exactly 15 to 30 seconds (roughly 40-75 words). " +
      "It must feature a high-impact visceral hook within the first 2 seconds. " +
      "One continuous beat — no scene breaks.",
  },
  EDUCATOR: {
    minBeats: 3,
    maxBeats: 3,
    hasCTA: true,
    pacingNote:
      "The output must read in 45 to 60 seconds total across exactly 3 beats " +
      "(roughly 35-50 words each): (1) the problem, (2) two clashing viewpoints " +
      "in direct tension, (3) the field's blind spot. Close with a short CTA line.",
  },
  DEEP_DIVER: {
    minBeats: 8,
    maxBeats: 15,
    hasCTA: false,
    pacingNote:
      "The output can run up to the maximum 3-minute YouTube Short boundary. " +
      "Segment into 8 to 15 beats of roughly 25-40 words each, one per structural " +
      "retention-reset point (every 10-15s of runtime) — each beat should be able " +
      "to stand alone as a distinct visual/tonal shift, capturing the full STORM " +
      "arc from introduction through synthesis.",
  },
};

export interface ClipSliceResult {
  sectionTitle: string;   // short, punchy title for the clip (not the source block's title)
  textContent:  string;   // full sliced script, flattened — for display/search
  beats:        string[]; // scene-segmented script, one entry per Remotion Sequence
  ctaText:      string | null; // EDUCATOR mode only
}

/**
 * Extract the single highest-friction point of disagreement from a long-form
 * script and re-cut it for a target platform mode's duration budget.
 */
export async function sliceForPlatform(
  textContent: string,
  platformMode: ClipPlatformMode
): Promise<ClipSliceResult> {
  const spec = CLIP_MODE_SPEC[platformMode];

  const systemPrompt = `You are an elite short-form content engineering model for a platform
that turns dense, adversarial multi-expert research into vertical video shorts.
Ingest the provided long-form script. Extract the single highest-friction point
of disagreement between expert perspectives — not a summary of the whole text,
the sharpest clash in it. ${spec.pacingNote}
Style: aggressive, punchy, intellectual editorial. Strip all intro filler,
throat-clearing, and hedging. Every sentence must earn its place.
Output ONLY a JSON object — no prose, no markdown fences.`;

  const userPrompt = `SOURCE SCRIPT:
${textContent.slice(0, 6000)}

Return exactly this JSON shape:
{
  "sectionTitle": "<punchy 3-6 word title for this clip, not the source block's title>",
  "beats": [${spec.minBeats === spec.maxBeats ? `<exactly ${spec.minBeats} string${spec.minBeats > 1 ? "s" : ""}>` : `<between ${spec.minBeats} and ${spec.maxBeats} strings>`}],
  ${spec.hasCTA ? '"ctaText": "<one short punchy call-to-action line>"' : '"ctaText": null'}
}`;

  const res = await openai.chat.completions.create({
    model: UTILITY_MODEL,
    temperature: 0.3,
    max_tokens: 700,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  let parsed: { sectionTitle: string; beats: string[]; ctaText: string | null };
  try {
    const raw = res.choices[0].message.content ?? "{}";
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(
      `sliceForPlatform: utility model returned non-JSON for platformMode=${platformMode}`
    );
  }

  // Defensive clamp — a model that drifts outside the requested beat count
  // shouldn't silently produce a clip with the wrong scene structure.
  const beats = Array.isArray(parsed.beats) ? parsed.beats.filter((b) => typeof b === "string" && b.trim()) : [];
  if (beats.length < spec.minBeats) {
    throw new Error(
      `sliceForPlatform: expected ${spec.minBeats}-${spec.maxBeats} beats for ${platformMode}, got ${beats.length}`
    );
  }
  const clampedBeats = beats.slice(0, spec.maxBeats);

  return {
    sectionTitle: parsed.sectionTitle?.trim() || "Untitled Clip",
    textContent:  clampedBeats.join(" "),
    beats:        clampedBeats,
    ctaText:      spec.hasCTA ? (parsed.ctaText ?? null) : null,
  };
}
/**
 * Drift Dashboard (V2-4) — core assertion extraction.
 *
 * Extracts the discrete, checkable factual/policy claims from a notebook's
 * source text — "our refund window is 30 days," not the surrounding prose.
 * This is the correct utility-tier task: cheap classification/extraction,
 * not judgment. Whether two assertions from different silos actually
 * *contradict* each other is a genuine semantic judgment call and happens
 * downstream in src/lib/drift.ts via the reasoning model — this function's
 * job is only to produce the candidate list, matching the same
 * utility-vs-reasoning split the Hybrid Audit Protocol already uses
 * elsewhere (deterministic/cheap steps on gpt-4o-mini, judgment on Claude).
 */
export async function extractCoreAssertions(text: string): Promise<string[]> {
  const systemPrompt = `You extract discrete, checkable factual or policy claims from source text —
the kind of statement that could be true in one document and false or
contradicted in another (a stated policy, a technical constraint, a
committed timeline, a pricing or access rule — not opinions, not narrative).
Output ONLY a JSON object — no prose, no markdown fences.`;

  const userPrompt = `SOURCE TEXT:
${text.slice(0, 8000)}

Extract up to 12 discrete, checkable assertions. Each should be a single,
self-contained sentence stateable independent of the surrounding text.

Respond ONLY with this JSON:
{ "assertions": ["<assertion 1>", "<assertion 2>", ...] }`;

  const res = await openai.chat.completions.create({
    model: UTILITY_MODEL,
    temperature: 0.2,
    max_tokens: 800,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  try {
    const raw = res.choices[0].message.content ?? "{}";
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(clean) as { assertions?: unknown };
    return Array.isArray(parsed.assertions)
      ? parsed.assertions.filter((a): a is string => typeof a === "string" && a.trim().length > 0)
      : [];
  } catch {
    return []; // a notebook that fails extraction just contributes no candidates — not a hard failure
  }
}

/**
 * Semantic drift gate (Blueprint §9, §7).
 *
 * Returns true if the edit is substantial enough to warrant image regeneration.
 * Trivial fixes (typos, punctuation, whitespace) return false — saves credits
 * and keeps the UI from flickering on every keystroke.
 */
export async function hasSemanticDrift(
  oldText: string,
  newText: string
): Promise<boolean> {
  // Short-circuit: if texts are identical or only differ by whitespace, skip.
  if (oldText.trim() === newText.trim()) return false;

  // Fast heuristic: if fewer than 3% of words changed, skip the LLM call.
  const oldWords = oldText.trim().split(/\s+/);
  const newWords = newText.trim().split(/\s+/);
  const changed  = newWords.filter((w, i) => w !== oldWords[i]).length;
  if (changed / Math.max(oldWords.length, 1) < 0.03) return false;

  // LLM gate for the ambiguous middle ground.
  const res = await openai.chat.completions.create({
    model: UTILITY_MODEL,
    temperature: 0,
    max_tokens: 5,
    messages: [
      {
        role: "system",
        content:
          'You detect semantic drift in educational script edits. ' +
          'Reply with only "YES" or "NO". ' +
          'YES = the core visual concept or subject matter changed. ' +
          'NO = only wording, style, or minor factual detail changed.',
      },
      {
        role: "user",
        content: `BEFORE:\n${oldText.slice(0, 400)}\n\nAFTER:\n${newText.slice(0, 400)}`,
      },
    ],
  });

  const answer = (res.choices[0].message.content ?? "NO").trim().toUpperCase();
  return answer.startsWith("YES");
}
