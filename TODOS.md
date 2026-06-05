# TODOs

Current backlog after the Pathway A agentic dashboard rebuild.

---

## 1. External delivery adapters

**Goal:** Move from metadata-only channel support to live delivery adapters.

**Note:** Federated org agent registry, canonical comms timeline, and hub↔agent contracts are in [ARCHITECTURE-AGENT-GATEWAY.md](ARCHITECTURE-AGENT-GATEWAY.md) (implemented). Task **open** handoff plus **Resend inbound** replies are wired (see README env vars). **Telegram outbound** (connector registry, handoff, admin/user test) is wired via `channel_credentials` + `TELEGRAM_BOT_TOKEN`; additional providers remain below.

**Scope**
- Gmail/Outlook send + status webhooks.
- Slack/Teams DM delivery + thread updates.
- Retry queue, dead-letter handling, and visibility in admin task pipeline.

---

## 1b. Telegram connect flow (replace manual chat ID)

**Goal:** One-click Telegram linking — no pasting numeric chat IDs in the Connectors pane.

**Why:** Telegram bots cannot cold-DM a user by @username; they need a stable `chat_id` after the user has started the bot. Scope B used manual chat ID because inbound was out of scope.

**Scope**
- Dashboard **Connect Telegram** → deep link `https://t.me/<SailBot>?start=connect_<signed_token>` tied to the logged-in user.
- Inbound handler (webhook preferred; polling acceptable for dev): on `/start connect_<token>`, validate token, persist `chat_id` to `channel_credentials`, mark connector active.
- Connectors pane: show **Waiting for Telegram…** / **Connected**; remove chat ID input (keep optional re-link / disconnect).
- Short-lived, single-use connect tokens; expire unclaimed tokens.
- Docs: BotFather webhook URL, `TELEGRAM_BOT_TOKEN`, local ngrok/tunnel note for dev.

**Out of scope (same as connector v1):** inbound task replies over Telegram, retry queue.

---

## 2. Workspace extraction quality

**Goal:** Improve raw-doc task extraction quality and editing ergonomics.

**Scope**
- richer extraction heuristics/LLM fallback,
- confidence/traceability per extracted task,
- explicit "accept/reject/edit" loops in chat + task pane.

---

## 3. Admin RBAC hardening

**Goal:** Replace shared-secret-only access with role-based authorization and audit policies.

**Scope**
- role-aware admin route guardrails,
- scoped permissions for read/write ops,
- immutable audit event coverage for critical actions.

---

*Last updated: Telegram connector framework (Scope B); connect-via-bot flow tracked in §1b.*
