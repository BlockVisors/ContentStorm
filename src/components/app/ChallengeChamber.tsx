"use client";

import React, { useState, useRef, useEffect } from "react";
import type { CollapseEvent } from "@/lib/challenge";

/**
 * THE CHALLENGE CHAMBER — Production adversarial viva UI (Blueprint §11).
 *
 * Two phases:
 *   1. THESIS — learner submits their opening position on the module topic.
 *   2. VIVA   — the adversarial loop: agent attacks, learner defends, repeat.
 *              Each SUBMIT REBUTTAL fires POST /api/challenge/[sessionId]/respond
 *              and the UI updates from the response — no SWR polling needed.
 *
 * Session is created by the parent via POST /api/challenge/[moduleId]/start,
 * which returns the session object including the first round. The parent passes
 * the session down as initialSession.
 *
 * On COMPLETED: renders the Synthesis Resilience Report Card. V2-2 note: a
 * session is either canonical (srsScore !== null, three-factor breakdown) or
 * legacy (srsScore === null, legacyResilienceScore has the old 5-vector sum).
 * ReportCard branches on which one it got — see §3.3 of the V2 architecture
 * doc for why these are never migrated in place.
 */

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  ink:        "#07100F",
  panel:      "#0C1B1A",
  panel2:     "#0A1716",
  line:       "#1C3A38",
  lineSoft:   "#16302E",
  tealBright: "#2E6F6A",
  lace:       "#ECE6D4",
  laceDim:    "#9FB0AC",
  laceFaint:  "#5E7370",
  gold:       "#C9A24B",
  rust:       "#B5563A",
};

