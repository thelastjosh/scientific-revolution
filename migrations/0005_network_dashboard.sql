-- User profile + network organizations, tasks, projects, epoch

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reputation" real DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "motivation" integer DEFAULT 50 NOT NULL;

CREATE TABLE "organizations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "organization_members" (
	"organization_id" varchar(64) NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
	"user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"role" varchar(64) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_pk" PRIMARY KEY("organization_id","user_id")
);

CREATE TABLE "network_tasks" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"organization_id" varchar(64) REFERENCES "organizations"("id") ON DELETE set null,
	"short_why" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"evaluation_loop" text DEFAULT '' NOT NULL,
	"motivation_score" integer DEFAULT 0 NOT NULL,
	"time_estimate" text DEFAULT '' NOT NULL,
	"status" varchar(24) DEFAULT 'available' NOT NULL,
	"community" varchar(32) NOT NULL,
	"github_link" text,
	"workspace_type" varchar(32),
	"task_kind" varchar(32),
	"event_date" timestamp with time zone,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "network_projects" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"organization_id" varchar(64) REFERENCES "organizations"("id") ON DELETE set null,
	"short_why" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"motivation_score" integer NOT NULL,
	"deadline" text NOT NULL,
	"status" varchar(24) NOT NULL,
	"claimed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "network_epochs" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"progress" integer NOT NULL,
	"target" integer NOT NULL,
	"current" integer NOT NULL,
	"deadline" text NOT NULL,
	"status" varchar(16) DEFAULT 'nominal' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
