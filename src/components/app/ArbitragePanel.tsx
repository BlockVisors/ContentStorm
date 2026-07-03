"use client";

import React, { useState } from "react";
import useSWR from "swr";

/**
 * Curriculum Arbitrage panel — V2-6.
 *
 * Module-scoped (unlike DriftDashboard.tsx, which is org-scoped) — matches
 * the API surface: GET /api/arbitrage/[moduleId], not an org-wide list route.
 * Shows every detected event regardless of addon status (detection is free),
 * but the rewrite action is gated: a non-addon org sees "Curriculum
 * Arbitrage Event Detected" per the source spec's exact notification
 * language, with an upgrade path instead of a working button.
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

interface ArbitrageEventItem {
  id: string;
  sourceUrl: string;
  sourceType: "PATENT" | "ACADEMIC_JOURNAL" | "GITHUB_ADVISORY" | "REGULATORY_UPDATE" | "NEWS";
  sourceExcerpt: string;
  semanticDelta: number;
  affectedBlocks: string[];
  status: "PENDING" | "REWRITING" | "REQUEUED" | "DISMISSED";
  detectedAt: string;
  resolvedAt: string | null;
}

const SOURCE_LABELS: Record<ArbitrageEventItem["sourceType"], string> = {
  PATENT:             "Patent Filing",
  ACADEMIC_JOURNAL:   "Academic Journal",
  GITHUB_ADVISORY:    "GitHub Security Advisory",
  REGULATORY_UPDATE:  "Regulatory Update",
  NEWS:               "News",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ArbitragePanel({ moduleId }: { moduleId: string }) {
  const { data, mutate } = useSWR<{ events: ArbitrageEventItem[] }>(
    `/api/arbitrage/${moduleId}`,
    fetcher,
    { refreshInterval: 15_000 }
  );

  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res  = await fetch(`/api/arbitrage/${moduleId}/scan`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan trigger failed");
    } finally {
      setScanning(false);
    }
  };

  const rewrite = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res  = await fetch(`/api/arbitrage/events/${id}/rewrite`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        if (body.error === "ADDON_REQUIRED") { setNeedsUpgrade(true); return; }
        throw new Error(body.message ?? body.error);
      }
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed");
    } finally {
      setBusyId(null);
    }
  };

  const dismiss = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res  = await fetch(`/api/arbitrage/dismiss/${id}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error);
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dismiss failed");
    } finally {
      setBusyId(null);
    }
  };

  const events = data?.events ?? [];
  const pending = events.filter((e) => e.status === "PENDING");

  return (
    <div style={{ color: C.lace }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim }}>
          CURRICULUM ARBITRAGE {pending.length > 0 && `· ${pending.length} PENDING`}
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="cs-mono"
          style={{
            fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", padding: "8px 14px",
            border: `1px solid ${C.line}`, background: "transparent",
            color: scanning ? C.laceFaint : C.laceDim, cursor: scanning ? "not-allowed" : "pointer",
          }}
        >
          {scanning ? "SCAN QUEUED…" : "CHECK FOR UPDATES"}
        </button>
      </div>

      {error && <div className="cs-mono" style={{ fontSize: 11, color: C.rust, marginBottom: 12 }}>✕ {error}</div>}

      {needsUpgrade && (
        <div style={{ border: `1px solid ${C.gold}`, background: "rgba(201,162,75,0.04)", padding: 20, marginBottom: 16, textAlign: "center" }}>
          <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.gold, marginBottom: 8 }}>
            [ CURRICULUM ARBITRAGE EVENT DETECTED ]
          </div>
          <p className="cs-serif" style={{ fontSize: 13, color: C.laceDim, marginBottom: 12 }}>
            The outside world moved and this module didn't follow — enable auto-rewrite for +$49/mo, any paid plan.
          </p>
          <a href="/billing" className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: C.gold, textDecoration: "none" }}>
            ENABLE IN BILLING →
          </a>
        </div>
      )}

      {events.length === 0 ? (
        <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.laceFaint, padding: "20px 0" }}>
          NO ARBITRAGE EVENTS DETECTED
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {events.map((event) => {
            const dimmed = event.status === "DISMISSED";
            const color  = event.semanticDelta > 0.8 ? C.rust : event.semanticDelta > 0.6 ? C.gold : C.tealBright;
            return (
              <div key={event.id} style={{ border: `1px solid ${dimmed ? C.line : color}`, background: C.panel, opacity: dimmed ? 0.55 : 1 }}>
                <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.lineSoft}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.12em", color }}>
                    {SOURCE_LABELS[event.sourceType]} · Δ{(event.semanticDelta * 100).toFixed(0)}% · {event.status}
                  </span>
                  <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="cs-mono" style={{ fontSize: 9, color: C.laceFaint, textDecoration: "underline" }}>
                    SOURCE →
                  </a>
                </div>
                <div style={{ padding: "12px 16px" }}>
                  <p className="cs-serif" style={{ fontSize: 13, color: C.laceDim, margin: "0 0 8px", lineHeight: 1.5 }}>
                    {event.sourceExcerpt.slice(0, 240)}{event.sourceExcerpt.length > 240 ? "…" : ""}
                  </p>
                  <span className="cs-mono" style={{ fontSize: 9, color: C.laceFaint }}>
                    {event.affectedBlocks.length} block{event.affectedBlocks.length !== 1 ? "s" : ""} affected
                  </span>
                </div>
                {event.status === "PENDING" && (
                  <div style={{ padding: "10px 16px", display: "flex", gap: 8 }}>
                    <button
                      onClick={() => rewrite(event.id)}
                      disabled={busyId === event.id}
                      className="cs-mono"
                      style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", padding: "7px 14px", border: `1px solid ${C.tealBright}`, background: "transparent", color: C.tealBright, cursor: "pointer" }}
                    >
                      {busyId === event.id ? "REWRITING…" : "REWRITE NOW"}
                    </button>
                    <button
                      onClick={() => dismiss(event.id)}
                      disabled={busyId === event.id}
                      className="cs-mono"
                      style={{ fontSize: 10, letterSpacing: "0.1em", padding: "7px 14px", border: `1px solid ${C.line}`, background: "transparent", color: C.laceFaint, cursor: "pointer" }}
                    >
                      DISMISS
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
