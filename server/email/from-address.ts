/**
 * Outbound `from` for Resend sends (onboarding, task handoff, admin test).
 * AgentMail sends from AGENTMAIL_INBOX_ID instead; this address is still used for Reply-To domain resolution.
 */
export const DEFAULT_EMAIL_FROM = "support@sourceful.org";

export function getOutboundFromEmail(): string {
  return DEFAULT_EMAIL_FROM;
}
