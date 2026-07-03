import { ethers } from "ethers";
import { EAS, SchemaEncoder, NO_EXPIRATION } from "@ethereum-attestation-service/eas-sdk";
import { createHash } from "crypto";
import type { OnChainNetwork } from "@prisma/client";

/**
 * On-chain credential minting (V2-5).
 *
 * Uses the Ethereum Attestation Service (EAS) rather than a custom-deployed
 * contract — EAS is already-live public infrastructure on both target
 * networks, specifically designed for exactly this "verifiable claim about
 * a specific subject" use case, and it means Content Storm mints against
 * audited, battle-tested contracts instead of shipping a bespoke Solidity
 * contract that would need its own audit before real value ran through it.
 *
 * SCHEMA (must be registered once per network before minting works — see
 * scripts/register-eas-schema.ts):
 *   string sessionId, string moduleAnchor, uint8 srsScore,
 *   uint16 skepticDeflectionBps, uint16 sourceGroundingBps,
 *   uint16 biasEquilibriumBps, string verificationHash, uint64 issuedAt
 *
 * The three SRS sub-scores are stored as basis points (0-10000), not floats
 * — Solidity has no native decimal type; basis points is the standard
 * on-chain convention for a 0.00-1.00 value and keeps the schema a single
 * uint16 per field instead of a fixed-point encoding scheme.
 *
 * IDENTITY: no learner wallet address is required or stored. The attestation
 * recipient is the zero address — this is a claim ABOUT a session's result,
 * anchored to the module and a verification hash, not an identity credential
 * issued TO a wallet. That keeps the feature usable for every learner
 * regardless of whether they have a wallet, and keeps no personally
 * identifying information on a public, permanent ledger.
 */

export const EAS_SCHEMA_STRING =
  "string sessionId,string moduleAnchor,uint8 srsScore,uint16 skepticDeflectionBps,uint16 sourceGroundingBps,uint16 biasEquilibriumBps,string verificationHash,uint64 issuedAt";

interface NetworkConfig {
  rpcUrl: string;
  easContractAddress: string;
  schemaUID: string;
  explorerBaseUrl: string;
  chainName: string;
}

/**
 * Contract addresses sourced from the official eas-contracts deployment
 * registry (github.com/ethereum-attestation-service/eas-contracts/deployments,
 * cross-checked against docs.attest.org/docs/quick--start/contracts).
 *
 * Base is an OP-stack chain and EAS is deployed at the same fixed "predeploy"
 * address on every OP-stack chain (confirmed against the project's own
 * Optimism deployment artifact, which lists the identical address as its EAS
 * constructor arg). Polygon isn't OP-stack, so it has its own distinct,
 * directly-published deployment address instead.
 *
 * VERIFY BOTH against the docs link above before a real mainnet mint — env
 * vars override these defaults for exactly that reason. A wrong address here
 * signs and sends a real transaction that either reverts (wasted gas) or, far
 * worse, silently succeeds against a contract that isn't EAS at all.
 */
const NETWORKS: Record<OnChainNetwork, NetworkConfig> = {
  BASE: {
    rpcUrl: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    easContractAddress:
      process.env.EAS_CONTRACT_ADDRESS_BASE ?? "0x4200000000000000000000000000000000000021",
    schemaUID: process.env.EAS_SCHEMA_UID_BASE ?? "",
    explorerBaseUrl: "https://base.easscan.org/attestation/view",
    chainName: "Base",
  },
  POLYGON: {
    rpcUrl: process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
    easContractAddress:
      process.env.EAS_CONTRACT_ADDRESS_POLYGON ?? "0x5E634ef5355f45A855d02D66eCD687b1502AF790",
    schemaUID: process.env.EAS_SCHEMA_UID_POLYGON ?? "",
    explorerBaseUrl: "https://polygon.easscan.org/attestation/view",
    chainName: "Polygon",
  },
};

