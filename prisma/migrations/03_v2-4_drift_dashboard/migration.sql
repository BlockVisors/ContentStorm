-- ============================================================================
-- CONTENT STORM — V2-4: Drift Dashboard
--
-- New table only. Sovereign-gated at the route layer (not the schema layer —
-- no billing check belongs in a migration), so no data reaches this table
-- until an org is on the Sovereign tier and a scan actually runs.
-- ============================================================================

CREATE TYPE "DriftStatus" AS ENUM ('OPEN', 'REMEDIATED', 'DISMISSED');

CREATE TABLE "DriftRisk" (
    "id"                   TEXT NOT NULL,
    "orgId"                TEXT NOT NULL,
    "notebookAId"          TEXT,
    "siloA"                TEXT NOT NULL,
    "assertionA"           TEXT NOT NULL,
    "notebookBId"          TEXT,
    "siloB"                TEXT NOT NULL,
    "assertionB"           TEXT NOT NULL,
    "divergenceScore"      DOUBLE PRECISION NOT NULL,
    "financialImpact"      TEXT NOT NULL,
    "remediationPlan"      TEXT NOT NULL,
    "remediationModuleId"  TEXT,
    "status"               "DriftStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriftRisk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DriftRisk_orgId_idx" ON "DriftRisk"("orgId");
CREATE INDEX "DriftRisk_orgId_status_idx" ON "DriftRisk"("orgId", "status");

ALTER TABLE "DriftRisk"
  ADD CONSTRAINT "DriftRisk_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriftRisk"
  ADD CONSTRAINT "DriftRisk_notebookAId_fkey"
  FOREIGN KEY ("notebookAId") REFERENCES "Notebook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DriftRisk"
  ADD CONSTRAINT "DriftRisk_notebookBId_fkey"
  FOREIGN KEY ("notebookBId") REFERENCES "Notebook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DriftRisk"
  ADD CONSTRAINT "divergenceScore_range_chk"
  CHECK ("divergenceScore" >= 0 AND "divergenceScore" <= 1);
