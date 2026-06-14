import { AgentMailClient } from "agentmail";

let client: AgentMailClient | null = null;

export function getAgentMailClient(): AgentMailClient | null {
  const apiKey = process.env.AGENTMAIL_API_KEY?.trim();
  if (!apiKey) return null;
  if (!client) client = new AgentMailClient({ apiKey });
  return client;
}

export function getAgentMailInboxId(): string | null {
  const inboxId = process.env.AGENTMAIL_INBOX_ID?.trim();
  return inboxId || null;
}
