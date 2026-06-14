import { and, asc, eq } from "drizzle-orm";
import { networkTasks, organizationMembers } from "@shared/schema";
import { getDb } from "./db";

export async function assertUserOrganizationMember(userId: string, organizationId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db
    .select({ one: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)),
    )
    .limit(1);
  if (!rows[0]) {
    const err = new Error("Not a member of this organization");
    (err as { status?: number }).status = 403;
    throw err;
  }
}

export async function resolveOrganizationIdForTask(task: typeof networkTasks.$inferSelect): Promise<string | null> {
  if (task.organizationId) return task.organizationId;
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select({ organizationId: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, task.ownerUserId))
    .orderBy(asc(organizationMembers.createdAt))
    .limit(1);
  return rows[0]?.organizationId ?? null;
}

export type HandoffChannel = "email" | import("@shared/connectors/types").ConnectorId;

export function taskHandoffAlreadySent(
  task: typeof networkTasks.$inferSelect,
  channel: HandoffChannel,
): boolean {
  const history = task.history ?? [];
  if (channel === "email") {
    if (history.some((h) => h && typeof h === "object" && (h as { kind?: string }).kind === "handoff_email_sent")) {
      return true;
    }
    const refs = task.externalRefs ?? [];
    return refs.some(
      (r) => (r.system === "resend" || r.system === "agentmail") && r.id.startsWith("handoff:"),
    );
  }
  const kind = `handoff_${channel}_sent`;
  if (history.some((h) => h && typeof h === "object" && (h as { kind?: string }).kind === kind)) {
    return true;
  }
  const refs = task.externalRefs ?? [];
  return refs.some((r) => r.system === channel && r.id.startsWith("handoff:"));
}
