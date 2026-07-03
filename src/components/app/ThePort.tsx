"use client";

import React, { useState } from "react";
import useSWR from "swr";

/**
 * THE PORT — Deployment command center (Blueprint §5.5, §13, §14).
 *
 * Three deployment vectors, one UI:
 *   Vector 1: LTI 1.3 credentials panel (display + copy)
 *   Vector 2: Headless webhook configuration + fire button
 *   Vector 3: Raw asset export (tier-gated checklist)
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

type Tier = "FREE" | "PRO" | "ENTERPRISE";

interface DeploymentData {
  ltiClientId:        string | null;
  ltiDeploymentId:    string | null;
  ltiPlatformOidcUrl: string | null;
  ltiAccessTokenUrl:  string | null;
  ltiKeysetUrl:       string | null;
  ltiLineItemUrl:     string | null;
  lrsEndpoint:        string | null;
  lrsKey:             string | null;
  webhookUrl:         string | null;
  webhookSecret:      string | null;
  watermarkEnabled:   boolean;
}

interface RenderJobData {
  status:           string;
  compiledVideoUrl: string | null;
  rawAssetsArchive: string | null;
  audioTrackUrl:    string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ThePort({
  moduleId,
  moduleTitle,
  tier,
  appUrl,
}: {
  moduleId:    string;
  moduleTitle: string;
  tier:        Tier;
  appUrl:      string;
}) {
  const { data: deployment, mutate: mutateDeployment } = useSWR<DeploymentData>(
    `/api/modules/${moduleId}/deployment`,
    fetcher
  );
  const { data: renderJob } = useSWR<RenderJobData>(
    `/api/modules/${moduleId}/render`,
    fetcher
  );

  const isPro    = tier === "PRO" || tier === "ENTERPRISE";
  const isEnterprise = tier === "ENTERPRISE";
  const launchUrl = `${appUrl}/api/lti/login`;

  return (
    <div style={{ background: C.ink, color: C.lace, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Spectral:wght@400;500&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .cs-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .cs-serif   { font-family: 'Spectral', Georgia, serif; }
        .cs-mono    { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        *::selection { background: ${C.gold}; color: ${C.ink}; }
        input:focus, textarea:focus { outline: 1px solid ${C.gold}; }
      `}</style>

      {/* COMMAND RAIL */}
      <header style={{ borderBottom: `1px solid ${C.line}`, background: "rgba(7,16,15,0.92)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.gold }}>CONTENT STORM</span>
          <span style={{ color: C.lineSoft }}>/</span>
          <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.laceDim }}>THE PORT</span>
          <span style={{ color: C.lineSoft }}>/</span>
          <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: C.laceFaint }}>{moduleTitle}</span>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 100px" }}>

        <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.laceFaint, marginBottom: 10 }}>
          MODULE · DEPLOYMENT & EXTRACTION
        </div>
        <h1 className="cs-display" style={{ fontSize: "clamp(26px,4.5vw,42px)", lineHeight: 0.98, margin: "0 0 48px" }}>
          {moduleTitle}
        </h1>

        {/* VECTOR 1 — LTI 1.3 */}
        <SectionHeader index="01" label="LTI 1.3 EMBED" tag={isEnterprise ? "ENTERPRISE" : "ENTERPRISE ONLY"} locked={!isEnterprise} />
        {isEnterprise ? (
          <LtiPanel
            moduleId={moduleId}
            deployment={deployment}
            launchUrl={launchUrl}
            onSave={mutateDeployment}
          />
        ) : (
          <LockedPanel message="LTI 1.3 integration and live Challenge Chamber grade passback require an ENTERPRISE plan." />
        )}

        <Divider />

        {/* VECTOR 2 — WEBHOOK */}
        <SectionHeader index="02" label="HEADLESS WEBHOOK" tag="ALL TIERS" locked={false} />
        <WebhookPanel moduleId={moduleId} deployment={deployment} onSave={mutateDeployment} />

        <Divider />

        {/* VECTOR 3 — RAW EXPORT */}
        <SectionHeader index="03" label="RAW ASSET EXTRACTION" tag={isPro ? "PRO" : "FREE · WATERMARKED"} locked={false} />
        <ExportPanel moduleId={moduleId} renderJob={renderJob} isPro={isPro} />

      </main>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ index, label, tag, locked }: { index: string; label: string; tag: string; locked: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
      <span className="cs-mono" style={{ fontSize: 11, color: C.laceFaint }}>{index}</span>
      <h2 className="cs-display" style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>{label}</h2>
      <span className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: locked ? C.rust : C.tealBright, border: `1px solid ${locked ? C.rust : C.tealBright}`, padding: "2px 6px" }}>
        {tag}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.line, margin: "48px 0" }} />;
}

