import { emailEvents } from "@shared/schema";
import { getDb } from "../db";
import { sendAppEmail } from "./send-app-email";

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
  const subject = `${input.inviterName} invited you to Sourceful`;
  const html = `
    <p>${input.inviterName} invited you to join Sourceful.</p>
    ${input.organizationName ? `<p>Organization context: <b>${input.organizationName}</b></p>` : ""}
    ${input.contextSummary ? `<p>${input.contextSummary}</p>` : ""}
    <p><a href="${inviteUrl}">Accept invite</a></p>
  `;

  const sendResult = await sendAppEmail({
    to: input.recipientEmail,
    subject,
    html,
  });
  if (!sendResult.ok) {
    await logEmailEvent({
      userId: input.creatorUserId ?? null,
      inviteToken: input.inviteToken,
      emailType: "invite",
      recipient: input.recipientEmail,
      subject,
      status: "skipped",
      errorMessage: sendResult.reason,
      payload: { inviteUrl },
    });
    return { sent: false as const, reason: sendResult.reason, inviteUrl };
  }

  try {
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
  const subject = "Your Sourceful onboarding is set";
  const html = `<p>Hi ${input.recipientFirstName}, your workspace is ready.</p>`;
  const sendResult = await sendAppEmail({
    to: input.recipientEmail,
    subject,
    html,
  });
  if (!sendResult.ok) {
    await logEmailEvent({
      userId: input.userId,
      emailType: "onboarding_followup",
      recipient: input.recipientEmail,
      subject,
      status: "skipped",
      errorMessage: sendResult.reason,
    });
    return { sent: false as const, reason: sendResult.reason };
  }
  try {
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

