"use client";

import React, { useState } from "react";
import useSWR from "swr";

/**
 * Drift Dashboard — executive risk view (V2-4, Sovereign only).
 *
 * Lists cross-silo contradictions, sorted OPEN-first by severity (matches
 * the API's ordering). Each row shows both silos' conflicting assertions
 * side by side, the modeled financial impact, and either a remediation link
 * (already auto-compiled) or a manual "Remediate" trigger.
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
  rust:       "#B5563A",
};

interface DriftRiskItem {
  id: string;
  siloA: string;
  assertionA: string;
  siloB: string;
  assertionB: string;
  divergenceScore: number;
  financialImpact: string;
  remediationPlan: string;
  remediationModuleId: string | null;
  status: "OPEN" | "REMEDIATED" | "DISMISSED";
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function severityColor(score: number): string {
  if (score > 0.85) return C.rust;
  if (score > 0.7) return C.gold;
  return C.tealBright;
}

export default function DriftDashboard() {
  const { data, mutate, error: fetchError } = useSWR<{ risks: DriftRiskItem[] } | { error: string; message: string }>(
    "/api/drift",
    fetcher,
    { refreshInterval: 20_000 }
  );

  const [scanning, setScanning]   = useState(false);
  const [busyId, setBusyId]       = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res  = await fetch("/api/drift/detect", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan trigger failed");
    } finally {
      setScanning(false);
    }
  };

  const remediate = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res  = await fetch(`/api/drift/${id}/remediate`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error);
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remediation failed");
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res  = await fetch(`/api/drift/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: "DISMISSED" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error);
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dismiss failed");
    } finally {
      setBusyId(null);
    }
  };

  // Sovereign gate surfaced inline — the API returns 403 SOVEREIGN_REQUIRED
  // for anything below that tier, rather than an empty list that could read
  // as "no risks found."
  if (data && "error" in data) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: C.gold, marginBottom: 10 }}>
          [ DRIFT DASHBOARD · SOVEREIGN TIER REQUIRED ]
        </div>
        <p className="cs-serif" style={{ fontSize: 14, color: C.laceDim }}>{data.message}</p>
      </div>
    );
  }

  const risks = data?.risks ?? [];
  const openRisks = risks.filter((r) => r.status === "OPEN");

  return (
    <div style={{ background: C.ink, color: C.lace, minHeight: "100vh" }}>
      <header style={{ borderBottom: `1px solid ${C.line}`, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.gold, marginBottom: 6 }}>
            [ THE DRIFT DASHBOARD ]
          </div>
          <div className="cs-display" style={{ fontSize: 18, fontWeight: 700 }}>
            Cross-Silo Inconsistency Map
          </div>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="cs-mono"
          style={{
            fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", padding: "11px 20px",
            border: "none", background: scanning ? C.lineSoft : C.gold,
            color: scanning ? C.laceFaint : C.ink, cursor: scanning ? "not-allowed" : "pointer",
          }}
        >
          {scanning ? "SCAN QUEUED…" : "RUN CROSS-SILO SCAN"}
        </button>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 80px" }}>
        {error && <div className="cs-mono" style={{ fontSize: 11, color: C.rust, marginBottom: 16 }}>✕ {error}</div>}
        {fetchError && <div className="cs-mono" style={{ fontSize: 11, color: C.rust, marginBottom: 16 }}>✕ Failed to load risks</div>}

        <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.laceFaint, marginBottom: 20 }}>
          {openRisks.length} OPEN · {risks.length} TOTAL
        </div>

        {risks.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", border: `1px dashed ${C.line}` }}>
            <p className="cs-serif" style={{ fontSize: 14, color: C.laceFaint }}>
              No contradictions detected yet. Run a cross-silo scan to populate this dashboard.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {risks.map((risk) => {
            const color = severityColor(risk.divergenceScore);
            const dimmed = risk.status !== "OPEN";
            return (
              <div key={risk.id} style={{ border: `1px solid ${dimmed ? C.line : color}`, background: C.panel, opacity: dimmed ? 0.6 : 1 }}>
                <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.lineSoft}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color }}>
                    DIVERGENCE {(risk.divergenceScore * 100).toFixed(0)}% · {risk.status}
                  </span>
                  <span className="cs-mono" style={{ fontSize: 9, color: C.laceFaint }}>
                    {new Date(risk.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid ${C.lineSoft}` }}>
                  <div style={{ padding: "14px 20px", borderRight: `1px solid ${C.lineSoft}` }}>
                    <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.tealBright, marginBottom: 6 }}>
                      {risk.siloA}
                    </div>
                    <p className="cs-serif" style={{ fontSize: 13, color: C.laceDim, margin: 0, lineHeight: 1.5 }}>{risk.assertionA}</p>
                  </div>
                  <div style={{ padding: "14px 20px" }}>
                    <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.rust, marginBottom: 6 }}>
                      {risk.siloB}
                    </div>
                    <p className="cs-serif" style={{ fontSize: 13, color: C.laceDim, margin: 0, lineHeight: 1.5 }}>{risk.assertionB}</p>
                  </div>
                </div>

                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.lineSoft}` }}>
                  <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.gold, marginBottom: 4 }}>
                    FINANCIAL IMPACT
                  </div>
                  <p className="cs-serif" style={{ fontSize: 13, color: C.lace, margin: "0 0 10px" }}>{risk.financialImpact}</p>
                  <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.laceDim, marginBottom: 4 }}>
                    REMEDIATION PLAN
                  </div>
                  <p className="cs-serif" style={{ fontSize: 13, color: C.laceDim, margin: 0 }}>{risk.remediationPlan}</p>
                </div>

                {risk.status === "OPEN" && (
                  <div style={{ padding: "12px 20px", display: "flex", gap: 10 }}>
                    <button
                      onClick={() => remediate(risk.id)}
                      disabled={busyId === risk.id}
                      className="cs-mono"
                      style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", padding: "8px 16px", border: `1px solid ${C.tealBright}`, background: "transparent", color: C.tealBright, cursor: "pointer" }}
                    >
                      {busyId === risk.id ? "COMPILING…" : "AUTO-REMEDIATE"}
                    </button>
                    <button
                      onClick={() => dismiss(risk.id)}
                      disabled={busyId === risk.id}
                      className="cs-mono"
                      style={{ fontSize: 10, letterSpacing: "0.12em", padding: "8px 16px", border: `1px solid ${C.line}`, background: "transparent", color: C.laceFaint, cursor: "pointer" }}
                    >
                      DISMISS
                    </button>
                  </div>
                )}

                {risk.status === "REMEDIATED" && risk.remediationModuleId && (
                  <div style={{ padding: "12px 20px" }}>
                    <a href={`/modules/${risk.remediationModuleId}`} className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: C.tealBright, textDecoration: "none" }}>
                      VIEW REMEDIATION MODULE →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
