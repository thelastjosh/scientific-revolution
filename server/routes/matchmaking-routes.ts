import type { Express, Request, Response } from "express";
import {
  acceptMatchProposal,
  declineMatchProposal,
  getProposalByToken,
  getTaskMatchmakingStatus,
  submitTaskForMatching,
} from "../matchmaking/runner";
import { getMatchmakingMetrics, listMatchmakingRuns } from "../matchmaking/metrics-service";
import { isAdminUser } from "../admin-access";
import { getDb } from "../db";
import { networkTasks, users } from "@shared/schema";
import { and, eq } from "drizzle-orm";

async function assertAdmin(req: Request): Promise<void> {
  if (!req.userId) {
    const err = new Error("Sign in required") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  const db = getDb();
  if (!db) {
    const err = new Error("Database is not configured") as Error & { status?: number };
    err.status = 503;
    throw err;
  }
  const rows = await db.select().from(users).where(eq(users.id, req.userId)).limit(1);
  const user = rows[0];
  if (!user || !isAdminUser(user)) {
    const err = new Error("Admin access required") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}

export function registerMatchmakingRoutes(app: Express): void {
  app.post("/api/tasks/:id/submit-for-matching", async (req: Request, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Sign in required" });
    const result = await submitTaskForMatching({
      taskId: req.params.id,
      ownerUserId: req.userId,
    });
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    res.json({
      decision: result.decision,
      runId: result.runId,
      matchmaking: result.status,
    });
  });

  app.get("/api/tasks/:id/matchmaking", async (req: Request, res: Response) => {
    if (!req.userId) return res.status(401).json({ message: "Sign in required" });
    const db = getDb();
    if (!db) return res.status(503).json({ message: "Database is not configured" });
    const taskRows = await db
      .select({ id: networkTasks.id })
      .from(networkTasks)
      .where(
        and(eq(networkTasks.id, req.params.id), eq(networkTasks.ownerUserId, req.userId)),
      )
      .limit(1);
    if (!taskRows[0]) return res.status(404).json({ message: "Task not found" });
    const status = await getTaskMatchmakingStatus(req.params.id);
    res.json({ matchmaking: status });
  });

  app.get("/api/matchmaking/offer/:token", async (req: Request, res: Response) => {
    const offer = await getProposalByToken(req.params.token);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.json({ offer });
  });

  app.post("/api/matchmaking/offer/:token/accept", async (req: Request, res: Response) => {
    const result = await acceptMatchProposal({ token: req.params.token });
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    res.json({ ok: true, taskId: result.taskId });
  });

  app.post("/api/matchmaking/offer/:token/decline", async (req: Request, res: Response) => {
    const result = await declineMatchProposal({ token: req.params.token });
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    res.json({ ok: true, taskId: result.taskId, rerun: result.rerun });
  });

  app.get("/api/admin/matchmaking/metrics", async (req: Request, res: Response) => {
    try {
      await assertAdmin(req);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      return res.status(err.status ?? 500).json({ message: err.message ?? "Error" });
    }
    const metrics = await getMatchmakingMetrics();
    res.json({ metrics });
  });

  app.get("/api/admin/matchmaking/runs", async (req: Request, res: Response) => {
    try {
      await assertAdmin(req);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      return res.status(err.status ?? 500).json({ message: err.message ?? "Error" });
    }
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const data = await listMatchmakingRuns({ limit, offset });
    res.json(data);
  });
}