const PERSONA_META: Record<string, { sigil: string; color: string; domain: string }> = {
  PRACTITIONER: { sigil: "P", color: C.tealBright, domain: "OPERATIONAL REALITIES"  },
  ACADEMIC:     { sigil: "A", color: C.laceDim,    domain: "EMPIRICAL EVIDENCE"      },
  SKEPTIC:      { sigil: "S", color: C.rust,       domain: "STRUCTURAL WEAKNESSES"   },
  ECONOMIST:    { sigil: "E", color: C.gold,       domain: "FINANCIAL INCENTIVES"    },
  HISTORIAN:    { sigil: "H", color: C.laceFaint,  domain: "HISTORICAL PRECEDENT"    },
  // V2-8 — the fused Skeptic+Economist voice for Crisis Mode's single escalation
  // round. Distinct rust/alert treatment on purpose: this round is meant to
  // read as a dramatically different moment, not just a 6th persona card.
  CATALYST:     { sigil: "!", color: C.rust,       domain: "BLACK-SWAN DISRUPTION"   },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChallengeRoundData {
  id:           string;
  interrogator: string;
  agentAttack:  string;
  userDefense:  string | null;
  createdAt:    string;
}

interface LegacyVectorScore {
  score:    number; // 0–20
  rationale: string;
}
interface LegacyVectorBreakdown {
  empiricalGrounding:    LegacyVectorScore;
  boundaryAwareness:     LegacyVectorScore;
  personaNeutralization: LegacyVectorScore;
  logicalConsistency:    LegacyVectorScore;
  synthesisRigor:        LegacyVectorScore;
}

interface SessionData {
  id:                string;
  moduleId:          string;
  challengePrompt:   string;
  userInitialThesis: string | null;
  status:            "IN_PROGRESS" | "COMPLETED" | "FAILED";

  // Canonical SRS (V2-2+) — null on legacy sessions.
  srsScore:          number | null;
  skepticDeflection: number | null;
  sourceGrounding:   number | null;
  biasEquilibrium:   number | null;
  collapseTimeline:  CollapseEvent[] | null;
  professorCritique: string | null;

  // Legacy V1 — null on canonical sessions.
  legacyResilienceScore: number | null;
  legacyVectorBreakdown: LegacyVectorBreakdown | null;
  legacyWeakestLink:     string | null;

  isCrisisMode:      boolean; // V2-8
  grade:             string | null;
  rounds:            ChallengeRoundData[];
}

// ── Entry point: thesis submission ────────────────────────────────────────────
export function ThesisGate({
  moduleId,
  challengeContext,
  onSessionStart,
}: {
  moduleId:         string;
  challengeContext: string; // shown above the textarea to frame the topic
  onSessionStart:   (session: SessionData) => void;
}) {
  const [thesis,    setThesis]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const handleStart = async () => {
    if (thesis.trim().length < 10 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/challenge/${moduleId}/start`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userInitialThesis: thesis }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? err.error ?? "Failed to start session");
      }
      const session: SessionData = await res.json();
      onSessionStart(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.laceFaint, marginBottom: 16 }}>
        PHASE · ADVERSARIAL EXAMINATION · SUBMIT INITIAL THESIS
      </div>

      {/* The objective case */}
      <div style={{ padding: "20px 24px", border: `1px solid ${C.line}`, background: C.panel2, marginBottom: 28 }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.2em", color: C.gold, marginBottom: 10 }}>
          THE OBJECTIVE CASE
        </div>
        <p className="cs-serif" style={{ fontSize: 16, lineHeight: 1.65, color: C.lace, margin: 0 }}>
          {challengeContext}
        </p>
      </div>

      <label className="cs-mono" style={{ display: "block", fontSize: 10, letterSpacing: "0.22em", color: C.laceDim, marginBottom: 10 }}>
        DRAFT YOUR OPENING POSITION
      </label>
      <textarea
        ref={taRef}
        value={thesis}
        onChange={(e) => setThesis(e.target.value)}
        placeholder="State your thesis. The interrogators are watching."
        rows={6}
        style={{
          width: "100%", resize: "vertical", padding: "14px 16px",
          background: C.panel, color: C.lace, border: `1px solid ${C.line}`,
          fontFamily: "'Spectral', Georgia, serif", fontSize: 17, lineHeight: 1.6,
          outline: "none",
        }}
      />

      {error && (
        <p className="cs-mono" style={{ fontSize: 11, color: C.rust, marginTop: 10 }}>
          ✕ {error}
        </p>
      )}

      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleStart}
          disabled={thesis.trim().length < 10 || loading}
          className="cs-mono"
          style={{
            fontSize: 12, fontWeight: 600, letterSpacing: "0.18em",
            padding: "14px 28px", border: "none",
            background: thesis.trim().length >= 10 && !loading ? C.gold : C.lineSoft,
            color:      thesis.trim().length >= 10 && !loading ? C.ink  : C.laceFaint,
            cursor:     thesis.trim().length >= 10 && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "INITIATING EXAMINATION…" : "[ ENTER THE CHAMBER ]"}
        </button>
      </div>
    </div>
  );
}

// ── Main: the adversarial viva loop ──────────────────────────────────────────
export default function ChallengeChamber({
  initialSession,
}: {
  initialSession: SessionData;
}) {
  const [session,     setSession]     = useState<SessionData>(initialSession);
  const [response,    setResponse]    = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom after each new round lands.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.rounds.length]);

  const activeRound = session.rounds.find((r) => r.userDefense === null);
  const isComplete  = session.status === "COMPLETED";

  const handleSubmit = async () => {
    if (!activeRound || response.trim().length < 10 || submitting) return;
    setSubmitting(true);
    setError(null);

    // Optimistic: show the defense immediately.
    setSession((s) => ({
      ...s,
      rounds: s.rounds.map((r) =>
        r.id === activeRound.id ? { ...r, userDefense: response } : r
      ),
    }));
    const submitted = response;
    setResponse("");

    try {
      const res = await fetch(`/api/challenge/${session.id}/respond`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ roundId: activeRound.id, userDefense: submitted }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? err.error ?? "Response failed");
      }
      const updated: SessionData = await res.json();
      setSession(updated);
    } catch (e) {
      // Rollback optimistic update on failure.
      setSession((s) => ({
        ...s,
        rounds: s.rounds.map((r) =>
          r.id === activeRound.id ? { ...r, userDefense: null } : r
        ),
      }));
      setResponse(submitted);
      setError(e instanceof Error ? e.message : "Submit failed — try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: C.ink, color: C.lace, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Spectral:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .cs-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .cs-serif   { font-family: 'Spectral', Georgia, serif; }
        .cs-mono    { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        *::selection { background: ${C.gold}; color: ${C.ink}; }
        textarea:focus { outline: 1px solid ${C.gold}; outline-offset: 0; }
        @keyframes csFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .cs-appear { animation: csFade .35s ease-out; }
      `}</style>

      {/* COMMAND RAIL */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(7,16,15,0.92)", borderBottom: `1px solid ${C.line}`, backdropFilter: "blur(6px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.gold }}>CONTENT STORM</span>
            <span style={{ color: C.lineSoft }}>/</span>
            <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.laceDim }}>THE CHALLENGE CHAMBER</span>
          </div>
          <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: isComplete ? C.tealBright : session.isCrisisMode ? C.rust : C.laceFaint }}>
            {isComplete
              ? `✓ COMPLETE · ${session.rounds.length} ROUNDS${session.isCrisisMode ? " · CRISIS MODE" : ""}`
              : session.isCrisisMode
              ? "⚠ CRISIS MODE · BLACK-SWAN ESCALATION"
              : `ROUND ${session.rounds.filter(r => r.userDefense !== null).length + 1} OF 5`}
          </span>
        </div>
      </header>

      {session.isCrisisMode && !isComplete && (
        <div className="cs-appear" style={{ background: "rgba(181,86,58,0.1)", borderBottom: `1px solid ${C.rust}`, padding: "10px 20px", textAlign: "center" }}>
          <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.rust }}>
            THE CATALYST HAS ESCALATED — YOUR BASELINE DEFENSE IS NO LONGER ENOUGH
          </span>
        </div>
      )}

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* OBJECTIVE CASE */}
        <div style={{ marginBottom: 40, padding: "20px 24px", border: `1px solid ${C.line}`, background: C.panel2 }}>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.gold, marginBottom: 10 }}>
            THE OBJECTIVE CASE · GROUNDED NOTEBOOK TARGET
          </div>
          <p className="cs-serif" style={{ fontSize: 16, lineHeight: 1.65, color: C.lace, margin: "0 0 12px" }}>
            {session.challengePrompt}
          </p>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: C.laceFaint }}>
            INITIAL THESIS: {session.userInitialThesis?.slice(0, 120)}{(session.userInitialThesis?.length ?? 0) > 120 ? "…" : ""}
          </div>
        </div>

        {/* INTERROGATION TIMELINE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {session.rounds.map((round, idx) => {
            const meta = PERSONA_META[round.interrogator] ?? { sigil: "?", color: C.laceDim, domain: "UNKNOWN" };
            return (
              <div key={round.id} className="cs-appear" style={{ border: `1px solid ${C.line}`, marginBottom: 2, background: C.panel }}>

                {/* Agent attack */}
                <div style={{ display: "flex", gap: 0, borderBottom: round.userDefense ? `1px solid ${C.lineSoft}` : "none" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 14px", borderRight: `1px solid ${C.lineSoft}`, minWidth: 90 }}>
                    <span className="cs-mono" style={{ fontSize: 11, fontWeight: 700, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", background: meta.color, color: C.ink }}>
                      {meta.sigil}
                    </span>
                    <span className="cs-mono" style={{ fontSize: 8, letterSpacing: "0.12em", color: meta.color, marginTop: 6, textAlign: "center" }}>
                      {round.interrogator}
                    </span>
                    <span className="cs-mono" style={{ fontSize: 7, letterSpacing: "0.08em", color: C.laceFaint, marginTop: 2, textAlign: "center" }}>
                      {meta.domain}
                    </span>
                  </div>
                  <div style={{ flex: 1, padding: "16px 18px" }}>
                    <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: C.rust, marginBottom: 8 }}>
                      ✕ ATTACK · ROUND {idx + 1}
                    </div>
                    <p className="cs-serif" style={{ fontSize: 15, lineHeight: 1.68, color: C.lace, margin: 0 }}>
                      {round.agentAttack}
                    </p>
                  </div>
                </div>

                {/* Defense — submitted */}
                {round.userDefense && (
                  <div style={{ display: "flex", gap: 0, background: "rgba(46,111,106,0.04)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 14px", borderRight: `1px solid ${C.lineSoft}`, minWidth: 90 }}>
                      <span className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: C.tealBright }}>✓ DEFENSE</span>
                    </div>
                    <div style={{ flex: 1, padding: "16px 18px" }}>
                      <p className="cs-serif" style={{ fontSize: 15, lineHeight: 1.68, color: C.laceDim, margin: 0, fontStyle: "italic" }}>
                        {round.userDefense}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ACTIVE INPUT */}
        {!isComplete && activeRound && (
          <div className="cs-appear" style={{ marginTop: 16, border: `1px solid ${C.tealBright}`, background: "rgba(46,111,106,0.04)" }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.lineSoft}` }}>
              <label className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: C.tealBright }}>
                DRAFT YOUR LOGICAL COUNTER-ARGUMENT
              </label>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                }}
                placeholder={
                  session.isCrisisMode
                    ? "The disruption is real. State your mitigation — deflection matters more than citations here…"
                    : "Incorporate objective dataset constraints to neutralise their domain bias…"
                }
                disabled={submitting}
                rows={5}
                style={{
                  width: "100%", resize: "vertical", padding: 0, border: "none",
                  background: "transparent", color: C.lace,
                  fontFamily: "'Spectral', Georgia, serif", fontSize: 16, lineHeight: 1.65,
                  outline: "none",
                }}
              />
            </div>
            <div style={{ padding: "0 18px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.laceFaint }}>
                ⌘↩ TO SUBMIT
              </span>
              <button
                onClick={handleSubmit}
                disabled={response.trim().length < 10 || submitting}
                className="cs-mono"
                style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.18em",
                  padding: "11px 22px", border: "none",
                  background: response.trim().length >= 10 && !submitting ? C.gold : C.lineSoft,
                  color:      response.trim().length >= 10 && !submitting ? C.ink  : C.laceFaint,
                  cursor:     response.trim().length >= 10 && !submitting ? "pointer" : "not-allowed",
                }}
              >
                {submitting ? "EVALUATING…" : "SUBMIT REBUTTAL"}
              </button>
            </div>
            {error && (
              <div style={{ padding: "0 18px 14px" }}>
                <span className="cs-mono" style={{ fontSize: 11, color: C.rust }}>✕ {error}</span>
              </div>
            )}
          </div>
        )}

        {/* RESILIENCE REPORT CARD */}
        {isComplete && (session.srsScore !== null || session.legacyResilienceScore !== null) && (
          <div className="cs-appear" style={{ marginTop: 40 }}>
            <ReportCard session={session} onElevateToCrisis={setSession} />
          </div>
        )}

        <div ref={bottomRef} />
      </main>
    </div>
  );
}

// ── Resilience Report Card ────────────────────────────────────────────────────
function ReportCard({ session, onElevateToCrisis }: { session: SessionData; onElevateToCrisis: (session: SessionData) => void }) {
  return session.srsScore !== null
    ? <CanonicalReportCard session={session} onElevateToCrisis={onElevateToCrisis} />
    : <LegacyReportCard session={session} />;
}

// ── Canonical (V2-2+) — three-factor SRS + collapse timeline ─────────────────
function CanonicalReportCard({ session, onElevateToCrisis }: { session: SessionData; onElevateToCrisis: (session: SessionData) => void }) {
  const score = session.srsScore ?? 0;
  const grade = session.grade ?? "—";

  const factors: Array<{ label: string; value: number | null; note: string }> = [
    { label: "SKEPTIC DEFLECTION RATE", value: session.skepticDeflection, note: "S_DR · 40%" },
    { label: "SOURCE GROUNDING ANCHOR", value: session.sourceGrounding,   note: "S_GA · 45%" },
    { label: "BIAS EQUILIBRIUM",        value: session.biasEquilibrium,   note: "B_E  · 15%"  },
  ];

  return (
    <div style={{ border: `2px solid ${C.tealBright}`, background: C.panel2 }}>

      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.tealBright, marginBottom: 6 }}>
            [ FINAL EVALUATION COMPLETED ]
          </div>
          <div className="cs-display" style={{ fontSize: 14, color: C.laceDim }}>
            SYNTHESIS RESILIENCE SCORE
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className="cs-display" style={{ fontSize: 52, fontWeight: 700, color: C.gold, lineHeight: 1 }}>
            {score}
          </span>
          <span className="cs-mono" style={{ fontSize: 18, color: C.laceDim }}>/100</span>
          <div className="cs-mono" style={{ fontSize: 13, color: C.gold, letterSpacing: "0.15em", marginTop: 4 }}>
            GRADE: {grade}
          </div>
        </div>
      </div>

      {/* Three-factor breakdown */}
      <div style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceFaint, padding: "12px 24px 8px" }}>
          THREE-FACTOR BREAKDOWN
        </div>
        {factors.map(({ label, value, note }) => {
          const v   = value ?? 0;
          const pct = v * 100;
          const col = pct >= 75 ? C.tealBright : pct >= 50 ? C.gold : C.rust;
          return (
            <div key={label} style={{ padding: "10px 24px", borderTop: `1px solid ${C.lineSoft}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.laceDim }}>{label}</span>
                <span className="cs-mono" style={{ fontSize: 11, color: col, fontWeight: 600 }}>
                  {v.toFixed(2)} <span style={{ color: C.laceFaint }}>({note})</span>
                </span>
              </div>
              <div style={{ height: 3, background: C.lineSoft }}>
                <div style={{ height: "100%", width: `${pct}%`, background: col, transition: "width 0.6s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Collapse timeline */}
      {session.collapseTimeline && session.collapseTimeline.length > 0 && (
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.line}` }}>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.rust, marginBottom: 10 }}>
            [ COLLAPSE TIMELINE ]
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {session.collapseTimeline.map((event, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <span className="cs-mono" style={{ fontSize: 10, color: C.rust, minWidth: 64 }}>
                  ROUND {event.round}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 3, background: C.lineSoft, marginBottom: 4 }}>
                    <div style={{ height: "100%", width: `${event.drop * 100}%`, background: C.rust }} />
                  </div>
                  <p className="cs-serif" style={{ fontSize: 13, color: C.laceFaint, margin: 0 }}>
                    {event.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Professor critique */}
      {session.professorCritique && (
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.line}` }}>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, marginBottom: 8 }}>
            [ PROFESSOR'S CRITIQUE ]
          </div>
          <p className="cs-serif" style={{ fontSize: 15, lineHeight: 1.7, color: C.lace, margin: 0, fontStyle: "italic" }}>
            "{session.professorCritique}"
          </p>
        </div>
      )}

      {/* Crisis Mode elevation (V2-8) */}
      <CrisisElevationPanel session={session} onElevate={onElevateToCrisis} />

      {/* On-chain credential (V2-5) */}
      <CredentialMintPanel sessionId={session.id} />
    </div>
  );
}

