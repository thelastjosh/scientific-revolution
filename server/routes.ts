import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { z } from "zod";
import { uiExperimentVariantSchema } from "@shared/schema";
import {
  listUiExperiments,
  updateUiExperiment,
} from "./ui-experiments-service";

const patchBodySchema = z.object({
  enabled: z.boolean().optional(),
  variant: uiExperimentVariantSchema.optional(),
});

function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET?.trim();
}

function assertAdmin(req: Request): void {
  const secret = getAdminSecret();
  if (!secret) {
    const err = new Error("ADMIN_SECRET is not configured");
    (err as { status?: number }).status = 503;
    throw err;
  }
  const auth = req.headers.authorization;
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : undefined;
  const headerToken =
    typeof req.headers["x-admin-token"] === "string"
      ? req.headers["x-admin-token"]
      : undefined;
  const token = bearer || headerToken;
  if (!token || token !== secret) {
    const err = new Error("Unauthorized");
    (err as { status?: number }).status = 401;
    throw err;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/ui-experiments", async (_req: Request, res: Response) => {
    const experiments = await listUiExperiments();
    res.json({ experiments });
  });

  app.put("/api/ui-experiments/:key", async (req: Request, res: Response) => {
    try {
      assertAdmin(req);
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

  return httpServer;
}
