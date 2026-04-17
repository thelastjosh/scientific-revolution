import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "http";
import type { Express, Request, Response } from "express";
import { assertProductionSessionSecret } from "../server/auth";
import { createApp } from "../server/app";

let cachedApp: Express | undefined;

/**
 * Source for the Vercel bundle — built to `api/index.js` by `npm run build:vercel-api`.
 * Do not import `../server/*` from `api/index.ts` on Vercel; the server folder is not deployed.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!cachedApp) {
    assertProductionSessionSecret();
    cachedApp = await createApp();
  }
  cachedApp(req as Request, res as Response);
}
