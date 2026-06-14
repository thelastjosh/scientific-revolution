import { getAgentMailClient, getAgentMailInboxId } from "./agentmail-client";
import { getEmailProvider, emailNotConfiguredReason, type EmailProviderId } from "./email-provider";
import { getOutboundFromEmail } from "./from-address";
import { getResendClient } from "./resend-client";

export type SendAppEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
  headers?: Record<string, string>;
};

export type SendAppEmailResult =
  | { ok: true; provider: EmailProviderId; messageId: string }
  | { ok: false; provider: EmailProviderId | null; reason: string };

function normalizeReplyTo(replyTo: string | string[] | undefined): string[] | undefined {
  if (!replyTo) return undefined;
  return Array.isArray(replyTo) ? replyTo : [replyTo];
}

async function sendViaResend(input: SendAppEmailInput): Promise<SendAppEmailResult> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: false, provider: "resend", reason: "RESEND_API_KEY not configured" };
  }

  const replyTo = normalizeReplyTo(input.replyTo);
  const { data, error } = await resend.emails.send({
    from: getOutboundFromEmail(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo,
    headers: input.headers,
  });

  if (error) {
    return { ok: false, provider: "resend", reason: error.message };
  }

  return { ok: true, provider: "resend", messageId: data?.id ?? "unknown" };
}

async function sendViaAgentMail(input: SendAppEmailInput): Promise<SendAppEmailResult> {
  const client = getAgentMailClient();
  const inboxId = getAgentMailInboxId();
  if (!client) {
    return { ok: false, provider: "agentmail", reason: "AGENTMAIL_API_KEY not configured" };
  }
  if (!inboxId) {
    return { ok: false, provider: "agentmail", reason: "AGENTMAIL_INBOX_ID not configured" };
  }

  try {
    const response = await client.inboxes.messages.send(inboxId, {
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? inboxId,
      headers: input.headers,
    });
    return { ok: true, provider: "agentmail", messageId: response.messageId };
  } catch (e) {
    const err = e as { body?: { message?: string }; message?: string };
    const reason = err.body?.message ?? err.message ?? "agentmail_send_failed";
    return { ok: false, provider: "agentmail", reason };
  }
}

export async function sendAppEmail(input: SendAppEmailInput): Promise<SendAppEmailResult> {
  const provider = getEmailProvider();
  if (!provider) {
    return { ok: false, provider: null, reason: emailNotConfiguredReason() };
  }
  if (provider === "agentmail") return sendViaAgentMail(input);
  return sendViaResend(input);
}
