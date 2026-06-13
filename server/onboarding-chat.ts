import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { OnboardingInvite } from "@shared/schema";
import {
  EDIT_PROFILE_AGENT_REPLY,
  isHomeOpeningMessageVariant,
  isUserEditProfileMessage,
  isUserSrKnowMoreMessage,
  isUserWhatIsScientificRevolutionMessage,
  srKnowMoreReplyPlain,
} from "@shared/onboarding-opening";
import { openingMessageFromInvite } from "./onboarding-invite-service";
import {
  assembleOnboardingSystemPrompt,
  resolveOnboardingPromptVariant,
} from "./prompts/onboarding";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Strip leading assistant-only content (deterministic opening) so Anthropic
 * messages start with a user turn as required.
 */
export function toAnthropicMessages(
  messages: ChatTurn[],
): MessageParam[] {
  let i = 0;
  while (i < messages.length && messages[i].role === "assistant") {
    i++;
  }
  const out: MessageParam[] = [];
  for (; i < messages.length; i++) {
    const m = messages[i];
    const content = m.content?.trim() ?? "";
    if (!content) continue;
    if (m.role === "user") {
      out.push({ role: "user", content });
    } else {
      out.push({ role: "assistant", content });
    }
  }
  return out;
}

export function hasUserMessage(messages: ChatTurn[]): boolean {
  return messages.some((m) => m.role === "user" && (m.content?.trim() ?? ""));
}

export async function completeOnboardingReply(
  invite: OnboardingInvite | null,
  messages: ChatTurn[],
  entryOpeningLine?: string | null,
): Promise<string> {
  if (!hasUserMessage(messages)) {
    const err = new Error("At least one user message is required");
    (err as { status?: number }).status = 400;
    throw err;
  }

  let lastUser: ChatTurn | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === "user" && (m.content?.trim() ?? "")) {
      lastUser = m;
      break;
    }
  }
  if (lastUser && isUserEditProfileMessage(lastUser.content)) {
    return EDIT_PROFILE_AGENT_REPLY;
  }
  if (lastUser && isUserWhatIsScientificRevolutionMessage(lastUser.content)) {
    return srKnowMoreReplyPlain();
  }
  if (lastUser && isUserSrKnowMoreMessage(lastUser.content)) {
    return srKnowMoreReplyPlain();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error("ANTHROPIC_API_KEY is not configured");
    (err as { status?: number }).status = 503;
    throw err;
  }

  const openingLine =
    entryOpeningLine && isHomeOpeningMessageVariant(entryOpeningLine)
      ? entryOpeningLine
      : openingMessageFromInvite(invite);
  const variant = resolveOnboardingPromptVariant();
  const system = assembleOnboardingSystemPrompt(invite, openingLine, variant);
  const anthropicMessages = toAnthropicMessages(messages);

  if (anthropicMessages.length === 0) {
    const err = new Error("No messages to send to the model");
    (err as { status?: number }).status = 400;
    throw err;
  }

  const last = anthropicMessages[anthropicMessages.length - 1];
  if (last.role !== "user") {
    const err = new Error("Last message must be from the user");
    (err as { status?: number }).status = 400;
    throw err;
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: getAnthropicModel(),
    max_tokens: 640,
    system,
    messages: anthropicMessages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in model response");
  }
  return textBlock.text.trim();
}
