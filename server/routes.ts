import type { Express, Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { HOME_OPENING_MESSAGE_VARIANTS } from "@shared/onboarding-opening";
import {
  adminEvents,
  channelCredentials,
  networkTasks,
  postTaskSurveys,
  uiExperimentVariantSchema,
  userContextEntries,
  users,
} from "@shared/schema";
import { completeOnboardingReply } from "./onboarding-chat";
import {
  getInviteByToken,
  normalizeInviteToken,
  openingMessageFromInvite,
} from "./onboarding-invite-service";
import {
  listUiExperiments,
  updateUiExperiment,
} from "./ui-experiments-service";
import { registerAuthRoutes } from "./auth-routes";
import {
  getOnboardingContextForUser,
  upsertOnboardingContextForUser,
} from "./onboarding-context-service";
import { buildProfileFromPublicUrl } from "./onboarding-link-profile";
import { getDashboardBundle } from "./dashboard-service";
import { getDb } from "./db";
import { storage } from "./storage";
import {
  createTaskFromDraft,
  extractTasksFromRawDoc,
  graduateOnboardingToWorkspace,
  sendWorkspaceMessage,
} from "./workspace-chat-service";

const patchBodySchema = z.object({
  enabled: z.boolean().optional(),
  variant: uiExperimentVariantSchema.optional(),
});

const onboardingChatBodySchema = z.object({
  inviteToken: z.string().max(128).nullable().optional(),
  /** Matches hero A/B on home so the system prompt is aligned with what the user saw. */
  entryOpeningLine: z
    .enum([
      HOME_OPENING_MESSAGE_VARIANTS[0],
      HOME_OPENING_MESSAGE_VARIANTS[1],
    ])
    .optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
});

const onboardingContextBodySchema = z.object({
  persona: z.enum(["invite_link", "invite_no_link", "general"]),
  inviteToken: z.string().max(128).nullable(),
  inviteEmail: z.string().email().nullable(),
  onboardingStep: z.string().min(1).max(120),
  summary: z.string().max(5000).nullable(),
});

const profileFromLinkBodySchema = z.object({
  url: z.string().min(1).max(2000).url(),
});

const graduateBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .default([]),
  activeIntent: z.string().max(200).nullable().optional(),
});

const workspaceChatBodySchema = z.object({
  sessionId: z.string().min(1),
  content: z.string().min(1).max(6000),
});

const taskExtractSchema = z.object({
  rawSourceDoc: z.string().min(1).max(50000),
});

const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(10000),
  rawSourceDoc: z.string().max(50000).nullable().optional(),
  sourceSessionId: z.string().nullable().optional(),
});

const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(10000).optional(),
  status: z.enum(["draft", "open", "completed", "archived"]).optional(),
});

const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  bio: z.string().max(6000).nullable().optional(),
});

