ALTER TABLE "onboarding_invites"
  ADD COLUMN IF NOT EXISTS "creator_user_id" varchar,
  ADD COLUMN IF NOT EXISTS "organization_id" varchar(64),
  ADD COLUMN IF NOT EXISTS "inviter_relationship_label" varchar(128),
  ADD COLUMN IF NOT EXISTS "inviter_context_summary" text,
  ADD COLUMN IF NOT EXISTS "max_uses" integer,
  ADD COLUMN IF NOT EXISTS "use_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_used_at" timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_invites_creator_fk'
  ) THEN
    ALTER TABLE "onboarding_invites"
      ADD CONSTRAINT "onboarding_invites_creator_fk"
      FOREIGN KEY ("creator_user_id") REFERENCES "users"("id") ON DELETE set null;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_invites_org_fk'
  ) THEN
    ALTER TABLE "onboarding_invites"
      ADD CONSTRAINT "onboarding_invites_org_fk"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE set null;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "invite_redemptions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invite_token" varchar(128) NOT NULL REFERENCES "onboarding_invites"("token") ON DELETE cascade,
  "redeemer_user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "redeemer_email" text,
  "session_id" varchar,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "invite_redemptions_token_user_uidx"
  ON "invite_redemptions"("invite_token","redeemer_user_id");

CREATE TABLE IF NOT EXISTS "email_events" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar REFERENCES "users"("id") ON DELETE set null,
  "invite_token" varchar(128) REFERENCES "onboarding_invites"("token") ON DELETE set null,
  "email_type" varchar(64) NOT NULL,
  "recipient" text NOT NULL,
  "subject" text NOT NULL,
  "status" varchar(24) NOT NULL DEFAULT 'sent',
  "error_message" text,
  "payload" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
