-- Agentic dashboard reset (Pathway A)

DO $$ BEGIN
  CREATE TYPE "task_status" AS ENUM('draft', 'open', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "chat_session_type" AS ENUM('onboarding', 'workspace');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "chat_message_role" AS ENUM('system', 'assistant', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "survey_status" AS ENUM('pending', 'completed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "users" DROP COLUMN IF EXISTS "reputation";
ALTER TABLE "users" DROP COLUMN IF EXISTS "motivation";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar(24) NOT NULL DEFAULT 'member';

ALTER TABLE "network_tasks"
  ADD COLUMN IF NOT EXISTS "owner_user_id" varchar,
  ADD COLUMN IF NOT EXISTS "assignee_user_id" varchar,
  ADD COLUMN IF NOT EXISTS "source_session_id" varchar,
  ADD COLUMN IF NOT EXISTS "raw_source_doc" text,
  ADD COLUMN IF NOT EXISTS "extracted_by" varchar(64) DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS "delivery_channels" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "external_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();

UPDATE "network_tasks"
SET "owner_user_id" = (
  SELECT id FROM users ORDER BY created_at ASC LIMIT 1
)
WHERE "owner_user_id" IS NULL;

ALTER TABLE "network_tasks"
  ALTER COLUMN "owner_user_id" SET NOT NULL;

ALTER TABLE "network_tasks"
  ADD CONSTRAINT IF NOT EXISTS "network_tasks_owner_fk"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE cascade;
ALTER TABLE "network_tasks"
  ADD CONSTRAINT IF NOT EXISTS "network_tasks_assignee_fk"
    FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE set null;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'network_tasks'
      AND column_name = 'status'
      AND udt_name = 'task_status'
  ) THEN
    ALTER TABLE "network_tasks"
      ALTER COLUMN "status" TYPE task_status
      USING CASE
        WHEN "status" IN ('available', 'in-progress') THEN 'open'::task_status
        WHEN "status" = 'completed' THEN 'completed'::task_status
        ELSE 'draft'::task_status
      END;
  END IF;
END $$;

ALTER TABLE "network_tasks"
  DROP COLUMN IF EXISTS "short_why",
  DROP COLUMN IF EXISTS "rationale",
  DROP COLUMN IF EXISTS "evaluation_loop",
  DROP COLUMN IF EXISTS "motivation_score",
  DROP COLUMN IF EXISTS "time_estimate",
  DROP COLUMN IF EXISTS "community",
  DROP COLUMN IF EXISTS "github_link",
  DROP COLUMN IF EXISTS "workspace_type",
  DROP COLUMN IF EXISTS "task_kind",
  DROP COLUMN IF EXISTS "event_date";

DROP TABLE IF EXISTS "network_projects";
DROP TABLE IF EXISTS "network_epochs";

CREATE TABLE IF NOT EXISTS "onboarding_contexts" (
  "user_id" varchar PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "persona" varchar(24) NOT NULL,
  "invite_token" varchar(128),
  "invite_email" text,
  "onboarding_step" varchar(120) NOT NULL,
  "summary" text,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chat_sessions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" chat_session_type NOT NULL,
  "title" text,
  "graduated_from_session_id" varchar,
  "active_intent" text,
  "archived" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" varchar NOT NULL REFERENCES "chat_sessions"("id") ON DELETE cascade,
  "role" chat_message_role NOT NULL,
  "content" text NOT NULL,
  "meta" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "channel_credentials" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "provider" varchar(40) NOT NULL,
  "account_label" text NOT NULL,
  "credential_ref" text NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_context_entries" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "source" varchar(40) NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "meta" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "post_task_surveys" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" varchar(32) NOT NULL REFERENCES "network_tasks"("id") ON DELETE cascade,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "status" survey_status NOT NULL DEFAULT 'pending',
  "score" integer,
  "feedback" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "admin_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "event_type" varchar(64) NOT NULL,
  "target_type" varchar(64),
  "target_id" text,
  "payload" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