async function assertAdmin(req: Request): Promise<void> {
  if (!req.userId) {
    const err = new Error("Sign in required");
    (err as { status?: number }).status = 401;
    throw err;
  }
  const user = await storage.getUser(req.userId);
  if (!user) {
    const err = new Error("User not found");
    (err as { status?: number }).status = 401;
    throw err;
  }
  if (user.role !== "admin") {
    const err = new Error("Admin role required");
    (err as { status?: number }).status = 403;
    throw err;
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  registerAuthRoutes(app);

  app.get("/api/dashboard", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sign in required" });
    }
    if (!getDb()) {
      return res.status(503).json({
        message:
          "Database not configured. Set DATABASE_URL, run npm run db:migrate, then npm run db:seed.",
      });
    }
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const data = await getDashboardBundle(user);
      res.setHeader("Cache-Control", "private, no-store");
      res.json(data);
    } catch (e: unknown) {
      console.error("[api/dashboard]", e);
      res.status(500).json({ message: "Failed to load dashboard" });
    }
  });

  app.post("/api/onboarding/graduate", async (req: Request, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Sign in required" });
    const parsed = graduateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    try {
      const out = await graduateOnboardingToWorkspace({
        userId: req.userId,
        onboardingMessages: parsed.data.messages,
        activeIntent: parsed.data.activeIntent ?? null,
      });
      res.json(out);
    } catch (e: unknown) {
      console.error("[onboarding/graduate]", e);
      res.status(500).json({ message: "Failed to graduate chat session" });
    }
  });

  app.get("/api/onboarding/bootstrap", async (req: Request, res: Response) => {
    try {
      const raw =
        typeof req.query.invite === "string" ? req.query.invite : undefined;
      const token = normalizeInviteToken(raw);
      const invite = await getInviteByToken(token);
      // Must not cache: openingMessage is A/B random; cached responses always repeat one line.
      res.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate");
      res.json({
        openingMessage: openingMessageFromInvite(invite),
        inviteFirstName: invite?.firstName?.trim() ?? null,
        inviteProfile: invite
          ? {
              token: invite.token,
              firstName: invite.firstName ?? null,
              email: invite.email ?? null,
              description: invite.description ?? null,
              researchSummary: invite.researchSummary ?? null,
            }
          : null,
      });
    } catch (e: unknown) {
      console.error("[onboarding/bootstrap]", e);
      res.status(500).json({ message: "Failed to load onboarding" });
    }
  });

  app.post("/api/onboarding/profile-from-link", async (req: Request, res: Response) => {
    const parsed = profileFromLinkBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Valid url is required" });
    }
    try {
      const profile = await buildProfileFromPublicUrl(parsed.data.url);
      res.json({ profile });
    } catch (e: unknown) {
      const err = e as { message?: string };
      const msg = err.message ?? "Could not build profile from link";
      console.error("[onboarding/profile-from-link]", e);
      res.status(502).json({ message: msg });
    }
  });

  app.post("/api/onboarding/chat", async (req: Request, res: Response) => {
    const parsed = onboardingChatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    try {
      const token = normalizeInviteToken(parsed.data.inviteToken ?? null);
      const invite = await getInviteByToken(token);
      const message = await completeOnboardingReply(
        invite,
        parsed.data.messages,
        parsed.data.entryOpeningLine,
      );
      res.json({ message });
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      const status = err.status ?? 500;
      console.error("[onboarding/chat]", e);
      res.status(status).json({
        message: err.message ?? "Chat request failed",
      });
    }
  });

  app.get("/api/onboarding/context", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sign in required" });
    }
    const context = await getOnboardingContextForUser(req.userId);
    res.json({ context });
  });

  app.put("/api/onboarding/context", async (req: Request, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ message: "Sign in required" });
    }
    const parsed = onboardingContextBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const context = await upsertOnboardingContextForUser(req.userId, parsed.data);
    res.json({ context });
  });

  app.put("/api/profile/me", async (req: Request, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Sign in required" });
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const db = getDb();
    if (!db) return res.status(503).json({ message: "Database is not configured" });
    const rows = await db
      .update(users)
      .set({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        bio: parsed.data.bio,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.userId))
      .returning();
    const user = rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      profile: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        bio: user.bio ?? null,
      },
    });
  });

  app.get("/api/profiles", async (req: Request, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Sign in required" });
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const db = getDb();
    if (!db) return res.status(503).json({ message: "Database is not configured" });
    const rows = await db.select().from(users).orderBy(asc(users.firstName), asc(users.lastName));
    const people = rows
      .filter((u) => {
        if (!q) return true;
        return (
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      })
      .map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        bio: u.bio ?? null,
      }));
    res.json({ profiles: people });
  });

  app.post("/api/workspace/chat", async (req: Request, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Sign in required" });
    const parsed = workspaceChatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    try {
      const out = await sendWorkspaceMessage({
        userId: req.userId,
        sessionId: parsed.data.sessionId,
        content: parsed.data.content,
      });
      res.json(out);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      res.status(err.status ?? 500).json({ message: err.message ?? "Workspace chat failed" });
    }
  });

  app.post("/api/tasks/extract", async (req: Request, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Sign in required" });
    const parsed = taskExtractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const extractedTasks = extractTasksFromRawDoc(parsed.data.rawSourceDoc);
    res.json({
      draft: {
        title: extractedTasks[0]?.title ?? "Draft task",
        description:
          extractedTasks[0]?.description ??
          "Generated from source document. Review and edit before submit.",
        extractedTasks,
      },
    });
  });

  app.get("/api/tasks", async (req: Request, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Sign in required" });
    const db = getDb();
    if (!db) return res.status(503).json({ message: "Database is not configured" });
    const rows = await db
      .select()
      .from(networkTasks)
      .where(eq(networkTasks.ownerUserId, req.userId))
      .orderBy(asc(networkTasks.createdAt));
    res.json({
      tasks: rows.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        organizationId: t.organizationId ?? null,
        ownerUserId: t.ownerUserId,
        assigneeUserId: t.assigneeUserId ?? null,
        sourceSessionId: t.sourceSessionId ?? null,
        rawSourceDoc: t.rawSourceDoc ?? null,
        extractedBy: t.extractedBy ?? null,
        deliveryChannels: t.deliveryChannels ?? [],
        externalRefs: t.externalRefs ?? [],
        history: t.history ?? [],
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  });

  app.post("/api/tasks", async (req: Request, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Sign in required" });
    const parsed = taskCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    try {
      const row = await createTaskFromDraft({
        ownerUserId: req.userId,
        title: parsed.data.title,
        description: parsed.data.description,
        rawSourceDoc: parsed.data.rawSourceDoc ?? null,
        sourceSessionId: parsed.data.sourceSessionId ?? null,
      });
      res.status(201).json({
        task: {
          id: row.id,
          title: row.title,
          description: row.description,
          status: row.status,
          organizationId: row.organizationId ?? null,
          ownerUserId: row.ownerUserId,
          assigneeUserId: row.assigneeUserId ?? null,
          sourceSessionId: row.sourceSessionId ?? null,
          rawSourceDoc: row.rawSourceDoc ?? null,
          extractedBy: row.extractedBy ?? null,
          deliveryChannels: row.deliveryChannels ?? [],
          externalRefs: row.externalRefs ?? [],
          history: row.history ?? [],
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        },
      });
    } catch (e: unknown) {
      console.error("[tasks/create]", e);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req: Request, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Sign in required" });
    const parsed = taskUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const db = getDb();
    if (!db) return res.status(503).json({ message: "Database is not configured" });
    const rows = await db
      .update(networkTasks)
      .set({
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status,
        updatedAt: new Date(),
      })
      .where(and(eq(networkTasks.id, req.params.id), eq(networkTasks.ownerUserId, req.userId)))
      .returning();
    const row = rows[0];
    if (!row) return res.status(404).json({ message: "Task not found" });
    res.json({
      task: {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        organizationId: row.organizationId ?? null,
        ownerUserId: row.ownerUserId,
        assigneeUserId: row.assigneeUserId ?? null,
        sourceSessionId: row.sourceSessionId ?? null,
        rawSourceDoc: row.rawSourceDoc ?? null,
        extractedBy: row.extractedBy ?? null,
        deliveryChannels: row.deliveryChannels ?? [],
        externalRefs: row.externalRefs ?? [],
        history: row.history ?? [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  });

  app.get("/api/admin/summary", async (req: Request, res: Response) => {
    try {
      await assertAdmin(req);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      return res.status(err.status ?? 500).json({ message: err.message ?? "Error" });
    }
    const db = getDb();
    if (!db) return res.status(503).json({ message: "Database is not configured" });
    const [usersRows, taskRows, surveyRows, credsRows, ctxRows, eventRows] = await Promise.all([
      db.select().from(users).orderBy(asc(users.createdAt)),
      db.select().from(networkTasks).orderBy(asc(networkTasks.createdAt)),
      db.select().from(postTaskSurveys).orderBy(asc(postTaskSurveys.createdAt)),
      db.select().from(channelCredentials).orderBy(asc(channelCredentials.createdAt)),
      db.select().from(userContextEntries).orderBy(asc(userContextEntries.createdAt)),
      db.select().from(adminEvents).orderBy(asc(adminEvents.createdAt)),
    ]);
    res.json({
      accounts: usersRows.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        bio: u.bio ?? null,
      })),
      tasks: taskRows.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        ownerUserId: t.ownerUserId,
        assigneeUserId: t.assigneeUserId ?? null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      surveys: surveyRows,
      channelCredentials: credsRows,
      contextEntries: ctxRows,
      adminEvents: eventRows,
    });
  });

  app.get("/api/ui-experiments", async (_req: Request, res: Response) => {
    const experiments = await listUiExperiments();
    res.json({ experiments });
  });

  app.put("/api/ui-experiments/:key", async (req: Request, res: Response) => {
    try {
      await assertAdmin(req);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      return res
        .status(err.status ?? 500)
        .json({ message: err.message ?? "Error" });
    }
    const key = decodeURIComponent(req.params.key);
    const parsed = patchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const updated = await updateUiExperiment(key, parsed.data);
    if (!updated) {
      return res.status(404).json({ message: "Unknown experiment key" });
    }
    res.json({ experiment: updated });
  });
}
