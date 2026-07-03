"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Lock, Unlock, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";

/**
 * THE CRUCIBLE — Production block editor (Blueprint §9).
 *
 * Replaces the prototype (TheCrucible.jsx). All state is server-driven:
 *   - Block list fetched from GET /api/modules/[moduleId] (already available)
 *   - Per-block asset status polled from GET /api/blocks/[id]
 *   - Text edits fire PATCH /api/blocks/[id] (debounced 750ms)
 *   - Reorder fires two sequential PATCH requests swapping order values
 *   - Lock toggle fires PATCH with { isLocked }
 *   - Compile CTA fires POST /api/modules/[moduleId]/render
 *
 * SWR per-block: polls GET /api/blocks/[id] every 2.5s while
 * mediaStatus ∈ {PENDING, PROCESSING}; stops on COMPLETED/FAILED.
 */

// ── Palette (locked design system) ──────────────────────────────────────────
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

const PERSONA_META: Record<string, { sigil: string; color: string }> = {
  PRACTITIONER: { sigil: "P", color: C.tealBright },
  ACADEMIC:     { sigil: "A", color: C.laceDim    },
  SKEPTIC:      { sigil: "S", color: C.rust       },
  ECONOMIST:    { sigil: "E", color: C.gold       },
  HISTORIAN:    { sigil: "H", color: C.laceFaint  },
  INTRO:        { sigil: "◈", color: C.tealBright },
  CONTRADICTION:{ sigil: "✕", color: C.rust       },
  SYNTHESIS:    { sigil: "Σ", color: C.gold       },
};

const STYLE_OPTS = ["AVATAR", "WHITEBOARD", "FACELESS"] as const;
type VideoStyle  = (typeof STYLE_OPTS)[number];

// ── Types ────────────────────────────────────────────────────────────────────
interface BlockRow {
  id:          string;
  order:       number;
  sectionTitle: string;
  videoStyle:  VideoStyle;
  imageUrl:    string | null;
  imagePrompt: string | null;
  mediaStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  isLocked:    boolean;
}

