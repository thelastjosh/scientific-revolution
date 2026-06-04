import type { ConnectorId, ConnectorCredentialPayload, SendResult } from "@shared/connectors/types";
import type { networkTasks } from "@shared/schema";
import type { getCommTemplatesForOrg } from "../network-templates-service";

export type CommTemplates = Awaited<ReturnType<typeof getCommTemplatesForOrg>>;

export type ConnectorAdapter = {
  id: ConnectorId;
  parseCredentialRef(raw: string): ConnectorCredentialPayload | null;
  validateSetup(payload: unknown):
    | { ok: true; normalized: ConnectorCredentialPayload; address: string }
    | { ok: false; message: string };
  isPlatformConfigured(): boolean;
  sendText(input: { address: string; text: string }): Promise<SendResult>;
  formatHandoffMessage(task: typeof networkTasks.$inferSelect, templates: CommTemplates): string;
  formatTestMessage(): string;
  maskCredentialPreview(payload: ConnectorCredentialPayload): string;
};
