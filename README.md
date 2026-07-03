# Content Storm V2

Multi-agent adversarial knowledge compiler. Ingests source material, runs it through
five domain-isolated LLM personas forbidden from agreeing, maps the contradictions,
compiles a multi-modal video lecture + interactive text-block storyboard, and tests
the learner's synthesis against the same five agents in an adversarial viva (the
Challenge Chamber).

Architecture reference: `Content-Storm-Architecture.md` (v0.9 blueprint) and
`CONTENT_STORM_V2_RATIFIED_ARCHITECTURE.md` (V2 delta — canonical SRS, 5-tier
billing, Drift Dashboard, Curriculum Arbitrage, Federated Edge, Arbitrage Clipper).

---

## Provenance — read this before assuming anything is "done"

This codebase was assembled from an uploaded file set that mixed **real, working
code** with **narrative descriptions of code that was never actually delivered**.
Both the real code and my own additions/fixes are documented below so nothing here
is silently taken on faith.

### Genuinely real, uploaded, unmodified
- `prisma/schema.prisma` — 20 models, 16 enums, verified internally consistent
  (brace-balanced, every field type resolves, all relations bidirectional).
- All 6 core pipeline workers (`ingest`, `persona-scan`, `contradiction-map`,
  `synthesis`, `image-generation`, `render`) and all 4 V2 workers (`clip-render`,
  `mint-credential`, `drift-scan`, `arbitrage-scan`).
- 8 of the 19 API routes (billing/credits, billing/checkout, arbitrage list,
  drift/detect, challenge/crisis, challenge GET, credentials/mint, clipper/slice).
- Every `src/lib/*` module except the three noted as rewritten below.
- All landing-page and app-internal (Brutalist Sovereign) React components.
- The Remotion sub-package (compositions, shared design tokens).

### Rewritten from a stale/legacy state found in the upload
- **`src/lib/challenge.ts`** — the uploaded version only implemented the legacy
  V1 5-vector scoring matrix. Two real uploaded routes (`challenge/[id]/crisis`,
  `challenge/[id]` GET) require the V2-2 canonical 3-factor SRS
  (`SRS = 0.40·S_DR + 0.45·S_GA + 0.15·B_E`) and a `generateCrisisAttack()`
  export, neither of which existed. Rebuilt from `SRS-3_and_math.md`'s formula
  and the architecture doc's D1 resolution, matched to `schema.prisma`'s real
  field names. The legacy 5-vector path is preserved as the `legacy*` fallback
  fields the schema and `ChallengeChamber.tsx` already expect.
- **`src/lib/lti.ts`** — still read pre-V2-2 fields (`resilienceScore`,
  `vectorBreakdown`, `weakestLink`). Updated to the canonical
  `srsScore ?? legacyResilienceScore` fallback pattern `challenge/[id]` GET
  already establishes.
- **`src/lib/tenancy.ts`** — missing `assertAddon`, imported by two real routes
  (`credentials/mint`, `clipper/slice`). Added, matching the existing
  `assertRole` pattern.
- **`src/lib/vector.ts`** — missing `scoreSourceGroundingSimilarity`, the
  deterministic (non-LLM) cosine-similarity function the canonical SRS's S_GA
  sub-score requires per patent Claim 2. Added.
- **`src/lib/credits.ts`** — had a stale, duplicate 3-tier `MONTHLY_GRANT`
  (`FREE`/`PRO`/`ENTERPRISE`) shadowing the correct 5-tier version already
  properly defined in `credit-constants.ts`. Removed the duplicate; now
  re-exports from `credit-constants.ts`.
- **`src/workers/render.worker.ts`, `src/workers/clip-render.worker.ts`** — both
  called `renderMediaOnLambda({ bucketName: ... })`. The real
  `@remotion/lambda-client` input type has no `bucketName` field (only the
  *output* does) — the correct input field is `forceBucketName`. Fixed in both
  files. Also cast `REMOTION_REGION` to Remotion's `AwsRegion` literal union
  (env vars are plain `string`).

### Written from scratch (did not exist anywhere in the upload)
11 of 19 API routes — the full V1 core pipeline's HTTP surface was missing
entirely (only its workers existed): `notebooks/[id]/ingest`,
`modules/[id]/initialize`, `modules/[id]` (GET), `blocks/[id]` (GET+PATCH),
`modules/[id]/render`, `challenge/[id]/start`, `challenge/[id]/respond`,
`lti/login`, `lti/launch`, `export/[moduleId]`, `webhooks/[deploymentId]`.
Written against the real, already-uploaded workers/lib functions they call —
mechanical wiring, not invented business logic — following the exact
conventions (`tenantRoute`, Zod validation, error shapes) the 8 real routes
already establish.

Also written from scratch: the true Next.js root layout (`src/app/layout.tsx`
— no file anywhere in the upload had `<html>`/`<body>` tags, and
`clerkMiddleware()` was already running with no `<ClerkProvider>` ancestor,
which breaks auth app-wide, not just on one route), the app's own
`package.json` (only the Remotion sub-package's existed), `tsconfig.json`,
`next.config.ts` placement, and this README.

### Explicitly flagged, not silently faked
- **`src/app/api/lti/launch/route.ts`** — state/nonce CSRF verification is
  real and enforced. Full JWS *signature* verification against the platform's
  JWKS is not implemented (no JOSE library in this dependency set) — documented
  in the file itself as a named blocking gap, not a silent trust-the-claims
  stub. Add `jose`, fetch `DeploymentProfile.ltiKeysetUrl`, and verify before
  any production LTI launch.
- **`src/lib/stripe.ts`** — the pinned `apiVersion: "2025-04-30.basil"` may not
  match what your installed `stripe` package's types expect. This is
  deliberate — the pin must match your actual Stripe Dashboard configuration,
  not whatever happens to be locally installed. Verify before deploying.
- **`prisma/migrations/00_v1_baseline/`** — contains a `MISSING.md`, not a real
  migration. The 8 migrations that *were* uploaded are all V2 deltas; no V1
  baseline migration exists anywhere in the source material. Generate one
  against an empty database before running the rest in sequence.

---

## Setup

```bash
npm install
cp .env.example .env   # fill in every value — see the file's own comments
npx prisma migrate dev --name v1_baseline   # see the migrations note above
npx prisma generate
npm run dev
```

Background workers run as separate processes (`npm run worker:ingest`,
`worker:persona-scan`, etc. — see `package.json` scripts). All 10 BullMQ queues
need Redis reachable at `REDIS_URL`.

Remotion (`remotion/`) is a separate package:
```bash
cd remotion && npm install
npm run studio          # local preview
npm run lambda:deploy   # deploy function + site before any real render
```

## A note on verification

Every file in this repo was checked for internal consistency: all `@/...` and
relative imports resolve to real files, every named import matches a real
named export, the Prisma schema's 20 models have zero dangling relations, and
the whole `src/` tree was type-checked together (not file-by-file) using a
hand-written Prisma client type stub — this sandbox's network allowlist
doesn't include `binaries.prisma.sh`, so the real engine binary couldn't be
fetched to run `prisma generate` for real. Run `npx prisma generate` for real
before your first `tsc --noEmit` locally; a handful of `implicit any` errors
you may see without it (on `.map`/`.filter` callbacks over Prisma query
results) are stub artifacts, not real bugs — confirmed by checking that every
one of those sites is downstream of a Prisma call that a real client would
type precisely.
