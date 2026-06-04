import type { Express, Request, Response } from "express";
import { z } from "zod";
import { isConnectorId } from "@shared/connectors/types";
import { listCatalog } from "./connectors/registry";
import {
  deleteUserConnector,
  listUserConnectors,
  patchUserConnector,
  sendUserTest,
  upsertUserConnector,
} from "./connectors/connector-service";

const upsertBodySchema = z.object({
  accountLabel: z.string().max(120).optional(),
  chatId: z.string().max(32).optional(),
  credential: z.record(z.unknown()).optional(),
});

const patchBodySchema = z.object({
  accountLabel: z.string().max(120).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

function requireUserId(req: Request, res: Response): string | null {
  if (!req.userId) {
    res.status(401).json({ message: "Sign in required" });
    return null;
  }
  return req.userId;
}

function parseProviderParam(param: string, res: Response) {
  if (!isConnectorId(param)) {
    res.status(400).json({ message: "Unknown connector provider" });
    return null;
  }
  return param;
}

export function registerConnectorRoutes(app: Express): void {
  app.get("/api/connectors/catalog", (_req: Request, res: Response) => {
    res.json({ catalog: listCatalog() });
  });

  app.get("/api/connectors/mine", async (req: Request, res: Response) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const connectors = await listUserConnectors(userId);
    res.json({ connectors });
  });

  app.put("/api/connectors/mine/:provider", async (req: Request, res: Response) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const provider = parseProviderParam(req.params.provider, res);
    if (!provider) return;
    const parsed = upsertBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const credential =
      provider === "telegram"
        ? { chatId: parsed.data.chatId ?? parsed.data.credential?.chatId }
        : parsed.data.credential;
    const out = await upsertUserConnector({
      userId,
      provider,
      accountLabel: parsed.data.accountLabel ?? "",
      credential,
    });
    if (!out.ok) {
      return res.status(out.status ?? 400).json({ message: out.message });
    }
    res.json({ connector: out.connector });
  });

  app.patch("/api/connectors/mine/:provider", async (req: Request, res: Response) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const provider = parseProviderParam(req.params.provider, res);
    if (!provider) return;
    const parsed = patchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.flatten() });
    }
    const out = await patchUserConnector({
      userId,
      provider,
      accountLabel: parsed.data.accountLabel,
      status: parsed.data.status,
    });
    if (!out.ok) {
      return res.status(out.status ?? 400).json({ message: out.message });
    }
    res.json({ connector: out.connector });
  });

  app.delete("/api/connectors/mine/:provider", async (req: Request, res: Response) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const provider = parseProviderParam(req.params.provider, res);
    if (!provider) return;
    const out = await deleteUserConnector(userId, provider);
    if (!out.ok) {
      return res.status(out.status ?? 400).json({ message: out.message });
    }
    res.json({ ok: true });
  });

  app.post("/api/connectors/mine/:provider/test", async (req: Request, res: Response) => {
    const userId = requireUserId(req, res);
    if (!userId) return;
    const provider = parseProviderParam(req.params.provider, res);
    if (!provider) return;
    const out = await sendUserTest(userId, provider);
    if (!out.ok) {
      return res.status(out.status ?? 502).json({ message: out.reason });
    }
    res.json({ ok: true, channel: provider, detail: out.detail });
  });
}
