import { and, desc, eq } from "drizzle-orm";
import { networkSensitiveApprovals } from "@shared/schema";
import { getDb } from "./db";

export async function createApprovalRequest(input: {
  organizationId: string;
  traceId: string;
  requestKind: string;
  payload?: Record<string, unknown>;
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const [row] = await db
    .insert(networkSensitiveApprovals)
    .values({
      organizationId: input.organizationId,
      traceId: input.traceId,
      requestKind: input.requestKind,
      payload: input.payload ?? {},
    })
    .returning();
  return row!;
}

export async function listPendingApprovals(organizationId?: string) {
  const db = getDb();
  if (!db) return [];
  if (organizationId) {
    return db
      .select()
      .from(networkSensitiveApprovals)
      .where(
        and(
          eq(networkSensitiveApprovals.organizationId, organizationId),
          eq(networkSensitiveApprovals.status, "pending"),
        ),
      )
      .orderBy(desc(networkSensitiveApprovals.createdAt));
  }
  return db
    .select()
    .from(networkSensitiveApprovals)
    .where(eq(networkSensitiveApprovals.status, "pending"))
    .orderBy(desc(networkSensitiveApprovals.createdAt));
}

export async function resolveApproval(input: {
  id: string;
  actorUserId: string;
  status: "approved" | "rejected";
  resolutionNote?: string | null;
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const [row] = await db
    .update(networkSensitiveApprovals)
    .set({
      status: input.status,
      resolutionNote: input.resolutionNote ?? null,
      resolvedByUserId: input.actorUserId,
      resolvedAt: new Date(),
    })
    .where(and(eq(networkSensitiveApprovals.id, input.id), eq(networkSensitiveApprovals.status, "pending")))
    .returning();
  if (!row) {
    const err = new Error("Approval not found or already resolved");
    (err as { status?: number }).status = 404;
    throw err;
  }
  return row;
}
