import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicModel, toAnthropicMessages } from "./onboarding-chat";
import { assembleWorkspaceSystemPrompt } from "./prompts/workspace";

const MAX_HISTORY_TURNS = 48;

type ChatTurn = { role: "user" | "assistant"; content: string };

export async function completeWorkspaceReply(
  messages: ChatTurn[],
  context: {
    userName: string;
    activeIntent?: string | null;
    taskTitles: string[];
  },
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error("ANTHROPIC_API_KEY is not configured");
    (err as { status?: number }).status = 503;
    throw err;
  }

  const recent = messages.slice(-MAX_HISTORY_TURNS);
  const anthropicMessages = toAnthropicMessages(recent);
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
    max_tokens: 800,
    system: assembleWorkspaceSystemPrompt(context),
    messages: anthropicMessages,
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in model response");
  }
  return textBlock.text.trim();
}
