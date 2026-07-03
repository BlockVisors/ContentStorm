-- ============================================================================
-- CONTENT STORM — V2-5: On-Chain Credentials
--
-- New table only — no existing columns touched. Gated behind
-- Organization.hasOnChainCredentialAddon (added in the V2-3 migration), so
-- no route reaches this table until an org enables the add-on.
-- ============================================================================

CREATE TYPE "OnChainNetwork" AS ENUM ('BASE', 'POLYGON');
CREATE TYPE "OnChainMintStatus" AS ENUM ('PENDING', 'PROCESSING', 'MINTED', 'FAILED');

CREATE TABLE "OnChainCredential" (
    "id"                    TEXT NOT NULL,
    "sessionId"             TEXT NOT NULL,
    "userVerificationHash"  TEXT NOT NULL,
    "moduleAnchor"          TEXT NOT NULL,
    "finalSrs"              INTEGER NOT NULL,
    "skepticDeflection"     DOUBLE PRECISION NOT NULL,
    "sourceGrounding"       DOUBLE PRECISION NOT NULL,
    "biasEquilibrium"       DOUBLE PRECISION NOT NULL,
    "network"               "OnChainNetwork" NOT NULL DEFAULT 'BASE',
    "txHash"                TEXT,
    "attestationUID"        TEXT,
    "status"                "OnChainMintStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason"         TEXT,
    "mintedAt"              TIMESTAMP(3),
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnChainCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnChainCredential_sessionId_key" ON "OnChainCredential"("sessionId");
CREATE UNIQUE INDEX "OnChainCredential_attestationUID_key" ON "OnChainCredential"("attestationUID");
CREATE INDEX "OnChainCredential_sessionId_idx" ON "OnChainCredential"("sessionId");

ALTER TABLE "OnChainCredential"
  ADD CONSTRAINT "OnChainCredential_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "AssessmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SRS range sanity — mirrors the check already on AssessmentSession.srsScore.
ALTER TABLE "OnChainCredential"
  ADD CONSTRAINT "finalSrs_range_chk"
  CHECK ("finalSrs" >= 0 AND "finalSrs" <= 100);
