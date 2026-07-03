-- ============================================================================
-- CONTENT STORM — V2-7: Federated Edge Runtime
--
-- New table only. No self-serve write path reaches this table (registration
-- is authenticated by FEDERATED_NODE_SECRET, held only by Content Storm
-- ops — see src/app/api/federated/nodes/route.ts), so no billing/tier logic
-- belongs in this migration either.
-- ============================================================================

CREATE TYPE "NodeStatus" AS ENUM ('PENDING', 'ACTIVE', 'OFFLINE');

CREATE TABLE "FederatedNode" (
    "id"                 TEXT NOT NULL,
    "orgId"              TEXT NOT NULL,
    "nodeEndpoint"       TEXT NOT NULL,
    "modelCluster"       TEXT NOT NULL,
    "heartbeatTokenHash" TEXT NOT NULL,
    "status"             "NodeStatus" NOT NULL DEFAULT 'PENDING',
    "lastHeartbeat"      TIMESTAMP(3),
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FederatedNode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FederatedNode_orgId_idx" ON "FederatedNode"("orgId");

ALTER TABLE "FederatedNode"
  ADD CONSTRAINT "FederatedNode_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