function LockedPanel({ message }: { message: string }) {
  return (
    <div style={{ padding: "24px", border: `1px solid ${C.line}`, background: C.panel2 }}>
      <p className="cs-serif" style={{ fontSize: 15, color: C.laceDim, margin: 0 }}>{message}</p>
      <a href="/billing" className="cs-mono" style={{ display: "inline-block", marginTop: 16, fontSize: 11, letterSpacing: "0.16em", color: C.gold }}>
        UPGRADE → ENTERPRISE
      </a>
    </div>
  );
}

// ── Vector 1: LTI Panel ───────────────────────────────────────────────────────
function LtiPanel({ moduleId, deployment, launchUrl, onSave }: {
  moduleId:   string;
  deployment: DeploymentData | undefined;
  launchUrl:  string;
  onSave:     () => void;
}) {
  const [form,   setForm]   = useState<Partial<DeploymentData>>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const merge = (field: keyof DeploymentData, val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const save = async () => {
    setSaving(true);
    await fetch(`/api/modules/${moduleId}/deployment`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    setSaving(false);
    onSave();
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const display = (field: keyof DeploymentData) =>
    (form[field] as string | null | undefined) ?? deployment?.[field] ?? "";

  return (
    <div style={{ border: `1px solid ${C.line}`, background: C.panel }}>
      {/* Read-only credentials */}
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.lineSoft}` }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, marginBottom: 14 }}>
          SECURE HANDSHAKE CREDENTIALS
        </div>
        <CredRow label="LAUNCH URL" value={launchUrl} onCopy={() => copy(launchUrl, "LAUNCH URL")} copied={copied === "LAUNCH URL"} />
        {deployment?.ltiClientId && (
          <CredRow label="CLIENT ID" value={deployment.ltiClientId} onCopy={() => copy(deployment.ltiClientId!, "CLIENT ID")} copied={copied === "CLIENT ID"} />
        )}
      </div>

      {/* Editable platform config */}
      <div style={{ padding: "20px 24px" }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, marginBottom: 14 }}>
          PLATFORM CONFIGURATION
        </div>
        {([
          ["ltiDeploymentId",    "PLATFORM DEPLOYMENT ID"],
          ["ltiPlatformOidcUrl", "PLATFORM OIDC URL"],
          ["ltiAccessTokenUrl",  "TOKEN ENDPOINT URL"],
          ["ltiKeysetUrl",       "PLATFORM JWKS URL"],
          ["ltiLineItemUrl",     "GRADEBOOK LINE ITEM URL"],
          ["lrsEndpoint",        "LRS ENDPOINT (xAPI)"],
          ["lrsKey",             "LRS AUTH KEY"],
        ] as [keyof DeploymentData, string][]).map(([field, label]) => (
          <div key={field} style={{ marginBottom: 12 }}>
            <label className="cs-mono" style={{ display: "block", fontSize: 9, letterSpacing: "0.18em", color: C.laceFaint, marginBottom: 4 }}>
              {label}
            </label>
            <input
              value={display(field) as string}
              onChange={(e) => merge(field, e.target.value)}
              style={{ width: "100%", padding: "10px 12px", background: C.panel2, color: C.lace, border: `1px solid ${C.lineSoft}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, outline: "none" }}
            />
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <GoldButton onClick={save} disabled={saving}>
            {saving ? "SAVING…" : "[ SAVE LTI CONFIGURATION ]"}
          </GoldButton>
        </div>
      </div>
    </div>
  );
}

function CredRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
      <span className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.laceFaint, minWidth: 110 }}>{label}</span>
      <code className="cs-mono" style={{ flex: 1, fontSize: 11, color: C.lace, background: C.panel2, padding: "6px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </code>
      <button onClick={onCopy} className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", padding: "6px 12px", background: copied ? C.tealBright : "transparent", color: copied ? C.ink : C.gold, border: `1px solid ${copied ? C.tealBright : C.gold}`, cursor: "pointer" }}>
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  );
}

// ── Vector 2: Webhook Panel ───────────────────────────────────────────────────
function WebhookPanel({ moduleId, deployment, onSave }: { moduleId: string; deployment: DeploymentData | undefined; onSave: () => void }) {
  const [url,    setUrl]    = useState("");
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [firing, setFiring] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/modules/${moduleId}/deployment`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ webhookUrl: url || deployment?.webhookUrl, webhookSecret: secret || deployment?.webhookSecret }),
    });
    setSaving(false);
    onSave();
  };

  const fire = async () => {
    setFiring(true);
    setResult(null);
    try {
      const res  = await fetch(`/api/modules/${moduleId}/webhook/fire`, { method: "POST" });
      const data = await res.json();
      setResult(res.ok ? `✓ DELIVERED · HTTP ${data.responseStatus}` : `✕ ${data.error}`);
    } catch {
      setResult("✕ DELIVERY FAILED — CHECK NETWORK");
    } finally {
      setFiring(false);
    }
  };

  return (
    <div style={{ border: `1px solid ${C.line}`, background: C.panel }}>
      <div style={{ padding: "20px 24px" }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, marginBottom: 14 }}>
          WEBHOOK TARGET CONFIGURATION
        </div>
        {[
          { label: "WEBHOOK TARGET URL", val: url || deployment?.webhookUrl || "", set: setUrl, placeholder: "https://your-platform.com/webhooks/storm" },
          { label: "HMAC-SHA256 SIGNING SECRET", val: secret || deployment?.webhookSecret || "", set: setSecret, placeholder: "whsec_…" },
        ].map(({ label, val, set, placeholder }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <label className="cs-mono" style={{ display: "block", fontSize: 9, letterSpacing: "0.18em", color: C.laceFaint, marginBottom: 4 }}>{label}</label>
            <input value={val} onChange={(e) => set(e.target.value)} placeholder={placeholder}
              style={{ width: "100%", padding: "10px 12px", background: C.panel2, color: C.lace, border: `1px solid ${C.lineSoft}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, outline: "none" }} />
          </div>
        ))}
        <div className="cs-serif" style={{ fontSize: 13, color: C.laceFaint, lineHeight: 1.55, margin: "12px 0 16px" }}>
          Payload: five expert perspectives, contradiction map, script blocks, asset URLs, and the Challenge Chamber endpoint. Signed with <code style={{ fontFamily: "inherit", color: C.lace }}>X-CS-Signature: sha256=&lt;hmac&gt;</code>.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
          {result && <span className="cs-mono" style={{ fontSize: 11, color: result.startsWith("✓") ? C.tealBright : C.rust }}>{result}</span>}
          <GhostButton onClick={save} disabled={saving}>{saving ? "SAVING…" : "SAVE"}</GhostButton>
          <GoldButton onClick={fire} disabled={firing || !deployment?.webhookUrl}>{firing ? "FIRING…" : "[ FIRE WEBHOOK ]"}</GoldButton>
        </div>
      </div>
    </div>
  );
}

// ── Vector 3: Export Panel ────────────────────────────────────────────────────
const ASSET_OPTIONS = [
  { key: "mp4",         label: "Compiled Video (.MP4)",         freeOk: true,  desc: "Final stitched lecture video"          },
  { key: "stems_zip",   label: "Visual Stems (.ZIP)",           freeOk: false, desc: "All generated images (Flux/Midjourney)" },
  { key: "audio_wav",   label: "Audio Track (.WAV)",            freeOk: false, desc: "Isolated ElevenLabs voiceover"         },
  { key: "script_md",   label: "STORM Script (.MD)",            freeOk: false, desc: "Full script by persona"                },
  { key: "script_json", label: "STORM Data (.JSON)",            freeOk: false, desc: "Structured contradiction map + blocks" },
] as const;

