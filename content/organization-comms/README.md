# Organization communication parameters

One Markdown file per organization. File name = organization `id` in the database (e.g. `unicef.md`, `public-ai.md`). `default.md` applies when no org-specific file matches (generic onboarding, no invite, or unknown org).

## How to use

- **Authoring:** Edit the org’s file when copy, tone, or cadence should change. Keep section headings stable so tooling or future templates can read them.
- **Resolution order:** `organizations.id` from invite or membership → `{id}.md`; if missing → `default.md`.
- **Code mapping:** Email types in the app (e.g. `invite`, `onboarding_welcome`, `onboarding_follow_up`) should take **subject line**, **key expectation bullets**, and **CTA** from the parameters tables below. See each file’s `comms_by_trigger` / `message_parameters` blocks.

## Conventions in each file

| Section | Purpose |
|--------|---------|
| `org_id` | Must match filename stem and DB `organizations.id`. |
| `parameters` | Named slots for subject prefixes, product name, support link, etc. |
| `expectation_management` | Honest scope: what work is and is not. |
| `comms_by_trigger` | **When** a message sends and **which channel** (email vs in-app). |
| `update_cadence` | **How often** to check in; what triggers an extra nudge. |

## Related code

- `server/email/onboarding-email-service.ts` — Resend sends and `emailType` logging.
- Invites and org context: `onboarding_invites`, `organization_members`, invite application flow.
