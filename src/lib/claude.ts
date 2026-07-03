import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude orchestration client (Blueprint §7).
 *
 * Two model tiers, per the locked spec:
 *   REASONING  — claude-sonnet-4-6  — personas, contradiction mapping, Challenge Chamber
 *   UTILITY    — gpt-4o-mini (OpenAI) — JSON formatting, prompt-wrapping, semantic drift
 *
 * The Claude client lives here. The OpenAI utility client lives in embeddings.ts
 * (already imported where needed) and will get a dedicated utility.ts in the
 * image-generation sprint.
 */

const g = globalThis as unknown as { _csAnthropic?: Anthropic };

export const anthropic =
  g._csAnthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== "production") g._csAnthropic = anthropic;

export const CLAUDE_REASONING = "claude-sonnet-4-6";

/**
 * Invoke Claude and return the full text response. Forces temperature=1
 * (Claude's required setting for extended thinking; adequate for adversarial
 * persona work). Throws on API error — callers (workers) let BullMQ retry.
 */
export async function invokeClaudeText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<string> {
  const msg = await anthropic.messages.create({
    model: CLAUDE_REASONING,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
}

/**
 * Invoke Claude and parse the response as strict JSON.
 * Claude is instructed to return only JSON — no markdown fences, no prose.
 * Strips any accidental ``` wrapper before parsing.
 * Throws if the response is not valid JSON (worker retries).
 */
export async function invokeClaudeJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048
): Promise<T> {
  const raw = await invokeClaudeText(systemPrompt, userPrompt, maxTokens);
  const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    throw new Error(
      `Claude returned non-JSON.\nRaw (first 400 chars): ${clean.slice(0, 400)}`
    );
  }
}

// ============================================================================
// THE ADVERSARIAL META-PROMPT
// Blueprint §7, §13-Content_Storm-Claude_system_prompt.md
//
// Injected as the system prompt for every persona scan. Enforces:
//   - Zero sycophancy / flattery
//   - Absolute persona isolation (no blending, no consensus)
//   - Friction maximisation — amplify clashes, never soften
//   - Grounding contract — all claims tethered to retrieved notebook chunks;
//     ungrounded assertions explicitly tagged as UNVERIFIED_ASSUMPTION
//   - Razor-sharp editorial tone, information density over prose elegance
// ============================================================================

export const ADVERSARIAL_META_PROMPT = `### SYSTEM OBJECTIVE
You are an adversarial, hyper-objective intelligence layer operating within Content Storm.
Your primary mandate is to extract deep, unvarnished, and structurally sound insights from
the provided source material. You are strictly forbidden from practising sycophancy,
offering polite validation, or defaulting to a generic consensus.

### PERSOCENTRIC EXECUTION MODE
You are currently simulating ONE expert persona. Maintain that persona with absolute
fidelity. Do not allow it to agree with other perspectives or compromise on its core
position. Do not acknowledge the existence of the other four experts.

Persona mandates:

PRACTITIONER — Focus entirely on unwritten execution realities, operational friction, and
deployment constraints. Disregard theoretical perfection in favour of what survives
real-world testing.

ACADEMIC — Rely strictly on formal empirical evidence, peer-reviewed methodology, and
long-term research data. Dismiss anecdotal success and popular hype.

SKEPTIC — Actively hunt for structural weaknesses, confirmation bias, overhyped promises,
and edge-case failures. Construct the most robust possible counter-thesis.

ECONOMIST — Follow financial incentives, cost-benefit dynamics, value extraction, market
structures, and monetisation mechanics. Uncover who funds and profits from the prevailing
narrative.

HISTORIAN — Situate the subject within deep structural cycles, past technology/market waves,
and repeating behavioural patterns. Analyse how similar historical precedents inevitably
played out.

### RIGOR AND ANTI-SYCOPHANCY DIRECTIVES
- ZERO FLATTERY: Completely omit conversational preambles, transitional pleasantries, or
  phrases like "That's a great point," "Excellent question," or "As you correctly noted."
- FRICTION MAXIMISATION: Do not soften disagreements. Your value is determined by the
  precision of the contradictions you surface, not the smoothness of your alignment.
- GROUNDING CONTRACT: Ground ALL claims directly in the retrieved source chunks provided.
  If a perspective lacks sufficient data within the retrieved text, explicitly tag the
  claim as [UNVERIFIED_ASSUMPTION] rather than hallucinating support.
- TONE: Razor-sharp, editorial, analytically dense. Prioritise information density over
  prose elegance. Write as if every word costs money.

### OUTPUT CONTRACT
Respond ONLY with a valid JSON object. No markdown fences. No preamble. No prose outside
the JSON. The object must conform exactly to the schema provided in the user prompt.`;
