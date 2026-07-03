-- ============================================================================
-- CONTENT STORM — V2-10: The Arbitrage Clipper
--
-- New table only — no existing columns touched, nothing to backfill. Safe to
-- run without downtime; the feature is fully gated behind
-- Organization.hasClipperAddon (added in the V2-3 migration), so no route
-- reaches this table until an org explicitly enables the add-on.
-- ============================================================================

CREATE TYPE "ClipPlatformMode" AS ENUM ('RETAINER', 'EDUCATOR', 'DEEP_DIVER');

CREATE TABLE "ClipAsset" (
    "id"                  TEXT NOT NULL,
    "moduleId"            TEXT NOT NULL,
    "sourceScriptBlockId" TEXT,
    "platformMode"        "ClipPlatformMode" NOT NULL,
    "targetPlatform"      TEXT NOT NULL,
    "sectionTitle"        TEXT NOT NULL,
    "textContent"         TEXT NOT NULL,
    "beats"               JSONB NOT NULL,
    "ctaText"             TEXT,
    "videoStyle"          "VideoStyle" NOT NULL DEFAULT 'FACELESS',
    "sourceImageUrl"      TEXT,
    "mediaStatus"         "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "compiledVideoUrl"    TEXT,
    "progress"            INTEGER NOT NULL DEFAULT 0,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClipAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClipAsset_moduleId_idx" ON "ClipAsset"("moduleId");

ALTER TABLE "ClipAsset"
  ADD CONSTRAINT "ClipAsset_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClipAsset"
  ADD CONSTRAINT "ClipAsset_sourceScriptBlockId_fkey"
  FOREIGN KEY ("sourceScriptBlockId") REFERENCES "ScriptBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClipAsset"
  ADD CONSTRAINT "progress_range_chk"
  CHECK ("progress" >= 0 AND "progress" <= 100);
