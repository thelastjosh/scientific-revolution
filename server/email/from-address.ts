import { getAgentMailInboxId } from "./agentmail-client";
import { getEmailProvider } from "./email-provider";

/** Legacy Resend sender when EMAIL_PROVIDER=resend. */
export const DEFAULT_EMAIL_FROM = "support@sourceful.org";

/**
 * Outbound From for logging / Reply-To domain resolution.
 * AgentMail sends from AGENTMAIL_INBOX_ID; Resend uses EMAIL_FROM or DEFAULT_EMAIL_FROM.
 */
export function getOutboundFromEmail(): string {
  if (getEmailProvider() === "agentmail") {
    return getAgentMailInboxId() ?? DEFAULT_EMAIL_FROM;
  }
  const fromEnv = process.env.EMAIL_FROM?.trim();
  return fromEnv || DEFAULT_EMAIL_FROM;
}
