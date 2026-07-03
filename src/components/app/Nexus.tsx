"use client";

import React, { useState } from "react";
import useSWR from "swr";

/**
 * THE NEXUS — live Nexus scan view (Blueprint §5.2, §5.3).
 *
 * Conditional SWR polling: polls while stage is IDLE/SCANNING/MAPPING/SYNTHESISING,
 * stops on READY. Mirrors the Vault's pattern exactly.
 *
 * Three zones:
 *   1. Stage rail — current pipeline position
 *   2. Perspective grid — five persona cards that populate live
 *   3. Contradiction map — appears once all 5 perspectives land
 */

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
  goldBright: "#E0BE63",
  rust:       "#B5563A",
};

const PERSONA_META: Record<string, { sigil: string; label: string; color: string }> = {
  PRACTITIONER: { sigil: "P", label: "PRACTITIONER",  color: C.tealBright  },
  ACADEMIC:     { sigil: "A", label: "ACADEMIC",      color: C.laceDim     },
  SKEPTIC:      { sigil: "S", label: "SKEPTIC",       color: C.rust        },
  ECONOMIST:    { sigil: "E", label: "ECONOMIST",     color: C.gold        },
  HISTORIAN:    { sigil: "H", label: "HISTORIAN",     color: C.laceFaint   },
};

