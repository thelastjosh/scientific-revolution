ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "profile_markdown" text,
  ADD COLUMN IF NOT EXISTS "relationship_markdown" text,
  ADD COLUMN IF NOT EXISTS "skill_markdown" text;
