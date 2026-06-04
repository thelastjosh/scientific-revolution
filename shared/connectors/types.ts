/** Connector providers stored in `channel_credentials.provider`. */
export const CONNECTOR_IDS = ["telegram", "phone", "signal"] as const;
export type ConnectorId = (typeof CONNECTOR_IDS)[number];

export function isConnectorId(s: string): s is ConnectorId {
  return (CONNECTOR_IDS as readonly string[]).includes(s);
}

export type ConnectorCatalogStatus = "available" | "coming_soon";

export type ConnectorCapabilities = {
  outboundSend: boolean;
  taskHandoff: boolean;
  adminTest: boolean;
  userTest: boolean;
};

export type ConnectorCatalogEntry = {
  id: ConnectorId;
  label: string;
  description: string;
  capabilities: ConnectorCapabilities;
  status: ConnectorCatalogStatus;
  setupHint: string;
};

export type TelegramCredentialPayload = {
  chatId: string;
};

export type ConnectorCredentialPayload = TelegramCredentialPayload;

export type UserConnectorDto = {
  id: string;
  provider: ConnectorId;
  accountLabel: string;
  status: string;
  credentialRefPreview: string;
  createdAt: string;
  updatedAt: string;
};

export type SendResult =
  | { ok: true; externalId: string }
  | { ok: false; reason: string };