const STAGES = ["IDLE", "SCANNING", "MAPPING", "SYNTHESISING", "READY"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABEL: Record<Stage, string> = {
  IDLE:          "AWAITING INITIALIZATION",
  SCANNING:      "MULTI-PERSPECTIVE SCAN IN PROGRESS",
  MAPPING:       "CONTRADICTION MAPPING",
  SYNTHESISING:  "SYNTHESISING SCRIPT BLOCKS",
  READY:         "NEXUS COMPLETE — CRUCIBLE READY",
};

const ACTIVE_STAGES: Stage[] = ["IDLE", "SCANNING", "MAPPING", "SYNTHESISING"];

type ModuleState = {
  id:    string;
  title: string;
  stage: Stage;
  perspectives: Array<{
    persona:       string;
    corePosition:  string;
  }>;
  contradictionMap: {
    clashPoints:         unknown[];
    strongestView:       string;
    weakestView:         string;
    resolvingQuestion:   string;
    universalAgreements: string;
    fieldBlindSpots:     string;
  } | null;
  scriptBlocks: Array<{ id: string; sectionTitle: string }>;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Nexus({
  moduleId,
  onReady,
}: {
  moduleId: string;
  onReady?: () => void;
}) {
  const [initialising, setInitialising] = useState(false);
  const [initError, setInitError]       = useState<string | null>(null);

  const { data, mutate } = useSWR<ModuleState>(
    `/api/modules/${moduleId}`,
    fetcher,
    {
      refreshInterval: (d) =>
        d && !ACTIVE_STAGES.includes(d.stage as Stage) ? 0 : 2000,
      onSuccess: (d) => {
        if (d.stage === "READY") onReady?.();
      },
    }
  );

  const stage: Stage = (data?.stage as Stage) ?? "IDLE";
  const perspectives = data?.perspectives ?? [];
  const map          = data?.contradictionMap ?? null;

  const handleInitialize = async () => {
    setInitialising(true);
    setInitError(null);
    try {
      const res = await fetch(`/api/modules/${moduleId}/initialize`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message ?? body.error ?? "Initialize failed");
      }
      mutate(); // trigger immediate re-fetch
    } catch (e) {
      setInitError(e instanceof Error ? e.message : "Initialization failed");
    } finally {
      setInitialising(false);
    }
  };

  return (
    <div style={{ background: C.ink, color: C.lace, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Spectral:wght@400;500&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .cs-nexus, .cs-nexus * { box-sizing: border-box; }
        .cs-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .cs-serif   { font-family: 'Spectral', Georgia, serif; }
        .cs-mono    { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        .cs-nexus ::selection { background: ${C.gold}; color: ${C.ink}; }
        @keyframes csPulse { 0%,100%{opacity:.4;} 50%{opacity:1;} }
        .cs-blink { animation: csPulse 1.15s ease-in-out infinite; }
        @keyframes csFade { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
        .cs-appear { animation: csFade .4s ease-out; }
        @media (prefers-reduced-motion: reduce) { .cs-blink,.cs-appear { animation: none; } }
      `}</style>

      {/* COMMAND RAIL */}
      <header style={{ borderBottom: `1px solid ${C.line}`, background: "rgba(7,16,15,0.92)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.gold }}>CONTENT STORM</span>
            <span style={{ color: C.lineSoft }}>/</span>
            <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.laceDim }}>THE NEXUS</span>
          </div>
          <span className={`cs-mono ${ACTIVE_STAGES.includes(stage) ? "cs-blink" : ""}`}
            style={{ fontSize: 10, letterSpacing: "0.22em", color: stage === "READY" ? C.tealBright : ACTIVE_STAGES.includes(stage) ? C.gold : C.laceFaint }}>
            ▸ {STAGE_LABEL[stage]}
          </span>
        </div>
      </header>

      <main className="cs-nexus" style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* MODULE TITLE */}
        <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.laceFaint, marginBottom: 10 }}>
          MODULE · {perspectives.length}/5 PERSPECTIVES INDEXED
        </div>
        <h1 className="cs-display" style={{ fontSize: "clamp(24px, 4vw, 40px)", lineHeight: 1, margin: "0 0 32px" }}>
          {data?.title ?? "…"}
        </h1>

        {/* STAGE RAIL */}
        <StageRail current={stage} />

        {/* INITIALIZE CTA */}
        {stage === "IDLE" && (
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            <button
              onClick={handleInitialize}
              disabled={initialising}
              className="cs-mono"
              style={{
                fontSize: 12, fontWeight: 600, letterSpacing: "0.18em",
                padding: "14px 28px", border: "none",
                background: initialising ? C.lineSoft : C.gold,
                color: initialising ? C.laceFaint : C.ink,
                cursor: initialising ? "not-allowed" : "pointer",
              }}
            >
              {initialising ? "QUEUING SCANS…" : "[ INITIALIZE NEXUS SCAN ]"}
            </button>
            {initError && (
              <span className="cs-mono" style={{ fontSize: 11, color: C.rust }}>✕ {initError}</span>
            )}
          </div>
        )}

        {/* PERSPECTIVE GRID */}
        {(perspectives.length > 0 || stage !== "IDLE") && (
          <div style={{ marginTop: 40 }}>
            <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: C.laceDim, marginBottom: 16 }}>
              EXPERT PERSPECTIVES
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {["PRACTITIONER", "ACADEMIC", "SKEPTIC", "ECONOMIST", "HISTORIAN"].map((p) => {
                const meta  = PERSONA_META[p];
                const found = perspectives.find((x) => x.persona === p);
                return (
                  <PersonaCard
                    key={p}
                    meta={meta}
                    position={found?.corePosition ?? null}
                    scanning={ACTIVE_STAGES.includes(stage) && !found}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* CONTRADICTION MAP */}
        {map && (
          <div className="cs-appear" style={{ marginTop: 48 }}>
            <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: C.laceDim, marginBottom: 16 }}>
              CONTRADICTION MAP
            </div>
            <ContradictionPanel map={map} />
          </div>
        )}

        {/* READY STATE */}
        {stage === "READY" && (
          <div className="cs-appear" style={{ marginTop: 40, padding: "20px 24px", border: `1px solid ${C.tealBright}`, background: "rgba(46,111,106,0.06)" }}>
            <div className="cs-mono" style={{ fontSize: 11, letterSpacing: "0.22em", color: C.tealBright, marginBottom: 8 }}>
              ✓ NEXUS COMPLETE
            </div>
            <p className="cs-serif" style={{ fontSize: 16, color: C.laceDim, margin: 0 }}>
              {data?.scriptBlocks.length ?? 0} script blocks written to The Crucible.
              Open the editor to refine and compile.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StageRail({ current }: { current: Stage }) {
  const idx = STAGES.indexOf(current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {STAGES.map((s, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 10, height: 10,
                border: `1px solid ${done || active ? C.gold : C.line}`,
                background: done ? C.gold : active ? "transparent" : "transparent",
              }} />
              <span className="cs-mono" style={{ fontSize: 8, letterSpacing: "0.15em", color: active ? C.gold : done ? C.tealBright : C.laceFaint, whiteSpace: "nowrap" }}>
                {s}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i < idx ? C.tealBright : C.lineSoft, minWidth: 20, marginBottom: 14 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PersonaCard({
  meta, position, scanning,
}: {
  meta:     { sigil: string; label: string; color: string };
  position: string | null;
  scanning: boolean;
}) {
  return (
    <div style={{ border: `1px solid ${C.line}`, background: C.panel, padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span className="cs-mono" style={{ fontSize: 11, fontWeight: 600, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", background: meta.color, color: C.ink }}>
          {meta.sigil}
        </span>
        <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: meta.color }}>
          {meta.label}
        </span>
      </div>
      {position ? (
        <p className="cs-appear cs-serif" style={{ fontSize: 14, lineHeight: 1.6, color: C.lace, margin: 0 }}>
          {position}
        </p>
      ) : (
        <span className={`cs-mono ${scanning ? "cs-blink" : ""}`} style={{ fontSize: 10, letterSpacing: "0.18em", color: scanning ? C.gold : C.laceFaint }}>
          {scanning ? "[ SCANNING ]" : "[ AWAITING ]"}
        </span>
      )}
    </div>
  );
}

function ContradictionPanel({ map }: {
  map: {
    clashPoints:         unknown[];
    strongestView:       string;
    weakestView:         string;
    resolvingQuestion:   string;
    universalAgreements: string;
    fieldBlindSpots:     string;
  };
}) {
  const clashes = map.clashPoints as Array<{ personaA: string; personaB: string; claim: string; tensionSummary: string }>;
  return (
    <div style={{ border: `1px solid ${C.line}`, background: C.panel2 }}>
      {/* Clashes */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.lineSoft}` }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.2em", color: C.rust, marginBottom: 12 }}>PRIMARY CLASHES · {clashes.length}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {clashes.map((c, i) => (
            <div key={i} style={{ padding: "10px 12px", border: `1px solid ${C.lineSoft}`, background: C.panel }}>
              <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.rust, marginBottom: 4 }}>
                {c.personaA} ✕ {c.personaB}
              </div>
              <p className="cs-serif" style={{ fontSize: 13, color: C.lace, margin: "0 0 4px" }}>{c.claim}</p>
              <p className="cs-serif" style={{ fontSize: 12, color: C.laceDim, margin: 0 }}>{c.tensionSummary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Meta rows */}
      {[
        { label: "STRONGEST VIEW",       value: map.strongestView,       accent: C.tealBright },
        { label: "WEAKEST VIEW",         value: map.weakestView,         accent: C.rust       },
        { label: "UNIVERSAL AGREEMENTS", value: map.universalAgreements, accent: C.laceDim    },
        { label: "RESOLVING QUESTION",   value: map.resolvingQuestion,   accent: C.gold       },
        { label: "FIELD BLIND SPOTS",    value: map.fieldBlindSpots,     accent: C.gold       },
      ].map(({ label, value, accent }) => (
        <div key={label} style={{ padding: "14px 20px", borderBottom: `1px solid ${C.lineSoft}` }}>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.2em", color: accent, marginBottom: 6 }}>{label}</div>
          <p className="cs-serif" style={{ fontSize: 14, color: C.lace, lineHeight: 1.6, margin: 0 }}>{value}</p>
        </div>
      ))}
    </div>
  );
}
