import { and, eq, or } from "drizzle-orm";
import { userEdges } from "@shared/schema";
import { getDb } from "./db";

export async function createUserEdge(
  sourceUserId: string,
  targetUserId: string,
  kind: string,
  label: string | null,
): Promise<{ id: string }> {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  if (sourceUserId === targetUserId) {
    const err = new Error("Cannot connect a user to themselves");
    (err as { status?: number }).status = 400;
    throw err;
  }
  const existing = await db
    .select({ id: userEdges.id })
    .from(userEdges)
    .where(
      and(
        eq(userEdges.sourceUserId, sourceUserId),
        eq(userEdges.targetUserId, targetUserId),
        eq(userEdges.kind, kind),
      ),
    )
    .limit(1);
  if (existing[0]) {
    return { id: existing[0].id };
  }
  const rows = await db
    .insert(userEdges)
    .values({
      sourceUserId,
      targetUserId,
      kind,
      label,
    })
    .returning({ id: userEdges.id });
  return { id: rows[0]!.id };
}

export async function listEdgesForUser(userId: string) {
  const db = getDb();
  if (!db) return [];
  return db
    .select()
    .from(userEdges)
    .where(
      or(eq(userEdges.sourceUserId, userId), eq(userEdges.targetUserId, userId)),
    );
}

export async function listAllEdges() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(userEdges);
}
