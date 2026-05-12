/**
 * Outbound Resend `from` for all app mail (onboarding, task handoff, admin test).
 * Fixed for now; reintroduce `EMAIL_FROM` override here when you need per-env senders.
 */
export const DEFAULT_EMAIL_FROM = "support@sourceful.org";

export function getOutboundFromEmail(): string {
  return DEFAULT_EMAIL_FROM;
}
