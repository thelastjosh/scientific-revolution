import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { organizationMembers } from "@shared/schema";
import {
  appendEventBodySchema,
  approvalRequestBodySchema,
  heartbeatBodySchema,
  taskSyncBodySchema,
} from "./network-agent/contract";
import { verifyNetworkSignature } from "./network-agent/hmac";
import {
  appendCommunicationEvent,
  listCommunicationEventsForOrg,
  syncTaskExternalRefs,
} from "./network-communication-service";
import {
  createApprovalRequest,
  listPendingApprovals,
  resolveApproval,
} from "./network-approval-service";
import { getCommTemplatesForOrg } from "./network-templates-service";
import {
  createOrganizationAgent,
  getAgentByOrganizationId,
  listAllAgents,
  maskSigningSecret,
  rotateSigningSecret,
  touchHeartbeat,
  updateAgentStatus,
  upsertOrganizationAgent,
} from "./organization-agent-service";
import { pingOrgAgent } from "./network-dispatch-service";
import { getDb } from "./db";
import { isAdminUser } from "./admin-access";
import { storage } from "./storage";

function rawBodyUtf8(req: Request): string {
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (raw && Buffer.isBuffer(raw)) return raw.toString("utf8");
  return JSON.stringify(req.body ?? {});
}

async function verifyAgentForOrganization(req: Request, organizationId: string) {
  const agent = await getAgentByOrganizationId(organizationId);
  if (!agent || agent.status === "disabled") return null;
  const ts = req.get("x-sail-timestamp") ?? "";
  const sig = req.get("x-sail-signature") ?? "";
  if (!verifyNetworkSignature(agent.signingSecret, ts, rawBodyUtf8(req), sig)) return null;
  return agent;
}

async function assertAdminSession(req: Request): Promise<void> {
  if (!req.userId) {
    const err = new Error("Sign in required");
    (err as { status?: number }).status = 401;
    throw err;
  }
  const user = await storage.getUser(req.userId);
  if (!user || !isAdminUser(user)) {
    const err = new Error("Admin role required");
    (err as { status?: number }).status = 403;
    throw err;
  }
}

async function assertOrgMember(req: Request, organizationId: string): Promise<void> {
  if (!req.userId) {
    const err = new Error("Sign in required");
    (err as { status?: number }).status = 401;
    throw err;
  }
  const db = getDb();
  if (!db) {
    const err = new Error("Database is not configured");
    (err as { status?: number }).status = 503;
    throw err;
  }
  const rows = await db
    .select({ one: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, req.userId),
      ),
    )
    .limit(1);
  if (!rows[0]) {
    const err = new Error("Not a member of this organization");
    (err as { status?: number }).status = 403;
    throw err;
  }
}

const adminCreateAgentSchema = z.object({
  organizationId: z.string().min(1).max(64),
  runtimeKind: z.string().min(1).max(32),
  baseUrl: z.string().url().max(2000),
  capabilityManifest: z.array(z.string().max(64)).max(32).optional(),
  managedBy: z.enum(["byo", "sail_managed"]).optional(),
  activate: z.boolean().optional(),
});

const orgRegisterSchema = z.object({
  runtimeKind: z.string().min(1).max(32),
  baseUrl: z.string().url().max(2000),
  capabilityManifest: z.array(z.string().max(64)).max(32).optional(),
  managedBy: z.enum(["byo", "sail_managed"]).optional(),
});

