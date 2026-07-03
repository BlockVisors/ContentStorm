-- ============================================================================
-- CONTENT STORM — V2-8: Crisis Mode Challenge Chamber
--
-- ChallengeRound.interrogator moves off the shared PersonaType enum onto a
-- new ChallengeInterrogator enum (the 5 existing values + CATALYST). Same
-- safe pattern as the V2-3 SubscriptionTier migration: create the new type,
-- cast the column through it, drop nothing from the old type (PersonaType
-- keeps all 5 of its original values — ExpertPerspective and PersonaProfile
-- still use it unchanged, this migration only touches ChallengeRound).
--
-- No data loss: every existing ChallengeRound.interrogator value (one of the
-- 5 real personas) is a 1:1 valid value in the new enum too.
-- ============================================================================

CREATE TYPE "ChallengeInterrogator" AS ENUM (
  'PRACTITIONER', 'ACADEMIC', 'SKEPTIC', 'ECONOMIST', 'HISTORIAN', 'CATALYST'
);

ALTER TABLE "ChallengeRound"
  ALTER COLUMN "interrogator" TYPE "ChallengeInterrogator"
  USING ("interrogator"::text)::"ChallengeInterrogator";

-- isCrisisMode already exists on AssessmentSession (added in the V2-2
-- migration, ahead of this feature actually using it) — nothing to add here.
