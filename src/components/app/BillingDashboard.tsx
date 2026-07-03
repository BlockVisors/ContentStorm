"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { MONTHLY_GRANT, CREDIT_COST } from "@/lib/credit-constants";
import type { SubscriptionTier, BillingModel } from "@prisma/client";

/**
 * Billing dashboard — V2-3 five-tier update.
 *
 * Sections:
 *   1. Credit gauge — balance vs monthly grant; branches by billing model
 *      (FLAT/SEAT show a percentage bar, METERED shows overage state,
 *      CUSTOM shows "unlimited, custom contract")
 *   2. Tier panel — 5 plan cards; Sovereign is "Contact Sales", not Checkout;
 *      Enterprise Sandbox collects a seat count before checkout
 *   3. Add-on toggle grid (NEW) — 5 à la carte add-ons, open to every paid
 *      tier (§4.3); Federated Edge is "Contact Sales" even though it's listed
 *      here, since it's a real VPC deployment, not a self-serve toggle
 *   4. Credit costs — what each operation costs
 *   5. Recent ledger — last 20 transactions
 *
 * Display metadata (labels/prices) is defined locally rather than imported
 * from src/lib/billing.ts — that module reads server-only STRIPE_PRICE_*
 * env vars at import time, which resolve to undefined in a client bundle.
 * Keeping presentation-only data local avoids coupling this component to
 * server env resolution, matching the pattern the V1 file already used.
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

type AddonKey =
  | "hasArbitrageAddon"
  | "hasOnChainCredentialAddon"
  | "hasPremiumComputeAddon"
  | "hasFederatedEdgeAddon"
  | "hasClipperAddon";

interface CreditSummary {
  balance:      number;
  tier:         SubscriptionTier;
  billingModel: BillingModel;
  seatCount:    number | null;
  monthlyGrant: number;
  addons:       Record<AddonKey, boolean>;
  recent: Array<{
    id:        string;
    delta:     number;
    reason:    string;
    refId:     string | null;
    createdAt: string;
  }>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TIER_ORDER: SubscriptionTier[] = ["FREE", "PRO", "ARCHITECT", "ENTERPRISE_SANDBOX", "SOVEREIGN"];

const TIER_DISPLAY: Record<SubscriptionTier, {
  label: string; color: string; price: string; credits: string;
  features: string[]; checkoutEnabled: boolean;
}> = {
  FREE: {
    label: "FREE", color: C.laceFaint, price: "$0/mo", credits: `${MONTHLY_GRANT.FREE} credits/mo`,
    features: ["Text engine", "Challenge Chamber", "Watermarked 720p MP4"],
    checkoutEnabled: false,
  },
  PRO: {
    label: "PRO", color: C.tealBright, price: "$49/mo", credits: `${MONTHLY_GRANT.PRO} credits/mo`,
    features: ["Larger credit allotment", "1080p/4K video", "Raw asset stems", "No watermark"],
    checkoutEnabled: true,
  },
  ARCHITECT: {
    label: "ARCHITECT", color: C.gold, price: "$79–149/mo", credits: `${MONTHLY_GRANT.ARCHITECT} incl. + metered overage`,
    features: ["No hard credit ceiling", "Priority render queue", "1080p/4K, clean, raw stems"],
    checkoutEnabled: true,
  },
  ENTERPRISE_SANDBOX: {
    label: "ENTERPRISE SANDBOX", color: C.gold, price: "$40–75/seat/mo", credits: `${MONTHLY_GRANT.ENTERPRISE_SANDBOX} credits/seat/mo`,
    features: ["LTI 1.3 + AGS + xAPI + SCORM", "On-chain SRS + premium compute included", "Seat-based, annual minimum"],
    checkoutEnabled: true,
  },
  SOVEREIGN: {
    label: "SOVEREIGN", color: C.goldBright, price: "custom", credits: "negotiated capacity",
    features: ["Drift Dashboard", "Curriculum Arbitrage", "Federated Edge", "White-glove"],
    checkoutEnabled: false,
  },
};

const ADDON_DISPLAY: Record<AddonKey, { label: string; price: string; selfServe: boolean }> = {
  hasArbitrageAddon:         { label: "Curriculum Arbitrage",          price: "+$49/mo",     selfServe: true  },
  hasOnChainCredentialAddon: { label: "On-Chain SRS Credentials",      price: "+$29/mo",     selfServe: true  },
  hasPremiumComputeAddon:    { label: "High-Tier Adversarial Compute", price: "+$39/mo",     selfServe: true  },
  hasClipperAddon:           { label: "The Arbitrage Clipper",        price: "+$39/mo",     selfServe: true  },
  hasFederatedEdgeAddon:     { label: "Federated Edge Runtime",       price: "custom quote", selfServe: false },
};
const ADDON_ORDER: AddonKey[] = [
  "hasOnChainCredentialAddon", "hasPremiumComputeAddon", "hasClipperAddon", "hasArbitrageAddon", "hasFederatedEdgeAddon",
];

const COST_TABLE: Array<{ label: string; cost: number; note: string }> = [
  { label: "Image asset generation",   cost: CREDIT_COST.IMAGE_GEN,  note: "Per block regen" },
  { label: "Video compile (Remotion)", cost: CREDIT_COST.RENDER,     note: "Per full render"  },
  { label: "Nexus scan (5 personas)",  cost: CREDIT_COST.NEXUS_SCAN, note: "Included free"    },
  { label: "Challenge Chamber viva",   cost: CREDIT_COST.CHALLENGE,  note: "Included free"    },
];

const SALES_EMAIL = "sales@contentstorm.ai";

export default function BillingDashboard() {
  const { data, mutate } = useSWR<CreditSummary>("/api/billing/credits", fetcher, {
    refreshInterval: 15_000, // faster than V1's 30s — add-on toggles need to resolve visibly once the webhook lands
  });

  const [checkingOut, setCheckingOut]     = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [togglingAddon, setTogglingAddon] = useState<AddonKey | null>(null);
  const [seatInput, setSeatInput]         = useState(5);
  const [error, setError]                 = useState<string | null>(null);

  const upgrade = async (plan: Exclude<SubscriptionTier, "FREE" | "SOVEREIGN">, seats?: number) => {
    setCheckingOut(true);
    setError(null);
    try {
      const res  = await fetch("/api/billing/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(seats ? { plan, seats } : { plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error);
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setCheckingOut(false);
    }
  };

  const managePortal = async () => {
    setOpeningPortal(true);
    setError(null);
    try {
      const res  = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error);
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing portal");
      setOpeningPortal(false);
    }
  };

  const toggleAddon = async (addon: AddonKey, action: "ENABLE" | "DISABLE") => {
    setTogglingAddon(addon);
    setError(null);
    try {
      const res  = await fetch("/api/billing/addons", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ addon, action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? body.error);
      // Flag flips via webhook, not this response — re-poll until it lands.
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add-on toggle failed");
    } finally {
      setTogglingAddon(null);
    }
  };

  const tier         = data?.tier ?? "FREE";
  const billingModel = data?.billingModel ?? "FLAT";
  const balance      = data?.balance ?? 0;
  const monthlyGrant = data?.monthlyGrant ?? MONTHLY_GRANT[tier];
  const pct          = Math.min(100, Math.max(0, Math.round((balance / monthlyGrant) * 100)));
  const tierMeta      = TIER_DISPLAY[tier];
  const addons        = data?.addons;
  const canBuyAddons   = tier !== "FREE";

  return (
    <div style={{ background: C.ink, color: C.lace, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Spectral:wght@400;500&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .cs-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .cs-serif   { font-family: 'Spectral', Georgia, serif; }
        .cs-mono    { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        *::selection { background: ${C.gold}; color: ${C.ink}; }
      `}</style>

      {/* Command rail */}
      <header style={{ borderBottom: `1px solid ${C.line}`, background: "rgba(7,16,15,0.92)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 840, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.gold }}>CONTENT STORM</span>
          <span style={{ color: C.lineSoft }}>/</span>
          <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.3em", color: C.laceDim }}>BILLING & CREDITS</span>
        </div>
      </header>

      <main style={{ maxWidth: 840, margin: "0 auto", padding: "40px 20px 100px" }}>

        {error && (
          <div className="cs-mono" style={{ fontSize: 11, color: C.rust, marginBottom: 20 }}>✕ {error}</div>
        )}

        {/* ── 1. Credit Gauge ───────────────────────────────────────────────── */}
        <div style={{ border: `1px solid ${C.line}`, background: C.panel, marginBottom: 24 }}>
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.lineSoft}`, display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.3em", color: C.laceFaint, marginBottom: 8 }}>
                STORM CREDITS · CURRENT BALANCE
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="cs-display" style={{ fontSize: 48, fontWeight: 700, color: balance < 0 ? C.rust : balance < 5 ? C.rust : C.gold, lineHeight: 1 }}>
                  {balance}
                </span>
                <span className="cs-mono" style={{ fontSize: 14, color: C.laceDim }}>
                  / {billingModel === "METERED" ? `${monthlyGrant} incl.` : monthlyGrant}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.18em", padding: "3px 8px", border: `1px solid ${tierMeta.color}`, color: tierMeta.color }}>
                {tierMeta.label}{data?.seatCount ? ` · ${data.seatCount} SEATS` : ""}
              </span>
              <div className="cs-mono" style={{ fontSize: 10, color: C.laceFaint, marginTop: 6 }}>{tierMeta.price}</div>
            </div>
          </div>

          {/* Balance bar — branches by billing model */}
          <div style={{ padding: "16px 24px" }}>
            {billingModel === "CUSTOM" ? (
              <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.tealBright }}>
                UNLIMITED · CAPACITY NEGOTIATED PER SOVEREIGN CONTRACT
              </div>
            ) : billingModel === "METERED" && balance < 0 ? (
              <>
                <div style={{ height: 4, background: C.rust, marginBottom: 6 }} />
                <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.rust }}>
                  OVERAGE ACTIVE · {Math.abs(balance)} CREDITS BEYOND INCLUDED ALLOTMENT · BILLED VIA STRIPE USAGE
                </div>
              </>
            ) : (
              <>
                <div style={{ height: 4, background: C.lineSoft, marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct > 20 ? C.tealBright : C.rust, transition: "width 0.6s ease" }} />
                </div>
                <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.15em", color: C.laceFaint }}>
                  {pct}% REMAINING · REFRESHES MONTHLY WITH SUBSCRIPTION
                  {billingModel === "METERED" ? " · NO HARD CEILING BEYOND THIS" : ""}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 2. Tier Panel ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
          {TIER_ORDER.map((plan) => {
            const meta    = TIER_DISPLAY[plan];
            const current = tier === plan;
            const isSovereign = plan === "SOVEREIGN";
            const isSandbox    = plan === "ENTERPRISE_SANDBOX";

            return (
              <div key={plan} style={{ border: `1px solid ${current ? C.gold : C.line}`, background: current ? "rgba(201,162,75,0.04)" : C.panel, padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                  <span className="cs-mono" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: current ? C.gold : C.laceDim }}>{meta.label}</span>
                  <span className="cs-mono" style={{ fontSize: 10, color: C.laceFaint }}>{meta.price}</span>
                </div>
                <div className="cs-mono" style={{ fontSize: 9, color: C.tealBright, marginBottom: 10 }}>{meta.credits}</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {meta.features.map((f) => (
                    <li key={f} className="cs-serif" style={{ fontSize: 12, color: C.laceDim, marginBottom: 4 }}>
                      <span style={{ color: C.tealBright, marginRight: 6 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>

                {isSandbox && !current && (
                  <div style={{ marginTop: 12 }}>
                    <label className="cs-mono" style={{ fontSize: 9, color: C.laceFaint, display: "block", marginBottom: 4 }}>SEATS (MIN 5)</label>
                    <input
                      type="number" min={5} value={seatInput}
                      onChange={(e) => setSeatInput(Math.max(5, parseInt(e.target.value, 10) || 5))}
                      className="cs-mono"
                      style={{ width: "100%", padding: "6px 8px", background: C.panel2, color: C.lace, border: `1px solid ${C.line}`, fontSize: 12 }}
                    />
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  {current ? (
                    plan !== "FREE" ? (
                      <button onClick={managePortal} disabled={openingPortal} className="cs-mono" style={ghostBtn}>
                        {openingPortal ? "OPENING…" : "MANAGE PLAN"}
                      </button>
                    ) : (
                      <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.laceFaint }}>CURRENT PLAN</span>
                    )
                  ) : isSovereign ? (
                    <a href={`mailto:${SALES_EMAIL}?subject=Sovereign%20tier%20inquiry`} className="cs-mono" style={{ ...goldBtn, display: "block", textAlign: "center", textDecoration: "none" }}>
                      CONTACT SALES
                    </a>
                  ) : !meta.checkoutEnabled ? (
                    <span className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.laceFaint }}>—</span>
                  ) : (
                    <button
                      onClick={() => upgrade(plan as Exclude<SubscriptionTier, "FREE" | "SOVEREIGN">, isSandbox ? seatInput : undefined)}
                      disabled={checkingOut}
                      className="cs-mono" style={goldBtn}
                    >
                      {checkingOut ? "REDIRECTING…" : `UPGRADE → ${meta.label}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. Add-on toggle grid ────────────────────────────────────────────── */}
        <div style={{ border: `1px solid ${C.line}`, background: C.panel, marginBottom: 24 }}>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, padding: "14px 24px", borderBottom: `1px solid ${C.lineSoft}` }}>
            À LA CARTE ADD-ONS {!canBuyAddons && "· UPGRADE TO A PAID PLAN TO UNLOCK"}
          </div>
          {ADDON_ORDER.map((key) => {
            const meta    = ADDON_DISPLAY[key];
            const enabled = addons?.[key] ?? false;
            const busy    = togglingAddon === key;

            return (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 24px", borderBottom: `1px solid ${C.lineSoft}`, opacity: canBuyAddons ? 1 : 0.45 }}>
                <div>
                  <span className="cs-serif" style={{ fontSize: 14, color: C.lace }}>{meta.label}</span>
                  <span className="cs-mono" style={{ fontSize: 10, color: C.laceFaint, marginLeft: 10 }}>{meta.price}</span>
                </div>

                {!meta.selfServe ? (
                  <a href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent(meta.label + " inquiry")}`} className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.12em", color: C.gold, textDecoration: "none" }}>
                    CONTACT SALES →
                  </a>
                ) : (
                  <button
                    onClick={() => toggleAddon(key, enabled ? "DISABLE" : "ENABLE")}
                    disabled={!canBuyAddons || busy}
                    className="cs-mono"
                    style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
                      padding: "7px 14px", border: `1px solid ${enabled ? C.tealBright : C.line}`,
                      background: enabled ? "rgba(46,111,106,0.12)" : "transparent",
                      color: enabled ? C.tealBright : C.laceDim,
                      cursor: canBuyAddons && !busy ? "pointer" : "not-allowed",
                    }}
                  >
                    {busy ? "…" : enabled ? "✓ ENABLED" : "ENABLE"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── 4. Credit cost table ──────────────────────────────────────────── */}
        <div style={{ border: `1px solid ${C.line}`, background: C.panel, marginBottom: 24 }}>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, padding: "14px 24px", borderBottom: `1px solid ${C.lineSoft}` }}>
            CREDIT COST TABLE
          </div>
          {COST_TABLE.map(({ label, cost, note }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 24px", borderBottom: `1px solid ${C.lineSoft}` }}>
              <div>
                <span className="cs-serif" style={{ fontSize: 14, color: C.lace }}>{label}</span>
                <span className="cs-mono" style={{ fontSize: 10, color: C.laceFaint, marginLeft: 10 }}>{note}</span>
              </div>
              <span className="cs-mono" style={{ fontSize: 12, color: cost === 0 ? C.tealBright : C.gold, fontWeight: 600 }}>
                {cost === 0 ? "FREE" : `${cost} cr`}
              </span>
            </div>
          ))}
        </div>

        {/* ── 5. Recent ledger ──────────────────────────────────────────────── */}
        <div style={{ border: `1px solid ${C.line}`, background: C.panel }}>
          <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, padding: "14px 24px", borderBottom: `1px solid ${C.lineSoft}` }}>
            RECENT TRANSACTIONS
          </div>
          {(data?.recent ?? []).length === 0 ? (
            <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.15em", color: C.laceFaint, padding: "20px 24px" }}>
              NO TRANSACTIONS YET
            </div>
          ) : (
            (data?.recent ?? []).map((entry) => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", borderBottom: `1px solid ${C.lineSoft}`, gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="cs-mono" style={{ fontSize: 11, color: C.laceDim, letterSpacing: "0.1em" }}>
                    {entry.reason.replace(/_/g, " ").toUpperCase()}
                  </span>
                  {entry.refId && (
                    <span className="cs-mono" style={{ fontSize: 9, color: C.laceFaint, marginLeft: 8 }}>
                      {entry.refId.slice(0, 8)}
                    </span>
                  )}
                </div>
                <span className="cs-mono" style={{ fontSize: 12, fontWeight: 600, color: entry.delta > 0 ? C.tealBright : C.rust, whiteSpace: "nowrap" }}>
                  {entry.delta > 0 ? "+" : ""}{entry.delta}
                </span>
                <span className="cs-mono" style={{ fontSize: 9, color: C.laceFaint, whiteSpace: "nowrap" }}>
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

// ── Button styles ─────────────────────────────────────────────────────────────
const goldBtn: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.16em",
  padding: "10px 16px", border: "none",
  background: C.gold, color: C.ink, cursor: "pointer", width: "100%",
};
const ghostBtn: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.16em",
  padding: "10px 16px", background: "transparent",
  color: C.laceDim, border: `1px solid ${C.line}`, cursor: "pointer", width: "100%",
};
