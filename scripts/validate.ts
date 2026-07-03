#!/usr/bin/env tsx
/**
 * Content Storm — Foundation + Vault validation
 * Run: npx tsx scripts/validate.ts
 *
 * Checks every service integration in order. A failure in an early step
 * explains why later steps would also fail. All checks are independent
 * reads/writes against real services — nothing is mocked.
 *
 * Exit 0 = all green. Exit 1 = at least one check failed.
 */

import "dotenv/config"; // picks up .env in the project root

const results: { label: string; ok: boolean; detail: string }[] = [];

function pass(label: string, detail = "") {
  results.push({ label, ok: true, detail });
  console.log(`  ✓  ${label}${detail ? `  — ${detail}` : ""}`);
}

function fail(label: string, detail = "") {
  results.push({ label, ok: false, detail });
  console.error(`  ✗  ${label}${detail ? `  — ${detail}` : ""}`);
}

// ── 1. Required environment variables ────────────────────────────────────────
console.log("\n[1] Environment variables");
const REQUIRED_ENV = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
  "REDIS_URL",
  "OPENAI_API_KEY",
];
for (const key of REQUIRED_ENV) {
  if (process.env[key]) pass(key);
  else fail(key, "not set");
}

// ── 2. Supabase Postgres connection ──────────────────────────────────────────
console.log("\n[2] Postgres connection");
let prisma: import("@prisma/client").PrismaClient;
try {
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient({ log: [] });
  await prisma.$connect();
  pass("prisma.$connect()");
} catch (e) {
  fail("prisma.$connect()", String(e));
  console.error("\n  Cannot proceed without a database. Fix DATABASE_URL and re-run.\n");
  process.exit(1);
}

// ── 3. Schema — spot-check key tables ────────────────────────────────────────
console.log("\n[3] Schema tables");
const TABLE_CHECKS: Array<() => Promise<unknown>> = [
  () => prisma.organization.count(),
  () => prisma.user.count(),
  () => prisma.notebook.count(),
  () => prisma.sourceChunk.count(),
  () => prisma.courseModule.count(),
  () => prisma.personaProfile.count(),
];
const TABLE_LABELS = [
  "Organization",
  "User",
  "Notebook",
  "SourceChunk",
  "CourseModule",
  "PersonaProfile",
];
for (let i = 0; i < TABLE_CHECKS.length; i++) {
  try {
    const count = await TABLE_CHECKS[i]();
    pass(TABLE_LABELS[i], `${count} rows`);
  } catch (e) {
    fail(TABLE_LABELS[i], String(e));
  }
}

// ── 4. pgvector extension + HNSW index ───────────────────────────────────────
console.log("\n[4] pgvector");
try {
  const extRows = await prisma.$queryRaw<{ name: string }[]>`
    SELECT name FROM pg_extension WHERE name = 'vector'
  `;
  if (extRows.length) pass("vector extension installed");
  else fail("vector extension", "extension not found — run: CREATE EXTENSION vector;");
} catch (e) {
  fail("vector extension check", String(e));
}

