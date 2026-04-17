# TODOs

Roadmap items for Scientific Revolution (Sail). Not exhaustive.

---

## 1. Mid-conversation advisor / expert pull-in (real-time)

**Goal:** During an onboarding or task conversation, invite a human advisor or domain expert without leaving the thread—via **SMS, deep link, or QR**—carrying an **AI-generated summary** of what is being discussed so they can decide in seconds whether to engage.

**Why people actually click**

- **Primary hook:** Make the stake explicit—*without you, this won’t get solved* (or the specific blocked outcome). The summary and CTA should center obligation and impact, not generic “you were mentioned.”
- **Trust and friction:** Short, scannable summary; clear time ask (e.g. “5 minutes to unblock”); who is asking and why *them*.
- **Optional layers to explore:**
  - **Opt-in context:** Let the invitee choose how much thread context they see before accepting (preview vs full).
  - **Social proof / ties:** Surface relationship to the requester (e.g. mutual org, prior task, inviter vouched)—anything that answers “why me” and “is this legit” fast.

**Product / eng notes (future breakdown)**

- Summary generation pipeline (what to include, redaction, tone).
- Delivery channels (SMS provider, signed URLs, QR payload).
- Permissions, audit trail, and rate limits for pulling externals into a thread.

---

## 2. Moira — AI meeting agent (Zoom / Google Meet)

**Goal:** An AI agent named **Moira** that can **join Zoom or Google Meet calls**, produce **reliable transcripts**, and (per product spec) support downstream flows—summaries, task linkage, dossier attachments.

**Notes**

- Likely depends on platform APIs, bot/join policies, consent UX, and storage of recordings/transcripts.
- Align naming and behavior with the brutalist / operational tone of the rest of the product.

---

*Last updated: product backlog scratchpad.*
