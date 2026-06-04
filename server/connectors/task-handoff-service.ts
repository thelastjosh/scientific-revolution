import { eq } from "drizzle-orm";
import type { ConnectorId } from "@shared/connectors/types";
import { networkTasks } from "@shared/schema";
import { appendCommunicationEvent } from "../network-communication-service";
import { getCommTemplatesForOrg } from "../network-templates-service";
import { getDb } from "../db";
import {
  resolveOrganizationIdForTask,
  taskHandoffAlreadySent,
} from "../task-organization";
import { findUserConnector } from "./connector-service";
import { getAdapter, listSendCapableConnectorIds } from "./registry";

function handoffHistoryKind(provider: ConnectorId): string {
  return `handoff_${provider}_sent`;
}

export async function sendConnectorHandoffsIfNeeded(input: {
  task: typeof networkTasks.$inferSelect;
  previousStatus: string;
}): Promise<void> {
  const { task, previousStatus } = input;
  if (task.status !== "open") return;
  if (previousStatus === "open") return;

  const orgId = await resolveOrganizationIdForTask(task);
  const templates = orgId ? await getCommTemplatesForOrg(orgId) : null;

  for (const provider of listSendCapableConnectorIds()) {
    if (taskHandoffAlreadySent(task, provider)) continue;

    const conn = await findUserConnector(task.ownerUserId, provider);
    if (!conn) continue;

    const adapter = getAdapter(provider);
    if (!adapter || !adapter.isPlatformConfigured()) continue;

    if (!orgId || !templates) continue;

    const text = adapter.formatHandoffMessage(task, templates);
    const sent = await conn.adapter.sendText({ address: conn.address, text });
    if (!sent.ok) continue;

    const traceId = `handoff-${task.id}-${provider}-${Date.now()}`;
    await appendCommunicationEvent({
      organizationId: orgId,
      traceId,
      dedupeKey: `${provider}:handoff:${sent.externalId}`,
      direction: "outbound",
      channel: provider,
      threadKey: `${provider}:${conn.address}:${sent.externalId}`,
      taskId: task.id,
      actorExternalHandle: conn.address,
      body: `Handoff: ${task.title}`,
      payload: { externalId: sent.externalId, provider },
    });

    const db = getDb();
    if (db) {
      const refs = [
        ...(task.externalRefs ?? []),
        { system: provider, id: `handoff:${sent.externalId}` },
      ];
      const hist = [
        ...(task.history ?? []),
        {
          kind: handoffHistoryKind(provider),
          at: new Date().toISOString(),
          to: conn.address,
          externalId: sent.externalId,
        },
      ];
      await db
        .update(networkTasks)
        .set({
          externalRefs: refs,
          history: hist,
          updatedAt: new Date(),
        })
        .where(eq(networkTasks.id, task.id));
      task.externalRefs = refs;
      task.history = hist;
    }
  }
}