export function registerNetworkRoutes(app: Express): void {
  app.post("/internal/network/append-event", async (req: Request, res: Response) => {
    const parsed = appendEventBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const body = parsed.data;
    const agent = await verifyAgentForOrganization(req, body.organizationId);
    if (!agent) {
      return res.status(401).json({ message: "Invalid or missing agent signature" });
    }
    try {
      const out = await appendCommunicationEvent({
        organizationId: body.organizationId,
        traceId: body.traceId,
        dedupeKey: body.dedupeKey,
        direction: body.direction,
        channel: body.channel,
        threadKey: body.threadKey,
        taskId: body.taskId ?? null,
        actorExternalHandle: body.actorExternalHandle ?? null,
        body: body.body,
        payload: body.payload,
        occurredAt: body.occurredAtIso ? new Date(body.occurredAtIso) : undefined,
      });
      return res.status(out.duplicate ? 200 : 201).json({
        id: out.event.id,
        duplicate: out.duplicate,
      });
    } catch (e) {
      console.error("[internal/network/append-event]", e);
      return res.status(500).json({ message: "Failed to append event" });
    }
  });

  app.post("/internal/network/task-sync", async (req: Request, res: Response) => {
    const parsed = taskSyncBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const body = parsed.data;
    const agent = await verifyAgentForOrganization(req, body.organizationId);
    if (!agent) {
      return res.status(401).json({ message: "Invalid or missing agent signature" });
    }
    try {
      const out = await syncTaskExternalRefs({
        organizationId: body.organizationId,
        taskId: body.taskId,
        externalRefs: body.externalRefs,
      });
      return res.json(out);
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      return res.status(status).json({ message: (e as Error).message });
    }
  });

  app.post("/internal/network/heartbeat", async (req: Request, res: Response) => {
    const parsed = heartbeatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const body = parsed.data;
    const agent = await verifyAgentForOrganization(req, body.organizationId);
    if (!agent) {
      return res.status(401).json({ message: "Invalid or missing agent signature" });
    }
    await touchHeartbeat(body.organizationId);
    return res.json({ ok: true });
  });

  app.get("/internal/network/templates", async (req: Request, res: Response) => {
    const organizationId =
      typeof req.query.organizationId === "string" ? req.query.organizationId : "";
    if (!organizationId) {
      return res.status(400).json({ message: "organizationId query required" });
    }
    const ts = req.get("x-sail-timestamp") ?? "";
    const sig = req.get("x-sail-signature") ?? "";
    const agent = await getAgentByOrganizationId(organizationId);
    if (!agent || agent.status === "disabled") {
      return res.status(401).json({ message: "Unknown organization agent" });
    }
    const canonical = `${ts}.${organizationId}`;
    if (!verifyNetworkSignature(agent.signingSecret, ts, canonical, sig)) {
      return res.status(401).json({ message: "Invalid or missing agent signature" });
    }
    const templates = await getCommTemplatesForOrg(organizationId);
    return res.json(templates);
  });

  app.post("/internal/network/approval-requests", async (req: Request, res: Response) => {
    const parsed = approvalRequestBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const body = parsed.data;
    const agent = await verifyAgentForOrganization(req, body.organizationId);
    if (!agent) {
      return res.status(401).json({ message: "Invalid or missing agent signature" });
    }
    try {
      const row = await createApprovalRequest({
        organizationId: body.organizationId,
        traceId: body.traceId,
        requestKind: body.requestKind,
        payload: body.payload,
      });
      return res.status(201).json({ id: row.id, status: row.status });
    } catch (e) {
      console.error("[internal/network/approval-requests]", e);
      return res.status(500).json({ message: "Failed to record approval request" });
    }
  });

  app.get("/api/admin/network/agents", async (req: Request, res: Response) => {
    try {
      await assertAdminSession(req);
      const rows = await listAllAgents();
      res.json({
        agents: rows.map((a) => ({
          id: a.id,
          organizationId: a.organizationId,
          runtimeKind: a.runtimeKind,
          baseUrl: a.baseUrl,
          status: a.status,
          managedBy: a.managedBy,
          networkApiLevel: a.networkApiLevel,
          capabilityManifest: a.capabilityManifest,
          lastHeartbeatAt: a.lastHeartbeatAt?.toISOString() ?? null,
          signingSecretPreview: maskSigningSecret(a.signingSecret),
          createdAt: a.createdAt.toISOString(),
        })),
      });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      res.status(status).json({ message: (e as Error).message });
    }
  });

  app.post("/api/admin/network/agents", async (req: Request, res: Response) => {
    try {
      await assertAdminSession(req);
      const parsed = adminCreateAgentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.flatten() });
      }
      const row = await createOrganizationAgent({
        organizationId: parsed.data.organizationId,
        runtimeKind: parsed.data.runtimeKind,
        baseUrl: parsed.data.baseUrl,
        capabilityManifest: parsed.data.capabilityManifest,
        managedBy: parsed.data.managedBy,
        status: parsed.data.activate ? "active" : "pending",
      });
      return res.status(201).json({
        agent: {
          id: row.id,
          organizationId: row.organizationId,
          runtimeKind: row.runtimeKind,
          baseUrl: row.baseUrl,
          status: row.status,
          signingSecret: row.signingSecret,
        },
      });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      res.status(status).json({ message: (e as Error).message });
    }
  });

  app.post("/api/admin/network/agents/:organizationId/rotate-secret", async (req: Request, res: Response) => {
    try {
      await assertAdminSession(req);
      const row = await rotateSigningSecret(req.params.organizationId);
      return res.json({
        organizationId: row.organizationId,
        signingSecret: row.signingSecret,
      });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      res.status(status).json({ message: (e as Error).message });
    }
  });

  app.post("/api/admin/network/agents/:organizationId/ping", async (req: Request, res: Response) => {
    try {
      await assertAdminSession(req);
      const result = await pingOrgAgent(req.params.organizationId);
      return res.json(result);
    } catch (e: unknown) {
      res.status(500).json({ message: (e as Error).message });
    }
  });

  app.patch("/api/admin/network/agents/:id/status", async (req: Request, res: Response) => {
    try {
      await assertAdminSession(req);
      const statusSchema = z.object({ status: z.enum(["pending", "active", "degraded", "disabled"]) });
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
      const row = await updateAgentStatus(req.params.id, parsed.data.status);
      if (!row) return res.status(404).json({ message: "Agent not found" });
      return res.json({ agent: { id: row.id, status: row.status } });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      res.status(status).json({ message: (e as Error).message });
    }
  });

  app.get("/api/admin/network/approvals", async (req: Request, res: Response) => {
    try {
      await assertAdminSession(req);
      const org =
        typeof req.query.organizationId === "string" ? req.query.organizationId : undefined;
      const rows = await listPendingApprovals(org);
      res.json({ approvals: rows });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      res.status(status).json({ message: (e as Error).message });
    }
  });

  app.post("/api/admin/network/approvals/:id/resolve", async (req: Request, res: Response) => {
    try {
      await assertAdminSession(req);
      if (!req.userId) return res.status(401).json({ message: "Sign in required" });
      const bodySchema = z.object({
        status: z.enum(["approved", "rejected"]),
        resolutionNote: z.string().max(2000).nullable().optional(),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
      const row = await resolveApproval({
        id: req.params.id,
        actorUserId: req.userId,
        status: parsed.data.status,
        resolutionNote: parsed.data.resolutionNote,
      });
      return res.json({ approval: row });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      res.status(status).json({ message: (e as Error).message });
    }
  });

  const adminTestAppendSchema = z.object({
    organizationId: z.string().min(1).max(64),
    traceId: z.string().min(1).max(64),
    dedupeKey: z.string().min(1).max(256),
    channel: z.string().min(1).max(32),
    threadKey: z.string().min(1).max(4000),
    direction: z.enum(["inbound", "outbound"]).default("inbound"),
    body: z.string().max(100_000).default(""),
    actorExternalHandle: z.string().max(512).nullable().optional(),
    taskId: z.string().max(32).nullable().optional(),
  });

  /** Dev / P1: append a canonical event without agent HMAC (e.g. simulate Telegram ingest). Admin only. */
  app.post("/api/admin/network/test-append-event", async (req: Request, res: Response) => {
    try {
      await assertAdminSession(req);
      const parsed = adminTestAppendSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
      const b = parsed.data;
      const out = await appendCommunicationEvent({
        organizationId: b.organizationId,
        traceId: b.traceId,
        dedupeKey: b.dedupeKey,
        direction: b.direction,
        channel: b.channel,
        threadKey: b.threadKey,
        taskId: b.taskId ?? null,
        actorExternalHandle: b.actorExternalHandle ?? null,
        body: b.body,
        payload: { source: "admin_test_append" },
      });
      return res.status(out.duplicate ? 200 : 201).json({
        id: out.event.id,
        duplicate: out.duplicate,
      });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      res.status(status).json({ message: (e as Error).message });
    }
  });

  app.get("/api/org/:organizationId/network-agent", async (req: Request, res: Response) => {
    try {
      await assertOrgMember(req, req.params.organizationId);
      const agent = await getAgentByOrganizationId(req.params.organizationId);
      if (!agent) {
        return res.json({ registered: false });
      }
      return res.json({
        registered: true,
        id: agent.id,
        runtimeKind: agent.runtimeKind,
        baseUrl: agent.baseUrl,
        status: agent.status,
        managedBy: agent.managedBy,
        networkApiLevel: agent.networkApiLevel,
        capabilityManifest: agent.capabilityManifest,
        lastHeartbeatAt: agent.lastHeartbeatAt?.toISOString() ?? null,
        signingSecretPreview: maskSigningSecret(agent.signingSecret),
      });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      res.status(status).json({ message: (e as Error).message });
    }
  });

  app.put("/api/org/:organizationId/network-agent", async (req: Request, res: Response) => {
    try {
      await assertOrgMember(req, req.params.organizationId);
      const parsed = orgRegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.flatten() });
      }
      const out = await upsertOrganizationAgent({
        organizationId: req.params.organizationId,
        runtimeKind: parsed.data.runtimeKind,
        baseUrl: parsed.data.baseUrl,
        capabilityManifest: parsed.data.capabilityManifest,
        managedBy: parsed.data.managedBy,
      });
      return res.json({
        agent: {
          id: out.agent.id,
          organizationId: out.agent.organizationId,
          runtimeKind: out.agent.runtimeKind,
          baseUrl: out.agent.baseUrl,
          status: out.agent.status,
          managedBy: out.agent.managedBy,
        },
        signingSecret: out.signingSecret,
        signingSecretNote:
          out.signingSecret === null
            ? "Unchanged. Use admin rotate-secret to issue a new secret."
            : "Store this secret with your agent; it is not shown again.",
      });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      res.status(status).json({ message: (e as Error).message });
    }
  });

  app.get("/api/org/:organizationId/network-events", async (req: Request, res: Response) => {
    try {
      await assertOrgMember(req, req.params.organizationId);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const events = await listCommunicationEventsForOrg(req.params.organizationId, limit);
      res.json({
        events: events.map((e) => ({
          id: e.id,
          traceId: e.traceId,
          dedupeKey: e.dedupeKey,
          direction: e.direction,
          channel: e.channel,
          threadKey: e.threadKey,
          taskId: e.taskId,
          actorExternalHandle: e.actorExternalHandle,
          body: e.body,
          payload: e.payload,
          occurredAt: e.occurredAt.toISOString(),
        })),
      });
    } catch (e: unknown) {
      const status = (e as { status?: number }).status ?? 500;
      res.status(status).json({ message: (e as Error).message });
    }
  });
}
