"use client";

import React from "react";
import useSWR from "swr";

/**
 * Federated Edge Runtime status panel — V2-7.
 *
 * Read-only by design — there is no "register a node" button here. Node
 * provisioning is a white-glove operation Content Storm ops performs
 * directly with the client (see src/app/api/federated/nodes/route.ts's
 * header comment for the full reasoning); this panel exists so a customer
 * can confirm their VPC deployment is alive without needing to ask ops.
 */

const C = {
  ink:        "#07100F",
  panel:      "#0C1B1A",
  line:       "#1C3A38",
  lineSoft:   "#16302E",
  tealBright: "#2E6F6A",
  lace:       "#ECE6D4",
  laceDim:    "#9FB0AC",
  laceFaint:  "#5E7370",
  gold:       "#C9A24B",
  rust:       "#B5563A",
};

interface FederatedNodeItem {
  id: string;
  nodeEndpoint: string;
  modelCluster: string;
  status: "PENDING" | "ACTIVE" | "OFFLINE";
  effectiveStatus: "PENDING" | "ACTIVE" | "OFFLINE";
  lastHeartbeat: string | null;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:  "#2E6F6A",
  PENDING: "#C9A24B",
  OFFLINE: "#B5563A",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function FederatedNodePanel() {
  const { data } = useSWR<{ nodes: FederatedNodeItem[] } | { error: string; message: string }>(
    "/api/federated/nodes",
    fetcher,
    { refreshInterval: 15_000 }
  );

  if (data && "error" in data) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: C.lace }}>
        <div className="cs-mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: C.gold, marginBottom: 10 }}>
          [ FEDERATED EDGE RUNTIME · ADD-ON REQUIRED ]
        </div>
        <p className="cs-serif" style={{ fontSize: 13, color: C.laceDim }}>{data.message}</p>
      </div>
    );
  }

  const nodes = data?.nodes ?? [];

  return (
    <div style={{ color: C.lace }}>
      <div className="cs-mono" style={{ fontSize: 9, letterSpacing: "0.22em", color: C.laceDim, marginBottom: 16 }}>
        [ FEDERATED EDGE RUNTIME · VPC DEPLOYMENT STATUS ]
      </div>

      {nodes.length === 0 ? (
        <div style={{ padding: 24, border: `1px dashed ${C.line}`, textAlign: "center" }}>
          <p className="cs-serif" style={{ fontSize: 13, color: C.laceFaint }}>
            No node registered yet. Your deployment is coordinated directly with Content Storm's
            infrastructure team — reach out to your account contact to schedule provisioning.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {nodes.map((node) => {
            const color = STATUS_COLOR[node.effectiveStatus] ?? C.laceFaint;
            return (
              <div key={node.id} style={{ border: `1px solid ${color}`, background: C.panel, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span className="cs-mono" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", color }}>
                    ● {node.effectiveStatus}
                  </span>
                  <span className="cs-mono" style={{ fontSize: 9, color: C.laceFaint }}>
                    {node.lastHeartbeat
                      ? `LAST HEARTBEAT: ${new Date(node.lastHeartbeat).toLocaleString()}`
                      : "NEVER CONNECTED"}
                  </span>
                </div>
                <div className="cs-serif" style={{ fontSize: 13, color: C.laceDim, marginBottom: 4 }}>
                  Model cluster: <span style={{ color: C.lace }}>{node.modelCluster}</span>
                </div>
                <div className="cs-mono" style={{ fontSize: 10, color: C.laceFaint }}>
                  {node.nodeEndpoint}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
