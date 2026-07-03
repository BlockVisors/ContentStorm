"use client";

import React, { useState } from "react";
import useSWR from "swr";

/**
 * The Arbitrage Clipper — dashboard slicer UI (V2-10).
 *
 * Flow: pick a source ScriptBlock → pick a platform mode → slice (gpt-4o-mini
 * extracts the highest-friction clash point) → preview the beats → render
 * (queues the clip-render worker) → poll status → download link on completion.
 *
 * Gating: if the org doesn't have hasClipperAddon, this renders an upsell
 * panel instead of the slicer — matches the ADDON_REQUIRED shape
 * src/lib/tenancy.ts::assertAddon() returns, so a 403 from either the slice
 * or render route surfaces the same upgrade prompt inline rather than a
 * dead-end error.
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

type PlatformMode = "RETAINER" | "EDUCATOR" | "DEEP_DIVER";
type TargetPlatform = "SHORTS_OPTIMAL" | "REELS_OPTIMAL" | "TIKTOK_MID" | "YOUTUBE_SHORT_MAX";

const MODE_META: Record<PlatformMode, { label: string; range: string; note: string; defaultTarget: TargetPlatform }> = {
  RETAINER:   { label: "THE RETAINER",   range: "15–30s",  note: "Single thesis + direct counter. Aggressive kinetic type.",       defaultTarget: "SHORTS_OPTIMAL" },
  EDUCATOR:   { label: "THE EDUCATOR",   range: "45–60s",  note: "Problem → clash → blind spot. 3 scenes + a closing CTA.",        defaultTarget: "TIKTOK_MID" },
  DEEP_DIVER: { label: "THE DEEP DIVER", range: "90s–3m",  note: "Full STORM arc. Retention-reset visual shift every ~12s.",       defaultTarget: "YOUTUBE_SHORT_MAX" },
};

const TARGET_LABELS: Record<TargetPlatform, string> = {
  SHORTS_OPTIMAL:    "YouTube Shorts",
  REELS_OPTIMAL:     "Instagram Reels",
  TIKTOK_MID:        "TikTok",
  YOUTUBE_SHORT_MAX:  "YouTube Shorts (max length)",
};

interface ScriptBlockOption {
  id: string;
  sectionTitle: string;
  textContent: string;
}

interface ClipListItem {
  id: string;
  sourceScriptBlockId: string | null;
  platformMode: PlatformMode;
  targetPlatform: TargetPlatform;
  sectionTitle: string;
  textContent: string;
  ctaText: string | null;
  mediaStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  compiledVideoUrl: string | null;
  createdAt: string;
}

interface SliceResult {
  clipAssetId: string;
  sectionTitle: string;
  beats: string[];
  ctaText: string | null;
  beatCount: number;
  expectedDurationRange: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ClipperPanel({
  moduleId,
  scriptBlocks,
}: {
  moduleId: string;
  scriptBlocks: ScriptBlockOption[];
}) {
  const { data: listData, mutate: mutateList } = useSWR<{ clips: ClipListItem[] }>(
    `/api/clipper/${moduleId}`,
    fetcher,
    { refreshInterval: 8000 }
  );

  const [selectedBlockId, setSelectedBlockId] = useState(scriptBlocks[0]?.id ?? "");
  const [platformMode, setPlatformMode]       = useState<PlatformMode>("RETAINER");
  const [targetPlatform, setTargetPlatform]   = useState<TargetPlatform>(MODE_META.RETAINER.defaultTarget);
  const [slicing, setSlicing]                 = useState(false);
  const [sliceResult, setSliceResult]         = useState<SliceResult | null>(null);
  const [rendering, setRendering]             = useState<string | null>(null); // clipAssetId currently being queued
  const [error, setError]                     = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade]       = useState(false);

  const selectMode = (mode: PlatformMode) => {
    setPlatformMode(mode);
    setTargetPlatform(MODE_META[mode].defaultTarget);
  };

  const runSlice = async () => {
    if (!selectedBlockId) return;
    setSlicing(true);
    setError(null);
    setSliceResult(null);
    try {
      const res = await fetch("/api/clipper/slice", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scriptBlockId: selectedBlockId, platformMode, targetPlatform }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "ADDON_REQUIRED") { setNeedsUpgrade(true); return; }
        throw new Error(data.message ?? data.error);
      }
      setSliceResult(data);
      await mutateList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Slice failed");
    } finally {
      setSlicing(false);
    }
  };

  const triggerRender = async (clipAssetId: string) => {
    setRendering(clipAssetId);
    setError(null);
    try {
      const res = await fetch(`/api/clipper/${clipAssetId}/render`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "ADDON_REQUIRED") { setNeedsUpgrade(true); return; }
        if (data.error === "INSUFFICIENT_CREDITS") {
          setError(`Not enough Storm Credits — need ${data.required}, have ${data.available}.`);
          return;
        }
        throw new Error(data.message ?? data.error);
      }
      await mutateList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render trigger failed");
    } finally {
      setRendering(null);
    }
  };

  if (needsUpgrade) {
    return (
      <div style={{ border: `1px solid ${C.gold}`, background: "rgba(201,162,75,0.04)", padding: 32, textAlign: "center" }}>
        <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.25em", color: C.gold, marginBottom: 12 }}>
          [ THE ARBITRAGE CLIPPER · ADD-ON REQUIRED ]
        </div>
        <p className="cs-serif" style={{ fontSize: 15, color: C.laceDim, maxWidth: 480, margin: "0 auto 20px" }}>
          Automated vertical short-form slicing is a +$39/mo add-on, available on any paid plan. Turn 10 hours of manual clipping into one click.
        </p>
        <a href="/billing" className="cs-mono" style={{
          display: "inline-block", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em",
          padding: "10px 20px", background: C.gold, color: C.ink, textDecoration: "none",
        }}>
          ENABLE IN BILLING →
        </a>
      </div>
    );
  }

  return (
    <div style={{ color: C.lace }}>
      {error && (
        <div className="cs-mono" style={{ fontSize: 11, color: C.rust, marginBottom: 16 }}>✕ {error}</div>
      )}

      {/* ── Source + mode selection ─────────────────────────────────────── */}
      <div style={{ border: `1px solid ${C.line}`, background: C.panel, marginBottom: 20 }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, padding: "14px 20px", borderBottom: `1px solid ${C.lineSoft}` }}>
          NEW CLIP
        </div>

        <div style={{ padding: 20 }}>
          <label className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.laceFaint, display: "block", marginBottom: 6 }}>
            SOURCE SCRIPT BLOCK
          </label>
          <select
            value={selectedBlockId}
            onChange={(e) => setSelectedBlockId(e.target.value)}
            className="cs-mono"
            style={{ width: "100%", padding: "8px 10px", background: C.panel2, color: C.lace, border: `1px solid ${C.line}`, fontSize: 12, marginBottom: 18 }}
          >
            {scriptBlocks.length === 0 && <option value="">No script blocks yet</option>}
            {scriptBlocks.map((b) => (
              <option key={b.id} value={b.id}>{b.sectionTitle}</option>
            ))}
          </select>

          <label className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.laceFaint, display: "block", marginBottom: 8 }}>
            PLATFORM MODE
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 18 }}>
            {(Object.keys(MODE_META) as PlatformMode[]).map((mode) => {
              const meta = MODE_META[mode];
              const active = platformMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => selectMode(mode)}
                  className="cs-mono"
                  style={{
                    textAlign: "left", padding: "12px 14px", cursor: "pointer",
                    border: `1px solid ${active ? C.gold : C.line}`,
                    background: active ? "rgba(201,162,75,0.06)" : C.panel2,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: active ? C.gold : C.laceDim, marginBottom: 4 }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 10, color: C.tealBright, marginBottom: 6 }}>{meta.range}</div>
                  <div className="cs-serif" style={{ fontSize: 11, color: C.laceFaint, lineHeight: 1.4 }}>{meta.note}</div>
                </button>
              );
            })}
          </div>

          <label className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.laceFaint, display: "block", marginBottom: 6 }}>
            TARGET PLATFORM
          </label>
          <select
            value={targetPlatform}
            onChange={(e) => setTargetPlatform(e.target.value as TargetPlatform)}
            className="cs-mono"
            style={{ width: "100%", padding: "8px 10px", background: C.panel2, color: C.lace, border: `1px solid ${C.line}`, fontSize: 12, marginBottom: 18 }}
          >
            {(Object.keys(TARGET_LABELS) as TargetPlatform[]).map((tp) => (
              <option key={tp} value={tp}>{TARGET_LABELS[tp]}</option>
            ))}
          </select>

          <button
            onClick={runSlice}
            disabled={slicing || !selectedBlockId}
            className="cs-mono"
            style={{
              width: "100%", padding: "12px 16px", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em",
              border: "none", cursor: slicing || !selectedBlockId ? "not-allowed" : "pointer",
              background: slicing || !selectedBlockId ? C.lineSoft : C.gold,
              color: slicing || !selectedBlockId ? C.laceFaint : C.ink,
            }}
          >
            {slicing ? "EXTRACTING HIGHEST-FRICTION CLASH…" : "SLICE"}
          </button>
        </div>

        {/* ── Slice preview ──────────────────────────────────────────────── */}
        {sliceResult && (
          <div style={{ borderTop: `1px solid ${C.lineSoft}`, padding: 20 }}>
            <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.2em", color: C.tealBright, marginBottom: 4 }}>
              SLICED · {sliceResult.beatCount} BEAT{sliceResult.beatCount !== 1 ? "S" : ""} · {sliceResult.expectedDurationRange}
            </div>
            <div className="cs-display" style={{ fontSize: 16, fontWeight: 700, color: C.lace, marginBottom: 12 }}>
              {sliceResult.sectionTitle}
            </div>
            {sliceResult.beats.map((beat, i) => (
              <p key={i} className="cs-serif" style={{ fontSize: 13, color: C.laceDim, lineHeight: 1.6, marginBottom: 8, paddingLeft: 12, borderLeft: `2px solid ${i % 2 === 0 ? C.gold : C.tealBright}` }}>
                {beat}
              </p>
            ))}
            {sliceResult.ctaText && (
              <p className="cs-mono" style={{ fontSize: 12, color: C.gold, marginTop: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                CTA → {sliceResult.ctaText}
              </p>
            )}
            <button
              onClick={() => triggerRender(sliceResult.clipAssetId)}
              disabled={rendering === sliceResult.clipAssetId}
              className="cs-mono"
              style={{
                marginTop: 16, padding: "10px 18px", fontSize: 11, fontWeight: 600, letterSpacing: "0.15em",
                border: `1px solid ${C.tealBright}`, background: "transparent", color: C.tealBright, cursor: "pointer",
              }}
            >
              {rendering === sliceResult.clipAssetId ? "QUEUING…" : "RENDER THIS CLIP"}
            </button>
          </div>
        )}
      </div>

      {/* ── Existing clips ──────────────────────────────────────────────── */}
      <div style={{ border: `1px solid ${C.line}`, background: C.panel }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, padding: "14px 20px", borderBottom: `1px solid ${C.lineSoft}` }}>
          CLIPS FOR THIS MODULE
        </div>
        {(listData?.clips ?? []).length === 0 ? (
          <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.laceFaint, padding: "20px" }}>
            NO CLIPS YET
          </div>
        ) : (
          listData!.clips.map((clip) => (
            <div key={clip.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${C.lineSoft}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div className="cs-display" style={{ fontSize: 13, fontWeight: 600, color: C.lace, marginBottom: 2 }}>
                  {clip.sectionTitle}
                </div>
                <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: C.laceFaint }}>
                  {MODE_META[clip.platformMode].label} · {TARGET_LABELS[clip.targetPlatform]} · {new Date(clip.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {clip.mediaStatus === "COMPLETED" && clip.compiledVideoUrl ? (
                  <a href={clip.compiledVideoUrl} target="_blank" rel="noreferrer" className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: C.tealBright, textDecoration: "none" }}>
                    ▶ DOWNLOAD
                  </a>
                ) : clip.mediaStatus === "PROCESSING" ? (
                  <span className="cs-mono" style={{ fontSize: 10, color: C.gold }}>{clip.progress}%</span>
                ) : clip.mediaStatus === "FAILED" ? (
                  <span className="cs-mono" style={{ fontSize: 10, color: C.rust }}>FAILED</span>
                ) : (
                  <button
                    onClick={() => triggerRender(clip.id)}
                    disabled={rendering === clip.id}
                    className="cs-mono"
                    style={{ fontSize: 10, letterSpacing: "0.1em", padding: "5px 10px", border: `1px solid ${C.line}`, background: "transparent", color: C.laceDim, cursor: "pointer" }}
                  >
                    {rendering === clip.id ? "QUEUING…" : "RENDER"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