function getSigner(network: OnChainNetwork): ethers.Wallet {
  const privateKey = process.env.ONCHAIN_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("ONCHAIN_SIGNER_PRIVATE_KEY is not set — cannot sign on-chain mints.");
  }
  const provider = new ethers.JsonRpcProvider(NETWORKS[network].rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * sha256(learnerId:sessionId:srsScore) — lets Content Storm (or the learner,
 * who knows their own identity) reproduce and confirm this exact hash
 * belongs to a specific person and result. A third party holding only the
 * on-chain hash cannot reverse it back to a learner identity — that's the
 * "verifiable without exposing identity" property the product pitch relies
 * on (§14 — "on-chain verifiable credentials").
 */
export function buildVerificationHash(learnerId: string, sessionId: string, srsScore: number): string {
  return createHash("sha256").update(`${learnerId}:${sessionId}:${srsScore}`).digest("hex");
}

export interface MintCredentialInput {
  sessionId: string;
  learnerId: string; // internal or external learner identity — used only to derive the hash, never written on-chain itself
  moduleAnchor: string;
  srsScore: number; // 0-100
  skepticDeflection: number; // 0..1
  sourceGrounding: number; // 0..1
  biasEquilibrium: number; // 0..1
}

export interface MintCredentialResult {
  network: OnChainNetwork;
  txHash: string;
  attestationUID: string;
  verificationHash: string;
}

function toBps(fraction: number): number {
  return Math.max(0, Math.min(10_000, Math.round(fraction * 10_000)));
}

async function mintOnNetwork(
  network: OnChainNetwork,
  input: MintCredentialInput
): Promise<MintCredentialResult> {
  const config = NETWORKS[network];
  if (!config.schemaUID) {
    throw new Error(
      `EAS_SCHEMA_UID_${network} is not configured. Register the schema once via ` +
      `\`npx tsx scripts/register-eas-schema.ts ${network.toLowerCase()}\` and set the printed UID in .env.`
    );
  }

  const signer = getSigner(network);
  const eas = new EAS(config.easContractAddress);
  eas.connect(signer);

  const verificationHash = buildVerificationHash(input.learnerId, input.sessionId, input.srsScore);

  const encoder = new SchemaEncoder(EAS_SCHEMA_STRING);
  const encodedData = encoder.encodeData([
    { name: "sessionId", value: input.sessionId, type: "string" },
    { name: "moduleAnchor", value: input.moduleAnchor, type: "string" },
    { name: "srsScore", value: input.srsScore, type: "uint8" },
    { name: "skepticDeflectionBps", value: toBps(input.skepticDeflection), type: "uint16" },
    { name: "sourceGroundingBps", value: toBps(input.sourceGrounding), type: "uint16" },
    { name: "biasEquilibriumBps", value: toBps(input.biasEquilibrium), type: "uint16" },
    { name: "verificationHash", value: verificationHash, type: "string" },
    { name: "issuedAt", value: Math.floor(Date.now() / 1000), type: "uint64" },
  ]);

  const tx = await eas.attest({
    schema: config.schemaUID,
    data: {
      recipient: ethers.ZeroAddress,
      expirationTime: NO_EXPIRATION,
      revocable: true, // revocable, not immutable — a session later found fraudulent must be revocable
      data: encodedData,
    },
  });

  const attestationUID = await tx.wait();

  return {
    network,
    txHash: tx.receipt?.hash ?? "",
    attestationUID,
    verificationHash,
  };
}

/**
 * Mint an on-chain credential. Tries Base first (the product's stated
 * primary network); falls back to Polygon on any failure — RPC outage, gas
 * spike, or a reverted transaction on Base shouldn't take the whole feature
 * down when a working fallback network is one call away.
 */
export async function mintCredential(input: MintCredentialInput): Promise<MintCredentialResult> {
  try {
    return await mintOnNetwork("BASE", input);
  } catch (baseError) {
    console.error("[onchain] Base mint failed, falling back to Polygon:", baseError);
    try {
      return await mintOnNetwork("POLYGON", input);
    } catch (polygonError) {
      const baseMsg    = baseError instanceof Error ? baseError.message : String(baseError);
      const polygonMsg = polygonError instanceof Error ? polygonError.message : String(polygonError);
      throw new Error(`Both networks failed. Base: ${baseMsg}. Polygon: ${polygonMsg}.`);
    }
  }
}

/** Public verification link — the actual "employers verify it directly" surface. */
export function explorerUrl(network: OnChainNetwork, attestationUID: string): string {
  return `${NETWORKS[network].explorerBaseUrl}/${attestationUID}`;
}
