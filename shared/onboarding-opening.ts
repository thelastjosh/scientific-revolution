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

/** Example prompt; when sent, the client shows a cached SR explainer + interview MCQ (no LLM). */
export const WHAT_IS_SCIENTIFIC_REVOLUTION_PROMPT = "What is Scientific Revolution?";

export function isUserWhatIsScientificRevolutionMessage(text: string): boolean {
  return text.trim().toLowerCase() === WHAT_IS_SCIENTIFIC_REVOLUTION_PROMPT.toLowerCase();
}

/** Cached explainer body (plain text; rich UI adds buttons below). */
export const WHAT_IS_SR_REPLY_TEXT = [
  "Scientific Revolution is a matchmaking service for volunteer-driven work.",
  "",
  "Think: distributed teams working on problems that matter, without the overhead of managers or platforms.",
].join("\n");

/** Button in the SR explainer block; shows the cached origins story (no LLM). */
export const SR_KNOW_MORE_PROMPT = "I'd like to know more information about SR";

export function isUserSrKnowMoreMessage(text: string): boolean {
  return text.trim().toLowerCase() === SR_KNOW_MORE_PROMPT.toLowerCase();
}

/** Cached origins / partner context (shown after SR_KNOW_MORE_PROMPT). */
export const WHAT_IS_SR_ORIGINS_REPLY_TEXT = [
  "Scientific Revolution grew out of work Josh led at Public AI—a volunteer movement focused on spreading the benefits and mitigating the harms of AI through public-interest projects.",
  "",
  "Early pilots needed something lighter than another “platform”: a way to match people to mission-aligned work, keep context in one thread, and hand tasks off through email and messaging without a management layer on top.",
  "",
  "That pattern was tested with partners including UNICEF (volunteer coordination around program outreach and partner follow-up) and Metagov (governance and research communities that needed clear handoffs between contributors).",
  "",
  "Sail—the software behind Scientific Revolution—is the coordination layer those pilots pointed to: chat-first onboarding, a workspace for tasks drafted from real source material, and delivery through the channels people already use.",
].join("\n");

/** First interview step surfaced immediately after the SR explainer. */
export const INTERVIEW_ENTRY_MCQ = {
  question: "What best describes why you're here?",
  options: [
    {
      label: "Volunteer or mission-aligned work",
      value: "I'm here for volunteer or mission-aligned work.",
    },
    {
      label: "Research or technical contribution",
      value: "I'm here to contribute research or technical skills.",
    },
    {
      label: "Organizing or coordinating others",
      value: "I'm here to organize or coordinate work.",
    },
    {
      label: "Just exploring for now",
      value: "I'm exploring what Scientific Revolution can do.",
    },
  ],
} as const;

export function interviewEntryMcqUserTexts(): string[] {
  return INTERVIEW_ENTRY_MCQ.options.map((o) => o.value);
}

/** Plain-text reply for API cache / transcript when rich UI is unavailable. */
export function whatIsScientificRevolutionReplyPlain(): string {
  const optionLines = INTERVIEW_ENTRY_MCQ.options.map((o) => `- ${o.label}`).join("\n");
  return [
    WHAT_IS_SR_REPLY_TEXT,
    "",
    INTERVIEW_ENTRY_MCQ.question,
    optionLines,
  ].join("\n");
}

export function srKnowMoreReplyPlain(): string {
  return WHAT_IS_SR_ORIGINS_REPLY_TEXT;
}

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
export const ONBOARDING_OPENING_BODY = `You can onboard through a few ways:

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
