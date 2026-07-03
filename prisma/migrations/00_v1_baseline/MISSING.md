NOTE: no V1 baseline (00_v1_baseline) migration was ever uploaded — schema.prisma's
V1 tables (Organization, User, Notebook, SourceChunk, CourseModule, ExpertPerspective,
ContradictionMap, ScriptBlock, RenderJob, AssessmentSession, ChallengeRound,
DeploymentProfile, LtiState, PersonaProfile, CreditLedger) have no initial migration
in this repo. Run 'npx prisma migrate dev --name v1_baseline' against the schema
with all migrations/*/migration.sql removed first to generate it, or diff schema.prisma
against an empty DB to produce it directly.