try {
  const idxRows = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'SourceChunk'
      AND indexname = 'source_chunk_embedding_idx'
  `;
  if (idxRows.length) pass("HNSW index exists");
  else fail("HNSW index", "missing — run the pgvector migration SQL");
} catch (e) {
  fail("HNSW index check", String(e));
}

// ── 5. pgvector write + cosine retrieval roundtrip ───────────────────────────
console.log("\n[5] pgvector roundtrip");
let tmpChunkId: string | null = null;
let tmpNotebookId: string | null = null;
let tmpOrgId: string | null = null;
try {
  // Minimal org → notebook → chunk scaffold (all deleted at end).
  const org = await prisma.organization.create({ data: { name: "__validate_org__" } });
  tmpOrgId = org.id;
  const nb = await prisma.notebook.create({ data: { orgId: org.id, title: "__validate_nb__" } });
  tmpNotebookId = nb.id;
  const chunk = await prisma.sourceChunk.create({
    data: { notebookId: nb.id, content: "validation probe", sourceRef: "__probe__#0" },
  });
  tmpChunkId = chunk.id;
  pass("scaffold created", `org=${org.id.slice(0, 8)} nb=${nb.id.slice(0, 8)}`);

  // Write a deterministic unit vector (dim 1536).
  const { Prisma } = await import("@prisma/client");
  const vec = new Array(1536).fill(0);
  vec[0] = 1; // unit vector along dim-0
  const vecLiteral = Prisma.raw(`'[${vec.join(",")}]'::vector`);
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SourceChunk" SET embedding = ${vecLiteral} WHERE id = ${tmpChunkId}
  `);
  pass("setChunkEmbedding (raw SQL write)");

  // Cosine retrieval: query with the same unit vector — distance should be 0.
  const rows = await prisma.$queryRaw<{ id: string; distance: number }[]>(
    Prisma.sql`
      SELECT id, (embedding <=> ${vecLiteral}) AS distance
      FROM "SourceChunk"
      WHERE "notebookId" = ${nb.id} AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vecLiteral}
      LIMIT 1
    `
  );
  if (rows.length && rows[0].id === tmpChunkId && Number(rows[0].distance) < 0.001) {
    pass("matchChunks cosine retrieval", `distance=${Number(rows[0].distance).toFixed(6)}`);
  } else {
    fail("matchChunks cosine retrieval", `rows=${rows.length}, first=${JSON.stringify(rows[0])}`);
  }
} catch (e) {
  fail("pgvector roundtrip", String(e));
} finally {
  // Clean up scaffold rows regardless of test result.
  if (tmpChunkId) await prisma.sourceChunk.deleteMany({ where: { id: tmpChunkId } }).catch(() => {});
  if (tmpNotebookId) await prisma.notebook.deleteMany({ where: { id: tmpNotebookId } }).catch(() => {});
  if (tmpOrgId) await prisma.organization.deleteMany({ where: { id: tmpOrgId } }).catch(() => {});
}

// ── 6. Redis connection ───────────────────────────────────────────────────────
console.log("\n[6] Redis (BullMQ)");
let redis: import("ioredis").default;
try {
  const IORedis = (await import("ioredis")).default;
  redis = new IORedis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  await redis.connect();
  const pong = await redis.ping();
  if (pong === "PONG") pass("Redis PING", "PONG");
  else fail("Redis PING", `unexpected: ${pong}`);
} catch (e) {
  fail("Redis connection", String(e));
}

try {
  const { Queue } = await import("bullmq");
  const q = new Queue("__validate__", {
    connection: redis!,
    defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
  });
  const job = await q.add("probe", { ok: true });
  await job.remove();
  await q.close();
  pass("BullMQ queue add + remove");
} catch (e) {
  fail("BullMQ", String(e));
}

// ── 7. OpenAI embeddings (text-embedding-3-small) ────────────────────────────
console.log("\n[7] OpenAI embeddings");
try {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: ["Content Storm foundation validation probe"],
  });
  const dim = res.data[0].embedding.length;
  if (dim === 1536) pass("text-embedding-3-small", `dim=${dim}`);
  else fail("text-embedding-3-small", `unexpected dim=${dim}`);
} catch (e) {
  fail("OpenAI embeddings", String(e));
}

// ── 8. Chunker smoke test ─────────────────────────────────────────────────────
console.log("\n[8] Chunker");
try {
  const { chunkText } = await import("../src/lib/chunking");
  const empty = chunkText("");
  const single = chunkText("Hello world. This is a validation probe.");
  const multi = chunkText(
    Array(20).fill("MCP standardizes the client-server architecture for AI context. ").join("") +
    "\n\n" +
    Array(20).fill("The Skeptic argues this expands the prompt injection attack surface. ").join("")
  );
  if (empty.length === 0 && single.length === 1 && multi.length >= 1) {
    pass("chunkText", `empty=0 single=1 multi=${multi.length}`);
  } else {
    fail("chunkText", `empty=${empty.length} single=${single.length} multi=${multi.length}`);
  }
} catch (e) {
  fail("chunkText import", String(e));
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(56));
const failed = results.filter((r) => !r.ok);
if (failed.length === 0) {
  console.log(`\n  All ${results.length} checks passed. Foundation + Vault is live.\n`);
  console.log("  Next: npm run worker:ingest  (in a separate terminal)");
  console.log("  Then: npm run dev\n");
  process.exit(0);
} else {
  console.log(`\n  ${failed.length} of ${results.length} checks failed:\n`);
  for (const r of failed) console.error(`    ✗  ${r.label}: ${r.detail}`);
  console.log("");
  process.exit(1);
}
