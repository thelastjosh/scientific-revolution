import { emailEvents } from "@shared/schema";
import { getDb } from "../db";
import { getOutboundFromEmail } from "./from-address";
import { getResendClient } from "./resend-client";

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL?.trim() || "http://localhost:5000").replace(/\/+$/, "");
}

async function logEmailEvent(input: {
  userId?: string | null;
  inviteToken?: string | null;
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
      inviteToken: input.inviteToken ?? null,
      emailType: input.emailType,
      recipient: input.recipient,
      subject: input.subject,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      payload: input.payload ?? null,
    });
  } catch (e) {
    const err = e as { code?: string };
    if (err.code !== "42P01" && err.code !== "42703") {
      throw e;
    }
  }
}

export async function sendInviteEmail(input: {
  inviteToken: string;
  recipientEmail: string;
  inviterName: string;
  organizationName?: string | null;
  contextSummary?: string | null;
  creatorUserId?: string | null;
}) {
  const inviteUrl = `${appBaseUrl()}/?invite=${encodeURIComponent(input.inviteToken)}`;
  const subject = `${input.inviterName} invited you to Scientific Revolution`;
  const html = `
    <p>${input.inviterName} invited you to join Scientific Revolution.</p>
    ${input.organizationName ? `<p>Organization context: <b>${input.organizationName}</b></p>` : ""}
    ${input.contextSummary ? `<p>${input.contextSummary}</p>` : ""}
    <p><a href="${inviteUrl}">Accept invite</a></p>
  `;

  const resend = getResendClient();
  if (!resend) {
    await logEmailEvent({
      userId: input.creatorUserId ?? null,
      inviteToken: input.inviteToken,
      emailType: "invite",
      recipient: input.recipientEmail,
      subject,
      status: "skipped",
      errorMessage: "RESEND_API_KEY not configured",
      payload: { inviteUrl },
    });
    return { sent: false as const, reason: "RESEND_API_KEY not configured", inviteUrl };
  }

  try {
    await resend.emails.send({
      from: getOutboundFromEmail(),
      to: input.recipientEmail,
      subject,
      html,
    });
    await logEmailEvent({
      userId: input.creatorUserId ?? null,
      inviteToken: input.inviteToken,
      emailType: "invite",
      recipient: input.recipientEmail,
      subject,
      status: "sent",
      payload: { inviteUrl },
    });
    return { sent: true as const, inviteUrl };
  } catch (e) {
    const msg = (e as Error).message ?? "Unknown email error";
    await logEmailEvent({
      userId: input.creatorUserId ?? null,
      inviteToken: input.inviteToken,
      emailType: "invite",
      recipient: input.recipientEmail,
      subject,
      status: "failed",
      errorMessage: msg,
      payload: { inviteUrl },
    });
    return { sent: false as const, reason: msg, inviteUrl };
  }
}

export async function sendOnboardingFollowUpEmail(input: {
  userId: string;
  recipientEmail: string;
  recipientFirstName: string;
}) {
  const subject = "Your Scientific Revolution onboarding is set";
  const html = `<p>Hi ${input.recipientFirstName}, your workspace is ready.</p>`;
  const resend = getResendClient();
  if (!resend) {
    await logEmailEvent({
      userId: input.userId,
      emailType: "onboarding_followup",
      recipient: input.recipientEmail,
      subject,
      status: "skipped",
      errorMessage: "RESEND_API_KEY not configured",
    });
    return { sent: false as const, reason: "RESEND_API_KEY not configured" };
  }
  try {
    await resend.emails.send({
      from: getOutboundFromEmail(),
      to: input.recipientEmail,
      subject,
      html,
    });
    await logEmailEvent({
      userId: input.userId,
      emailType: "onboarding_followup",
      recipient: input.recipientEmail,
      subject,
      status: "sent",
    });
    return { sent: true as const };
  } catch (e) {
    const msg = (e as Error).message ?? "Unknown email error";
    await logEmailEvent({
      userId: input.userId,
      emailType: "onboarding_followup",
      recipient: input.recipientEmail,
      subject,
      status: "failed",
      errorMessage: msg,
    });
    return { sent: false as const, reason: msg };
  }
}