// ── Crisis Mode elevation panel (V2-8) ────────────────────────────────────────
// Matches the eligibility gate enforced server-side in
// src/app/api/challenge/[id]/crisis/route.ts — kept in sync by comment, not
// by import: that route is server-only (pulls in src/lib/challenge.ts, which
// pulls in the Anthropic SDK), so importing its constant here would drag
// server dependencies into this client component, the same class of mistake
// BillingDashboard.tsx's credit-constants.ts split fixed in V2-3.
const CRISIS_ELIGIBILITY_MIN_SRS = 60;

function CrisisElevationPanel({
  session,
  onElevate,
}: {
  session: SessionData;
  onElevate: (session: SessionData) => void;
}) {
  const [elevating, setElevating] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Already elevated (or in the middle of a crisis round) — nothing to offer.
  if (session.isCrisisMode) return null;
  // Below the passing threshold — Crisis Mode is an escalation, not a retry mechanism.
  if ((session.srsScore ?? 0) < CRISIS_ELIGIBILITY_MIN_SRS) return null;

  const elevate = async () => {
    setElevating(true);
    setError(null);
    try {
      const res  = await fetch(`/api/challenge/${session.id}/crisis`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error);
      onElevate(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crisis elevation failed");
    } finally {
      setElevating(false);
    }
  };

  return (
    <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.lineSoft}`, background: "rgba(181,86,58,0.03)" }}>
      <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.2em", color: C.rust, marginBottom: 8 }}>
        [ CRISIS MODE AVAILABLE ]
      </div>
      <p className="cs-serif" style={{ fontSize: 13, color: C.laceDim, marginBottom: 12, lineHeight: 1.6 }}>
        You held your ground against five independent experts. The Catalyst — a fused Skeptic and
        Economist — will now hit the weakest load-bearing assumption in your defense with a single
        black-swan disruption. Your final score reflects the whole session, reweighted toward
        deflection under pressure.
      </p>
      {error && <div className="cs-mono" style={{ fontSize: 11, color: C.rust, marginBottom: 8 }}>✕ {error}</div>}
      <button
        onClick={elevate}
        disabled={elevating}
        className="cs-mono"
        style={{
          fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", padding: "9px 16px",
          border: `1px solid ${C.rust}`, background: "transparent", color: C.rust,
          cursor: elevating ? "not-allowed" : "pointer",
        }}
      >
        {elevating ? "THE CATALYST IS FORMING…" : "⚠ ELEVATE TO CRISIS MODE"}
      </button>
    </div>
  );
}

// ── On-chain credential mint panel (V2-5) ─────────────────────────────────────
interface CredentialStatus {
  status: "NOT_MINTED" | "PENDING" | "PROCESSING" | "MINTED" | "FAILED";
  network?: "BASE" | "POLYGON";
  attestationUID?: string | null;
  failureReason?: string | null;
  verifyUrl?: string | null;
}

function CredentialMintPanel({ sessionId }: { sessionId: string }) {
  const [status, setStatus]   = useState<CredentialStatus>({ status: "NOT_MINTED" });
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  const fetchStatus = async () => {
    try {
      const res  = await fetch(`/api/credentials/${sessionId}`);
      const data = await res.json();
      if (res.ok) setStatus(data);
    } catch {
      // Silent — this is a polling refresh, not a user-initiated action.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Only poll while a mint is actually in flight — no point hammering the
    // route once a credential is settled (MINTED/FAILED) or nothing has
    // been requested yet (NOT_MINTED).
    const interval = setInterval(() => {
      setStatus((s) => {
        if (s.status === "PENDING" || s.status === "PROCESSING") fetchStatus();
        return s;
      });
    }, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const mint = async () => {
    setMinting(true);
    setError(null);
    try {
      const res  = await fetch("/api/credentials/mint", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "ADDON_REQUIRED") { setNeedsUpgrade(true); return; }
        throw new Error(data.message ?? data.error);
      }
      setStatus({ status: "PENDING" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mint request failed");
    } finally {
      setMinting(false);
    }
  };

  if (loading) return null;

  if (needsUpgrade) {
    return (
      <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.lineSoft}` }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.2em", color: C.gold, marginBottom: 8 }}>
          [ ON-CHAIN CREDENTIALS · ADD-ON REQUIRED ]
        </div>
        <p className="cs-serif" style={{ fontSize: 13, color: C.laceDim }}>
          Anchor this score on-chain so employers can verify it directly — +$29/mo, any paid plan.
        </p>
        <a href="/billing" className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: C.gold, textDecoration: "none" }}>
          ENABLE IN BILLING →
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.lineSoft}` }}>
      <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.2em", color: C.laceDim, marginBottom: 10 }}>
        [ ON-CHAIN CREDENTIAL ]
      </div>

      {error && <div className="cs-mono" style={{ fontSize: 11, color: C.rust, marginBottom: 8 }}>✕ {error}</div>}

      {status.status === "NOT_MINTED" && (
        <button
          onClick={mint}
          disabled={minting}
          className="cs-mono"
          style={{
            fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", padding: "9px 16px",
            border: `1px solid ${C.gold}`, background: "transparent", color: C.gold,
            cursor: minting ? "not-allowed" : "pointer",
          }}
        >
          {minting ? "QUEUING…" : "MINT ON-CHAIN CREDENTIAL"}
        </button>
      )}

      {(status.status === "PENDING" || status.status === "PROCESSING") && (
        <div className="cs-mono" style={{ fontSize: 11, color: C.gold }}>
          ⟳ {status.status === "PENDING" ? "QUEUED" : "MINTING ON " + (status.network ?? "BASE")}…
        </div>
      )}

      {status.status === "MINTED" && (
        <div>
          <div className="cs-mono" style={{ fontSize: 11, color: C.tealBright, marginBottom: 6 }}>
            ✓ MINTED ON {status.network}
          </div>
          {status.verifyUrl && (
            <a href={status.verifyUrl} target="_blank" rel="noreferrer" className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.1em", color: C.laceDim, textDecoration: "underline" }}>
              VIEW ATTESTATION →
            </a>
          )}
        </div>
      )}

      {status.status === "FAILED" && (
        <div>
          <div className="cs-mono" style={{ fontSize: 11, color: C.rust, marginBottom: 6 }}>
            ✕ MINT FAILED{status.failureReason ? `: ${status.failureReason}` : ""}
          </div>
          <button
            onClick={mint}
            disabled={minting}
            className="cs-mono"
            style={{ fontSize: 10, letterSpacing: "0.12em", padding: "7px 14px", border: `1px solid ${C.line}`, background: "transparent", color: C.laceDim, cursor: "pointer" }}
          >
            {minting ? "RETRYING…" : "RETRY MINT"}
          </button>
        </div>
      )}
    </div>
  );
}
function LegacyReportCard({ session }: { session: SessionData }) {
  const breakdown = session.legacyVectorBreakdown;
  const score     = session.legacyResilienceScore ?? 0;
  const grade     = session.grade ?? "—";

  const vectors: Array<{ key: keyof LegacyVectorBreakdown; label: string }> = [
    { key: "empiricalGrounding",    label: "Empirical Grounding"    },
    { key: "boundaryAwareness",     label: "Boundary Awareness"     },
    { key: "personaNeutralization", label: "Persona Neutralization" },
    { key: "logicalConsistency",    label: "Logical Consistency"    },
    { key: "synthesisRigor",        label: "Synthesis Rigor"        },
  ];

  return (
    <div style={{ border: `2px solid ${C.tealBright}`, background: C.panel2 }}>

      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.tealBright, marginBottom: 6 }}>
            [ FINAL EVALUATION COMPLETED · LEGACY SCORING ]
          </div>
          <div className="cs-display" style={{ fontSize: 14, color: C.laceDim }}>
            SYNTHESIS RESILIENCE RATING
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className="cs-display" style={{ fontSize: 52, fontWeight: 700, color: C.gold, lineHeight: 1 }}>
            {score}
          </span>
          <span className="cs-mono" style={{ fontSize: 18, color: C.laceDim }}>/100</span>
          <div className="cs-mono" style={{ fontSize: 13, color: C.gold, letterSpacing: "0.15em", marginTop: 4 }}>
            GRADE: {grade}
          </div>
        </div>
      </div>

      {/* Vector breakdown */}
      {breakdown && (
        <div style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceFaint, padding: "12px 24px 8px" }}>
            VECTOR BREAKDOWN
          </div>
          {vectors.map(({ key, label }) => {
            const v    = breakdown[key];
            const pct  = (v.score / 20) * 100;
            const col  = pct >= 75 ? C.tealBright : pct >= 50 ? C.gold : C.rust;
            return (
              <div key={key} style={{ padding: "10px 24px", borderTop: `1px solid ${C.lineSoft}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.laceDim }}>{label}</span>
                  <span className="cs-mono" style={{ fontSize: 11, color: col, fontWeight: 600 }}>{v.score}/20</span>
                </div>
                <div style={{ height: 3, background: C.lineSoft, marginBottom: 4 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: col, transition: "width 0.6s ease" }} />
                </div>
                <p className="cs-serif" style={{ fontSize: 13, color: C.laceFaint, margin: 0 }}>{v.rationale}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Weakest link */}
      {session.legacyWeakestLink && (
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.line}` }}>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.rust, marginBottom: 8 }}>
            [ THE WEAKEST LINK ]
          </div>
          <p className="cs-serif" style={{ fontSize: 14, lineHeight: 1.65, color: C.lace, margin: 0 }}>
            {session.legacyWeakestLink}
          </p>
        </div>
      )}

      {/* Professor critique */}
      {session.professorCritique && (
        <div style={{ padding: "16px 24px" }}>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, marginBottom: 8 }}>
            [ PROFESSOR'S CRITIQUE ]
          </div>
          <p className="cs-serif" style={{ fontSize: 15, lineHeight: 1.7, color: C.lace, margin: 0, fontStyle: "italic" }}>
            "{session.professorCritique}"
          </p>
        </div>
      )}
    </div>
  );
}
