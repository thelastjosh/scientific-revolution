---
org_id: public-ai
label: Public AI
applies_when:
  - Onboarding or invite is tied to organization `public-ai`
---

# Communication parameters — Public AI

## parameters

| key | value | used_in |
|-----|-------|--------|
| `org_display_name` | Public AI | all org-templated comms |
| `onboarding_welcome_subject` | Welcome to {product_name} — {org_display_name} | email `onboarding_welcome` |
| `invite_email_subject` | {inviter} invited you to volunteer with {org_display_name} | email `invite` |
| `mission_line` | Volunteer-driven, public-interest work to spread the benefits and mitigate harms of AI. | welcome |
| `tone_keywords` | collaborative, civic-minded, clear about unpaid nature of many roles | copy |

## expectation_management

- **What this is:** A community of volunteers working on public-interest AI initiatives — research support, education, tooling, and coordination.
- **What it is not:** A paid job pipeline, a VC pitch forum, or guaranteed “impact” metrics on every project.
- **Reality:** Tasks may be research notes, user testing, documentation, or community support. Value is in consistency and follow-through, not only demos.

## comms_by_trigger

| trigger | channel | email_type (suggested) | purpose |
|--------|----------|-------------------------|--------|
| Invite sent (Public AI context) | email | `invite` | Value prop + open invite link |
| Registration with org | email | `onboarding_welcome` | Community norms + CTA |
| Cohort or event announced (if applicable) | email | `org_announcement` | Optional; opt-in |
| 7 days quiet after join | in-app or email | `nudge_get_involved` | Suggested next action |

## welcome_message — onboarding (email body outline)

1. **Welcome to Public AI on {product_name}.**
2. **How we work** — volunteer-led; projects vary in scope; coordinators are also volunteers in many cases.
3. **What we need from you** — honest availability, small commitments you can keep.
4. **CTA** — set up profile, join a channel or task as offered.

## update_cadence

| event | update_type | when |
|--------|-------------|------|
| New initiative or project batch | email | on publish; respect opt-in |
| Personal milestone (first task done) | in-app | immediate |
| Quarterly (opt-in) | email | light digest of public updates |

## messaging_preferences

- Emphasize **in-app and community channels** (where the product supports them) for day-to-day coordination.
- **Email** for onboarding, consent, and infrequent org-wide updates.