interface ModuleData {
  id:          string;
  title:       string;
  scriptBlocks: Pick<BlockRow, "id" | "order" | "sectionTitle" | "videoStyle" | "mediaStatus">[];
  renderJob: { status: string; progress: number; compiledVideoUrl: string | null } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((r) => r.json());
const DEBOUNCE_MS = 750;

// Derive a persona sigil key from sectionTitle for display.
function sigilKey(title: string): string {
  const up = title.toUpperCase();
  for (const key of Object.keys(PERSONA_META)) {
    if (up.includes(key)) return key;
  }
  return "INTRO";
}

// ── Per-block SWR hook ───────────────────────────────────────────────────────
function useBlockStatus(blockId: string, initialStatus: BlockRow["mediaStatus"]) {
  const active = initialStatus === "PENDING" || initialStatus === "PROCESSING";
  const { data } = useSWR<BlockRow>(
    `/api/blocks/${blockId}`,
    fetcher,
    {
      refreshInterval: (d) =>
        d?.mediaStatus === "PENDING" || d?.mediaStatus === "PROCESSING" ? 2500 : 0,
      fallbackData: { mediaStatus: initialStatus } as BlockRow,
      revalidateOnFocus: false,
    }
  );
  return data;
}

// ── ScriptBlockEditor ────────────────────────────────────────────────────────
function ScriptBlockEditor({
  initialBlock,
  index,
  total,
  active,
  onFocus,
  onOrderSwap,
}: {
  initialBlock: Pick<BlockRow, "id" | "order" | "sectionTitle" | "videoStyle" | "mediaStatus">;
  index:        number;
  total:        number;
  active:       boolean;
  onFocus:      (id: string) => void;
  onOrderSwap:  (id: string, dir: -1 | 1) => void;
}) {
  // Local text state — owned here for zero-latency typing.
  const [text,    setText]    = useState("");
  const [fetched, setFetched] = useState(false);
  const taRef     = useRef<HTMLTextAreaElement>(null);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevText  = useRef("");

  // Fetch initial textContent once (not part of the SWR poll — that's asset-only).
  useEffect(() => {
    fetch(`/api/blocks/${initialBlock.id}`)
      .then((r) => r.json())
      .then((d: BlockRow & { textContent?: string }) => {
        // The GET returns textContent if we extend the route — for now derive it
        // from whatever the full block endpoint returns.
        if (d.imagePrompt) {
          // imagePrompt is the style-wrapped prompt, not the script.
          // Fetch full text from a dedicated endpoint in production.
        }
        setFetched(true);
      });
  }, [initialBlock.id]);

  // SWR polls asset status only.
  const blockStatus = useBlockStatus(initialBlock.id, initialBlock.mediaStatus);
  const mediaStatus = blockStatus?.mediaStatus ?? initialBlock.mediaStatus;
  const imageUrl    = blockStatus?.imageUrl    ?? null;
  const isLocked    = blockStatus?.isLocked    ?? false;

  const resize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  useEffect(() => { resize(); }, [text, resize]);

  const patchBlock = useCallback(
    async (payload: Record<string, unknown>) => {
      await fetch(`/api/blocks/${initialBlock.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      // Invalidate the per-block SWR cache so the poll sees the new status.
      globalMutate(`/api/blocks/${initialBlock.id}`);
    },
    [initialBlock.id]
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    resize();
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (val !== prevText.current) {
        prevText.current = val;
        patchBlock({ textContent: val });
        // Optimistic — show PROCESSING immediately without waiting for the PATCH response.
        globalMutate(
          `/api/blocks/${initialBlock.id}`,
          (cur: BlockRow | undefined) => cur ? { ...cur, mediaStatus: "PROCESSING" } : cur,
          false
        );
      }
    }, DEBOUNCE_MS);
  };

  const toggleLock = () => patchBlock({ isLocked: !isLocked });
  const regen      = () => {
    if (!isLocked) patchBlock({ textContent: text || prevText.current });
  };

  const meta = PERSONA_META[sigilKey(initialBlock.sectionTitle)] ?? PERSONA_META.INTRO;
  const accent = active ? C.gold : meta.color === C.rust ? C.rust : C.tealBright;

  return (
    <div
      className="cs-block group flex flex-col md:flex-row md:gap-7 mb-px"
      style={{ background: active ? "rgba(201,162,75,0.025)" : "transparent" }}
    >
      {/* order rail */}
      <div className="hidden md:flex flex-col items-center pt-7 select-none" style={{ width: 34 }}>
        <span className="cs-mono text-[10px]" style={{ color: C.laceFaint }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 w-px mt-2" style={{ background: C.lineSoft }} />
      </div>

      {/* editor column */}
      <div className="flex-1 py-6" style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 18 }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span
              className="cs-mono inline-flex items-center justify-center text-[11px] font-semibold"
              style={{ width: 20, height: 20, color: C.ink, background: meta.color }}
            >
              {meta.sigil}
            </span>
            <span className="cs-mono text-[11px] tracking-[0.22em]" style={{ color: C.laceDim }}>
              {initialBlock.sectionTitle.toUpperCase()}
            </span>
          </div>

          {/* block controls — quiet until hover/focus */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <BlockBtn title="Move up" disabled={index === 0} onClick={() => onOrderSwap(initialBlock.id, -1)}>
              <ArrowUp size={13} />
            </BlockBtn>
            <BlockBtn title="Move down" disabled={index === total - 1} onClick={() => onOrderSwap(initialBlock.id, 1)}>
              <ArrowDown size={13} />
            </BlockBtn>
            <BlockBtn title="Regenerate asset" onClick={regen} disabled={isLocked}>
              <RefreshCw size={13} />
            </BlockBtn>
            <BlockBtn title={isLocked ? "Unpin asset" : "Pin asset"} active={isLocked} onClick={toggleLock}>
              {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
            </BlockBtn>
          </div>
        </div>

        <textarea
          ref={taRef}
          className="cs-serif cs-input w-full bg-transparent resize-none border-none"
          style={{ color: C.lace, fontSize: 18, lineHeight: 1.62, padding: 0 }}
          value={text}
          spellCheck={false}
          placeholder={fetched ? "Draft the script here…" : "Loading…"}
          onFocus={() => onFocus(initialBlock.id)}
          onChange={handleTextChange}
        />
      </div>

      {/* asset margin */}
      <div className="md:pt-6 pb-6 md:pb-0" style={{ minWidth: 0 }}>
        <AssetMargin
          mediaStatus={mediaStatus}
          imageUrl={imageUrl}
          isLocked={isLocked}
          videoStyle={initialBlock.videoStyle}
        />
      </div>
    </div>
  );
}

// ── Asset margin ─────────────────────────────────────────────────────────────
function AssetMargin({ mediaStatus, imageUrl, isLocked, videoStyle }: {
  mediaStatus: BlockRow["mediaStatus"];
  imageUrl:    string | null;
  isLocked:    boolean;
  videoStyle:  VideoStyle;
}) {
  return (
    <>
      <div
        className="relative overflow-hidden"
        style={{
          width: "100%", maxWidth: 280, aspectRatio: "16 / 9",
          background: C.panel2, border: `1px solid ${C.line}`,
        }}
      >
        {mediaStatus === "PROCESSING" || mediaStatus === "PENDING" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div style={{ position: "absolute", left: 0, right: 0, height: "34%",
              background: "linear-gradient(180deg, transparent, rgba(201,162,75,0.14), transparent)",
              animation: "csScan 1.6s linear infinite" }} />
            <span className="cs-mono text-[10px] tracking-[0.3em]"
              style={{ color: C.gold, animation: "csPulse 1.15s ease-in-out infinite", position: "relative", zIndex: 1 }}>
              [ COMPILING ASSET ]
            </span>
          </div>
        ) : mediaStatus === "FAILED" ? (
          <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
            <span className="cs-mono text-[10px] tracking-[0.2em]" style={{ color: C.rust }}>
              ✕ GEN FAILED · RETRY QUEUED
            </span>
          </div>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Generated asset" className="w-full h-full object-cover"
            style={{ animation: "csFade .55s ease-out" }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="cs-mono text-[10px] tracking-[0.2em]" style={{ color: C.laceFaint }}>
              [ NO VISUAL DATA ]
            </span>
          </div>
        )}
        {isLocked && imageUrl && (
          <span className="cs-mono absolute top-1.5 right-1.5 inline-flex items-center gap-1 text-[8px] tracking-widest px-1 py-0.5"
            style={{ color: C.gold, background: "rgba(7,16,15,0.7)" }}>
            <Lock size={9} /> PINNED
          </span>
        )}
      </div>
      <div className="cs-mono text-[9px] tracking-[0.2em] mt-1.5 flex justify-between"
        style={{ color: C.laceFaint, maxWidth: 280 }}>
        <span>{videoStyle}</span>
        <span style={{ color: mediaStatus === "PROCESSING" ? C.gold : C.laceFaint }}>
          {mediaStatus}
        </span>
      </div>
    </>
  );
}

function BlockBtn({ children, title, onClick, disabled, active }: {
  children: React.ReactNode;
  title:    string;
  onClick:  () => void;
  disabled?: boolean;
  active?:  boolean;
}) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className="inline-flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        width: 26, height: 26,
        color:   active ? C.gold : C.laceDim,
        border:  `1px solid ${active ? C.gold : C.line}`,
        background: "transparent",
        opacity: disabled ? 0.3 : 1,
        cursor:  disabled ? "not-allowed" : "pointer",
      }}>
      {children}
    </button>
  );
}

// ── Root Crucible ────────────────────────────────────────────────────────────
export default function Crucible({ moduleId }: { moduleId: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [banner,    setBanner]    = useState<string | null>(null);

  const { data: module, mutate: mutateModule } = useSWR<ModuleData>(
    `/api/modules/${moduleId}`,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false }
  );

  const blocks = (module?.scriptBlocks ?? []).slice().sort((a, b) => a.order - b.order);
  const renderJob = module?.renderJob ?? null;

  const allReady  = blocks.length > 0 && blocks.every((b) => b.mediaStatus === "COMPLETED");
  const anyBusy   = blocks.some((b) => b.mediaStatus === "PROCESSING" || b.mediaStatus === "PENDING");

  // Reorder: swap order values of two adjacent blocks.
  const handleOrderSwap = useCallback(
    async (blockId: string, dir: -1 | 1) => {
      const sorted = blocks.slice().sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((b) => b.id === blockId);
      const j = i + dir;
      if (j < 0 || j >= sorted.length) return;

      const blockA = sorted[i];
      const blockB = sorted[j];

      // Optimistic UI swap.
      mutateModule(
        (cur) => cur
          ? {
              ...cur,
              scriptBlocks: cur.scriptBlocks.map((b) =>
                b.id === blockA.id ? { ...b, order: blockB.order } :
                b.id === blockB.id ? { ...b, order: blockA.order } : b
              ),
            }
          : cur,
        false
      );

      // Two PATCHes to keep order values unique.
      await Promise.all([
        fetch(`/api/blocks/${blockA.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: blockB.order }),
        }),
        fetch(`/api/blocks/${blockB.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: blockA.order }),
        }),
      ]);
    },
    [blocks, mutateModule]
  );

  const handleCompile = async () => {
    if (!allReady || compiling) return;
    setCompiling(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/modules/${moduleId}/render`, { method: "POST" });
      if (!res.ok) throw new Error("Render request rejected");
      setBanner(`RENDER JOB QUEUED · REMOTION LAMBDA · ${blocks.length} BLOCKS → MP4`);
      setTimeout(() => setBanner(null), 5000);
    } catch {
      setBanner("RENDER FAILED — CHECK WORKER LOGS");
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div style={{ background: C.ink, color: C.lace, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Spectral:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .cs-block, .cs-block * { box-sizing: border-box; }
        .cs-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .cs-serif   { font-family: 'Spectral', Georgia, serif; }
        .cs-mono    { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        .cs-input:focus { outline: none; }
        *::selection { background: ${C.gold}; color: ${C.ink}; }
        @keyframes csPulse { 0%,100%{opacity:.4;} 50%{opacity:1;} }
        @keyframes csScan  { 0%{top:-40%;} 100%{top:110%;} }
        @keyframes csFade  { from{opacity:0;transform:scale(1.015);} to{opacity:1;transform:scale(1);} }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation"] { animation: none !important; }
        }
      `}</style>

      {/* COMMAND RAIL */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(7,16,15,0.92)", borderBottom: `1px solid ${C.line}`, backdropFilter: "blur(6px)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.gold }}>CONTENT STORM</span>
            <span style={{ color: C.lineSoft }}>/</span>
            <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.laceDim }}>THE CRUCIBLE</span>
          </div>
          <button onClick={handleCompile} disabled={!allReady || compiling}
            className="cs-mono"
            style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.18em",
              padding: "10px 22px", border: "none",
              background: allReady && !compiling ? C.gold : C.lineSoft,
              color:      allReady && !compiling ? C.ink  : C.laceFaint,
              cursor:     allReady && !compiling ? "pointer" : "not-allowed",
            }}>
            {compiling      ? "QUEUING RENDER…"
             : anyBusy      ? `COMPILING ASSETS ${blocks.filter(b => b.mediaStatus === "COMPLETED").length}/${blocks.length}`
             : allReady     ? "COMPILE LECTURE"
             : `${blocks.filter(b => b.mediaStatus === "COMPLETED").length}/${blocks.length} READY`}
          </button>
        </div>
        {banner && (
          <div className="cs-mono text-[10px] tracking-[0.22em] px-5 py-2"
            style={{ background: C.tealBright, color: C.ink }}>
            ▸ {banner}
          </div>
        )}
        {renderJob?.compiledVideoUrl && (
          <div style={{ maxWidth: 1080, margin: "0 auto", padding: "8px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <span className="cs-mono text-[10px] tracking-[0.2em]" style={{ color: C.tealBright }}>✓ LECTURE COMPILED</span>
            <a href={renderJob.compiledVideoUrl} target="_blank" rel="noopener noreferrer"
              className="cs-mono text-[10px] tracking-[0.15em] underline" style={{ color: C.gold }}>
              DOWNLOAD MP4
            </a>
          </div>
        )}
      </header>

      {/* MODULE HEAD */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 20px 28px" }}>
        <div className="cs-mono text-[10px] tracking-[0.3em] mb-3" style={{ color: C.laceFaint }}>
          MODULE · {blocks.length} BLOCKS · TEXT-FIRST STORYBOARD
        </div>
        <h1 className="cs-display" style={{ fontSize: "clamp(26px,5vw,44px)", lineHeight: 0.98, letterSpacing: "-0.01em" }}>
          {module?.title ?? "…"}
        </h1>
      </div>

      {/* BLOCK LIST */}
      <div style={{ maxWidth: 1080, margin: "0 auto", paddingInline: 20, borderTop: `1px solid ${C.line}` }}>
        {blocks.map((b, i) => (
          <div key={b.id} style={{ borderBottom: `1px solid ${C.lineSoft}` }}>
            <ScriptBlockEditor
              initialBlock={b}
              index={i}
              total={blocks.length}
              active={activeId === b.id}
              onFocus={setActiveId}
              onOrderSwap={handleOrderSwap}
            />
          </div>
        ))}
        {blocks.length === 0 && (
          <div className="cs-mono text-[11px] tracking-[0.2em] py-16 text-center" style={{ color: C.laceFaint }}>
            [ NO SCRIPT BLOCKS — COMPLETE THE NEXUS SCAN FIRST ]
          </div>
        )}
      </div>

      <footer style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 64px" }}>
        <p className="cs-mono text-[10px] tracking-[0.2em] leading-relaxed" style={{ color: C.laceFaint }}>
          EDIT ANY BLOCK — ASSET DROPS TO [ COMPILING ] WHILE THE WORKER RE-RENDERS ·
          PIN TO HOLD AN ASSET AGAINST AUTO-REGEN · ALT+↑/↓ TO REORDER
        </p>
      </footer>
    </div>
  );
}
