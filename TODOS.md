# TODOs

Current backlog after the Pathway A agentic dashboard rebuild.

---

## 1. External delivery adapters

**Goal:** Move from metadata-only channel support to live delivery adapters.

**Scope**
- Gmail/Outlook send + status webhooks.
- Slack/Teams DM delivery + thread updates.
- Retry queue, dead-letter handling, and visibility in admin task pipeline.

---

## 2. Provider evaluation document

**Goal:** Complete the OpenClaw/alternatives evaluation before building provider-specific integrations.

**Scope**
- auth/RBAC fit,
- data residency + secret handling,
- retry/queue semantics,
- observability and operational burden,
- final recommendation and integration boundaries.

---

## 3. Workspace extraction quality

**Goal:** Improve raw-doc task extraction quality and editing ergonomics.

**Scope**
- richer extraction heuristics/LLM fallback,
- confidence/traceability per extracted task,
- explicit "accept/reject/edit" loops in chat + task pane.

---

## 4. Admin RBAC hardening

**Goal:** Replace shared-secret-only access with role-based authorization and audit policies.

**Scope**
- role-aware admin route guardrails,
- scoped permissions for read/write ops,
- immutable audit event coverage for critical actions.

---

*Last updated: Pathway A rebuild completion.*
