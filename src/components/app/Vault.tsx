"use client";

import React, { useCallback, useRef, useState } from "react";
import useSWR from "swr";

/**
 * THE VAULT — ingestion UI (Blueprint §5.1, Creator Dashboard "Vault" zone).
 *
 * Stage sources (PDF drop / URL / pasted text) -> INGEST. PDFs presign + upload
 * straight to S3, then POST /ingest enqueues the worker. Indexing status is
 * watched with conditional SWR polling: poll while PROCESSING/PENDING, stop on
 * COMPLETED or FAILED — same pattern as the Crucible block editor.
 */

const C = {
  ink: "#07100F",
  panel: "#0C1B1A",
  panel2: "#0A1716",
  line: "#1C3A38",
  lineSoft: "#16302E",
  tealBright: "#2E6F6A",
  lace: "#ECE6D4",
  laceDim: "#9FB0AC",
  laceFaint: "#5E7370",
  gold: "#C9A24B",
  goldBright: "#E0BE63",
  rust: "#B5563A",
};

type StagedSource =
  | { id: string; kind: "pdf"; label: string; file: File }
  | { id: string; kind: "url"; label: string; url: string }
  | { id: string; kind: "text"; label: string; raw: string };

type NotebookStatus = {
  id: string;
  title: string;
  vectorStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  chunkCount: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const uid = () => Math.random().toString(36).slice(2, 9);

export default function Vault({ notebookId }: { notebookId: string }) {
  const [staged, setStaged] = useState<StagedSource[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: nb, mutate } = useSWR<NotebookStatus>(
    `/api/notebooks/${notebookId}`,
    fetcher,
    {
      refreshInterval: (d) =>
        d?.vectorStatus === "PROCESSING" || d?.vectorStatus === "PENDING" ? 2500 : 0,
    }
  );

  const addFiles = useCallback((files: FileList | File[]) => {
    const next: StagedSource[] = [];
    for (const file of Array.from(files)) {
      const ok =
        file.type === "application/pdf" ||
        file.type === "text/plain" ||
        file.name.endsWith(".md");
      if (ok) next.push({ id: uid(), kind: "pdf", label: file.name, file });
    }
    if (next.length) setStaged((s) => [...s, ...next]);
  }, []);

  const addUrl = () => {
    const v = urlInput.trim();
    if (!/^https?:\/\//.test(v)) {
      setError("Enter a full http(s) URL");
      return;
    }
    setError(null);
    setStaged((s) => [...s, { id: uid(), kind: "url", label: v, url: v }]);
    setUrlInput("");
  };

  const addText = () => {
    const v = textInput.trim();
    if (v.length < 20) {
      setError("Paste at least a sentence or two");
      return;
    }
    setError(null);
    setStaged((s) => [
      ...s,
      { id: uid(), kind: "text", label: `Pasted text · ${new Date().toLocaleTimeString()}`, raw: v },
    ]);
    setTextInput("");
  };

  const remove = (id: string) => setStaged((s) => s.filter((x) => x.id !== id));

  async function uploadOne(src: Extract<StagedSource, { kind: "pdf" }>): Promise<{
    kind: "pdf";
    label: string;
    s3Key: string;
  }> {
    const presignRes = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: src.file.name,
        contentType: src.file.type || "application/pdf",
      }),
    });
    if (!presignRes.ok) throw new Error(`Presign failed for ${src.label}`);
    const { url, key } = await presignRes.json();
    const put = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": src.file.type || "application/pdf" },
      body: src.file,
    });
    if (!put.ok) throw new Error(`Upload failed for ${src.label}`);
    return { kind: "pdf", label: src.label, s3Key: key };
  }

  const ingest = async () => {
    if (!staged.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      const sources = await Promise.all(
        staged.map(async (s) => {
          if (s.kind === "pdf") return uploadOne(s);
          if (s.kind === "url") return { kind: "url" as const, label: s.label, url: s.url };
          return { kind: "text" as const, label: s.label, raw: s.raw };
        })
      );

      const res = await fetch(`/api/notebooks/${notebookId}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      if (!res.ok) throw new Error("Ingest request rejected");

      setStaged([]);
      mutate({ ...(nb as NotebookStatus), vectorStatus: "PROCESSING" }, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ingest failed");
    } finally {
      setBusy(false);
    }
  };

  const status = nb?.vectorStatus ?? "PENDING";

  return (
    <div className="cs-vault" style={{ background: C.ink, color: C.lace, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Spectral:wght@400;500&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .cs-vault, .cs-vault *{ box-sizing:border-box; }
        .cs-display{ font-family:'Space Grotesk', system-ui, sans-serif; }
        .cs-serif{ font-family:'Spectral', Georgia, serif; }
        .cs-mono{ font-family:'IBM Plex Mono', ui-monospace, monospace; }
        .cs-vault ::selection{ background:${C.gold}; color:${C.ink}; }
        .cs-field:focus-visible{ outline:2px solid ${C.gold}; outline-offset:2px; }
        .cs-btn:focus-visible{ outline:2px solid ${C.gold}; outline-offset:2px; }
        @keyframes csPulse{ 0%,100%{opacity:.45;} 50%{opacity:1;} }
        .cs-blink{ animation:csPulse 1.15s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .cs-blink{ animation:none; } }
      `}</style>

      {/* command rail */}
      <header
        style={{ borderBottom: `1px solid ${C.line}`, background: "rgba(7,16,15,0.92)" }}
      >
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.gold }}>CONTENT STORM</span>
          <span style={{ color: C.lineSoft }}>/</span>
          <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.laceDim }}>THE VAULT</span>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.laceFaint, marginBottom: 10 }}>
          NOTEBOOK · GROUND THE ENGINE
        </div>
        <h1 className="cs-display" style={{ fontSize: "clamp(24px,4.5vw,40px)", lineHeight: 1, letterSpacing: "-0.01em", margin: 0 }}>
          {nb?.title ?? "Vault"}
        </h1>

        {/* INDEXING STATUS */}
        <StatusPanel status={status} chunks={nb?.chunkCount ?? 0} />

        {/* DROP ZONE */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          className="cs-btn"
          style={{
            marginTop: 28, padding: "44px 20px", textAlign: "center", cursor: "pointer",
            border: `1px ${dragOver ? "solid" : "dashed"} ${dragOver ? C.gold : C.line}`,
            background: dragOver ? "rgba(201,162,75,0.04)" : C.panel,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,text/plain,.md"
            multiple
            hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <div className="cs-mono" style={{ fontSize: 12, letterSpacing: "0.18em", color: C.lace }}>
            DROP PDFs / TEXT FILES — OR CLICK TO BROWSE
          </div>
          <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.18em", color: C.laceFaint, marginTop: 8 }}>
            CHUNKED · EMBEDDED · STORED FOR RAG GROUNDING
          </div>
        </div>

        {/* URL + TEXT inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 0 }}>
            <input
              className="cs-field cs-mono"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUrl()}
              placeholder="https://source-url..."
              style={{ flex: 1, fontSize: 12, padding: "12px 14px", background: C.panel, color: C.lace, border: `1px solid ${C.line}`, outline: "none" }}
            />
            <button onClick={addUrl} className="cs-btn cs-mono" style={ghostBtn}>ADD URL</button>
          </div>
          <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
            <textarea
              className="cs-field cs-serif"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or paste raw text / a 500-word block..."
              style={{ flex: 1, fontSize: 15, lineHeight: 1.5, padding: "12px 14px", minHeight: 84, resize: "vertical", background: C.panel, color: C.lace, border: `1px solid ${C.line}`, outline: "none" }}
            />
            <button onClick={addText} className="cs-btn cs-mono" style={{ ...ghostBtn, alignSelf: "stretch" }}>ADD TEXT</button>
          </div>
        </div>

        {/* STAGED LIST */}
        {staged.length > 0 && (
          <div style={{ marginTop: 24, border: `1px solid ${C.line}` }}>
            <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: C.laceDim, padding: "10px 14px", borderBottom: `1px solid ${C.lineSoft}` }}>
              STAGED SOURCES · {staged.length}
            </div>
            {staged.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: `1px solid ${C.lineSoft}` }}>
                <span className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: C.ink, background: C.tealBright, padding: "2px 6px" }}>
                  {s.kind.toUpperCase()}
                </span>
                <span className="cs-serif" style={{ flex: 1, fontSize: 14, color: C.lace, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
                <button onClick={() => remove(s.id)} className="cs-btn cs-mono" style={{ fontSize: 10, color: C.rust, background: "transparent", border: "none", cursor: "pointer", letterSpacing: "0.1em" }}>
                  ✕ REMOVE
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="cs-mono" style={{ marginTop: 16, fontSize: 11, letterSpacing: "0.1em", color: C.rust }}>
            ✕ {error}
          </div>
        )}

        {/* INGEST CTA */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={ingest}
            disabled={!staged.length || busy || status === "PROCESSING"}
            className="cs-btn cs-mono"
            style={{
              fontSize: 12, fontWeight: 600, letterSpacing: "0.18em", padding: "13px 26px", border: "none",
              background: !staged.length || busy || status === "PROCESSING" ? C.lineSoft : C.gold,
              color: !staged.length || busy || status === "PROCESSING" ? C.laceFaint : C.ink,
              cursor: !staged.length || busy || status === "PROCESSING" ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "UPLOADING…" : status === "PROCESSING" ? "INDEXING…" : `INGEST ${staged.length || ""}`.trim()}
          </button>
        </div>
      </main>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", padding: "0 16px",
  background: "transparent", color: C.laceDim, border: `1px solid ${C.line}`, borderLeft: "none", cursor: "pointer",
};

function StatusPanel({
  status,
  chunks,
}: {
  status: NotebookStatus["vectorStatus"];
  chunks: number;
}) {
  const map = {
    PENDING: { color: C.laceFaint, text: "AWAITING SOURCES", live: false },
    PROCESSING: { color: C.gold, text: "SEMANTIC INDEXING IN PROGRESS", live: true },
    COMPLETED: { color: C.tealBright, text: "GROUNDED · READY FOR NEXUS", live: false },
    FAILED: { color: C.rust, text: "INGEST FAILED · RETRY", live: false },
  }[status];

  return (
    <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", border: `1px solid ${C.line}`, background: C.panel2 }}>
      <span className={`cs-mono ${map.live ? "cs-blink" : ""}`} style={{ fontSize: 11, letterSpacing: "0.22em", color: map.color }}>
        ▸ {map.text}
      </span>
      <span className="cs-mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: C.laceDim }}>
        {chunks} CHUNKS INDEXED
      </span>
    </div>
  );
}