type AssetKey = typeof ASSET_OPTIONS[number]["key"];

function ExportPanel({ moduleId, renderJob, isPro }: { moduleId: string; renderJob: RenderJobData | undefined; isPro: boolean }) {
  const [selected,   setSelected]   = useState<Set<AssetKey>>(new Set(["mp4"]));
  const [exporting,  setExporting]  = useState(false);
  const [links,      setLinks]      = useState<Record<string, string | null> | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const toggle = (key: AssetKey, allowed: boolean) => {
    if (!allowed) return;
    setSelected((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const exportAssets = async () => {
    setExporting(true);
    setError(null);
    setLinks(null);
    try {
      const res  = await fetch(`/api/modules/${moduleId}/export`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ assets: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Export failed");
      setLinks(data.urls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const isCompiled = renderJob?.status === "COMPLETED";

  return (
    <div style={{ border: `1px solid ${C.line}`, background: C.panel }}>
      <div style={{ padding: "20px 24px" }}>
        <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, marginBottom: 14 }}>
          SELECT EXPORT LAYERS
        </div>
        {ASSET_OPTIONS.map(({ key, label, freeOk, desc }) => {
          const allowed   = freeOk || isPro;
          const isChecked = selected.has(key);
          return (
            <div key={key} onClick={() => toggle(key, allowed)} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.lineSoft}`, cursor: allowed ? "pointer" : "not-allowed", opacity: allowed ? 1 : 0.4 }}>
              <div style={{ width: 16, height: 16, marginTop: 2, border: `1px solid ${isChecked && allowed ? C.gold : C.line}`, background: isChecked && allowed ? C.gold : "transparent", flexShrink: 0 }} />
              <div>
                <div className="cs-mono" style={{ fontSize: 11, color: allowed ? C.lace : C.laceFaint, letterSpacing: "0.1em" }}>
                  {label}
                  {!freeOk && !isPro && <span style={{ color: C.rust, marginLeft: 8 }}>PRO</span>}
                </div>
                <div className="cs-serif" style={{ fontSize: 13, color: C.laceFaint, marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          );
        })}

        {!isCompiled && (
          <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.gold, marginTop: 14 }}>
            ▸ VIDEO NOT YET COMPILED — COMPILE LECTURE FIRST
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
          {error && <span className="cs-mono" style={{ fontSize: 11, color: C.rust }}>✕ {error}</span>}
          <GoldButton onClick={exportAssets} disabled={exporting || selected.size === 0 || !isCompiled}>
            {exporting ? "PREPARING…" : "[ INITIATE ASSET COMPRESSION ]"}
          </GoldButton>
        </div>

        {/* Download links */}
        {links && (
          <div style={{ marginTop: 20, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 16 }}>
            <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.tealBright, marginBottom: 12 }}>
              ✓ DOWNLOAD LINKS READY · EXPIRE IN 1 HOUR
            </div>
            {Object.entries(links).map(([key, url]) => (
              url && (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: C.laceDim, minWidth: 100 }}>{key.toUpperCase()}</span>
                  <a href={url} download className="cs-mono" style={{ fontSize: 11, color: C.gold, letterSpacing: "0.12em", textDecoration: "none", border: `1px solid ${C.gold}`, padding: "4px 10px" }}>
                    DOWNLOAD
                  </a>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Button primitives ─────────────────────────────────────────────────────────
function GoldButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className="cs-mono"
      style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", padding: "12px 22px", border: "none", background: disabled ? C.lineSoft : C.gold, color: disabled ? C.laceFaint : C.ink, cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}

function GhostButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className="cs-mono"
      style={{ fontSize: 11, letterSpacing: "0.16em", padding: "12px 18px", background: "transparent", color: disabled ? C.laceFaint : C.laceDim, border: `1px solid ${C.line}`, cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}
