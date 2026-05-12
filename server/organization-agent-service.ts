import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { organizationAgents, organizations } from "@shared/schema";
import { getDb } from "./db";

export type AgentStatus = "pending" | "active" | "degraded" | "disabled";

export async function getAgentByOrganizationId(organizationId: string) {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(organizationAgents)
    .where(eq(organizationAgents.organizationId, organizationId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAgentById(id: string) {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select().from(organizationAgents).where(eq(organizationAgents.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listAllAgents() {
  const db = getDb();
  if (!db) return [];
  return db.select().from(organizationAgents);
}

export async function createOrganizationAgent(input: {
  organizationId: string;
  runtimeKind: string;
  baseUrl: string;
  capabilityManifest?: string[];
  managedBy?: "byo" | "sail_managed";
  status?: AgentStatus;
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const org = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, input.organizationId))
    .limit(1);
  if (!org[0]) {
    const err = new Error("Organization not found");
    (err as { status?: number }).status = 404;
    throw err;
  }
  const signingSecret = nanoid(48);
  const [row] = await db
    .insert(organizationAgents)
    .values({
      organizationId: input.organizationId,
      runtimeKind: input.runtimeKind.slice(0, 32),
      baseUrl: input.baseUrl.trim(),
      signingSecret,
      capabilityManifest: input.capabilityManifest ?? [],
      managedBy: input.managedBy ?? "byo",
      status: input.status ?? "pending",
    })
    .returning();
  return row!;
}

export async function upsertOrganizationAgent(input: {
  organizationId: string;
  runtimeKind: string;
  baseUrl: string;
  capabilityManifest?: string[];
  managedBy?: "byo" | "sail_managed";
}) {
  const existing = await getAgentByOrganizationId(input.organizationId);
  if (existing) {
    const db = getDb();
    if (!db) throw new Error("Database is not configured");
    const [row] = await db
      .update(organizationAgents)
      .set({
        runtimeKind: input.runtimeKind.slice(0, 32),
        baseUrl: input.baseUrl.trim(),
        capabilityManifest: input.capabilityManifest ?? existing.capabilityManifest,
        managedBy: input.managedBy ?? existing.managedBy,
        updatedAt: new Date(),
      })
      .where(eq(organizationAgents.id, existing.id))
      .returning();
    return { agent: row!, signingSecret: null as string | null };
  }
  const agent = await createOrganizationAgent(input);
  return { agent, signingSecret: agent.signingSecret };
}

export async function updateAgentStatus(id: string, status: AgentStatus) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const [row] = await db
    .update(organizationAgents)
    .set({ status, updatedAt: new Date() })
    .where(eq(organizationAgents.id, id))
    .returning();
  return row ?? null;
}

export async function rotateSigningSecret(organizationId: string) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const signingSecret = nanoid(48);
  const [row] = await db
    .update(organizationAgents)
    .set({ signingSecret, updatedAt: new Date() })
    .where(eq(organizationAgents.organizationId, organizationId))
    .returning();
  if (!row) {
    const err = new Error("Agent registration not found");
    (err as { status?: number }).status = 404;
    throw err;
  }
  return row;
}

export async function touchHeartbeat(organizationId: string) {
  const db = getDb();
  if (!db) return;
  await db
    .update(organizationAgents)
    .set({
      lastHeartbeatAt: new Date(),
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(organizationAgents.organizationId, organizationId));
}

export function maskSigningSecret(secret: string): string {
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}
