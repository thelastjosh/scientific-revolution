import type { ConnectorCatalogEntry, ConnectorId } from "@shared/connectors/types";
import { telegramAdapter } from "./adapters/telegram-adapter";
import type { ConnectorAdapter } from "./types";

const PHONE_CATALOG: ConnectorCatalogEntry = {
  id: "phone",
  label: "Phone (SMS)",
  description: "Send task updates via SMS when a phone bridge is configured.",
  capabilities: {
    outboundSend: false,
    taskHandoff: false,
    adminTest: false,
    userTest: false,
  },
  status: "coming_soon",
  setupHint: "Phone messaging will use your verified mobile number. Coming soon.",
};

const SIGNAL_CATALOG: ConnectorCatalogEntry = {
  id: "signal",
  label: "Signal",
  description: "Send task updates via Signal when a bridge is configured.",
  capabilities: {
    outboundSend: false,
    taskHandoff: false,
    adminTest: false,
    userTest: false,
  },
  status: "coming_soon",
  setupHint: "Signal integration requires a linked device or bridge. Coming soon.",
};

const TELEGRAM_CATALOG: ConnectorCatalogEntry = {
  id: "telegram",
  label: "Telegram",
  description: "Receive task handoffs and test messages in Telegram.",
  capabilities: {
    outboundSend: true,
    taskHandoff: true,
    adminTest: true,
    userTest: true,
  },
  status: "available",
  setupHint:
    "Message your organization's Sail bot once in Telegram, then paste your numeric chat ID here (from @userinfobot or Bot API getUpdates).",
};

type RegistryEntry = {
  catalog: ConnectorCatalogEntry;
  adapter: ConnectorAdapter | null;
};

const REGISTRY: Record<ConnectorId, RegistryEntry> = {
  telegram: { catalog: TELEGRAM_CATALOG, adapter: telegramAdapter },
  phone: { catalog: PHONE_CATALOG, adapter: null },
  signal: { catalog: SIGNAL_CATALOG, adapter: null },
};

export function listCatalog(): ConnectorCatalogEntry[] {
  return Object.values(REGISTRY).map((e) => e.catalog);
}

export function getCatalogEntry(id: ConnectorId): ConnectorCatalogEntry {
  return REGISTRY[id].catalog;
}

export function getAdapter(id: ConnectorId): ConnectorAdapter | null {
  return REGISTRY[id].adapter;
}

/** Connectors that can send outbound messages today. */
export function listSendCapableConnectorIds(): ConnectorId[] {
  return (Object.keys(REGISTRY) as ConnectorId[]).filter((id) => {
    const entry = REGISTRY[id];
    return entry.catalog.status === "available" && entry.adapter != null && entry.catalog.capabilities.outboundSend;
  });
}

export function isConnectorAvailableForSetup(id: ConnectorId): boolean {
  return REGISTRY[id].catalog.status === "available" && REGISTRY[id].adapter != null;
}
