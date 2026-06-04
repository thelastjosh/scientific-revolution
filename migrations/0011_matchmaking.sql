DO $$ BEGIN
  CREATE TYPE "matchmaking_decision" AS ENUM('wait', 'propose');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "matchmaking_trigger" AS ENUM('submit', 'rerun', 'benchmark');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "matchmaking_proposal_status" AS ENUM('pending', 'accepted', 'declined', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "matchmaking_runs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" varchar(32) NOT NULL,
  "module_id" varchar(64) NOT NULL,
  "module_version" varchar(32) NOT NULL,
  "decision" "matchmaking_decision" NOT NULL,
  "proposed_user_id" varchar,
  "confidence" integer DEFAULT 0 NOT NULL,
  "reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "scores" jsonb,
  "input_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "trigger" "matchmaking_trigger" DEFAULT 'submit' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "matchmaking_proposals" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" varchar(32) NOT NULL,
  "run_id" varchar NOT NULL,
  "candidate_user_id" varchar NOT NULL,
  "status" "matchmaking_proposal_status" DEFAULT 'pending' NOT NULL,
  "token" varchar(128) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "responded_at" timestamp with time zone,
  "response_source" varchar(24),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "matchmaking_runs" ADD CONSTRAINT "matchmaking_runs_task_id_network_tasks_id_fk"
    FOREIGN KEY ("task_id") REFERENCES "network_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "matchmaking_runs" ADD CONSTRAINT "matchmaking_runs_proposed_user_id_users_id_fk"
    FOREIGN KEY ("proposed_user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "matchmaking_proposals" ADD CONSTRAINT "matchmaking_proposals_task_id_network_tasks_id_fk"
    FOREIGN KEY ("task_id") REFERENCES "network_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "matchmaking_proposals" ADD CONSTRAINT "matchmaking_proposals_run_id_matchmaking_runs_id_fk"
    FOREIGN KEY ("run_id") REFERENCES "matchmaking_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "matchmaking_proposals" ADD CONSTRAINT "matchmaking_proposals_candidate_user_id_users_id_fk"
    FOREIGN KEY ("candidate_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "matchmaking_proposals_token_uidx" ON "matchmaking_proposals" ("token");
