import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "http";
import type { Express, Request, Response } from "express";
import { createApp } from "../server/app";

let cachedApp: Express | undefined;

/**
 * Vercel serverless entry: `vercel.json` rewrites `/api/*` → `/api/index`.
 * Express is invoked as a Node request listener (same as `http.createServer(app)`).
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  cachedApp ??= await createApp();
  cachedApp(req as Request, res as Response);
}
