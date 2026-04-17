CREATE TABLE "onboarding_invites" (
	"token" varchar(128) PRIMARY KEY NOT NULL,
	"first_name" text,
	"email" text,
	"description" text,
	"research_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
