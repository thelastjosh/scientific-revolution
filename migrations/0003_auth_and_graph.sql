ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash";
ALTER TABLE "users" ADD COLUMN "email" text;
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");
ALTER TABLE "users" ADD COLUMN "display_name" text;
ALTER TABLE "users" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

CREATE TABLE "user_edges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"target_user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"kind" varchar(32) DEFAULT 'peer' NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_edges_no_self" CHECK ("source_user_id" <> "target_user_id"),
	CONSTRAINT "user_edges_source_target_kind" UNIQUE ("source_user_id", "target_user_id", "kind")
);
