import type { OnboardingInvite } from "@shared/schema";

/** Structured invite + research context injected into every onboarding system prompt. */
export function formatInviteContextBlock(invite: OnboardingInvite | null): string {
  if (!invite) {
    return [
      "No personalized invite token was used, or the token was not found.",
      "Treat this as a cold visitor with no pre-loaded profile.",
    ].join("\n");
  }

  return [
    "Invite record (from personalized link):",
    `- Email: ${invite.email ?? "(not provided)"}`,
    `- Inviter description / notes: ${invite.description ?? "(none)"}`,
    "",
    "Prior background / research summary (from network search or ops):",
    invite.researchSummary?.trim() || "(No research summary on file.)",
  ].join("\n");
}
