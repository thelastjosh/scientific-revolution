---
org_id: default
label: Generic / no organization
applies_when:
  - User onboards without an org-scoped invite
  - No matching organization comms file
---

# Communication parameters — default

## parameters

| key | value | used_in |
|-----|-------|--------|
| `product_name` | Scientific Revolution | all |
| `support_email` | *(set via env / product)* | welcome, help |
| `onboarding_welcome_subject` | Welcome to {product_name} | email `onboarding_welcome` |
| `invite_email_subject` | {inviter} invited you to {product_name} | email `invite` |
| `onboarding_follow_up_subject` | Your workspace is ready — next steps | email `onboarding_follow_up` |
| `primary_cta` | Open workspace / continue onboarding | welcome, follow-up |

## expectation_management

- **What this is:** A place to coordinate volunteer and mission-driven technical work, not a guarantee of a specific project or role.
- **What it is not:** A replacement for HR, payroll, or formal field deployment; not every task is high-visibility.
- **Tone:** Clear, warm, and practical. Acknowledge that useful work is often unglamorous (documentation, refactors, internal tools).

## comms_by_trigger

Use these as logical keys; implement as email or in-app message depending on channel.

| trigger | channel | email_type (suggested) | purpose |
|--------|----------|-------------------------|--------|
| User completes registration | email + in-app | `onboarding_welcome` | Welcome; link to profile and workspace |
| 24h after first login, profile incomplete | email | `onboarding_nudge_profile` | Gentle nudge to finish profile |
| User graduates onboarding to workspace | in-app (toast) + optional email | `onboarding_complete` | Confirm handoff; what to do next |
| User invited, invite email sent | email | `invite` | Landing link + one-line value prop |
| Weekly digest enabled (if product supports) | email | `weekly_digest` | Open tasks, org updates (opt-in) |

## welcome_message — onboarding (email body outline)

1. **Thanks for joining** — one sentence.
2. **What happens next** — 2 short bullets: complete profile; explore workspace.
3. **Expectations** — you may be matched to unglamorous but important work (clarity, reliability, handoffs).
4. **Single CTA** — button to app.

## update_cadence

| event | update_type | when | max_frequency |
|-------|-------------|------|---------------|
| Onboarding step completed | in-app | immediate | — |
| No activity 7 days after signup | email | day 7 | once per user |
| Major product or policy change | email | on release | as needed; batch if many changes |

## messaging_preferences

- Default: **email** for transactional (invite, password, security). **In-app** for nudges that do not need inbox clutter.
- Users should be able to opt out of non-essential email (digest, nudges) in settings when available.
