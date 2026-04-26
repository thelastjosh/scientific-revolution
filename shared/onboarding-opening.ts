/**
 * Home chat copy — shared by API bootstrap, client, and onboarding blocks.
 */

/** A/B: hero line on the home entry (50/50 in bootstrap and entry preview). */
export const HOME_OPENING_MESSAGE_VARIANTS = [
  "How can you help?",
  "What can you do?",
] as const;

export type HomeOpeningMessageVariant = (typeof HOME_OPENING_MESSAGE_VARIANTS)[number];

/** @deprecated use HOME_OPENING_MESSAGE_VARIANTS / pickHomeOpeningMessage */
export const HOME_OPENING_MESSAGE: HomeOpeningMessageVariant = "How can you help?";

/** Random pick for anonymous entry (bootstrap + system prompt when client does not resend a line). */
export function pickHomeOpeningMessage(): HomeOpeningMessageVariant {
  return Math.random() < 0.5
    ? HOME_OPENING_MESSAGE_VARIANTS[0]
    : HOME_OPENING_MESSAGE_VARIANTS[1];
}

export function isHomeOpeningMessageVariant(s: string): s is HomeOpeningMessageVariant {
  return (HOME_OPENING_MESSAGE_VARIANTS as readonly string[]).includes(s);
}

/** Sent from profile preview “Edit” — chat agent replies with a short follow-up. */
export const USER_EDIT_PROFILE_MESSAGE = "I'd like to edit my profile";

const EDIT_PROFILE_AGENT_REPLY =
  "Tell me what edits you'd like to make and I'll update your profile.";

export function isUserEditProfileMessage(text: string): boolean {
  return text.trim().toLowerCase() === USER_EDIT_PROFILE_MESSAGE.toLowerCase();
}

export { EDIT_PROFILE_AGENT_REPLY };

/** Split a full display name into first / last for registration prefill. */
export function splitDisplayNameForRegister(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const t = displayName.replace(/\s+/g, " ").trim();
  if (!t) return { firstName: "", lastName: "" };
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t, lastName: "" };
  return { firstName: t.slice(0, i), lastName: t.slice(i + 1).trim() };
}

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
export const ONBOARDING_OPENING_BODY = `SR has several ways to onboard and enrich your profile:

Add a link (e.g. site or LinkedIn) — use the field in the onboarding block.
Upload a CV — use the upload control in the chat.
Use an invite code or link — paste it into the invite field in the chat.
Continue the interview in chat, or create an account when you're ready.`;

export function formatOnboardingOpeningMessage(
  firstName: string | null | undefined,
): string {
  const greeting = onboardingGreetingLine(firstName);
  if (greeting) {
    return `${greeting}\n\n${ONBOARDING_OPENING_BODY}`;
  }
  return ONBOARDING_OPENING_BODY;
}
