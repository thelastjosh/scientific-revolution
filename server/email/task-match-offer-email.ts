import type { MatchmakingProposal, NetworkTask, User } from "@shared/schema";
import { emailEvents } from "@shared/schema";
import { getOutboundFromEmail } from "./from-address";
import { getResendClient } from "./resend-client";
import { appendCommunicationEvent } from "../network-communication-service";
import { getDb } from "../db";
import { resolveOrganizationIdForTask } from "../task-organization";

function appBaseUrl(): string {
  const base = process.env.APP_BASE_URL?.trim();
  if (base) return base.replace(/\/+$/, "");
  return "http://localhost:5000";
}

export function matchOfferUrls(token: string) {
  const base = `${appBaseUrl()}/match/offer/${token}`;
  return {
    offerPage: base,
    acceptPage: `${base}?action=accept`,
    declinePage: `${base}?action=decline`,
    acceptApi: `${appBaseUrl()}/api/matchmaking/offer/${token}/accept`,
    declineApi: `${appBaseUrl()}/api/matchmaking/offer/${token}/decline`,
  };
}

export function shouldSkipMatchOfferEmail(): boolean {
  if (process.env.MATCHMAKER_SKIP_EMAIL === "true") return true;
  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY?.trim()) {
    return true;
  }
  return false;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function logEmailEvent(input: {
  userId?: string | null;
  emailType: string;
  recipient: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  errorMessage?: string | null;
  payload?: Record<string, unknown>;
}) {
  const db = getDb();
  if (!db) return;
  try {
    await db.insert(emailEvents).values({
      userId: input.userId ?? null,
      inviteToken: null,
      emailType: input.emailType,
      recipient: input.recipient,
      subject: input.subject,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      payload: input.payload ?? null,
    });
  } catch {
    /* ignore */
  }
}

export async function sendTaskMatchOfferEmail(input: {
  task: NetworkTask;
  proposal: MatchmakingProposal;
  candidate: User;
  reasons: string[];
  organizationDisplayName: string | null;
}): Promise<{ ok: true; skipped?: boolean } | { ok: false; reason: string }> {
  const { task, proposal, candidate, reasons, organizationDisplayName } = input;
  const to = candidate.email.trim();
  const subject = `[Match] ${task.title}`;
  const urls = matchOfferUrls(proposal.token);

  if (shouldSkipMatchOfferEmail()) {
    await logEmailEvent({
      userId: candidate.id,
      emailType: "task_match_offer",
      recipient: to,
      subject,
      status: "skipped",
      errorMessage: "MATCHMAKER_SKIP_EMAIL or dev without RESEND_API_KEY",
      payload: { taskId: task.id, proposalId: proposal.id, ...urls },
    });
    return { ok: true, skipped: true };
  }

  const resend = getResendClient();
  if (!resend) {
    await logEmailEvent({
      userId: candidate.id,
      emailType: "task_match_offer",
      recipient: to,
      subject,
      status: "skipped",
      errorMessage: "RESEND_API_KEY not configured",
      payload: { taskId: task.id, proposalId: proposal.id },
    });
    return { ok: false, reason: "resend_not_configured" };
  }

  const orgLine = organizationDisplayName
    ? `<p>Organization: <b>${escapeHtml(organizationDisplayName)}</b></p>`
    : "";

  const reasonsHtml =
    reasons.length > 0
      ? `<ul>${reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
      : "";

  const html = `
    <p>Hi ${escapeHtml(candidate.firstName)},</p>
    <p>We think you may be a good fit for this volunteer task:</p>
    <p><b>${escapeHtml(task.title)}</b></p>
    <p>${escapeHtml(task.description).replace(/\n/g, "<br/>")}</p>
    ${orgLine}
    ${reasonsHtml ? `<p>Why you:</p>${reasonsHtml}` : ""}
    <p>
      <a href="${escapeHtml(urls.acceptPage)}">Accept this task</a>
      &nbsp;|&nbsp;
      <a href="${escapeHtml(urls.declinePage)}">Decline</a>
    </p>
    <p style="font-size:12px;color:#666">Or review: <a href="${escapeHtml(urls.offerPage)}">${escapeHtml(urls.offerPage)}</a></p>
    <p style="font-size:12px;color:#666">This offer expires ${proposal.expiresAt.toISOString().slice(0, 10)}.</p>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: getOutboundFromEmail(),
      to,
      subject,
      html,
    });
    if (error) {
      await logEmailEvent({
        userId: candidate.id,
        emailType: "task_match_offer",
        recipient: to,
        subject,
        status: "failed",
        errorMessage: error.message,
        payload: { taskId: task.id, proposalId: proposal.id },
      });
      return { ok: false, reason: error.message };
    }

    const resendId = data?.id ?? "unknown";
    const orgId = await resolveOrganizationIdForTask(task);
    if (orgId) {
      await appendCommunicationEvent({
        organizationId: orgId,
        traceId: `match-offer-${proposal.id}`,
        dedupeKey: `resend:match_offer:${resendId}`,
        direction: "outbound",
        channel: "email",
        threadKey: `match-offer:${proposal.id}`,
        taskId: task.id,
        actorExternalHandle: to,
        body: `Match offer: ${task.title}`,
        payload: { resendId, proposalId: proposal.id, ...urls },
      });
    }

    await logEmailEvent({
      userId: candidate.id,
      emailType: "task_match_offer",
      recipient: to,
      subject,
      status: "sent",
      payload: { taskId: task.id, proposalId: proposal.id, resendId },
    });
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message ?? "send_failed";
    await logEmailEvent({
      userId: candidate.id,
      emailType: "task_match_offer",
      recipient: to,
      subject,
      status: "failed",
      errorMessage: msg,
      payload: { taskId: task.id, proposalId: proposal.id },
    });
    return { ok: false, reason: msg };
  }
}
