import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { z } from "zod";
import { uiExperimentVariantSchema } from "@shared/schema";
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

const patchBodySchema = z.object({
  enabled: z.boolean().optional(),
  variant: uiExperimentVariantSchema.optional(),
});

const onboardingChatBodySchema = z.object({
  inviteToken: z.string().max(128).nullable().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
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
  registerAuthRoutes(app);

  app.get("/api/onboarding/bootstrap", async (req: Request, res: Response) => {
    try {
      const raw =
        typeof req.query.invite === "string" ? req.query.invite : undefined;
      const token = normalizeInviteToken(raw);
      const invite = await getInviteByToken(token);
      res.json({
        openingMessage: openingMessageFromInvite(invite),
        inviteFirstName: invite?.firstName?.trim() ?? null,
      });
    } catch (e: unknown) {
      console.error("[onboarding/bootstrap]", e);
      res.status(500).json({ message: "Failed to load onboarding" });
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
