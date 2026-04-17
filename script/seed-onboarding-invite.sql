-- Example invite for local testing. Replace values, then run against your DB:
--   psql "$DATABASE_URL" -f script/seed-onboarding-invite.sql
-- Or paste into Supabase SQL editor.

INSERT INTO onboarding_invites (token, first_name, email, description, research_summary)
VALUES (
  'dev-invite-001',
  'Alex',
  'alex@example.com',
  'Referred by the network lead; background in distributed systems and public-interest AI.',
  'Public footprint: conference talks on consensus; GitHub activity in Rust and networking; no red flags in public search.'
)
ON CONFLICT (token) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  email = EXCLUDED.email,
  description = EXCLUDED.description,
  research_summary = EXCLUDED.research_summary;
