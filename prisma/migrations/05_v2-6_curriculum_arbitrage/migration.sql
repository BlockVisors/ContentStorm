-- ============================================================================
-- CONTENT STORM — V2-6: Curriculum Arbitrage Engine
--
-- New table only. Detection is unconditional (runs regardless of billing);
-- only the automatic rewrite path checks hasArbitrageAddon at the route
-- layer, so no billing logic belongs in this migration.
-- ============================================================================

CREATE TYPE "ArbitrageSourceType" AS ENUM ('PATENT', 'ACADEMIC_JOURNAL', 'GITHUB_ADVISORY', 'REGULATORY_UPDATE', 'NEWS');
CREATE TYPE "ArbitrageStatus" AS ENUM ('PENDING', 'REWRITING', 'REQUEUED', 'DISMISSED');

CREATE TABLE "ArbitrageEvent" (
    "id"             TEXT NOT NULL,
    "moduleId"       TEXT NOT NULL,
    "sourceUrl"      TEXT NOT NULL,
    "sourceType"     "ArbitrageSourceType" NOT NULL,
    "sourceExcerpt"  TEXT NOT NULL,
    "matchedChunkId" TEXT,
    "semanticDelta"  DOUBLE PRECISION NOT NULL,
    "affectedBlocks" JSONB NOT NULL,
    "status"         "ArbitrageStatus" NOT NULL DEFAULT 'PENDING',
    "detectedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt"     TIMESTAMP(3),

    CONSTRAINT "ArbitrageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArbitrageEvent_moduleId_idx" ON "ArbitrageEvent"("moduleId");
CREATE INDEX "ArbitrageEvent_moduleId_status_idx" ON "ArbitrageEvent"("moduleId", "status");

ALTER TABLE "ArbitrageEvent"
  ADD CONSTRAINT "ArbitrageEvent_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArbitrageEvent"
  ADD CONSTRAINT "ArbitrageEvent_matchedChunkId_fkey"
  FOREIGN KEY ("matchedChunkId") REFERENCES "SourceChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ArbitrageEvent"
  ADD CONSTRAINT "semanticDelta_range_chk"
  CHECK ("semanticDelta" >= 0 AND "semanticDelta" <= 1);
