-- Identity is email; legal-style first + last name (no separate username or display_name).

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_unique";

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" text;

UPDATE "users" SET "email" = LOWER(TRIM("username"))
WHERE "email" IS NULL OR TRIM(COALESCE("email", '')) = '';

UPDATE "users" SET
  "first_name" = CASE
    WHEN COALESCE(TRIM("display_name"), '') = '' THEN 'Member'
    ELSE split_part(TRIM("display_name"), ' ', 1)
  END,
  "last_name" = CASE
    WHEN COALESCE(TRIM("display_name"), '') = '' THEN 'User'
    WHEN strpos(trim("display_name"), ' ') = 0 THEN 'User'
    ELSE trim(substring(trim("display_name") from strpos(trim("display_name"), ' ') + 1))
  END
WHERE "first_name" IS NULL;

ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;

ALTER TABLE "users" DROP COLUMN "username";
ALTER TABLE "users" DROP COLUMN "display_name";
