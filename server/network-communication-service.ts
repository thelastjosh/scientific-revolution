import { and, desc, eq } from "drizzle-orm";
import { communicationEvents, networkTasks } from "@shared/schema";
import { getDb } from "./db";

export async function appendCommunicationEvent(input: {
  organizationId: string;
  traceId: string;
  dedupeKey: string;
  direction: "inbound" | "outbound";
  channel: string;
  threadKey: string;
  taskId?: string | null;
  actorExternalHandle?: string | null;
  body: string;
  payload?: Record<string, unknown>;
  occurredAt?: Date;
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const occurredAt = input.occurredAt ?? new Date();
  try {
    const [row] = await db
      .insert(communicationEvents)
      .values({
        organizationId: input.organizationId,
        traceId: input.traceId,
        dedupeKey: input.dedupeKey,
        direction: input.direction,
        channel: input.channel.slice(0, 32),
        threadKey: input.threadKey,
        taskId: input.taskId ?? null,
        actorExternalHandle: input.actorExternalHandle ?? null,
        body: input.body,
        payload: input.payload ?? {},
        occurredAt,
      })
      .returning();
    return { event: row!, duplicate: false as const };
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "23505") {
      const existing = await db
        .select()
        .from(communicationEvents)
        .where(eq(communicationEvents.dedupeKey, input.dedupeKey))
        .limit(1);
      if (existing[0]) return { event: existing[0], duplicate: true as const };
    }
    throw e;
  }
}

export async function listCommunicationEventsForOrg(organizationId: string, limit = 100) {
  const db = getDb();
  if (!db) return [];
  return db
    .select()
    .from(communicationEvents)
    .where(eq(communicationEvents.organizationId, organizationId))
    .orderBy(desc(communicationEvents.occurredAt))
    .limit(limit);
}

export async function syncTaskExternalRefs(input: {
  organizationId: string;
  taskId: string;
  externalRefs?: { system: string; id: string }[];
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db
    .select()
    .from(networkTasks)
    .where(
      and(eq(networkTasks.id, input.taskId), eq(networkTasks.organizationId, input.organizationId)),
    )
    .limit(1);
  const task = rows[0];
  if (!task) {
    const err = new Error("Task not found for organization");
    (err as { status?: number }).status = 404;
    throw err;
  }
  if (input.externalRefs && input.externalRefs.length > 0) {
    const merged = [...(task.externalRefs ?? []), ...input.externalRefs];
    const seen = new Set<string>();
    const deduped = merged.filter((r) => {
      const k = `${r.system}:${r.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    await db
      .update(networkTasks)
      .set({ externalRefs: deduped, updatedAt: new Date() })
      .where(eq(networkTasks.id, input.taskId));
  }
  return { ok: true as const, taskId: input.taskId };
}
