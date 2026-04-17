/**
 * Home chat copy — shared by API bootstrap, client, and onboarding blocks.
 */

/** First assistant line on the home entry chat. */
export const HOME_OPENING_MESSAGE = "How can you help?";

/** Example prompt; when sent, the client shows the prepared SR onboarding block (no LLM). */
export const HELP_ME_ONBOARD_PROMPT = "Help me onboard";

function salutationLine(firstName: string): string {
  const hour = new Date().getUTCHours();
  if (hour >= 5 && hour < 12) return `Good morning, ${firstName}.`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${firstName}.`;
  if (hour >= 17 && hour < 22) return `Good evening, ${firstName}.`;
  return `Hi there, ${firstName}.`;
}

/** Single-line greeting for rich UI, or null if anonymous. */
export function onboardingGreetingLine(
  firstName: string | null | undefined,
): string | null {
  const n = firstName?.trim();
  if (!n) return null;
  return salutationLine(n);
}

/** Plain-text body (no UI chrome) — kept in sync with OnboardingIntro layout. */
export const ONBOARDING_OPENING_BODY = `SR has three typical ways of onboarding:

Upload a CV — use the upload control in the chat.
Use an invite code or link — paste it into the invite field in the chat.
Interview — just continue the chat.`;

export function formatOnboardingOpeningMessage(
  firstName: string | null | undefined,
): string {
  const greeting = onboardingGreetingLine(firstName);
  if (greeting) {
    return `${greeting}\n\n${ONBOARDING_OPENING_BODY}`;
  }
  return ONBOARDING_OPENING_BODY;
}
