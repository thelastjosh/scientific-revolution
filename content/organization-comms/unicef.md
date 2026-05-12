---
org_id: unicef
label: UNICEF
applies_when:
  - Onboarding or invite is tied to organization `unicef`
  - User is associated with UNICEF context via invite
---

# Communication parameters — UNICEF

## parameters

| key | value | used_in |
|-----|-------|--------|
| `org_display_name` | UNICEF | all UNICEF-templated comms |
| `onboarding_welcome_subject` | Welcome — volunteering with UNICEF on {product_name} | email `onboarding_welcome` |
| `invite_email_subject` | {inviter} invited you to contribute with UNICEF on {product_name} | email `invite` |
| `expectation_summary_short` | Field-adjacent work is mostly systems, data, and reliability — rarely “hero” field missions. | welcome, nudges |
| `tone_keywords` | grounded, respectful, mission-clear, anti-hype | copy generation |
| `primary_cta` | Complete onboarding — UNICEF context | welcome |

## expectation_management

**Must be clear in welcome and first follow-up:**

- **Not typical:** International volunteers are **not** being deployed to dig wells, distribute supplies in the field, or do physical humanitarian frontline work through this platform unless explicitly part of a separate, formal program. Do **not** imply that signing up here equals field deployment.
- **More typical:** Work skews toward **unsexy but critical** impact — e.g. stabilizing a financial or grants system, helping grantees with technical infrastructure, data hygiene, internal tooling, integration between systems, documentation, and reliability of applications that support programs.
- **Why it matters:** These activities reduce error, protect funds, and help staff and partners focus on children — even when the work feels invisible.
- **Keeping people in the loop:** Volunteers should know **what stage** their effort is in (intake, scoped, in progress, blocked, shipped) and **when** to expect a response from coordinators. Under-promise on timelines; over-communicate on blockers.

## comms_by_trigger

| trigger | channel | email_type (suggested) | purpose |
|--------|----------|-------------------------|--------|
| Invite created / sent (UNICEF-scoped) | email | `invite` | Link + org context; set expectations per above |
| User lands from UNICEF invite | in-app | — | First screen: 2–3 line expectation strip (same as bullet list) |
| User completes org-context onboarding | email | `onboarding_welcome` | Welcome + restate scope; link workspace |
| First task assigned or matched | in-app + optional email | `task_assigned` | What the task is; who owns follow-up |
| Task blocked or waiting on volunteer | in-app | `task_blocked` | What we need from you; **SLA: respond within 5 business days** (parameter) |
| Task completed or shipped | email or in-app | `task_update` | Outcome in one paragraph; thank-you |
| Monthly (opt-in) | email | `org_monthly_update` | Short program note + open opportunities (if any) |
| 14 days no engagement after invite accept | email | `re_engagement` | One question: still interested? Link to calibrate time |

## welcome_message — onboarding (email body outline)

1. **Thanks for offering time with UNICEF** — name the platform as the coordination layer, not the full volunteer program.
2. **Reality check (required paragraph)** — most contributions here are **technical and operational**: applications, data, infrastructure for teams and partners. Field imagery or “saving children face-to-face” is **out of scope** for default flows.
3. **What good looks like** — clear handoffs, documented work, small reliable wins.
4. **Staying informed** — you will get updates when status changes; coordinators aim to respond within **{response_sla_days}** business days for queue items (set parameter, e.g. 5).
5. **CTA** — continue onboarding / open workspace.

## update_cadence

| event | update_type | when | notes |
|--------|-------------|------|--------|
| Invite redeemed | in-app + email (summary) | immediate | Include expectation strip in email preheader or first 3 lines |
| Onboarding step advance | in-app | immediate | — |
| Task state change | in-app | immediate | If “blocked on volunteer”, also email if no response in 72h |
| Program pause / high-load period | email | as needed | One honest sentence; no marketing fluff |
| Stale open tasks | email | 30 days idle | “Still active?” + opt to decline |

## message_parameters (slot-in copy)

```yaml
reality_check_block: |
  Work coordinated here is typically technical: improving systems, data, and tools
  that support UNICEF’s mission. It is rare for work to match “field” volunteering
  stereotypes. The impact is often indirect — and still essential.

gratitude_closing: |
  Thank you for helping where the need is real, even when it is not photogenic.
```

## messaging_preferences

- Prefer **in-app** for rapid task ping-pong; **email** for onboarding truth-telling, monthly summary, and anything that needs a record or forward to a manager.
- UNICEF-specific footers: link to official volunteering or partnership pages only if product has vetted URLs; do not invent program promises.
