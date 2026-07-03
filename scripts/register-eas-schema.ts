#!/usr/bin/env tsx
/**
 * Content Storm — EAS schema registration (V2-5, one-time setup)
 * Run: npx tsx scripts/register-eas-schema.ts base
 *      npx tsx scripts/register-eas-schema.ts polygon
 *
 * Registers the on-chain credential schema (src/lib/onchain.ts's
 * EAS_SCHEMA_STRING) with EAS on the given network. This only needs to run
 * ONCE per network, ever — schemas are permanent and shared across every
 * attestation Content Storm ever mints. Run it once, put the printed
 * schemaUID in .env as EAS_SCHEMA_UID_BASE / EAS_SCHEMA_UID_POLYGON, and
 * minting (src/lib/onchain.ts::mintCredential) works from then on.
 *
 * Costs real gas on the signer wallet (ONCHAIN_SIGNER_PRIVATE_KEY) — this is
 * a mainnet transaction, not a testnet dry run, unless you point
 * BASE_RPC_URL / POLYGON_RPC_URL at a testnet first to rehearse it.
 */

import "dotenv/config"; // picks up .env in the project root
import { ethers } from "ethers";
import { SchemaRegistry } from "@ethereum-attestation-service/eas-sdk";
import { EAS_SCHEMA_STRING } from "../src/lib/onchain";

// SchemaRegistry addresses — same sourcing/verification caveat as
// src/lib/onchain.ts's NETWORKS map: confirm against
// https://docs.attest.org/docs/quick--start/contracts before running this
// against real mainnet funds.
const NETWORK_CONFIG = {
  base: {
    rpcUrl: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    registryAddress:
      process.env.EAS_SCHEMA_REGISTRY_ADDRESS_BASE ?? "0x4200000000000000000000000000000000000020",
  },
  polygon: {
    rpcUrl: process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
    registryAddress:
      process.env.EAS_SCHEMA_REGISTRY_ADDRESS_POLYGON ?? "0x7876EEF51A891E737AF8ba5A5E0f0Fd29073D5a7",
  },
} as const;

async function main() {
  const network = process.argv[2] as "base" | "polygon" | undefined;
  if (network !== "base" && network !== "polygon") {
    console.error("Usage: npx tsx scripts/register-eas-schema.ts <base|polygon>");
    process.exit(1);
  }

  const privateKey = process.env.ONCHAIN_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("ONCHAIN_SIGNER_PRIVATE_KEY is not set in .env.");
    process.exit(1);
  }

  const config   = NETWORK_CONFIG[network];
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const signer   = new ethers.Wallet(privateKey, provider);

  console.log(`Registering schema on ${network}...`);
  console.log(`  Registry:  ${config.registryAddress}`);
  console.log(`  Signer:    ${signer.address}`);
  console.log(`  Schema:    ${EAS_SCHEMA_STRING}`);

  const registry = new SchemaRegistry(config.registryAddress);
  registry.connect(signer);

  const tx = await registry.register({
    schema: EAS_SCHEMA_STRING,
    resolverAddress: ethers.ZeroAddress, // no resolver — this schema needs no custom on-chain validation logic
    revocable: true,
  });

  console.log(`  Tx sent, waiting for confirmation...`);
  const schemaUID = await tx.wait();

  console.log(`\n✓ Schema registered on ${network}`);
  console.log(`  schemaUID: ${schemaUID}`);
  console.log(`\nSet this in your .env:`);
  console.log(`  EAS_SCHEMA_UID_${network.toUpperCase()}="${schemaUID}"`);
}

main().catch((err) => {
  console.error("Schema registration failed:", err);
  process.exit(1);
});
