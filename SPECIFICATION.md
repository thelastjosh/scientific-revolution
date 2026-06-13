# Sourceful (Sail v1) - Platform Specification

## 1. Product Direction (Pathway A)
Sourceful is a chat-first coordination platform with two linked conversational surfaces:

1. **Home (`/`) onboarding chat** for identity/profile bootstrap.
2. **Dashboard (`/dashboard`) workspace chat** for ongoing work orchestration.

Users are explicitly graduated from onboarding into workspace chat, with transcript/context handoff.

## 2. Core Purpose
Enable organizations and individuals to draft, submit, and maintain high-quality tasks from real working context (docs, transcripts, messages), while delivering and executing work through external channels (email/messaging apps).

## 3. Core Principles
1. **Onboarding and workspace are distinct chat modes.**
2. **No reputation/motivation scoring in product model or UI.**
3. **Task execution happens off-platform** (email/messaging), while drafting, updates, and tracking happen in-platform.
4. **Admin is operational control center**, not just feature flags.

## 4. Key Surfaces

### 4.1 Home Onboarding Chat
- Invite/link enrichment and profile bootstrap.
- Account creation/login.
- Explicit CTA: **Continue in workspace**.

### 4.2 Dashboard Workspace Chat
Home-like core chat interface with optional panes:
- **Profile pane:** edit own profile.
- **People pane:** view/search other profiles.
- **Document/Task pane:** paste raw source docs, extract task drafts, create/edit tasks.

### 4.3 Admin Control Center
Tabbed operations interface for:
- accounts,
- tasks (outstanding/completed lifecycle),
- channel credentials/integrations,
- user-specific context entries,
- post-task surveys,
- admin/audit events,
- UI experiments.

## 5. Data & Integrations
- Tasks contain source-document context and delivery channel metadata.
- Chat sessions/messages persist in DB (`onboarding` and `workspace` session types).
- Onboarding context is DB-backed (not in-memory).
- External delivery systems (email/messaging/calendar) are represented via credential and context tables and admin operations.

## 6. User Flow
1. User arrives at `/` and completes onboarding chat.
2. User authenticates and selects **Continue in workspace**.
3. Platform persists onboarding transcript/context and initializes workspace session.
4. In dashboard chat, user pastes a raw doc; system proposes task drafts.
5. User edits/submits tasks; downstream delivery and completion occur through email/messaging channels.

## 7. Visual Design
- Brutalist monochrome aesthetics.
- Monospace typography and sharp border-heavy layouts.
- Chat-first composition with expandable operational panes.

## 8. Federated agent gateway (network plug-in)

Organizations may **register a multi-tenant agent runtime** (BYO or Sail-managed) to participate in Sail-mediated external messaging and automation. **OpenClaw is one supported `runtime_kind`; the contract is runtime-agnostic.** Sail remains the **hub** for registry, routing, tasks, canonical `communication_events` timeline, and approval queues. Any org using this path must register an agent endpoint and signing secret; see [ARCHITECTURE-AGENT-GATEWAY.md](ARCHITECTURE-AGENT-GATEWAY.md). External-user comms copy is **Sail-sourced** where possible (template API) so plugged-in agents do not drift from org branding and trust expectations.

