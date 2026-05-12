# TODOs

Current backlog after the Pathway A agentic dashboard rebuild.

---

## 1. External delivery adapters

**Goal:** Move from metadata-only channel support to live delivery adapters.

**Note:** Federated org agent registry, canonical comms timeline, and hub↔agent contracts are in [ARCHITECTURE-AGENT-GATEWAY.md](ARCHITECTURE-AGENT-GATEWAY.md) (implemented). Task **open** handoff plus **Resend inbound** replies are wired (see README env vars); additional providers remain below.

**Scope**
- Gmail/Outlook send + status webhooks.
- Slack/Teams DM delivery + thread updates.
- Retry queue, dead-letter handling, and visibility in admin task pipeline.

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

*Last updated: task email Resend hub (handoff + inbound webhook).*
