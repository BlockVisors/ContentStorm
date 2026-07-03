-- ============================================================================
-- CONTENT STORM — V2-2: Canonical SRS migration
--
-- Replaces the V1 5-vector matrix (empiricalGrounding / boundaryAwareness /
-- personaNeutralization / logicalConsistency / synthesisRigor, 20pts each)
-- with the patent-aligned three-factor formula:
--
--   SRS = 0.40 * S_DR (skepticDeflection) + 0.45 * S_GA (sourceGrounding)
--       + 0.15 * B_E  (biasEquilibrium)
--
-- Additive + rename only. No data is deleted. Existing V1 AssessmentSession
-- rows keep their scores under the legacy* columns and are rendered by the
-- report-card UI's legacy branch (see ChallengeChamber.tsx ReportCard).
-- Zero downtime: run before deploying the app code that reads the new columns.
-- ============================================================================

-- 1. Preserve V1 data under legacy column names.
ALTER TABLE "AssessmentSession" RENAME COLUMN "resilienceScore" TO "legacyResilienceScore";
ALTER TABLE "AssessmentSession" RENAME COLUMN "vectorBreakdown" TO "legacyVectorBreakdown";
ALTER TABLE "AssessmentSession" RENAME COLUMN "weakestLink" TO "legacyWeakestLink";

-- 2. Add the canonical three-factor columns. All nullable — populated only
--    when a session completes under the new evaluator.
ALTER TABLE "AssessmentSession" ADD COLUMN "srsScore"          INTEGER;
ALTER TABLE "AssessmentSession" ADD COLUMN "skepticDeflection" DOUBLE PRECISION;
ALTER TABLE "AssessmentSession" ADD COLUMN "sourceGrounding"   DOUBLE PRECISION;
ALTER TABLE "AssessmentSession" ADD COLUMN "biasEquilibrium"   DOUBLE PRECISION;
ALTER TABLE "AssessmentSession" ADD COLUMN "collapseTimeline"  JSONB;

-- 3. Crisis Mode flag — defaults false, backfills every existing row safely.
ALTER TABLE "AssessmentSession" ADD COLUMN "isCrisisMode" BOOLEAN NOT NULL DEFAULT false;

-- 4. Sanity constraint: canonical scores, when present, stay in their defined
--    ranges. Legacy rows (all four new columns NULL) are unaffected.
ALTER TABLE "AssessmentSession"
  ADD CONSTRAINT "srsScore_range_chk"
  CHECK ("srsScore" IS NULL OR ("srsScore" >= 0 AND "srsScore" <= 100));

ALTER TABLE "AssessmentSession"
  ADD CONSTRAINT "skepticDeflection_range_chk"
  CHECK ("skepticDeflection" IS NULL OR ("skepticDeflection" >= 0 AND "skepticDeflection" <= 1));

ALTER TABLE "AssessmentSession"
  ADD CONSTRAINT "sourceGrounding_range_chk"
  CHECK ("sourceGrounding" IS NULL OR ("sourceGrounding" >= 0 AND "sourceGrounding" <= 1));

ALTER TABLE "AssessmentSession"
  ADD CONSTRAINT "biasEquilibrium_range_chk"
  CHECK ("biasEquilibrium" IS NULL OR ("biasEquilibrium" >= 0 AND "biasEquilibrium" <= 1));
