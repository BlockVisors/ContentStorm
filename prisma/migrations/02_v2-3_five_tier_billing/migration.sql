-- ============================================================================
-- CONTENT STORM — V2-3: Five-tier billing migration
--
-- 1. Rebuilds the SubscriptionTier enum: FREE / PRO / ENTERPRISE becomes
--    FREE / PRO / ARCHITECT / ENTERPRISE_SANDBOX / SOVEREIGN. Existing
--    'ENTERPRISE' rows are remapped to 'ENTERPRISE_SANDBOX' — the closest
--    semantic match (LTI/xAPI/SCORM gate carries forward unchanged).
-- 2. Adds the BillingModel enum and the Organization columns V2-3 needs:
--    stripeSubscriptionId, billingModel, seatCount, meteredOverageRate,
--    five add-on flags, sovereignContractTerms.
-- 3. Backfills billingModel for existing paying orgs so route guards don't
--    see a FLAT-tagged Enterprise Sandbox org on day one.
--
-- Run before deploying app code that reads the new columns. Not reversible
-- without a corresponding down-migration — take a schema snapshot first if
-- this runs against a database with real subscriber data.
-- ============================================================================

-- 1. Rebuild the SubscriptionTier enum (Postgres cannot rename/remove enum
--    values in place while they're in use, so: rename old type, create new
--    type, cast the column through a value-remapping CASE, drop old type).
ALTER TYPE "SubscriptionTier" RENAME TO "SubscriptionTier_old";

CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'ARCHITECT', 'ENTERPRISE_SANDBOX', 'SOVEREIGN');

ALTER TABLE "Organization"
  ALTER COLUMN "tier" DROP DEFAULT;

ALTER TABLE "Organization"
  ALTER COLUMN "tier" TYPE "SubscriptionTier"
  USING (
    CASE "tier"::text
      WHEN 'ENTERPRISE' THEN 'ENTERPRISE_SANDBOX'
      ELSE "tier"::text
    END
  )::"SubscriptionTier";

ALTER TABLE "Organization"
  ALTER COLUMN "tier" SET DEFAULT 'FREE';

DROP TYPE "SubscriptionTier_old";

-- 2. New BillingModel enum.
CREATE TYPE "BillingModel" AS ENUM ('FLAT', 'METERED', 'SEAT', 'CUSTOM');

-- 3. New Organization columns.
ALTER TABLE "Organization" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId");

ALTER TABLE "Organization" ADD COLUMN "billingModel"       "BillingModel" NOT NULL DEFAULT 'FLAT';
ALTER TABLE "Organization" ADD COLUMN "seatCount"          INTEGER;
ALTER TABLE "Organization" ADD COLUMN "meteredOverageRate" DOUBLE PRECISION;

ALTER TABLE "Organization" ADD COLUMN "hasArbitrageAddon"         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "hasOnChainCredentialAddon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "hasPremiumComputeAddon"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "hasFederatedEdgeAddon"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "hasClipperAddon"           BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Organization" ADD COLUMN "sovereignContractTerms" JSONB;

-- 4. Backfill: orgs that were ENTERPRISE (now ENTERPRISE_SANDBOX) are seat-billed;
--    everyone else defaults correctly to FLAT already via the column default.
UPDATE "Organization" SET "billingModel" = 'SEAT' WHERE "tier" = 'ENTERPRISE_SANDBOX';

-- 5. Sanity constraint: seatCount only makes sense for seat billing, and must
--    be positive when present.
ALTER TABLE "Organization"
  ADD CONSTRAINT "seatCount_positive_chk"
  CHECK ("seatCount" IS NULL OR "seatCount" > 0);
