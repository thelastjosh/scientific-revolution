-- Federated org agent registry + canonical communication timeline + sensitive-action approvals

CREATE TABLE IF NOT EXISTS "organization_agents" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organization_id" varchar(64) NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "runtime_kind" varchar(32) NOT NULL,
  "base_url" text NOT NULL,
  "signing_secret" varchar(128) NOT NULL,
  "capability_manifest" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" varchar(24) DEFAULT 'pending' NOT NULL,
  "managed_by" varchar(16) DEFAULT 'byo' NOT NULL,
  "network_api_level" varchar(16) DEFAULT '1' NOT NULL,
  "last_heartbeat_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "organization_agents_org_unique" UNIQUE ("organization_id")
);

CREATE INDEX IF NOT EXISTS "organization_agents_status_idx" ON "organization_agents" ("status");

CREATE TABLE IF NOT EXISTS "communication_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organization_id" varchar(64) NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "trace_id" varchar(64) NOT NULL,
  "dedupe_key" varchar(256) NOT NULL,
  "direction" varchar(16) NOT NULL,
  "channel" varchar(32) NOT NULL,
  "thread_key" text NOT NULL,
  "task_id" varchar(32) REFERENCES "network_tasks"("id") ON DELETE SET NULL,
  "actor_external_handle" text,
  "body" text DEFAULT '' NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "communication_events_dedupe_unique" UNIQUE ("dedupe_key")
);

CREATE INDEX IF NOT EXISTS "communication_events_org_occurred_idx" ON "communication_events" ("organization_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "communication_events_trace_idx" ON "communication_events" ("trace_id");

CREATE TABLE IF NOT EXISTS "network_sensitive_approvals" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
  "organization_id" varchar(64) NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "trace_id" varchar(64) NOT NULL,
  "request_kind" varchar(64) NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" varchar(24) DEFAULT 'pending' NOT NULL,
  "resolution_note" text,
  "resolved_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "network_sensitive_approvals_org_status_idx" ON "network_sensitive_approvals" ("organization_id", "status");
