import type { ConnectorCatalogEntry, ConnectorId, UserConnectorDto } from "@shared/connectors/types";

export async function fetchConnectorCatalog(): Promise<ConnectorCatalogEntry[]> {
  const r = await fetch("/api/connectors/catalog", { credentials: "include" });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    catalog?: ConnectorCatalogEntry[];
  };
  if (!r.ok) throw new Error(data.message ?? `Catalog failed (${r.status})`);
  return data.catalog ?? [];
}

export async function fetchMyConnectors(): Promise<UserConnectorDto[]> {
  const r = await fetch("/api/connectors/mine", { credentials: "include" });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    connectors?: UserConnectorDto[];
  };
  if (!r.ok) throw new Error(data.message ?? `Connectors failed (${r.status})`);
  return data.connectors ?? [];
}

export async function upsertMyConnector(
  provider: ConnectorId,
  body: { accountLabel?: string; chatId?: string },
): Promise<UserConnectorDto> {
  const r = await fetch(`/api/connectors/mine/${encodeURIComponent(provider)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    connector?: UserConnectorDto;
  };
  if (!r.ok || !data.connector) {
    throw new Error(typeof data.message === "string" ? data.message : `Save failed (${r.status})`);
  }
  return data.connector;
}

export async function patchMyConnector(
  provider: ConnectorId,
  body: { accountLabel?: string; status?: "active" | "disabled" },
): Promise<UserConnectorDto> {
  const r = await fetch(`/api/connectors/mine/${encodeURIComponent(provider)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    connector?: UserConnectorDto;
  };
  if (!r.ok || !data.connector) {
    throw new Error(typeof data.message === "string" ? data.message : `Update failed (${r.status})`);
  }
  return data.connector;
}

export async function deleteMyConnector(provider: ConnectorId): Promise<void> {
  const r = await fetch(`/api/connectors/mine/${encodeURIComponent(provider)}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = (await r.json().catch(() => ({}))) as { message?: string };
  if (!r.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `Delete failed (${r.status})`);
  }
}

export async function testMyConnector(
  provider: ConnectorId,
): Promise<{ ok: true; detail?: string }> {
  const r = await fetch(`/api/connectors/mine/${encodeURIComponent(provider)}/test`, {
    method: "POST",
    credentials: "include",
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    ok?: boolean;
    detail?: string;
  };
  if (!r.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `Test failed (${r.status})`);
  }
  return { ok: true, detail: data.detail };
}
