import { and, eq } from "drizzle-orm";
import type { ConnectorId, UserConnectorDto } from "@shared/connectors/types";
import { isConnectorId } from "@shared/connectors/types";
import { adminEvents, channelCredentials } from "@shared/schema";
import { getDb } from "../db";
import { getAdapter, getCatalogEntry, isConnectorAvailableForSetup } from "./registry";

function rowToDto(row: typeof channelCredentials.$inferSelect): UserConnectorDto | null {
  if (!isConnectorId(row.provider)) return null;
  const adapter = getAdapter(row.provider);
  const payload = adapter?.parseCredentialRef(row.credentialRef) ?? null;
  const preview = payload && adapter ? adapter.maskCredentialPreview(payload) : "· (stored)";
  return {
    id: row.id,
    provider: row.provider,
    accountLabel: row.accountLabel,
    status: row.status,
    credentialRefPreview: preview,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listUserConnectors(userId: string): Promise<UserConnectorDto[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(channelCredentials)
    .where(eq(channelCredentials.userId, userId));
  return rows.map(rowToDto).filter((r): r is UserConnectorDto => r != null);
}

export async function findUserConnector(userId: string, provider: ConnectorId) {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(channelCredentials)
    .where(
      and(
        eq(channelCredentials.userId, userId),
        eq(channelCredentials.provider, provider),
        eq(channelCredentials.status, "active"),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const adapter = getAdapter(provider);
  if (!adapter) return null;
  const payload = adapter.parseCredentialRef(row.credentialRef);
  if (!payload) return null;
  const validated = adapter.validateSetup(
    provider === "telegram" ? { chatId: (payload as { chatId: string }).chatId } : payload,
  );
  if (!validated.ok) return null;
  return { row, adapter, address: validated.address, payload: validated.normalized };
}

export async function upsertUserConnector(input: {
  userId: string;
  provider: ConnectorId;
  accountLabel: string;
  credential: unknown;
}): Promise<{ ok: true; connector: UserConnectorDto } | { ok: false; message: string; status?: number }> {
  if (!isConnectorAvailableForSetup(input.provider)) {
    return { ok: false, message: "Connector is not available for setup", status: 400 };
  }
  const adapter = getAdapter(input.provider);
  if (!adapter) return { ok: false, message: "No adapter", status: 400 };

  const validated = adapter.validateSetup(input.credential);
  if (!validated.ok) return { ok: false, message: validated.message, status: 400 };

  const db = getDb();
  if (!db) return { ok: false, message: "database_not_configured", status: 503 };

  const credentialRef = JSON.stringify(validated.normalized);
  const label = input.accountLabel.trim() || getCatalogEntry(input.provider).label;
  const now = new Date();

  const existing = await db
    .select()
    .from(channelCredentials)
    .where(
      and(
        eq(channelCredentials.userId, input.userId),
        eq(channelCredentials.provider, input.provider),
      ),
    )
    .limit(1);

  let row: typeof channelCredentials.$inferSelect;
  if (existing[0]) {
    const updated = await db
      .update(channelCredentials)
      .set({
        accountLabel: label,
        credentialRef,
        status: "active",
        updatedAt: now,
      })
      .where(eq(channelCredentials.id, existing[0].id))
      .returning();
    row = updated[0]!;
  } else {
    const inserted = await db
      .insert(channelCredentials)
      .values({
        userId: input.userId,
        provider: input.provider,
        accountLabel: label,
        credentialRef,
        status: "active",
      })
      .returning();
    row = inserted[0]!;
  }

  const dto = rowToDto(row);
  if (!dto) return { ok: false, message: "invalid_row", status: 500 };
  return { ok: true, connector: dto };
}

export async function patchUserConnector(input: {
  userId: string;
  provider: ConnectorId;
  accountLabel?: string;
  status?: "active" | "disabled";
}): Promise<{ ok: true; connector: UserConnectorDto } | { ok: false; message: string; status?: number }> {
  const db = getDb();
  if (!db) return { ok: false, message: "database_not_configured", status: 503 };

  const existing = await db
    .select()
    .from(channelCredentials)
    .where(
      and(
        eq(channelCredentials.userId, input.userId),
        eq(channelCredentials.provider, input.provider),
      ),
    )
    .limit(1);
  if (!existing[0]) return { ok: false, message: "connector_not_found", status: 404 };

  const set: Partial<typeof channelCredentials.$inferInsert> = { updatedAt: new Date() };
  if (input.accountLabel !== undefined) set.accountLabel = input.accountLabel.trim();
  if (input.status !== undefined) set.status = input.status;

  const updated = await db
    .update(channelCredentials)
    .set(set)
    .where(eq(channelCredentials.id, existing[0].id))
    .returning();
  const dto = rowToDto(updated[0]!);
  if (!dto) return { ok: false, message: "invalid_row", status: 500 };
  return { ok: true, connector: dto };
}

export async function deleteUserConnector(
  userId: string,
  provider: ConnectorId,
): Promise<{ ok: true } | { ok: false; message: string; status?: number }> {
  const db = getDb();
  if (!db) return { ok: false, message: "database_not_configured", status: 503 };

  const deleted = await db
    .delete(channelCredentials)
    .where(
      and(
        eq(channelCredentials.userId, userId),
        eq(channelCredentials.provider, provider),
      ),
    )
    .returning({ id: channelCredentials.id });
  if (deleted.length === 0) return { ok: false, message: "connector_not_found", status: 404 };
  return { ok: true };
}

export type ConnectorSendResult =
  | { ok: true; detail?: string }
  | { ok: false; reason: string; status?: number };

export async function sendUserTest(
  userId: string,
  provider: ConnectorId,
): Promise<ConnectorSendResult> {
  const conn = await findUserConnector(userId, provider);
  if (!conn) return { ok: false, reason: "no_active_connector", status: 422 };
  if (!conn.adapter.isPlatformConfigured()) {
    return { ok: false, reason: `${provider}_not_configured`, status: 503 };
  }
  const text = conn.adapter.formatTestMessage();
  const sent = await conn.adapter.sendText({ address: conn.address, text });
  if (!sent.ok) return { ok: false, reason: sent.reason, status: 502 };
  return { ok: true, detail: sent.externalId };
}

export async function sendAdminTest(input: {
  targetUserId: string;
  actorUserId: string;
  provider: ConnectorId;
  body?: string;
}): Promise<ConnectorSendResult> {
  const conn = await findUserConnector(input.targetUserId, input.provider);
  if (!conn) return { ok: false, reason: "no_active_connector", status: 422 };
  if (!conn.adapter.isPlatformConfigured()) {
    return { ok: false, reason: `${input.provider}_not_configured`, status: 503 };
  }
  const text =
    input.body?.trim() ||
    `[Sail Admin test] ${conn.adapter.formatTestMessage()}`;
  const sent = await conn.adapter.sendText({ address: conn.address, text: text.slice(0, 4096) });
  if (!sent.ok) return { ok: false, reason: sent.reason, status: 502 };

  const db = getDb();
  if (db) {
    await db.insert(adminEvents).values({
      actorUserId: input.actorUserId,
      eventType: `admin_test_${input.provider}`,
      targetType: "user",
      targetId: input.targetUserId,
      payload: { externalId: sent.externalId },
    });
  }
  return { ok: true, detail: sent.externalId };
}
